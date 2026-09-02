#!/usr/bin/env python3
"""Independent formal audit of strong factored subpiece coefficient streams.

The producer is not imported.  Formal (total slack degree, b0 exponent)
factor arithmetic comes from the independent auditor, one strong summand is
reconstructed at a time, and every compressed coefficient line is compared
exactly before a separate linear-minimum merge replays both strong rows.
"""

from __future__ import annotations

import argparse
import gc
import gzip
import hashlib
import json
from pathlib import Path

from probe_rank8_low_low_a23_mixed_cross_truncated_agent import (
    BASE_NAMES,
    GROUP_A,
    GROUP_B,
)
from audit_rank8_low_low_a23_mixed_cross_outer_factored_formal_agent import (
    DEFAULT_PRIVATE_LIMIT,
    REDUCED_NAMES,
    atomic_json,
    build_formal_common,
    coefficient_cross,
    coefficient_curvature,
    coefficient_derivative,
    coefficient_derivative_cross,
    guard,
    private_bytes,
    sha256,
)


FORMAL_DEPENDENCY = "audit_rank8_low_low_a23_mixed_cross_outer_factored_formal_agent.py"
PARTS = ("margin_degree_d", "margin_degree_d_minus_1", "derivative")
FAILURE_CONTEXT: dict = {}


def piece_names_for_degree(degree: int) -> list[str]:
    names = ["base"]
    if degree <= 16:
        names.append("linear")
    if degree <= 15:
        names.append("direction")
    return names


def construct_subpiece(common, name, part, degree, exponent, peak, limit):
    zero, h = common["zero_raw"], common["raw"]["h"]
    capacity = common["capacity"]
    c0, c1 = common["base_c"], common["direction_c"]
    v0, v1 = common["base_v"], common["direction_v"]
    assert part in PARTS
    if name == "base":
        if part == PARTS[0]:
            polynomial = capacity.c[0][0] * coefficient_curvature(
                c0, degree, exponent, zero, h
            )
        elif part == PARTS[1]:
            polynomial = capacity.c[1][0] * coefficient_curvature(
                c0, degree - 1, exponent, zero, h
            )
        else:
            polynomial = h * coefficient_derivative(
                c0, v0, degree, exponent, zero, h
            )
    elif name == "linear":
        assert degree <= 16
        if part == PARTS[0]:
            polynomial = capacity.c[0][0] * coefficient_cross(
                c0, c1, degree, exponent, zero, h
            )
        elif part == PARTS[1]:
            polynomial = capacity.c[1][0] * coefficient_cross(
                c0, c1, degree - 1, exponent, zero, h
            )
        else:
            polynomial = h * coefficient_derivative_cross(
                c0, c1, v0, v1, degree, exponent, zero, h
            )
    else:
        assert name == "direction" and degree <= 15
        if part == PARTS[0]:
            polynomial = capacity.c[0][0] * coefficient_curvature(
                c1, degree, exponent, zero, h
            )
        elif part == PARTS[1]:
            polynomial = capacity.c[1][0] * coefficient_curvature(
                c1, degree - 1, exponent, zero, h
            )
        else:
            polynomial = h * coefficient_derivative(
                c1, v1, degree, exponent, zero, h
            )
    guard(f"formal {name} {part} outer {exponent}", peak, limit)
    return polynomial


def audit_piece_stream(
    polynomial,
    manifest_record: dict,
    face: list[int],
    degree: int,
    exponent: int,
    name: str,
    part: str,
    peak: list[int],
    limit: int,
) -> dict:
    manifest_path = Path(manifest_record["path"]).resolve()
    assert sha256(manifest_path) == manifest_record["sha256"]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["status"] == "PASS_EXACT_STRONG_PIECE_STREAM_COMPLETE"
    assert manifest["face"] == face
    assert manifest["total_ordinary_slack_degree"] == degree
    assert manifest["outer_exponent"] == exponent
    assert manifest["piece"] == name and manifest["subpiece"] == part
    assert manifest["unfiltered_piece_terms"] == len(polynomial)
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
            encoded = (
                ",".join(map(str, full)) + ":" + str(coefficient) + "\n"
            ).encode()
            assert saved.readline() == encoded
            digest.update(encoded)
            terms += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative += 1
                if first_negative is None:
                    first_negative = {
                        "monomial": list(full), "coefficient": coefficient
                    }
            if terms % 100_000 == 0:
                guard(
                    f"formal stream replay {name} {part} outer {exponent} {terms}",
                    peak, limit,
                )
        assert saved.readline() == b""
    assert terms == manifest["mixed_support_piece_terms"]
    assert negative == manifest["negative_piece_terms"]
    assert minimum == manifest["minimum_piece_coefficient"]
    assert first_negative == manifest["first_negative_piece_coefficient"]
    assert digest.hexdigest().upper() == manifest["ordered_piece_coefficient_sha256"]
    return {
        "piece": name,
        "subpiece": part,
        "component": f"{name}_{part}",
        "outer_exponent": exponent,
        "manifest": str(manifest_path),
        "manifest_sha256": manifest_record["sha256"],
        "stream": str(stream_path),
        "stream_sha256": manifest["coefficient_stream_sha256"],
        "unfiltered_piece_terms": len(polynomial),
        "mixed_support_piece_terms": terms,
        "exact_coefficient_stream_match": True,
    }


