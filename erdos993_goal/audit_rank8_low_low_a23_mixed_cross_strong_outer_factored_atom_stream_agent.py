#!/usr/bin/env python3
"""Independent formal audit of ultra-low-memory strong atom streams."""

from __future__ import annotations

import argparse
import gc
import gzip
import hashlib
import json
from pathlib import Path

from probe_rank8_low_low_a23_mixed_cross_truncated_agent import BASE_NAMES, GROUP_A, GROUP_B
from audit_rank8_low_low_a23_mixed_cross_outer_factored_formal_agent import (
    DEFAULT_PRIVATE_LIMIT,
    REDUCED_NAMES,
    atomic_json,
    build_formal_common,
    coefficient_product,
    guard,
    private_bytes,
    sha256,
)
from audit_rank8_low_low_a23_mixed_cross_strong_outer_factored_subpiece_stream_agent import (
    Cursor,
    replay_row_chunk,
)


FORMAL_DEPENDENCY = "audit_rank8_low_low_a23_mixed_cross_outer_factored_formal_agent.py"
MERGE_DEPENDENCY = "audit_rank8_low_low_a23_mixed_cross_strong_outer_factored_subpiece_stream_agent.py"
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
        return coefficient_product(
            left[left_rank], right[right_rank], target_degree, exponent, zero
        )

    if part in ("margin_degree_d", "margin_degree_d_minus_1"):
        target_degree = degree if part == "margin_degree_d" else degree - 1
        prefactor = capacity.c[0][0] if part == "margin_degree_d" else capacity.c[1][0]
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
            assert atom == "minus_h_c7_v8"
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
    guard(f"formal strong atom {piece} {part} {atom} outer {exponent}", peak, limit)
    return polynomial


def audit_atom_stream(polynomial, manifest_record, face, degree, exponent, piece, part, atom, peak, limit):
    manifest_path = Path(manifest_record["path"]).resolve()
    assert sha256(manifest_path) == manifest_record["sha256"]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["status"] == "PASS_EXACT_STRONG_ATOM_STREAM_COMPLETE"
    assert manifest["face"] == face
    assert manifest["total_ordinary_slack_degree"] == degree
    assert manifest["outer_exponent"] == exponent
    assert (manifest["piece"], manifest["part"], manifest["atom"]) == (piece, part, atom)
    assert manifest["unfiltered_atom_terms"] == len(polynomial)
    stream_path = Path(manifest["coefficient_stream"]).resolve()
    assert sha256(stream_path) == manifest["coefficient_stream_sha256"]
    indices = {item: REDUCED_NAMES.index(item) for item in REDUCED_NAMES}
    a = tuple(indices[item] for item in GROUP_A)
    b = tuple(indices[item] for item in GROUP_B if item != "b0")
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    with gzip.open(stream_path, "rb") as saved:
        for term_index in range(len(polynomial)):
            reduced = tuple(map(int, polynomial.monomial(term_index)))
            if not any(reduced[index] for index in a):
                continue
            if exponent == 0 and not any(reduced[index] for index in b):
                continue
            assert sum(reduced[len(BASE_NAMES):]) + exponent == degree
            coefficient = int(polynomial.coefficient(term_index))
            full = reduced + (exponent,)
            encoded = (",".join(map(str, full)) + ":" + str(coefficient) + "\n").encode()
            assert saved.readline() == encoded
            digest.update(encoded)
            terms += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative += 1
                if first_negative is None:
                    first_negative = {"monomial": list(full), "coefficient": coefficient}
            if terms % 100_000 == 0:
                guard(f"formal strong atom replay {piece} {part} {atom} outer {exponent} {terms}", peak, limit)
        assert saved.readline() == b""
    assert terms == manifest["mixed_support_atom_terms"]
    assert negative == manifest["negative_atom_terms"]
    assert minimum == manifest["minimum_atom_coefficient"]
    assert first_negative == manifest["first_negative_atom_coefficient"]
    assert digest.hexdigest().upper() == manifest["ordered_atom_coefficient_sha256"]
    return {
        "piece": piece, "part": part, "atom": atom,
        "component": f"{piece}_{part}_{atom}", "outer_exponent": exponent,
        "manifest": str(manifest_path), "manifest_sha256": manifest_record["sha256"],
        "stream": str(stream_path), "stream_sha256": manifest["coefficient_stream_sha256"],
        "unfiltered_atom_terms": len(polynomial), "mixed_support_atom_terms": terms,
        "exact_coefficient_stream_match": True,
    }


def load_row(job_row, face, degree):
    path = Path(job_row["manifest"]).resolve()
    assert sha256(path) == job_row["manifest_sha256"]
    manifest = json.loads(path.read_text(encoding="utf-8"))
    assert manifest["face"] == face
    assert manifest["total_ordinary_slack_degree"] == degree
    assert manifest["result"]["negative_terms"] == 0
    chunks = []
    for record in manifest["result"]["chunks"]:
        chunk_path = Path(record["path"]).resolve()
        assert sha256(chunk_path) == record["sha256"]
        chunks.append(json.loads(chunk_path.read_text(encoding="utf-8")))
    return manifest, chunks


