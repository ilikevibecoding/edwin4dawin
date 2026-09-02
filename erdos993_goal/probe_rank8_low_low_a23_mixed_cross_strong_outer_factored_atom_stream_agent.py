#!/usr/bin/env python3
"""Ultra-low-memory strong-row producer using bilinear atoms.

Every curvature, cross, derivative, and derivative-cross summand is split
into its displayed product atoms.  Only one product polynomial is live while
its deterministic coefficient stream is written; both strong rows are then
formed by exact streaming merges.
"""

from __future__ import annotations

import argparse
import gc
import gzip
import hashlib
import heapq
import json
import os
from pathlib import Path

from probe_rank8_low_low_a23_mixed_cross_truncated_agent import (
    BASE_NAMES, GROUP_A, GROUP_B, SLACK_NAMES,
)
from probe_rank8_low_low_a23_mixed_cross_face_grade_outer_factored_agent import (
    DEFAULT_PRIVATE_LIMIT,
    REDUCED_NAMES,
    atomic_json,
    build_split_common,
    guard,
    outer_product,
    private_bytes,
    sha256,
)
from probe_rank8_low_low_a23_mixed_cross_curvature_outer_factored_atom_stream_agent import (
    StreamCursor,
    new_row_state,
)


FORMAL_DEPENDENCY = "probe_rank8_low_low_a23_mixed_cross_face_grade_outer_factored_agent.py"
STREAM_DEPENDENCY = "probe_rank8_low_low_a23_mixed_cross_curvature_outer_factored_atom_stream_agent.py"
FULL_NAMES = BASE_NAMES + SLACK_NAMES
CURVATURE_ATOMS = ("square_88", "minus_product_79", "minus_h_product_78")
CROSS_ATOMS = (
    "twice_cross_88", "minus_base7_direction9", "minus_direction7_base9",
    "minus_h_base7_direction8", "minus_h_direction7_base8",
)
DERIVATIVE_ATOMS = (
    "twice_c8_v8", "minus_v7_c9", "minus_c7_v9",
    "minus_h_v7_c8", "minus_h_c7_v8",
)
DERIVATIVE_CROSS_ATOMS = (
    "twice_c0_8_v1_8", "twice_c1_8_v0_8",
    "minus_v0_7_c1_9", "minus_v1_7_c0_9",
    "minus_c0_7_v1_9", "minus_c1_7_v0_9",
    "minus_h_v0_7_c1_8", "minus_h_v1_7_c0_8",
    "minus_h_c0_7_v1_8", "minus_h_c1_7_v0_8",
)
FAILURE_CONTEXT: dict = {}


def piece_names_for_degree(degree):
    names = ["base"]
    if degree <= 16:
        names.append("linear")
    if degree <= 15:
        names.append("direction")
    return names


def atoms_for(piece, part):
    if part in ("margin_degree_d", "margin_degree_d_minus_1"):
        return CROSS_ATOMS if piece == "linear" else CURVATURE_ATOMS
    assert part == "derivative"
    return DERIVATIVE_CROSS_ATOMS if piece == "linear" else DERIVATIVE_ATOMS


def components_for_degree(degree):
    result = []
    for piece in piece_names_for_degree(degree):
        for part in ("margin_degree_d", "margin_degree_d_minus_1", "derivative"):
            result.extend((piece, part, atom) for atom in atoms_for(piece, part))
    return result


