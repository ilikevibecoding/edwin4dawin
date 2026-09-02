#!/usr/bin/env python3
"""Fail-closed recovery audit for complete streams left by an interrupted shard.

This script deliberately does *not* claim to rerun the independent polynomial
reconstruction.  It treats every surviving gzip stream as untrusted input,
validates its complete canonical coefficient encoding, and independently merges
all natural-atom streams into both producer rows in one pass.  A successful
report is exact recovery evidence while the canonical fresh reconstruction
audit remains the final provenance certificate.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import heapq
import json
import os
from pathlib import Path

import audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_agent as base


HERE = Path(__file__).resolve().parent
BASE_AUDITOR = (
    "audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_agent.py",
    "A0FA1D4C66A17B7D1030E8B0908EF0C5A700C2D1DFD4E5A35EC6FDF31B7D5F9F",
)
ORIGINAL_SHARD_AUDITOR = (
    "audit_rank8_low_low_a23_mixed_cross_multidegree_family_independent_shard_root.py",
    "1D91B64A0526A32802CDC0F0226161199E68C5883E511EF20320802D54C17608",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def term_key(monomial: tuple[int, ...]) -> tuple:
    return (-sum(monomial), tuple(reversed(monomial)))


class ValidatingCursor:
    def __init__(
        self,
        path: Path,
        component: tuple[str, ...],
        outer: int,
        degree: int,
    ) -> None:
        self.path = path
        self.component = component
        self.piece = component[0]
        self.outer = outer
        self.degree = degree
        self.raw = path.open("rb")
        self.stream = gzip.GzipFile(fileobj=self.raw, mode="rb")
        self.previous = None
        self.digest = hashlib.sha256()
        self.terms = 0
        self.negative = 0
        self.minimum = None
        self.first_negative = None
        indices = {name: base.REDUCED_NAMES.index(name) for name in base.REDUCED_NAMES}
        self.group_a = tuple(indices[name] for name in base.GROUP_A)
        self.group_b = tuple(indices[name] for name in base.GROUP_B if name != "b0")

    def advance(self):
        line = self.stream.readline()
        if not line:
            return None
        assert line.endswith(b"\n")
        encoded_monomial, encoded_coefficient = line[:-1].rsplit(b":", 1)
        monomial = tuple(map(int, encoded_monomial.split(b",")))
        coefficient = int(encoded_coefficient)
        canonical = (
            ",".join(map(str, monomial)) + ":" + str(coefficient) + "\n"
        ).encode()
        assert canonical == line
        assert len(monomial) == len(base.REDUCED_NAMES) + 1
        reduced = monomial[:-1]
        assert monomial[-1] == self.outer
        assert sum(reduced[len(base.BASE_NAMES):]) + self.outer == self.degree
        assert any(reduced[position] for position in self.group_a)
        if self.outer == 0:
            assert any(reduced[position] for position in self.group_b)
        assert coefficient != 0
        key = term_key(monomial)
        if self.previous is not None:
            assert self.previous < key
        self.previous = key
        self.digest.update(line)
        self.terms += 1
        self.minimum = coefficient if self.minimum is None else min(self.minimum, coefficient)
        if coefficient < 0:
            self.negative += 1
            if self.first_negative is None:
                self.first_negative = {
                    "monomial": list(monomial),
                    "coefficient": coefficient,
                }
        return key, monomial, coefficient

    def close(self) -> None:
        self.stream.close()
        self.raw.close()

    def summary(self, compressed_sha256: str) -> dict:
        return {
            "component": list(self.component),
            "piece": self.piece,
            "outer_exponent": self.outer,
            "unfiltered_polynomial_terms": None,
            "unfiltered_polynomial_terms_unavailable_reason": (
                "interrupted process left only the post-filter canonical stream"
            ),
            "mixed_support_atom_terms": self.terms,
            "negative_atom_terms": self.negative,
            "minimum_atom_coefficient": self.minimum,
            "first_negative_atom_coefficient": self.first_negative,
            "ordered_atom_coefficient_sha256": self.digest.hexdigest().upper(),
            "compressed_stream_sha256": compressed_sha256,
        }


def empty_row(outer: int) -> dict:
    return {
        "outer_exponent": outer,
        "digest": hashlib.sha256(),
        "mixed_support_terms": 0,
        "negative_terms": 0,
        "minimum": None,
        "first_negative": None,
    }


def update_row(row: dict, monomial: tuple[int, ...], coefficient: int) -> None:
    if coefficient == 0:
        return
    encoded = (
        ",".join(map(str, monomial)) + ":" + str(coefficient) + "\n"
    ).encode()
    row["digest"].update(encoded)
    row["mixed_support_terms"] += 1
    row["minimum"] = (
        coefficient if row["minimum"] is None else min(row["minimum"], coefficient)
    )
    if coefficient < 0:
        row["negative_terms"] += 1
        if row["first_negative"] is None:
            row["first_negative"] = {
                "monomial": list(monomial),
                "coefficient": coefficient,
            }


def finish_row(row: dict) -> dict:
    return {
        "outer_exponent": row["outer_exponent"],
        "mixed_support_terms": row["mixed_support_terms"],
        "negative_terms": row["negative_terms"],
        "minimum": row["minimum"],
        "first_negative": row["first_negative"],
        "ordered_coefficient_sha256": row["digest"].hexdigest().upper(),
    }


def assert_expected(replay: dict, expected_payload: dict) -> None:
    assert expected_payload["outer_exponent"] == replay["outer_exponent"]
    expected = expected_payload["chunk"]
    for field in (
        "outer_exponent",
        "mixed_support_terms",
        "negative_terms",
        "minimum",
        "ordered_coefficient_sha256",
    ):
        assert replay[field] == expected[field], (field, replay[field], expected[field])
    assert replay.get("first_negative") == expected.get("first_negative")


def run(args) -> dict:
    assert sha256(HERE / BASE_AUDITOR[0]) == BASE_AUDITOR[1]
    assert sha256(HERE / ORIGINAL_SHARD_AUDITOR[0]) == ORIGINAL_SHARD_AUDITOR[1]
    assert sha256(HERE / base.PRODUCER[0]) == base.PRODUCER[1]
    for name, expected in base.DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    maximum = base.FAMILY_MAXIMUM[args.family]
    assert args.degree <= maximum
    job_path = Path(args.producer_job).resolve()
    job_hash = args.expected_producer_job_sha256.upper()
    assert sha256(job_path) == job_hash
    job = json.loads(job_path.read_text(encoding="utf-8"))
    assert job["status"] == "PASS_EXACT_DISTINCT_FACES_FAMILY_GRADE_ALL_REQUIRED_ROWS_NONNEGATIVE"
    assert job["family"] == args.family
    assert job["total_ordinary_slack_degree"] == args.degree
    assert job["exact_base_degree"] == maximum - args.degree
    assert job["source_sha256"] == base.PRODUCER[1]
    labels = (f"{args.family}_middle_times_4", f"{args.family}_far")
    job_cells = {
        (cell["face_token"], cell["auxiliary"]): cell
        for cell in job["completed_cells"]
    }
    assert set(job_cells) == {
        (token, label)
        for token, _ in base.FACES
        for label in labels
    }
    loaded = {
        label: base.load_cell(
            job_cells, args.face_token, args.family, label, args.degree
        )
        for label in labels
    }

    components, _ = base.components_and_constructor(args.family, args.degree)
    stream_directory = Path(args.stream_directory).resolve()
    expected_paths = {
        base.component_name(component) + ".txt.gz": component
        for component in components
    }
    actual_paths = {
        path.name: path
        for path in stream_directory.iterdir()
        if path.is_file()
    }
    assert set(actual_paths) == set(expected_paths), (
        sorted(set(expected_paths) - set(actual_paths)),
        sorted(set(actual_paths) - set(expected_paths)),
    )
    compressed_hashes = {
        name: sha256(actual_paths[name])
        for name in sorted(actual_paths)
    }

    cursors = [
        ValidatingCursor(
            actual_paths[base.component_name(component) + ".txt.gz"],
            component,
            args.outer_exponent,
            args.degree,
        )
        for component in components
    ]
    far = empty_row(args.outer_exponent)
    middle = empty_row(args.outer_exponent)
    heap = []
    try:
        for index, cursor in enumerate(cursors):
            item = cursor.advance()
            if item is not None:
                key, monomial, coefficient = item
                heapq.heappush(heap, (key, index, monomial, coefficient))
        while heap:
            key = heap[0][0]
            active = []
            while heap and heap[0][0] == key:
                active.append(heapq.heappop(heap))
            monomial = active[0][2]
            far_coefficient = 0
            middle_coefficient = 0
            for _, index, current_monomial, coefficient in active:
                assert current_monomial == monomial
                cursor = cursors[index]
                far_coefficient += coefficient
                if cursor.piece == "base":
                    middle_coefficient += 4 * coefficient
                elif cursor.piece == "linear":
                    middle_coefficient += 2 * coefficient
                else:
                    assert cursor.piece == "direction"
                item = cursor.advance()
                if item is not None:
                    next_key, next_monomial, next_coefficient = item
                    heapq.heappush(
                        heap,
                        (next_key, index, next_monomial, next_coefficient),
                    )
            update_row(far, monomial, far_coefficient)
            update_row(middle, monomial, middle_coefficient)
    finally:
        for cursor in cursors:
            cursor.close()

    replay_by_label = {
        f"{args.family}_middle_times_4": finish_row(middle),
        f"{args.family}_far": finish_row(far),
    }
    replays = []
    for label in labels:
        replay = replay_by_label[label]
        assert_expected(replay, loaded[label][2][args.outer_exponent])
        assert replay["negative_terms"] == 0
        replays.append({
            "auxiliary": label,
            "producer_manifest": loaded[label][0]["manifest"],
            "producer_manifest_sha256": loaded[label][0]["manifest_sha256"],
            "replay": replay,
        })

    atom_summaries = []
    stream_records = []
    for cursor in cursors:
        name = base.component_name(cursor.component) + ".txt.gz"
        atom_summaries.append(cursor.summary(compressed_hashes[name]))
        stream_records.append({
            "component": list(cursor.component),
            "path": str(actual_paths[name]),
            "compressed_sha256": compressed_hashes[name],
            "ordered_coefficient_sha256": cursor.digest.hexdigest().upper(),
        })

    return {
        "schema": (
            "rank8-low-low-a23-mixed-cross-multidegree-interrupted-stream-"
            "recovery-root-v1"
        ),
        "status": "PASS_EXACT_INTERRUPTED_STREAM_FACE_OUTER_RECOVERY_BOTH_ROWS",
        "family": args.family,
        "total_ordinary_slack_degree": args.degree,
        "exact_base_degree": maximum - args.degree,
        "face_token": args.face_token,
        "face": list(dict(base.FACES)[args.face_token]),
        "outer_exponent": args.outer_exponent,
        "producer_job": str(job_path),
        "producer_job_sha256": job_hash,
        "producer_source_sha256": base.PRODUCER[1],
        "stream_directory": str(stream_directory),
        "stream_records": stream_records,
        "replays": replays,
        "atom_summaries": atom_summaries,
        "checks": {
            "producer_imported": False,
            "exact_expected_component_filename_set": True,
            "all_gzip_crc_checks_reached_eof": True,
            "all_lines_canonical_and_strictly_sorted": True,
            "all_degree_face_outer_and_mixed_support_filters_exact": True,
            "all_atom_stream_counts_signs_minima_witnesses_and_hashes_rebuilt": True,
            "both_rows_merged_in_one_independent_pass": True,
            "both_rows_match_producer_counts_signs_minima_witnesses_and_ordered_hashes": True,
            "canonical_fresh_polynomial_reconstruction_executed": False,
            "does_not_replace_canonical_fresh_reconstruction_audit": True,
        },
        "provenance_boundary": (
            "The streams survived an interrupted execution of the hash-pinned original "
            "independent shard auditor, but this recovery run cannot cryptographically "
            "prove that execution history. It therefore validates the surviving streams "
            "and exact row merges without claiming a fresh polynomial reconstruction."
        ),
        "base_auditor_source": {"path": BASE_AUDITOR[0], "sha256": BASE_AUDITOR[1]},
        "original_shard_auditor_source": {
            "path": ORIGINAL_SHARD_AUDITOR[0],
            "sha256": ORIGINAL_SHARD_AUDITOR[1],
            "claimed_as_executed_by_recovery": False,
        },
        "source_sha256": sha256(Path(__file__).resolve()),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--family", choices=("curvature", "strong"), required=True)
    parser.add_argument("--degree", type=int, choices=range(2, 18), required=True)
    parser.add_argument("--face-token", choices=("01", "10"), required=True)
    parser.add_argument("--outer-exponent", type=int, choices=range(3), required=True)
    parser.add_argument("--producer-job", required=True)
    parser.add_argument("--expected-producer-job-sha256", required=True)
    parser.add_argument("--stream-directory", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    try:
        payload = run(args)
    except Exception as error:
        payload = {
            "schema": (
                "rank8-low-low-a23-mixed-cross-multidegree-interrupted-stream-"
                "recovery-root-v1"
            ),
            "status": "FAIL_CLOSED_INTERRUPTED_STREAM_RECOVERY",
            "parameters": vars(args),
            "error_type": type(error).__name__,
            "error": repr(error),
            "source_sha256": sha256(Path(__file__).resolve()),
        }
        atomic_json(output, payload)
        raise
    digest = atomic_json(output, payload)
    print("PASS", output, digest, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