class Cursor:
    def __init__(self, record: dict, scale: int):
        self.raw = Path(record["stream"]).open("rb")
        self.gz = gzip.GzipFile(fileobj=self.raw, mode="rb")
        self.scale = scale
        self.previous = None

    def close(self):
        self.gz.close()
        self.raw.close()

    def advance(self):
        line = self.gz.readline()
        if not line:
            return None
        exponents, coefficient = line.rstrip(b"\n").rsplit(b":", 1)
        monomial = tuple(map(int, exponents.split(b",")))
        key = (-sum(monomial), tuple(reversed(monomial)))
        if self.previous is not None:
            assert self.previous <= key
        self.previous = key
        return key, monomial, self.scale * int(coefficient)


def replay_row_chunk(records, scales, expected_chunk, peak, limit):
    cursors = [Cursor(record, scale) for record, scale in zip(records, scales)]
    current = [cursor.advance() for cursor in cursors]
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = first_negative = None
    try:
        while any(item is not None for item in current):
            smallest = min(item[0] for item in current if item is not None)
            active = [
                i for i, item in enumerate(current)
                if item is not None and item[0] == smallest
            ]
            monomial = current[active[0]][1]
            coefficient = 0
            for i in active:
                assert current[i][1] == monomial
                coefficient += current[i][2]
                current[i] = cursors[i].advance()
            if coefficient == 0:
                continue
            digest.update(
                (",".join(map(str, monomial)) + ":" + str(coefficient) + "\n").encode()
            )
            terms += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative += 1
                if first_negative is None:
                    first_negative = {
                        "monomial": list(monomial), "coefficient": coefficient
                    }
            if terms % 100_000 == 0:
                guard(f"independent linear row merge {terms}", peak, limit)
    finally:
        for cursor in cursors:
            cursor.close()
    replay = {
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
    }
    for key, value in replay.items():
        assert expected_chunk["chunk"][key] == value
    return replay