def construct_atom(common, piece, part, atom, degree, exponent, peak, limit):
    zero, h = common["zero_raw"], common["raw"]["h"]
    capacity = common["capacity"]
    c0, c1 = common["base_c"], common["direction_c"]
    v0, v1 = common["base_v"], common["direction_v"]

    def product(left, left_rank, right, right_rank, target_degree=degree):
        return outer_product(
            (left[0][left_rank], left[1][left_rank]),
            (right[0][right_rank], right[1][right_rank]),
            target_degree, exponent, zero,
        )

    if part in ("margin_degree_d", "margin_degree_d_minus_1"):
        target_degree = degree if part == "margin_degree_d" else degree - 1
        prefactor = capacity.c[0] if part == "margin_degree_d" else capacity.c[1]
        if piece in ("base", "direction"):
            row = c0 if piece == "base" else c1
            if atom == "square_88":
                polynomial = prefactor * product(row, 8, row, 8, target_degree)
            elif atom == "minus_product_79":
                polynomial = -prefactor * product(row, 7, row, 9, target_degree)
            else:
                assert atom == "minus_h_product_78"
                polynomial = -prefactor * h * product(row, 7, row, 8, target_degree)
        else:
            assert piece == "linear" and atom in CROSS_ATOMS
            if atom == "twice_cross_88":
                polynomial = 2 * prefactor * product(c0, 8, c1, 8, target_degree)
            elif atom == "minus_base7_direction9":
                polynomial = -prefactor * product(c0, 7, c1, 9, target_degree)
            elif atom == "minus_direction7_base9":
                polynomial = -prefactor * product(c1, 7, c0, 9, target_degree)
            elif atom == "minus_h_base7_direction8":
                polynomial = -prefactor * h * product(c0, 7, c1, 8, target_degree)
            else:
                polynomial = -prefactor * h * product(c1, 7, c0, 8, target_degree)
    elif piece in ("base", "direction"):
        c = c0 if piece == "base" else c1
        v = v0 if piece == "base" else v1
        assert atom in DERIVATIVE_ATOMS
        if atom == "twice_c8_v8":
            polynomial = 2 * h * product(c, 8, v, 8)
        elif atom == "minus_v7_c9":
            polynomial = -h * product(v, 7, c, 9)
        elif atom == "minus_c7_v9":
            polynomial = -h * product(c, 7, v, 9)
        elif atom == "minus_h_v7_c8":
            polynomial = -h * h * product(v, 7, c, 8)
        else:
            polynomial = -h * h * product(c, 7, v, 8)
    else:
        assert piece == "linear" and part == "derivative"
        if atom == "twice_c0_8_v1_8":
            polynomial = 2 * h * product(c0, 8, v1, 8)
        elif atom == "twice_c1_8_v0_8":
            polynomial = 2 * h * product(c1, 8, v0, 8)
        elif atom == "minus_v0_7_c1_9":
            polynomial = -h * product(v0, 7, c1, 9)
        elif atom == "minus_v1_7_c0_9":
            polynomial = -h * product(v1, 7, c0, 9)
        elif atom == "minus_c0_7_v1_9":
            polynomial = -h * product(c0, 7, v1, 9)
        elif atom == "minus_c1_7_v0_9":
            polynomial = -h * product(c1, 7, v0, 9)
        elif atom == "minus_h_v0_7_c1_8":
            polynomial = -h * h * product(v0, 7, c1, 8)
        elif atom == "minus_h_v1_7_c0_8":
            polynomial = -h * h * product(v1, 7, c0, 8)
        elif atom == "minus_h_c0_7_v1_8":
            polynomial = -h * h * product(c0, 7, v1, 8)
        else:
            assert atom == "minus_h_c1_7_v0_8"
            polynomial = -h * h * product(c1, 7, v0, 8)
    guard(f"strong atom {piece} {part} {atom} outer {exponent}", peak, limit)
    return polynomial


