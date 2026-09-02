#!/usr/bin/env python3
"""Independent exact audit for a multidegree mixed-cross family job.

The producer grades by exact base degree and forms three aggregate pieces.
This auditor does neither: it uses the independently implemented formal
(ordinary-slack degree, b0 exponent) arithmetic, expands one natural bilinear
atom at a time, writes only temporary sorted coefficient streams, and performs
an external exact merge for both rows.  The producer is never imported.

Only the final audit report is durable.  Temporary atom streams are removed
after their outer slice has been replayed against the producer's hash-pinned
chunk.  Any exception emits a fail-closed report.
"""

from __future__ import annotations

import argparse
import gc
import gzip
import hashlib
import json
import os
import tempfile
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
    guard,
    private_bytes,
    sha256,
)
from audit_rank8_low_low_a23_mixed_cross_curvature_outer_factored_atom_stream_agent import (
    components_for_degree as curvature_components,
    construct_atom as construct_curvature_atom,
)
from audit_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent import (
    components_for_degree as strong_components,
    construct_atom as construct_strong_atom,
)


HERE = Path(__file__).resolve().parent
PRODUCER = (
    "probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent.py",
    "DEE5BEAB8D84051998C377E98174D319FC6F6FD39EF4923FD47978621F169342",
)
DEPENDENCIES = {
    "audit_rank8_low_low_a23_mixed_cross_outer_factored_formal_agent.py":
        "BE63A33CEA2B7079775BC5277791DAC724A22954B9F8F6CF2795C94413ED62C8",
    "audit_rank8_low_low_a23_mixed_cross_curvature_outer_factored_atom_stream_agent.py":
        "BCFFC810D6D3BA1126291B151148DFAE19F7857F3D25AA0E4FFA03CC7A66CC91",
    "audit_rank8_low_low_a23_mixed_cross_strong_outer_factored_atom_stream_agent.py":
        "89E7C481D169ACE01DC101F4B068BF4A117AF502AE2F97870D0E84DDC834DD2A",
    "probe_rank8_low_low_a23_mixed_cross_truncated_agent.py":
        "994FE4213EFA3E72B77952111D30FD541FF8340D64155301B16D191900AB192C",
}
FACES = (("01", (0, 1)), ("10", (1, 0)))
FAMILY_MAXIMUM = {"curvature": 16, "strong": 17}
FAILURE_CONTEXT: dict = {}


def term_key(monomial: tuple[int, ...]) -> tuple:
    return (-sum(monomial), tuple(reversed(monomial)))


def component_name(component: tuple[str, ...]) -> str:
    return "__".join(component)


def piece_name(component: tuple[str, ...]) -> str:
    return component[0]


def components_and_constructor(family: str, degree: int):
    if family == "curvature":
        return curvature_components(degree), construct_curvature_atom
    return strong_components(degree), construct_strong_atom


def write_atom_stream(
    polynomial,
    component: tuple[str, ...],
    outer: int,
    degree: int,
    path: Path,
    peak: list[int],
    limit: int,
) -> dict:
    indices = {name: REDUCED_NAMES.index(name) for name in REDUCED_NAMES}
    group_a = tuple(indices[name] for name in GROUP_A)
    group_b = tuple(indices[name] for name in GROUP_B if name != "b0")
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = None
    first_negative = None
    previous = None
    with gzip.open(path, "wb", compresslevel=1) as stream:
        for index in range(len(polynomial)):
            reduced = tuple(map(int, polynomial.monomial(index)))
            key = term_key(reduced)
            if previous is not None:
                assert previous <= key
            previous = key
            if not any(reduced[position] for position in group_a):
                continue
            if outer == 0 and not any(reduced[position] for position in group_b):
                continue
            assert sum(reduced[len(BASE_NAMES):]) + outer == degree
            coefficient = int(polynomial.coefficient(index))
            full = reduced + (outer,)
            encoded = (
                ",".join(map(str, full)) + ":" + str(coefficient) + "\n"
            ).encode()
            stream.write(encoded)
            digest.update(encoded)
            terms += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative += 1
                if first_negative is None:
                    first_negative = {
                        "monomial": list(full), "coefficient": coefficient,
                    }
            if terms % 100_000 == 0:
                guard(
                    f"temporary atom {component_name(component)} outer{outer} terms{terms}",
                    peak, limit,
                )
    return {
        "component": list(component),
        "piece": piece_name(component),
        "outer_exponent": outer,
        "unfiltered_polynomial_terms": len(polynomial),
        "mixed_support_atom_terms": terms,
        "negative_atom_terms": negative,
        "minimum_atom_coefficient": minimum,
        "first_negative_atom_coefficient": first_negative,
        "ordered_atom_coefficient_sha256": digest.hexdigest().upper(),
        "temporary_stream": str(path),
        "temporary_stream_sha256": sha256(path),
    }


