#!/usr/bin/env python3
"""Exact curvature cross-support scan by disjoint b0-exponent chunks.

The base/linear/direction curvature pieces have maximum ordinary-slack grades
16/15/14.  Only pieces allowed by those exact bounds are constructed.  They
are index-stream merged without forming a global curvature polynomial, and
each final-variable b0 exponent is committed atomically.
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
LABELS = ("curvature_middle_times_4", "curvature_far")


def build_curvature_pieces(face, label, degree, peak):
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
    h_raw = raw["h"]
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
    _, left = factor_row(ta, left_gaps, one)
    right_ratios, right_base = factor_row(tb, right_gaps, one)
    tail = [zero, zero, zero] + left[3:]
    base_v = {
        rank: convolution(tail, right_base, rank, zero)
        for rank in (7, 8, 9)
    }
    base_piece = curvature_grade(base_v, degree, zero_raw, h_raw)
    gc.collect()
    enforce_memory_limit("curvature base piece", peak)

    # At grade 16 only base can occur.  This also proves middle=4*far there.
    if degree == 16:
        return names, ((4 if label == "curvature_middle_times_4" else 1, base_piece),)

    right_direction = [zero for _ in right_base]
    right_direction[3] = right_base[2] * h
    for rank in range(4, len(right_base)):
        right_direction[rank] = right_direction[rank - 1] * right_ratios[rank - 1]
    direction_v = {
        rank: convolution(tail, right_direction, rank, zero)
        for rank in (7, 8, 9)
    }
    linear_piece = cross_grade(
        base_v, direction_v, degree, zero_raw, h_raw
    )
    gc.collect()
    enforce_memory_limit("curvature linear piece", peak)
    if label == "curvature_middle_times_4":
        return names, ((4, base_piece), (2, linear_piece))

    # Direction curvature has slack degree at most 14.
    if degree == 15:
        return names, ((1, base_piece), (1, linear_piece))
    direction_piece = curvature_grade(
        direction_v, degree, zero_raw, h_raw
    )
    gc.collect()
    enforce_memory_limit("curvature direction piece", peak)
    return names, ((1, base_piece), (1, linear_piece), (1, direction_piece))


def empty_stat(exponent):
    return {
        "outer_exponent": exponent,
        "mixed_support_terms": 0,
        "negative_terms": 0,
        "minimum": None,
        "first_negative": None,
        "ordered_coefficient_sha256": hashlib.sha256().hexdigest().upper(),
    }


def merge(face, label, degree, names, pieces, prefix, source_hash, dependencies, peak):
    index = {name: names.index(name) for name in names}
    a = tuple(index[name] for name in GROUP_A)
    b = tuple(index[name] for name in GROUP_B)
    b0 = index["b0"]
    cursors = [MixedCursor(poly, scale, a, b, degree) for scale, poly in pieces]
    heap = []
    for cursor_index, cursor in enumerate(cursors):
        item = cursor.advance()
        if item is not None:
            key, monomial, coefficient = item
            heapq.heappush(heap, (key, cursor_index, monomial, coefficient))
    # The proved outer-support bound is independent of the total slack grade.
    stats = [empty_stat(e) for e in range(3)]
    digests = [hashlib.sha256() for _ in stats]
    whole = hashlib.sha256()
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
        outer = monomial[b0]
        assert previous_outer <= outer <= 2
        previous_outer = outer
        encoded = ((",".join(map(str, monomial))) + ":" + str(combined) + "\n").encode()
        whole.update(encoded)
        digests[outer].update(encoded)
        stat = stats[outer]
        stat["mixed_support_terms"] += 1
        stat["minimum"] = combined if stat["minimum"] is None else min(stat["minimum"], combined)
        if combined < 0:
            stat["negative_terms"] += 1
            negative += 1
            if stat["first_negative"] is None:
                stat["first_negative"] = {"monomial": list(monomial), "coefficient": combined}
        terms += 1
        if terms % 100_000 == 0:
            enforce_memory_limit(f"curvature merge term {terms}", peak)

    records = []
    for exponent, stat in enumerate(stats):
        stat["ordered_coefficient_sha256"] = digests[exponent].hexdigest().upper()
        status = (
            "PASS_EXACT_MIXED_CROSS_CURVATURE_OUTER_CHUNK_NONNEGATIVE"
            if stat["negative_terms"] == 0
            else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        )
        payload = {
            "schema": "rank8-low-low-a23-mixed-cross-curvature-outer-chunk-agent-v1",
            "status": status,
            "face": list(face),
            "auxiliary": label,
            "total_ordinary_slack_degree": degree,
            "outer_variable": "b0",
            "outer_exponent": exponent,
            "outer_support_bound": [0, 2],
            "variables": list(names),
            "group_A": list(GROUP_A),
            "group_B": list(GROUP_B),
            "chunk": stat,
            "piece_scales": [scale for scale, _ in pieces],
            "global_row_assembly": False,
            "source_sha256": source_hash,
            "dependency_sha256": dependencies,
        }
        path = Path(f"{prefix}_b0_exp_{exponent}.json").resolve()
        file_hash = atomic_json(path, payload)
        records.append({
            "outer_exponent": exponent,
            "path": str(path),
            "sha256": file_hash,
            "mixed_support_terms": stat["mixed_support_terms"],
            "negative_terms": stat["negative_terms"],
            "minimum": stat["minimum"],
            "ordered_coefficient_sha256": stat["ordered_coefficient_sha256"],
        })
        print("CHUNK", exponent, "TERMS", stat["mixed_support_terms"], "NEGATIVE", stat["negative_terms"], flush=True)
    enforce_memory_limit("curvature merge complete", peak)
    return {
        "chunks": records,
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "ordered_coefficient_sha256": whole.hexdigest().upper(),
        "piece_lengths": [len(poly) for _, poly in pieces],
        "piece_raw_terms_visited": [cursor.raw_terms_visited for cursor in cursors],
        "piece_mixed_terms_visited": [cursor.mixed_terms_visited for cursor in cursors],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--label", choices=LABELS, required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 17), required=True)
    parser.add_argument("--output-prefix", required=True)
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    here = Path(__file__).resolve().parent
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    dependencies = {
        name: hashlib.sha256((here / name).read_bytes()).hexdigest().upper()
        for name in DEPENDENCIES
    }
    peak = [0]
    enforce_memory_limit("curvature start", peak)
    names, pieces = build_curvature_pieces(face, args.label, args.degree, peak)
    result = merge(
        face, args.label, args.degree, names, pieces, args.output_prefix,
        source_hash, dependencies, peak,
    )
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-curvature-outer-manifest-agent-v1",
        "status": (
            "PASS_EXACT_MIXED_CROSS_CURVATURE_GRADE_OUTER_CHUNKS_NONNEGATIVE"
            if result["negative_terms"] == 0
            else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT"
        ),
        "face": list(face),
        "auxiliary": args.label,
        "total_ordinary_slack_degree": args.degree,
        "outer_variable": "b0",
        "outer_exponent_range": [0, 2],
        "piece_degree_bounds": {"base": 16, "linear": 15, "direction": 14},
        "disjoint_coverage": "Every mixed term has one b0 exponent 0, 1, or 2.",
        "global_row_assembly": False,
        "hard_private_memory_limit_bytes": HARD_PRIVATE_LIMIT,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "result": result,
        "source_sha256": source_hash,
        "dependency_sha256": dependencies,
    }
    manifest = Path(f"{args.output_prefix}_manifest.json").resolve()
    manifest_hash = atomic_json(manifest, payload)
    print("MANIFEST", manifest, manifest_hash, flush=True)


if __name__ == "__main__":
    main()