def stream_atom(
    output_dir, date_tag, face, face_token, degree, exponent,
    piece, part, atom, polynomial, source_hash, formal_hash, stream_hash,
    peak, limit,
):
    indices = {item: REDUCED_NAMES.index(item) for item in REDUCED_NAMES}
    group_a = tuple(indices[item] for item in GROUP_A)
    group_b_without_outer = tuple(indices[item] for item in GROUP_B if item != "b0")
    prefix = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_strong_{piece}_{part}_{atom}_"
        f"grade_{degree}_b0_exp_{exponent}_atom_stream_agent_{date_tag}"
    )
    stream_path = Path(str(prefix) + ".txt.gz")
    temporary = stream_path.with_suffix(stream_path.suffix + ".tmp")
    ordered = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    previous = None
    with temporary.open("wb") as raw_file:
        with gzip.GzipFile(
            filename="", fileobj=raw_file, mode="wb", compresslevel=1, mtime=0
        ) as compressed:
            for term_index in range(len(polynomial)):
                reduced = tuple(map(int, polynomial.monomial(term_index)))
                key = (-sum(reduced), tuple(reversed(reduced)))
                if previous is not None:
                    assert previous <= key
                previous = key
                if not any(reduced[index] for index in group_a):
                    continue
                if exponent == 0 and not any(reduced[index] for index in group_b_without_outer):
                    continue
                assert sum(reduced[len(BASE_NAMES):]) + exponent == degree
                coefficient = int(polynomial.coefficient(term_index))
                full = reduced + (exponent,)
                encoded = (",".join(map(str, full)) + ":" + str(coefficient) + "\n").encode()
                compressed.write(encoded)
                ordered.update(encoded)
                terms += 1
                minimum = coefficient if minimum is None else min(minimum, coefficient)
                if coefficient < 0:
                    negative += 1
                    if first_negative is None:
                        first_negative = {"monomial": list(full), "coefficient": coefficient}
                if terms % 100_000 == 0:
                    guard(f"write strong atom {piece} {part} {atom} outer {exponent} {terms}", peak, limit)
    os.replace(temporary, stream_path)
    coefficient_stream_hash = sha256(stream_path)
    manifest_path = Path(str(prefix) + "_manifest.json")
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-atom-coefficient-stream-agent-v1",
        "status": "PASS_EXACT_STRONG_ATOM_STREAM_COMPLETE",
        "face": list(face), "bridge_corner": [2 * face[0], 2 * face[1]],
        "total_ordinary_slack_degree": degree,
        "outer_variable": "b0", "outer_exponent": exponent,
        "piece": piece, "part": part, "atom": atom,
        "component": f"{piece}_{part}_{atom}",
        "unfiltered_atom_terms": len(polynomial),
        "mixed_support_atom_terms": terms,
        "negative_atom_terms": negative,
        "minimum_atom_coefficient": minimum,
        "first_negative_atom_coefficient": first_negative,
        "ordered_atom_coefficient_sha256": ordered.hexdigest().upper(),
        "coefficient_stream": str(stream_path.resolve()),
        "coefficient_stream_sha256": coefficient_stream_hash,
        "coefficient_stream_encoding": "deterministic-gzip-mtime0-lines-full-exponents-colon-integer",
        "hard_private_memory_limit_bytes": limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source_hash,
        "formal_dependency_sha256": formal_hash,
        "stream_dependency_sha256": stream_hash,
    }
    manifest_hash = atomic_json(manifest_path, payload)
    print("ATOM", piece, part, atom, "OUTER", exponent, "TERMS", terms, "MANIFEST", manifest_hash, flush=True)
    return {
        "piece": piece, "part": part, "atom": atom,
        "component": f"{piece}_{part}_{atom}", "outer_exponent": exponent,
        "manifest": str(manifest_path.resolve()), "manifest_sha256": manifest_hash,
        "stream": str(stream_path.resolve()), "stream_sha256": coefficient_stream_hash,
        "unfiltered_atom_terms": len(polynomial), "mixed_support_atom_terms": terms,
    }


def merge_row_chunk(
    output_dir, date_tag, face, face_token, degree, exponent, label,
    records, scales, state, source_hash, formal_hash, stream_hash, peak, limit,
):
    cursors = [StreamCursor(record, scale) for record, scale in zip(records, scales)]
    heap = []
    for index, cursor in enumerate(cursors):
        item = cursor.advance()
        if item is not None:
            key, monomial, coefficient = item
            heapq.heappush(heap, (key, index, monomial, coefficient))
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    try:
        while heap:
            key, index, monomial, coefficient = heapq.heappop(heap)
            combined, consumed = coefficient, [index]
            while heap and heap[0][0] == key:
                _, other, other_monomial, other_coefficient = heapq.heappop(heap)
                assert other_monomial == monomial
                combined += other_coefficient
                consumed.append(other)
            for item_index in consumed:
                item = cursors[item_index].advance()
                if item is not None:
                    next_key, next_monomial, next_coefficient = item
                    heapq.heappush(heap, (next_key, item_index, next_monomial, next_coefficient))
            if combined == 0:
                continue
            encoded = (",".join(map(str, monomial)) + ":" + str(combined) + "\n").encode()
            digest.update(encoded)
            state["overall"].update(encoded)
            terms += 1
            minimum = combined if minimum is None else min(minimum, combined)
            if combined < 0:
                negative += 1
                if first_negative is None:
                    first_negative = {"monomial": list(monomial), "coefficient": combined}
            if terms % 100_000 == 0:
                guard(f"merge {label} outer {exponent} {terms}", peak, limit)
    finally:
        for cursor in cursors:
            cursor.close()
    stat = {
        "outer_exponent": exponent, "mixed_support_terms": terms,
        "negative_terms": negative, "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
    }
    prefix = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_{label}_grade_{degree}_"
        f"outer_factored_strong_atom_stream_agent_{date_tag}"
    )
    chunk_path = Path(str(prefix) + f"_b0_exp_{exponent}.json")
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-atom-stream-row-chunk-agent-v1",
        "status": "PASS_EXACT_STRONG_ATOM_STREAM_ROW_CHUNK_NONNEGATIVE" if negative == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT",
        "face": list(face), "bridge_corner": [2 * face[0], 2 * face[1]],
        "family": "strong", "auxiliary": label,
        "total_ordinary_slack_degree": degree,
        "outer_variable": "b0", "outer_exponent": exponent,
        "outer_support_bound": [0, 2], "variables": list(FULL_NAMES),
        "group_A": list(GROUP_A), "group_B": list(GROUP_B),
        "component_scales": dict(zip(state["component_names"], scales)),
        "atom_stream_manifests": [
            {"path": record["manifest"], "sha256": record["manifest_sha256"]}
            for record in records
        ],
        "chunk": stat, "global_row_assembly": False,
        "source_sha256": source_hash,
        "formal_dependency_sha256": formal_hash,
        "stream_dependency_sha256": stream_hash,
    }
    chunk_hash = atomic_json(chunk_path, payload)
    state["chunks"].append({
        "outer_exponent": exponent, "path": str(chunk_path.resolve()),
        "sha256": chunk_hash, "mixed_support_terms": terms,
        "negative_terms": negative, "minimum": minimum,
        "ordered_coefficient_sha256": stat["ordered_coefficient_sha256"],
    })
    state["terms"] += terms
    state["negative"] += negative
    for index, record in enumerate(records):
        state["component_lengths"][index] += record["unfiltered_atom_terms"]
        state["component_raw_terms_visited"][index] += record["unfiltered_atom_terms"]
        state["component_mixed_terms_visited"][index] += record["mixed_support_atom_terms"]
    print(label, "CHUNK", exponent, "TERMS", terms, "NEGATIVE", negative, flush=True)


