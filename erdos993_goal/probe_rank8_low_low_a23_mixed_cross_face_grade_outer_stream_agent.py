#!/usr/bin/env python3
"""One-face/one-grade exact outer-stream producer for all mixed cross rows.

Within one face and total ordinary-slack grade, common factor/convolution state
is built once.  Curvature middle/far then strong middle/far are streamed
sequentially; no assembled row and no two row streams coexist.  Each b0 slice,
row manifest, and job checkpoint is committed atomically.
"""

from __future__ import annotations

import argparse
import gc
import hashlib
import heapq
import json
import os
from pathlib import Path

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_a23_mixed_cross_truncated_agent import (
    BASE_NAMES,
    GROUP_A,
    GROUP_B,
    SLACK_NAMES,
    Graded,
    convolution,
    factor_row,
)
from probe_rank8_low_low_a23_mixed_cross_row_grade_agent import (
    cross_grade,
    curvature_grade,
    derivative_cross_grade,
    derivative_grade,
)
from probe_rank8_low_low_a23_mixed_cross_strong_outer_stream_agent import (
    HARD_PRIVATE_LIMIT,
    MixedCursor,
    atomic_json,
    enforce_memory_limit,
)


DEPENDENCIES = (
    "probe_rank8_low_low_a23_mixed_cross_truncated_agent.py",
    "probe_rank8_low_low_a23_mixed_cross_row_grade_agent.py",
    "probe_rank8_low_low_a23_mixed_cross_strong_outer_stream_agent.py",
)
PIECE_DEGREE_BOUNDS = {
    "curvature": {"base": 16, "linear": 15, "direction": 14},
    "strong": {"base": 17, "linear": 16, "direction": 15},
}


def build_common(face, degree, peak):
    names = BASE_NAMES + SLACK_NAMES
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    raw = dict(zip(names, context.gens()))
    zero_raw = context.constant(0)
    Graded.max_degree = degree
    Graded.zero = zero_raw
    variables = {
        name: Graded.slack(value) if name in SLACK_NAMES else Graded.base(value)
        for name, value in raw.items()
    }
    zero = Graded.base(zero_raw)
    one = Graded.base(context.constant(1))
    h, ta, tb, p, q = (variables[name] for name in BASE_NAMES)
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q
    left_gaps = [
        2 * h + variables["a0"], h, h + a2, h + a3,
        h + variables["a4"], h + variables["a5"],
        h + variables["a6"], h + variables["a7"],
    ]
    right_gaps = [
        2 * h + variables["b0"], h, h + b2, h + b3,
        h + variables["b4"], h + variables["b5"],
        h + variables["b6"], h + variables["b7"],
    ]
    left_ratios, left = factor_row(ta, left_gaps, one)
    right_ratios, right_base = factor_row(tb, right_gaps, one)
    tail = [zero, zero, zero] + left[3:]
    base_c = {rank: convolution(left, right_base, rank, zero) for rank in (7, 8, 9)}
    base_v = {rank: convolution(tail, right_base, rank, zero) for rank in (7, 8, 9)}
    direction_c = direction_v = None
    if degree <= 16:
        right_direction = [zero for _ in right_base]
        right_direction[3] = right_base[2] * h
        for rank in range(4, len(right_base)):
            right_direction[rank] = right_direction[rank - 1] * right_ratios[rank - 1]
        direction_c = {
            rank: convolution(left, right_direction, rank, zero)
            for rank in (7, 8, 9)
        }
        direction_v = {
            rank: convolution(tail, right_direction, rank, zero)
            for rank in (7, 8, 9)
        }
    enforce_memory_limit("common face-grade state", peak)
    return {
        "names": names,
        "raw": raw,
        "zero_raw": zero_raw,
        "left_ratios": left_ratios,
        "base_c": base_c,
        "direction_c": direction_c,
        "base_v": base_v,
        "direction_v": direction_v,
    }


