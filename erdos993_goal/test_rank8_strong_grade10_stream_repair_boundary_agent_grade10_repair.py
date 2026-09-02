#!/usr/bin/env python3
"""Exercise the grade-10 stream repair's fail-closed trust boundary.

This is deliberately synthetic: it does not claim to reproduce the historical
FLINT event.  It proves that the repaired cursor accepts an accessor-only
decode discrepancy iff independent monomial lookup locates the indexed
coefficient at the homogeneity-corrected monomial, and rejects representative
polynomial corruption and validation failures.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_rank8_strong_grade10_homogeneous_stream_repair_agent_grade10_repair as repair


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_strong_grade10_stream_repair_boundary_test_agent_grade10_repair.json"
REPAIR_SOURCE = (
    "probe_rank8_strong_grade10_homogeneous_stream_repair_agent_grade10_repair.py",
    "8C8D8E5C622FCF395BDDE70BFC4874FE1AF115448CDB6283FD334DEBA948439E",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    encoded = (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode()
    temporary = Path(str(path) + ".tmp")
    temporary.write_bytes(encoded)
    temporary.replace(path)
    return hashlib.sha256(encoded).hexdigest().upper()


class FakePoly:
    def __init__(
        self,
        stored_terms: list[tuple[tuple[int, ...], int]],
        decoded_monomials: list[tuple[int, ...]] | None = None,
        coefficient_reads: list[list[int]] | None = None,
        evaluation_offset: int = 0,
    ):
        self.stored_terms = stored_terms
        self.decoded_monomials = decoded_monomials or [m for m, _ in stored_terms]
        self.coefficient_reads = coefficient_reads
        self.coefficient_read_positions = [0] * len(stored_terms)
        self.evaluation_offset = evaluation_offset
        self.lookup = {monomial: coefficient for monomial, coefficient in stored_terms}

    def __len__(self):
        return len(self.stored_terms)

    def monomial(self, index: int):
        return self.decoded_monomials[index]

    def coefficient(self, index: int):
        if self.coefficient_reads is None:
            return self.stored_terms[index][1]
        position = self.coefficient_read_positions[index]
        self.coefficient_read_positions[index] += 1
        return self.coefficient_reads[index][position]

    def __getitem__(self, monomial: tuple[int, ...]):
        return self.lookup.get(monomial, 0)

    def __call__(self, *values: int):
        total = 0
        for monomial, coefficient in self.stored_terms:
            term = coefficient
            for value, exponent in zip(values, monomial):
                term *= value**exponent
            total += term
        return total + self.evaluation_offset


def new_cursor(poly: FakePoly) -> repair.HomogeneousCursor:
    return repair.HomogeneousCursor(
        poly=poly, piece=0, outer=0, peak=[0], limit=10_000_000_000,
    )


def expect_assertion(name: str, action) -> dict:
    try:
        action()
    except AssertionError as error:
        return {
            "case": name,
            "expected": "AssertionError",
            "observed": type(error).__name__,
            "message": str(error),
            "passed": True,
        }
    raise AssertionError(f"{name} did not fail closed")


def drain_and_summarize(cursor: repair.HomogeneousCursor) -> dict:
    while cursor.advance() is not None:
        pass
    return cursor.summary()


def main() -> None:
    assert sha256(HERE / REPAIR_SOURCE[0]) == REPAIR_SOURCE[1]

    corrected = (4, 0, 2, 1, 0, 0, 2, 0, 2, 2, 0, 3, 0, 1)
    decoded_h_plus_32 = (36,) + corrected[1:]
    coefficient = 123456789

    decoded_only = new_cursor(FakePoly(
        stored_terms=[(corrected, coefficient)],
        decoded_monomials=[decoded_h_plus_32],
    ))
    decoded_only_summary = drain_and_summarize(decoded_only)
    assert decoded_only_summary["decoded_homogeneity_anomalies"] == 1
    anomaly = decoded_only_summary["first_decoded_anomalies"][0]
    assert anomaly["coefficient_lookups_at_raw_monomial"] == [0, 0, 0]
    assert anomaly["coefficient_lookups_at_corrected_monomial"] == [
        coefficient, coefficient, coefficient,
    ]

    cases = [{
        "case": "accessor_only_h_plus_32_with_independent_lookup_witness",
        "expected": "accepted",
        "observed": "accepted",
        "passed": True,
        "cursor_summary": decoded_only_summary,
    }]

    cases.append(expect_assertion(
        "genuinely_stored_h_plus_32_polynomial_term",
        lambda: new_cursor(FakePoly(
            stored_terms=[(decoded_h_plus_32, coefficient)],
        )).advance(),
    ))

    cases.append(expect_assertion(
        "unstable_indexed_coefficient_reads",
        lambda: new_cursor(FakePoly(
            stored_terms=[(corrected, coefficient)],
            coefficient_reads=[[coefficient, coefficient + 1, coefficient]],
        )).advance(),
    ))

    invalid_non_h = (0, 8, 0, 0, 0) + corrected[5:]
    cases.append(expect_assertion(
        "raw_non_h_base_exponent_out_of_bounds",
        lambda: new_cursor(FakePoly(
            stored_terms=[(invalid_non_h, coefficient)],
        )).advance(),
    ))

    first = corrected
    second = (3, 1, 2, 1, 0, 0, 2, 0, 2, 2, 0, 3, 0, 1)
    descending = sorted([first, second], key=repair.term_key, reverse=True)

    def nonmonotone_action():
        cursor = new_cursor(FakePoly(
            stored_terms=[(descending[0], 7), (descending[1], 11)],
        ))
        cursor.advance()
        cursor.advance()

    cases.append(expect_assertion(
        "residual_nonmonotone_corrected_stream", nonmonotone_action,
    ))

    def evaluation_mismatch_action():
        cursor = new_cursor(FakePoly(
            stored_terms=[(corrected, coefficient)], evaluation_offset=1,
        ))
        drain_and_summarize(cursor)

    cases.append(expect_assertion(
        "independent_direct_evaluation_mismatch", evaluation_mismatch_action,
    ))

    assert all(case["passed"] for case in cases)
    payload = {
        "schema": "rank8-strong-grade10-stream-repair-boundary-test-v1",
        "status": "PASS_FAIL_CLOSED_REPAIR_BOUNDARY_EXERCISED",
        "scope_note": (
            "Synthetic boundary test only; not a reproduction of the historical "
            "FLINT accessor event."
        ),
        "repair_source": {"path": REPAIR_SOURCE[0], "sha256": REPAIR_SOURCE[1]},
        "cases": cases,
        "source_sha256": sha256(Path(__file__)),
    }
    digest = atomic_json(OUTPUT, payload)
    print("BOUNDARY_TEST", OUTPUT, digest, payload["status"], flush=True)


if __name__ == "__main__":
    main()