def finish_row_manifest(output_dir, date_tag, face, face_token, degree, state, source_hash, formal_hash, stream_hash, peak, limit):
    label = state["label"]
    prefix = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_{label}_grade_{degree}_"
        f"outer_factored_strong_atom_stream_agent_{date_tag}"
    )
    path = Path(str(prefix) + "_manifest.json")
    result = {
        "chunks": state["chunks"], "mixed_support_terms": state["terms"],
        "negative_terms": state["negative"],
        "ordered_coefficient_sha256": state["overall"].hexdigest().upper(),
        "component_names": state["component_names"],
        "component_scales": state["component_scales"],
        "component_lengths": state["component_lengths"],
        "component_raw_terms_visited": state["component_raw_terms_visited"],
        "component_mixed_terms_visited": state["component_mixed_terms_visited"],
    }
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-atom-stream-row-manifest-agent-v1",
        "status": "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_FACTORED_STRONG_ATOM_STREAM_CHUNKS_NONNEGATIVE" if state["negative"] == 0 else "FAIL_NEGATIVE_MIXED_CROSS_COEFFICIENT",
        "face": list(face), "bridge_corner": [2 * face[0], 2 * face[1]],
        "family": "strong", "auxiliary": label,
        "total_ordinary_slack_degree": degree,
        "outer_variable": "b0", "outer_exponent_range": [0, 2],
        "global_row_assembly": False, "one_atom_live_at_a_time": True,
        "hard_private_memory_limit_bytes": limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "result": result, "source_sha256": source_hash,
        "formal_dependency_sha256": formal_hash,
        "stream_dependency_sha256": stream_hash,
    }
    manifest_hash = atomic_json(path, payload)
    print(label, "MANIFEST", manifest_hash, flush=True)
    return {
        "family": "strong", "auxiliary": label,
        "manifest": str(path.resolve()), "manifest_sha256": manifest_hash,
        "mixed_support_terms": state["terms"], "negative_terms": state["negative"],
        "ordered_coefficient_sha256": result["ordered_coefficient_sha256"],
    }