def curvature_pieces(common, degree, peak):
    zero = common["zero_raw"]
    h = common["raw"]["h"]
    base_v = common["base_v"]
    direction_v = common["direction_v"]
    pieces = {
        "base": curvature_grade(base_v, degree, zero, h),
    }
    enforce_memory_limit("curvature base", peak)
    if degree <= PIECE_DEGREE_BOUNDS["curvature"]["linear"]:
        pieces["linear"] = cross_grade(base_v, direction_v, degree, zero, h)
        enforce_memory_limit("curvature linear", peak)
    if degree <= PIECE_DEGREE_BOUNDS["curvature"]["direction"]:
        pieces["direction"] = curvature_grade(direction_v, degree, zero, h)
        enforce_memory_limit("curvature direction", peak)
    return pieces


def strong_pieces(common, degree, peak):
    zero = common["zero_raw"]
    h = common["raw"]["h"]
    capacity = common["left_ratios"][2]
    assert all(not item for item in capacity.c[2:])
    c0, v0 = common["base_c"], common["base_v"]
    c1, v1 = common["direction_c"], common["direction_v"]

    base_margin = (
        capacity.c[0] * curvature_grade(c0, degree, zero, h)
        + capacity.c[1] * curvature_grade(c0, degree - 1, zero, h)
    )
    base_derivative = derivative_grade(c0, v0, degree, zero, h)
    pieces = {"base": base_margin + h * base_derivative}
    del base_margin, base_derivative
    gc.collect()
    enforce_memory_limit("strong base", peak)

    if degree <= PIECE_DEGREE_BOUNDS["strong"]["linear"]:
        linear_margin = (
            capacity.c[0] * cross_grade(c0, c1, degree, zero, h)
            + capacity.c[1] * cross_grade(c0, c1, degree - 1, zero, h)
        )
        linear_derivative = derivative_cross_grade(c0, c1, v0, v1, degree, zero, h)
        pieces["linear"] = linear_margin + h * linear_derivative
        del linear_margin, linear_derivative
        gc.collect()
        enforce_memory_limit("strong linear", peak)

    if degree <= PIECE_DEGREE_BOUNDS["strong"]["direction"]:
        direction_margin = (
            capacity.c[0] * curvature_grade(c1, degree, zero, h)
            + capacity.c[1] * curvature_grade(c1, degree - 1, zero, h)
        )
        direction_derivative = derivative_grade(c1, v1, degree, zero, h)
        pieces["direction"] = direction_margin + h * direction_derivative
        del direction_margin, direction_derivative
        gc.collect()
        enforce_memory_limit("strong direction", peak)
    return pieces


def row_spec(family, label, pieces):
    if label.endswith("middle_times_4"):
        scales = (("base", 4), ("linear", 2))
    else:
        scales = (("base", 1), ("linear", 1), ("direction", 1))
    return [(name, scale, pieces[name]) for name, scale in scales if name in pieces]


def empty_stat(exponent):
    return {
        "outer_exponent": exponent,
        "mixed_support_terms": 0,
        "negative_terms": 0,
        "minimum": None,
        "first_negative": None,
        "ordered_coefficient_sha256": hashlib.sha256().hexdigest().upper(),
    }