class Cursor:
    def __init__(self, record: dict, scale: int):
        self.raw = Path(record["temporary_stream"]).open("rb")
        self.stream = gzip.GzipFile(fileobj=self.raw, mode="rb")
        self.scale = scale
        self.previous = None

    def close(self) -> None:
        self.stream.close()
        self.raw.close()

    def advance(self):
        line = self.stream.readline()
        if not line:
            return None
        encoded_monomial, encoded_coefficient = line.rstrip(b"\n").rsplit(b":", 1)
        monomial = tuple(map(int, encoded_monomial.split(b",")))
        key = term_key(monomial)
        if self.previous is not None:
            assert self.previous <= key
        self.previous = key
        return key, monomial, self.scale * int(encoded_coefficient)


def row_records_and_scales(family: str, label: str, records: list[dict]):
    if label == f"{family}_middle_times_4":
        selected = [record for record in records if record["piece"] in ("base", "linear")]
        scales = [4 if record["piece"] == "base" else 2 for record in selected]
        return selected, scales
    assert label == f"{family}_far"
    return records, [1] * len(records)


def replay_row_chunk(
    records: list[dict],
    scales: list[int],
    expected: dict,
    complete_digest,
    peak: list[int],
    limit: int,
) -> dict:
    cursors = [Cursor(record, scale) for record, scale in zip(records, scales)]
    current = [cursor.advance() for cursor in cursors]
    digest = hashlib.sha256()
    terms = negative = 0
    minimum = None
    first_negative = None
    try:
        while any(item is not None for item in current):
            smallest = min(item[0] for item in current if item is not None)
            active = [
                index for index, item in enumerate(current)
                if item is not None and item[0] == smallest
            ]
            monomial = current[active[0]][1]
            coefficient = 0
            for index in active:
                assert current[index][1] == monomial
                coefficient += current[index][2]
                current[index] = cursors[index].advance()
            if coefficient == 0:
                continue
            encoded = (
                ",".join(map(str, monomial)) + ":" + str(coefficient) + "\n"
            ).encode()
            digest.update(encoded)
            complete_digest.update(encoded)
            terms += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative += 1
                if first_negative is None:
                    first_negative = {
                        "monomial": list(monomial), "coefficient": coefficient,
                    }
            if terms % 100_000 == 0:
                guard(f"independent temporary external merge terms{terms}", peak, limit)
    finally:
        for cursor in cursors:
            cursor.close()
    replay = {
        "outer_exponent": expected["outer_exponent"],
        "mixed_support_terms": terms,
        "negative_terms": negative,
        "minimum": minimum,
        "first_negative": first_negative,
        "ordered_coefficient_sha256": digest.hexdigest().upper(),
    }
    expected_stats = expected["chunk"]
    for name in (
        "outer_exponent", "mixed_support_terms", "negative_terms", "minimum",
        "first_negative", "ordered_coefficient_sha256",
    ):
        assert replay[name] == expected_stats[name], (
            name, replay[name], expected_stats[name]
        )
    return replay