def update_job(path, face, degree, completed, source_hash, formal_hash, stream_hash, peak, limit, final=False):
    labels = ["strong_middle_times_4", "strong_far"]
    done = [item["auxiliary"] for item in completed]
    missing = [label for label in labels if label not in done]
    return atomic_json(path, {
        "schema": "rank8-low-low-a23-mixed-cross-strong-atom-stream-job-agent-v1",
        "status": "PASS_COMPLETE_STRONG_FACE_GRADE_ATOM_STREAM_ROWS" if final and not missing and all(item["negative_terms"] == 0 for item in completed) else "CHECKPOINT_INCOMPLETE_STRONG_FACE_GRADE_ATOM_STREAM",
        "face": list(face), "bridge_corner": [2 * face[0], 2 * face[1]],
        "total_ordinary_slack_degree": degree,
        "expected_rows": labels, "completed_rows": completed, "missing_rows": missing,
        "one_atom_live_at_a_time": True,
        "hard_private_memory_limit_bytes": limit,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": source_hash,
        "formal_dependency_sha256": formal_hash,
        "stream_dependency_sha256": stream_hash,
    })


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--output-directory", default=".")
    parser.add_argument("--date-tag", default="20260823")
    parser.add_argument("--hard-private-limit-bytes", type=int, default=DEFAULT_PRIVATE_LIMIT)
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    face_token = args.face.replace(",", "")
    output_dir = Path(args.output_directory).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    here = Path(__file__).resolve().parent
    source_hash = sha256(Path(__file__))
    formal_hash = sha256(here / FORMAL_DEPENDENCY)
    stream_hash = sha256(here / STREAM_DEPENDENCY)
    peak = [0]
    job_path = output_dir / (
        f"rank8_low_low_a23_mixed_cross_face_{face_token}_strong_grade_{args.degree}_"
        f"outer_factored_atom_stream_job_agent_{args.date_tag}.json"
    )
    FAILURE_CONTEXT.update({"job": job_path, "face": face, "degree": args.degree, "peak": peak, "limit": args.hard_private_limit_bytes})
    completed = []
    update_job(job_path, face, args.degree, completed, source_hash, formal_hash, stream_hash, peak, args.hard_private_limit_bytes)
    common = build_split_common(face, args.degree, peak, args.hard_private_limit_bytes)
    components = components_for_degree(args.degree)
    middle_components = [item for item in components if item[0] in ("base", "linear")]
    states = {
        "strong_middle_times_4": new_row_state(
            "strong_middle_times_4",
            ["_".join(item) for item in middle_components],
            [4 if item[0] == "base" else 2 for item in middle_components],
        ),
        "strong_far": new_row_state(
            "strong_far", ["_".join(item) for item in components], [1] * len(components),
        ),
    }
    for exponent in range(3):
        records = []
        for piece, part, atom in components:
            polynomial = construct_atom(common, piece, part, atom, args.degree, exponent, peak, args.hard_private_limit_bytes)
            records.append(stream_atom(
                output_dir, args.date_tag, face, face_token, args.degree, exponent,
                piece, part, atom, polynomial, source_hash, formal_hash, stream_hash,
                peak, args.hard_private_limit_bytes,
            ))
            del polynomial
            gc.collect()
            guard(f"strong atom {piece} {part} {atom} outer {exponent} released", peak, args.hard_private_limit_bytes)
        middle_records = [record for record in records if record["piece"] in ("base", "linear")]
        middle_scales = [4 if record["piece"] == "base" else 2 for record in middle_records]
        merge_row_chunk(
            output_dir, args.date_tag, face, face_token, args.degree, exponent,
            "strong_middle_times_4", middle_records, middle_scales,
            states["strong_middle_times_4"], source_hash, formal_hash, stream_hash,
            peak, args.hard_private_limit_bytes,
        )
        merge_row_chunk(
            output_dir, args.date_tag, face, face_token, args.degree, exponent,
            "strong_far", records, [1] * len(records), states["strong_far"],
            source_hash, formal_hash, stream_hash, peak, args.hard_private_limit_bytes,
        )
    for label in ("strong_middle_times_4", "strong_far"):
        completed.append(finish_row_manifest(
            output_dir, args.date_tag, face, face_token, args.degree, states[label],
            source_hash, formal_hash, stream_hash, peak, args.hard_private_limit_bytes,
        ))
        update_job(job_path, face, args.degree, completed, source_hash, formal_hash, stream_hash, peak, args.hard_private_limit_bytes)
    job_hash = update_job(job_path, face, args.degree, completed, source_hash, formal_hash, stream_hash, peak, args.hard_private_limit_bytes, final=True)
    print("JOB", job_path, job_hash, flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        if FAILURE_CONTEXT:
            path = FAILURE_CONTEXT["job"]
            prior = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
            current = private_bytes()
            atomic_json(path, {
                **prior, "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD",
                "failure": {"type": type(error).__name__, "message": str(error)},
                "private_bytes_at_failure": current,
                "observed_peak_private_bytes_at_checkpoints": max(FAILURE_CONTEXT["peak"][0], current),
            })
        raise