def complete_digest(audited_by_outer, label, peak, limit):
    complete = hashlib.sha256()
    for audited_outer in audited_by_outer:
        records = audited_outer["components"]
        if label == "strong_middle_times_4":
            records = [record for record in records if record["piece"] in ("base", "linear")]
            scales = [4 if record["piece"] == "base" else 2 for record in records]
        else:
            scales = [1] * len(records)
        cursors = [Cursor(record, scale) for record, scale in zip(records, scales)]
        current = [cursor.advance() for cursor in cursors]
        terms = 0
        try:
            while any(item is not None for item in current):
                smallest = min(item[0] for item in current if item is not None)
                active = [i for i, item in enumerate(current) if item is not None and item[0] == smallest]
                monomial = current[active[0]][1]
                coefficient = 0
                for i in active:
                    assert current[i][1] == monomial
                    coefficient += current[i][2]
                    current[i] = cursors[i].advance()
                if coefficient:
                    complete.update((",".join(map(str, monomial)) + ":" + str(coefficient) + "\n").encode())
                    terms += 1
                    if terms % 100_000 == 0:
                        guard(f"complete strong digest {label} {terms}", peak, limit)
        finally:
            for cursor in cursors:
                cursor.close()
    return complete.hexdigest().upper()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--strong-job", required=True)
    parser.add_argument("--expected-strong-job-sha256", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--hard-private-limit-bytes", type=int, default=DEFAULT_PRIVATE_LIMIT)
    args = parser.parse_args()
    face_tuple = tuple(map(int, args.face.split(",")))
    face = list(face_tuple)
    peak = [0]
    output = Path(args.output).resolve()
    FAILURE_CONTEXT.update({"output": output, "face": face, "degree": args.degree, "peak": peak, "limit": args.hard_private_limit_bytes})
    job_path = Path(args.strong_job).resolve()
    assert sha256(job_path) == args.expected_strong_job_sha256.upper()
    job = json.loads(job_path.read_text(encoding="utf-8"))
    assert job["status"] == "PASS_COMPLETE_STRONG_FACE_GRADE_ATOM_STREAM_ROWS"
    assert job["face"] == face and job["total_ordinary_slack_degree"] == args.degree
    rows = {item["auxiliary"]: item for item in job["completed_rows"]}
    assert list(rows) == ["strong_middle_times_4", "strong_far"]
    middle_manifest, middle_chunks = load_row(rows["strong_middle_times_4"], face, args.degree)
    far_manifest, far_chunks = load_row(rows["strong_far"], face, args.degree)
    common = build_formal_common(face_tuple, args.degree, peak, args.hard_private_limit_bytes)
    expected_components = components_for_degree(args.degree)
    audited_by_outer = []
    row_replays = {"strong_middle_times_4": [], "strong_far": []}
    for exponent in range(3):
        producer_records = far_chunks[exponent]["atom_stream_manifests"]
        assert len(producer_records) == len(expected_components)
        audited = []
        for (piece, part, atom), manifest_record in zip(expected_components, producer_records):
            polynomial = construct_atom(common, piece, part, atom, args.degree, exponent, peak, args.hard_private_limit_bytes)
            audited.append(audit_atom_stream(
                polynomial, manifest_record, face, args.degree, exponent,
                piece, part, atom, peak, args.hard_private_limit_bytes,
            ))
            del polynomial
            gc.collect()
            guard(f"formal strong atom {piece} {part} {atom} outer {exponent} released", peak, args.hard_private_limit_bytes)
        audited_by_outer.append({"outer_exponent": exponent, "components": audited})
        middle_records = [record for record in audited if record["piece"] in ("base", "linear")]
        middle_scales = [4 if record["piece"] == "base" else 2 for record in middle_records]
        row_replays["strong_middle_times_4"].append(replay_row_chunk(
            middle_records, middle_scales, middle_chunks[exponent], peak, args.hard_private_limit_bytes
        ))
        row_replays["strong_far"].append(replay_row_chunk(
            audited, [1] * len(audited), far_chunks[exponent], peak, args.hard_private_limit_bytes
        ))
    for label, manifest in (("strong_middle_times_4", middle_manifest), ("strong_far", far_manifest)):
        assert complete_digest(audited_by_outer, label, peak, args.hard_private_limit_bytes) == manifest["result"]["ordered_coefficient_sha256"]
        assert sum(item["mixed_support_terms"] for item in row_replays[label]) == manifest["result"]["mixed_support_terms"]
        assert sum(item["negative_terms"] for item in row_replays[label]) == manifest["result"]["negative_terms"] == 0
    here = Path(__file__).resolve().parent
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-outer-factored-atom-stream-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_FORMAL_ATOM_STREAM_AND_BOTH_STRONG_ROW_REPLAY",
        "face": face, "bridge_corner": [2 * face[0], 2 * face[1]],
        "total_ordinary_slack_degree": args.degree,
        "strong_job": str(job_path), "strong_job_sha256": args.expected_strong_job_sha256.upper(),
        "atom_stream_audit": audited_by_outer, "row_replays": row_replays,
        "replayed_negative_terms": {label: sum(item["negative_terms"] for item in replays) for label, replays in row_replays.items()},
        "imports_producer": False, "one_formal_atom_live_at_a_time": True,
        "hard_private_memory_limit_bytes": args.hard_private_limit_bytes,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": sha256(Path(__file__)),
        "formal_dependency_sha256": sha256(here / FORMAL_DEPENDENCY),
        "merge_dependency_sha256": sha256(here / MERGE_DEPENDENCY),
        "producer_source_sha256_from_job": job["source_sha256"],
    }
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        if FAILURE_CONTEXT:
            requested = FAILURE_CONTEXT["output"]
            current = private_bytes()
            atomic_json(requested.with_suffix(requested.suffix + ".failure.json"), {
                "schema": "rank8-low-low-a23-mixed-cross-strong-outer-factored-atom-stream-independent-audit-agent-v1",
                "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD",
                "face": FAILURE_CONTEXT["face"],
                "total_ordinary_slack_degree": FAILURE_CONTEXT["degree"],
                "failure": {"type": type(error).__name__, "message": str(error)},
                "private_bytes_at_failure": current,
                "observed_peak_private_bytes_at_checkpoints": max(FAILURE_CONTEXT["peak"][0], current),
                "source_sha256": sha256(Path(__file__)),
            })
        raise