def stream_row(
    output_dir, date_tag, face, face_token, degree, family, label, names,
    piece_spec, source_hash, dependency_hashes, peak,
):
    name_index = {name: names.index(name) for name in names}
    group_a = tuple(name_index[name] for name in GROUP_A)
    group_b = tuple(name_index[name] for name in GROUP_B)
    outer_index = name_index["b0"]
    cursors = [
        MixedCursor(polynomial, scale, group_a, group_b, degree)
        for _, scale, polynomial in piece_spec
    ]
    heap = []
    for cursor_index, cursor in enumerate(cursors):
        item = cursor.advance()
        if item is not None:
            key, monomial, coefficient = item
            heapq.heappush(heap, (key, cursor_index, monomial, coefficient))
    stats = [empty_stat(exponent) for exponent in range(3)]
    digests = [hashlib.sha256() for _ in stats]
    overall = hashlib.sha256()
    terms = negative = 0
    previous_outer = 0
    while heap:
        key, cursor_index, monomial, coefficient = heapq.heappop(heap)
        combined = coefficient
        consumed = [cursor_index]
        while heap and heap[0][0] == key:
            _, other_index, other_monomial, other_coefficient = heapq.heappop(heap)
            assert other_monomial == monomial
            combined += other_coefficient
            consumed.append(other_index)
        for item_index in consumed:
            item = cursors[item_index].advance()
            if item is not None:
                next_key, next_monomial, next_coefficient = item
                heapq.heappush(heap, (next_key, item_index, next_monomial, next_coefficient))
        if combined == 0:
            continue
        outer = monomial[outer_index]
        assert previous_outer <= outer <= 2
        previous_outer = outer
        encoded = ((",".join(map(str, monomial))) + ":" + str(combined) + "\n").encode()
        overall.update(encoded)
        digests[outer].update(encoded)
        stat = stats[outer]
        stat["mixed_support_terms"] += 1
        stat["minimum"] = combined if stat["minimum"] is None else min(stat["minimum"], combined)
        if combined < 0:
            negative += 1
            stat["negative_terms"] += 1
            if stat["first_negative"] is None:
                stat["first_negative"] = {"monomial": list(monomial), "coefficient": combined}
        terms += 1
        if terms % 100_000 == 0:
            enforce_memory_limit(f"{label} merge term {terms}", peak)

    prefix = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_{label}_grade_{degree}_"
        f"outer_stream_agent_{date_tag}"
    )
    records = []
    for exponent, stat in enumerate(stats):
        stat["ordered_coefficient_sha256"] = digests[exponent].hexdigest().upper()
        status = (
            "PASS_EXACT_MIXED_CROSS_OUTER_CHUNK_COEFFICIENTWISE_NONNEGATIVE"
            if stat["negative_terms"] == 0
            else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        )
        payload = {
            "schema": "rank8-low-low-a23-mixed-cross-face-grade-outer-chunk-agent-v1",
            "status": status,
            "face": list(face),
            "bridge_corner": [2 * face[0], 2 * face[1]],
            "family": family,
            "auxiliary": label,
            "total_ordinary_slack_degree": degree,
            "outer_variable": "b0",
            "outer_exponent": exponent,
            "outer_support_bound": [0, 2],
            "variables": list(names),
            "group_A": list(GROUP_A),
            "group_B": list(GROUP_B),
            "piece_scales": {name: scale for name, scale, _ in piece_spec},
            "chunk": stat,
            "global_row_assembly": False,
            "source_sha256": source_hash,
            "dependency_sha256": dependency_hashes,
        }
        path = Path(str(prefix) + f"_b0_exp_{exponent}.json")
        file_hash = atomic_json(path, payload)
        records.append({
            "outer_exponent": exponent,
            "path": str(path.resolve()),
            "sha256": file_hash,
            "mixed_support_terms": stat["mixed_support_terms"],
            "negative_terms": stat["negative_terms"],
            "minimum": stat["minimum"],
            "ordered_coefficient_sha256": stat["ordered_coefficient_sha256"],
        })
        print(label, "CHUNK", exponent, "TERMS", stat["mixed_support_terms"], "NEGATIVE", stat["negative_terms"], flush=True)
    result = {
        "chunks": records,
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "ordered_coefficient_sha256": overall.hexdigest().upper(),
        "piece_names": [name for name, _, _ in piece_spec],
        "piece_scales": [scale for _, scale, _ in piece_spec],
        "piece_lengths": [len(polynomial) for _, _, polynomial in piece_spec],
        "piece_raw_terms_visited": [cursor.raw_terms_visited for cursor in cursors],
        "piece_mixed_terms_visited": [cursor.mixed_terms_visited for cursor in cursors],
    }
    manifest = Path(str(prefix) + "_manifest.json")
    manifest_payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face-grade-outer-manifest-agent-v1",
        "status": (
            "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE"
            if negative == 0
            else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "family": family,
        "auxiliary": label,
        "total_ordinary_slack_degree": degree,
        "outer_variable": "b0",
        "outer_exponent_range": [0, 2],
        "piece_degree_bounds": PIECE_DEGREE_BOUNDS[family],
        "global_row_assembly": False,
        "hard_private_memory_limit_bytes": HARD_PRIVATE_LIMIT,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "result": result,
        "source_sha256": source_hash,
        "dependency_sha256": dependency_hashes,
    }
    manifest_hash = atomic_json(manifest, manifest_payload)
    print(label, "MANIFEST", manifest, manifest_hash, flush=True)
    return {
        "family": family,
        "auxiliary": label,
        "manifest": str(manifest.resolve()),
        "manifest_sha256": manifest_hash,
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "ordered_coefficient_sha256": result["ordered_coefficient_sha256"],
    }


