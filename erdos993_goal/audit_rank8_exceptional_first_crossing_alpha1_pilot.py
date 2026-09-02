#!/usr/bin/env python3
"""Independent closed-form audit of the rank-eight alpha1 crossing pilot."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_exceptional_first_crossing_alpha1_pilot_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha1_pilot_audit_exact_20260820.json"
SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha1_exact.py"
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q8(polynomial: tuple[int, ...]) -> int:
    return (
        16 * polynomial[8] * polynomial[8]
        - polynomial[7] * polynomial[8]
        - 18 * polynomial[7] * polynomial[9]
    )


def coefficient(rank: int, second_type_multiplicity: int) -> int:
    """Coefficient of (1+x)^(14-m) (1+2x)^m, independently."""
    m = second_type_multiplicity
    return sum(
        math.comb(14 - m, rank - index) * math.comb(m, index) * 2**index
        for index in range(max(0, rank - (14 - m)), min(rank, m) + 1)
    )


def main() -> int:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_PILOT"
    assert report["scope"]["certified_alpha_split"] == {
        "source": 13,
        "terminal": 1,
        "total": 14,
    }
    assert report["scope"]["workers"] == 1
    assert report["resources"]["peak_private_bytes"] < 512 * 1024**2
    assert report["hashes"] == {
        JETS.name: digest(JETS),
        CLASSIFICATION.name: digest(CLASSIFICATION),
        SOURCE.name: digest(SOURCE),
    }

    independent_rows = []
    for multiplicity in range(15):
        polynomial = tuple(coefficient(rank, multiplicity) for rank in range(10))
        independent_rows.append((multiplicity, polynomial, q8(polynomial)))

    reported_rows = report["pilot"]["rows"]
    assert len(reported_rows) == 15
    for reported, (multiplicity, polynomial, value) in zip(
        reported_rows, independent_rows, strict=True
    ):
        assert reported["alpha1_second_type_multiplicity"] == multiplicity
        assert tuple(reported["product_i0_through_i9"]) == polynomial
        assert reported["Q8"] == value
        assert reported["source_alpha"] == 13
        assert reported["terminal_alpha"] == 1
        assert reported["total_alpha"] == 14

    values = [value for _, _, value in independent_rows]
    assert min(values) == report["pilot"]["minimum_Q8"] == 10_306_296
    assert max(values) == report["pilot"]["maximum_Q8"] == 1_013_150_121_984
    assert report["pilot"]["negative_Q8"] == sum(value < 0 for value in values) == 0
    assert report["pilot"]["zero_Q8"] == sum(value == 0 for value in values) == 0
    assert report["pilot"]["distinct_crossing_jets"] == 15
    assert report["pilot"]["ordered_covering_checks"] == 15
    assert report["pilot"]["partial_state_counts_by_alpha"] == {
        str(alpha): alpha + 1 for alpha in range(14)
    }

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha1-pilot-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_PILOT_AUDIT",
        "method": (
            "independently expand (1+x)^(14-m)(1+2x)^m for every 0<=m<=14, "
            "retain i0..i9, recompute literal Q8, and compare every reported row"
        ),
        "certified_alpha_split": {"source": 13, "terminal": 1, "total": 14},
        "checks": 15,
        "negative_Q8": 0,
        "zero_Q8": 0,
        "minimum_Q8": min(values),
        "maximum_Q8": max(values),
        "scope_warning": (
            "This audit covers only the alpha1 pilot and does not certify the "
            "remaining terminal-alpha bands 2 through 9."
        ),
        "hashes": {
            REPORT.name: digest(REPORT),
            SOURCE.name: digest(SOURCE),
            JETS.name: digest(JETS),
            CLASSIFICATION.name: digest(CLASSIFICATION),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