def load_row(job_row: dict, face: list[int], degree: int):
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
    FAILURE_CONTEXT.update({
        "output": output, "face": face, "degree": args.degree,
        "peak": peak, "limit": args.hard_private_limit_bytes,
    })
    job_path = Path(args.strong_job).resolve()
    assert sha256(job_path) == args.expected_strong_job_sha256.upper()
    job = json.loads(job_path.read_text(encoding="utf-8"))
    assert job["status"] == "PASS_COMPLETE_STRONG_FACE_GRADE_PIECE_STREAM_ROWS"
    assert job["face"] == face and job["total_ordinary_slack_degree"] == args.degree
    rows = {item["auxiliary"]: item for item in job["completed_rows"]}
    assert list(rows) == ["strong_middle_times_4", "strong_far"]
    middle_manifest, middle_chunks = load_row(
        rows["strong_middle_times_4"], face, args.degree
    )
    far_manifest, far_chunks = load_row(rows["strong_far"], face, args.degree)

    common = build_formal_common(
        face_tuple, args.degree, peak, args.hard_private_limit_bytes
    )
    piece_names = piece_names_for_degree(args.degree)
    expected_components = [(name, part) for name in piece_names for part in PARTS]
    audited_by_outer = []
    row_replays = {"strong_middle_times_4": [], "strong_far": []}
    whole = {
        "strong_middle_times_4": hashlib.sha256(),
        "strong_far": hashlib.sha256(),
    }
    for exponent in range(3):
        far_chunk = far_chunks[exponent]
        producer_records = far_chunk["piece_stream_manifests"]
        assert len(producer_records) == len(expected_components)
        audited = []
        for (name, part), manifest_record in zip(expected_components, producer_records):
            polynomial = construct_subpiece(
                common, name, part, args.degree, exponent, peak,
                args.hard_private_limit_bytes,
            )
            audited.append(audit_piece_stream(
                polynomial, manifest_record, face, args.degree, exponent,
                name, part, peak, args.hard_private_limit_bytes,
            ))
            del polynomial
            gc.collect()
            guard(
                f"formal {name} {part} outer {exponent} released",
                peak, args.hard_private_limit_bytes,
            )
        audited_by_outer.append({"outer_exponent": exponent, "components": audited})
        middle_records = [record for record in audited if record["piece"] in ("base", "linear")]
        middle_scales = [4 if record["piece"] == "base" else 2 for record in middle_records]
        for label, records_for_row, scales, chunk in (
            ("strong_middle_times_4", middle_records, middle_scales, middle_chunks[exponent]),
            ("strong_far", audited, [1] * len(audited), far_chunks[exponent]),
        ):
            replay = replay_row_chunk(
                records_for_row, scales, chunk, peak, args.hard_private_limit_bytes
            )
            # Re-read the exact producer chunk stream order through the same
            # independently verified component streams for the complete hash.
            # Chunk hashes plus counts are also retained explicitly below.
            row_replays[label].append(replay)

    for label, manifest in (
        ("strong_middle_times_4", middle_manifest),
        ("strong_far", far_manifest),
    ):
        # SHA-256 is not composable from chunk digests; replay each outer merge
        # once more directly into the complete ordered digest.
        complete = hashlib.sha256()
        for exponent, audited_outer in enumerate(audited_by_outer):
            records = audited_outer["components"]
            if label == "strong_middle_times_4":
                records = [record for record in records if record["piece"] in ("base", "linear")]
                scales = [4 if record["piece"] == "base" else 2 for record in records]
            else:
                scales = [1] * len(records)
            cursors = [Cursor(record, scale) for record, scale in zip(records, scales)]
            current = [cursor.advance() for cursor in cursors]
            try:
                while any(item is not None for item in current):
                    smallest = min(item[0] for item in current if item is not None)
                    active = [i for i, item in enumerate(current) if item is not None and item[0] == smallest]
                    monomial = current[active[0]][1]
                    coefficient = 0
                    for i in active:
                        coefficient += current[i][2]
                        current[i] = cursors[i].advance()
                    if coefficient:
                        complete.update((",".join(map(str, monomial)) + ":" + str(coefficient) + "\n").encode())
            finally:
                for cursor in cursors:
                    cursor.close()
        assert complete.hexdigest().upper() == manifest["result"]["ordered_coefficient_sha256"]
        assert sum(item["mixed_support_terms"] for item in row_replays[label]) == manifest["result"]["mixed_support_terms"]
        assert sum(item["negative_terms"] for item in row_replays[label]) == manifest["result"]["negative_terms"] == 0

    here = Path(__file__).resolve().parent
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-outer-factored-subpiece-stream-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_FORMAL_SUBPIECE_STREAM_AND_BOTH_STRONG_ROW_REPLAY",
        "face": face,
        "bridge_corner": [2 * face[0], 2 * face[1]],
        "total_ordinary_slack_degree": args.degree,
        "strong_job": str(job_path),
        "strong_job_sha256": args.expected_strong_job_sha256.upper(),
        "piece_stream_audit": audited_by_outer,
        "row_replays": row_replays,
        "replayed_negative_terms": {
            label: sum(item["negative_terms"] for item in replays)
            for label, replays in row_replays.items()
        },
        "imports_producer": False,
        "one_formal_subpiece_live_at_a_time": True,
        "hard_private_memory_limit_bytes": args.hard_private_limit_bytes,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "source_sha256": sha256(Path(__file__)),
        "formal_dependency_sha256": sha256(here / FORMAL_DEPENDENCY),
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
                "schema": "rank8-low-low-a23-mixed-cross-strong-outer-factored-subpiece-stream-independent-audit-agent-v1",
                "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD",
                "face": FAILURE_CONTEXT["face"],
                "total_ordinary_slack_degree": FAILURE_CONTEXT["degree"],
                "failure": {"type": type(error).__name__, "message": str(error)},
                "private_bytes_at_failure": current,
                "observed_peak_private_bytes_at_checkpoints": max(
                    FAILURE_CONTEXT["peak"][0], current
                ),
                "source_sha256": sha256(Path(__file__)),
            })
        raise