def update_job(path, face, degree, source_hash, dependency_hashes, completed, peak, final=False):
    expected = []
    if degree <= 16:
        expected.extend(("curvature_middle_times_4", "curvature_far"))
    expected.extend(("strong_middle_times_4", "strong_far"))
    completed_labels = [item["auxiliary"] for item in completed]
    missing = [label for label in expected if label not in completed_labels]
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-face-grade-job-agent-v1",
        "status": (
            "PASS_COMPLETE_FACE_GRADE_ALL_REQUIRED_ROWS"
            if final and not missing and all(item["negative_terms"] == 0 for item in completed)
            else "CHECKPOINT_INCOMPLETE_FACE_GRADE"
        ),
        "face": list(face),
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "total_ordinary_slack_degree": degree,
        "expected_rows": expected,
        "completed_rows": completed,
        "missing_rows": missing,
        "global_row_assembly": False,
        "hard_private_memory_limit_bytes": HARD_PRIVATE_LIMIT,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source_hash,
        "dependency_sha256": dependency_hashes,
    }
    return atomic_json(path, payload)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--output-directory", default=".")
    parser.add_argument("--date-tag", default="20260823")
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    face_token = args.face.replace(",", "")
    output_dir = Path(args.output_directory).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    here = Path(__file__).resolve().parent
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    dependency_hashes = {
        name: hashlib.sha256((here / name).read_bytes()).hexdigest().upper()
        for name in DEPENDENCIES
    }
    peak = [0]
    enforce_memory_limit("face-grade start", peak)
    job_path = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_grade_{args.degree}_"
        f"outer_stream_job_agent_{args.date_tag}.json"
    )
    completed = []
    update_job(job_path, face, args.degree, source_hash, dependency_hashes, completed, peak)
    common = build_common(face, args.degree, peak)
    names = common["names"]

    if args.degree <= 16:
        pieces = curvature_pieces(common, args.degree, peak)
        for label in ("curvature_middle_times_4", "curvature_far"):
            completed.append(stream_row(
                output_dir, args.date_tag, face, face_token, args.degree,
                "curvature", label, names,
                row_spec("curvature", label, pieces),
                source_hash, dependency_hashes, peak,
            ))
            update_job(job_path, face, args.degree, source_hash, dependency_hashes, completed, peak)
            if completed[-1]["negative_terms"]:
                raise AssertionError(f"negative coefficient in {label}")
        del pieces
        gc.collect()
        enforce_memory_limit("curvature rows released", peak)

    pieces = strong_pieces(common, args.degree, peak)
    for label in ("strong_middle_times_4", "strong_far"):
        completed.append(stream_row(
            output_dir, args.date_tag, face, face_token, args.degree,
            "strong", label, names,
            row_spec("strong", label, pieces),
            source_hash, dependency_hashes, peak,
        ))
        update_job(job_path, face, args.degree, source_hash, dependency_hashes, completed, peak)
        if completed[-1]["negative_terms"]:
            raise AssertionError(f"negative coefficient in {label}")
    job_hash = update_job(
        job_path, face, args.degree, source_hash, dependency_hashes,
        completed, peak, final=True,
    )
    print("JOB", job_path, job_hash, flush=True)


if __name__ == "__main__":
    main()