def load_cell(job_cells: dict, token: str, family: str, label: str, degree: int):
    cell = job_cells[(token, label)]
    manifest_path = Path(cell["manifest"]).resolve()
    assert sha256(manifest_path) == cell["manifest_sha256"]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["status"] == "PASS_EXACT_MIXED_CROSS_ROW_GRADE_OUTER_CHUNKS_NONNEGATIVE"
    assert manifest["face"] == ([0, 1] if token == "01" else [1, 0])
    assert manifest["family"] == family
    assert manifest["auxiliary"] == label
    assert manifest["total_ordinary_slack_degree"] == degree
    assert manifest["exact_base_degree"] == FAMILY_MAXIMUM[family] - degree
    assert manifest["source_sha256"] == PRODUCER[1]
    assert manifest["result"]["negative_terms"] == cell["negative_terms"] == 0
    assert manifest["result"]["ordered_coefficient_sha256"] == cell["ordered_coefficient_sha256"]
    chunks = []
    for record in manifest["result"]["chunks"]:
        path = Path(record["path"]).resolve()
        assert sha256(path) == record["sha256"]
        payload = json.loads(path.read_text(encoding="utf-8"))
        assert payload["source_sha256"] == PRODUCER[1]
        chunks.append(payload)
    assert [chunk["outer_exponent"] for chunk in chunks] == [0, 1, 2]
    return cell, manifest, chunks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--family", choices=("curvature", "strong"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--producer-job", required=True)
    parser.add_argument("--expected-producer-job-sha256", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--scratch-directory")
    parser.add_argument(
        "--hard-private-limit-bytes", type=int,
        default=max(DEFAULT_PRIVATE_LIMIT, 3_000_000_000),
    )
    args = parser.parse_args()
    maximum = FAMILY_MAXIMUM[args.family]
    assert args.degree <= maximum
    output = Path(args.output).resolve()
    scratch = (
        Path(args.scratch_directory).resolve()
        if args.scratch_directory else output.parent
    )
    scratch.mkdir(parents=True, exist_ok=True)
    peak = [0]
    FAILURE_CONTEXT.update(
        output=output, family=args.family, degree=args.degree,
        peak=peak, limit=args.hard_private_limit_bytes,
    )
    assert sha256(HERE / PRODUCER[0]) == PRODUCER[1]
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    job_path = Path(args.producer_job).resolve()
    expected_job_hash = args.expected_producer_job_sha256.upper()
    assert sha256(job_path) == expected_job_hash
    job = json.loads(job_path.read_text(encoding="utf-8"))
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE"
    assert job["family"] == args.family
    assert job["total_ordinary_slack_degree"] == args.degree
    assert job["exact_base_degree"] == maximum - args.degree
    assert job["source_sha256"] == PRODUCER[1]
    assert job["canonical_scope"]["faces_separate"] is True
    job_cells = {
        (cell["face_token"], cell["auxiliary"]): cell
        for cell in job["completed_cells"]
    }
    expected_keys = {
        (token, label)
        for token, _ in FACES
        for label in (
            f"{args.family}_middle_times_4", f"{args.family}_far"
        )
    }
    assert set(job_cells) == expected_keys

    components, constructor = components_and_constructor(args.family, args.degree)
    audited_faces = []
    for token, face in FACES:
        FAILURE_CONTEXT["face_token"] = token
        labels = (f"{args.family}_middle_times_4", f"{args.family}_far")
        loaded = {
            label: load_cell(job_cells, token, args.family, label, args.degree)
            for label in labels
        }
        complete = {label: hashlib.sha256() for label in labels}
        row_replays = {label: [] for label in labels}
        atom_summaries = []
        common = build_formal_common(
            face, args.degree, peak, args.hard_private_limit_bytes
        )
        for outer in range(3):
            FAILURE_CONTEXT["outer_exponent"] = outer
            with tempfile.TemporaryDirectory(
                prefix=f"rank8_{args.family}_g{args.degree}_{token}_o{outer}_",
                dir=scratch,
            ) as temporary:
                records = []
                for component in components:
                    polynomial = constructor(
                        common, *component, args.degree, outer,
                        peak, args.hard_private_limit_bytes,
                    )
                    stream_path = Path(temporary) / (
                        component_name(component) + ".txt.gz"
                    )
                    record = write_atom_stream(
                        polynomial, component, outer, args.degree, stream_path,
                        peak, args.hard_private_limit_bytes,
                    )
                    records.append(record)
                    del polynomial
                    gc.collect()
                    guard(
                        f"released independent atom {component_name(component)} outer{outer}",
                        peak, args.hard_private_limit_bytes,
                    )
                for label in labels:
                    selected, scales = row_records_and_scales(
                        args.family, label, records
                    )
                    expected_chunk = loaded[label][2][outer]
                    replay = replay_row_chunk(
                        selected, scales, expected_chunk, complete[label], peak,
                        args.hard_private_limit_bytes,
                    )
                    row_replays[label].append(replay)
                atom_summaries.append({
                    "outer_exponent": outer,
                    "components": [
                        {key: value for key, value in record.items()
                         if not key.startswith("temporary_")}
                        for record in records
                    ],
                    "temporary_streams_removed_after_exact_merge": True,
                })
        cells = []
        for label in labels:
            cell, manifest, _ = loaded[label]
            assert complete[label].hexdigest().upper() == manifest["result"]["ordered_coefficient_sha256"]
            assert sum(item["mixed_support_terms"] for item in row_replays[label]) == manifest["result"]["mixed_support_terms"]
            assert sum(item["negative_terms"] for item in row_replays[label]) == 0
            cells.append({
                "face_token": token,
                "face": list(face),
                "auxiliary": label,
                "producer_manifest": cell["manifest"],
                "producer_manifest_sha256": cell["manifest_sha256"],
                "replayed_mixed_support_terms": manifest["result"]["mixed_support_terms"],
                "replayed_negative_terms": 0,
                "replayed_ordered_coefficient_sha256": complete[label].hexdigest().upper(),
                "chunks": row_replays[label],
            })
        audited_faces.append({
            "face_token": token,
            "face": list(face),
            "atom_summaries": atom_summaries,
            "cells": cells,
        })
        del common
        gc.collect()
        guard(f"released independent face {token}", peak, args.hard_private_limit_bytes)

    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-multidegree-family-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_FORMAL_TWO_GRADING_ATOM_EXTERNAL_MERGE_ALL_FOUR_CELLS_EXACT",
        "family": args.family,
        "total_ordinary_slack_degree": args.degree,
        "exact_base_degree_in_producer": maximum - args.degree,
        "producer_job": str(job_path),
        "producer_job_sha256": expected_job_hash,
        "producer_source": {"path": PRODUCER[0], "sha256": PRODUCER[1]},
        "audited_faces": audited_faces,
        "checks": {
            "producer_imported": False,
            "independent_grading": "formal_total_slack_degree_and_b0_exponent",
            "one_natural_bilinear_atom_live_at_a_time": True,
            "temporary_external_merge": True,
            "temporary_streams_removed": True,
            "both_oriented_faces_reconstructed_separately": True,
            "all_chunk_counts_signs_minima_witnesses_and_ordered_hashes_exact": True,
            "all_complete_ordered_row_hashes_exact": True,
        },
        "hard_private_memory_limit_bytes": args.hard_private_limit_bytes,
        "observed_peak_private_bytes_at_checkpoints": peak[0],
        "dependencies": [
            {"path": name, "sha256": expected}
            for name, expected in DEPENDENCIES.items()
        ],
        "source_sha256": sha256(Path(__file__)),
    }
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as error:
        if FAILURE_CONTEXT:
            output = FAILURE_CONTEXT["output"]
            current = private_bytes()
            atomic_json(output.with_suffix(output.suffix + ".failure.json"), {
                "schema": "rank8-low-low-a23-mixed-cross-multidegree-family-independent-audit-agent-v1",
                "status": "FAIL_CLOSED_EXCEPTION_OR_MEMORY_GUARD",
                "family": FAILURE_CONTEXT["family"],
                "total_ordinary_slack_degree": FAILURE_CONTEXT["degree"],
                "context": {
                    key: value for key, value in FAILURE_CONTEXT.items()
                    if key not in ("output", "peak", "limit")
                },
                "failure": {"type": type(error).__name__, "message": str(error)},
                "private_bytes_at_failure": current,
                "observed_peak_private_bytes_at_checkpoints": max(
                    FAILURE_CONTEXT["peak"][0], current
                ),
                "hard_private_memory_limit_bytes": FAILURE_CONTEXT["limit"],
                "source_sha256": sha256(Path(__file__)),
            })
        raise
