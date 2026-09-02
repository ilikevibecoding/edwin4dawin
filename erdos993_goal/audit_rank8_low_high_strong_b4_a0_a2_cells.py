#!/usr/bin/env python3
"""Independent structural/key audit of the 240-cell strong-b4 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FILES = {
    "probe_rank8_low_high_strong_b4_a0_a2_cell.py":
        "25E4837E27BBFD377495AF03B876AD049998B849A12F8A95AA447AF02F667E6D",
    "verify_rank8_low_high_strong_b4_a0_a2_cells.py":
        "D38DF9236763F0E1B4895B3A2180CB283127099E17658C20D37E9DF9B4A3AF83",
    "rank8_low_high_strong_b4_a0_a2_cells_exact_20260820.json":
        "0523B65E9345939887DB77F32EE5C41CAC4F142E9C5F4235701616E999B593AE",
    "rank8_low_high_strong_b3_a0_a2_cells_exact_20260820.json":
        "77BF1549D11559C478CCA5215C6D70186D23827C7D06C04AF8C00E1BF2BAC5CE",
    "rank8_low_high_strong_b3_a0_a2_cells_independent_audit_exact_20260820.json":
        "37C269AB5C0AFA36FAB61B7F02FA1F8718473FE1000CCBB8D0B1141BD043075C",
}
PRIMARY = ROOT / "rank8_low_high_strong_b4_a0_a2_cells_exact_20260820.json"
REPORT = ROOT / "rank8_low_high_strong_b4_a0_a2_cells_independent_audit_exact_20260820.json"
EXPECTED_TERMS = {
    1: 40_822_260, 2: 24_153_129, 3: 13_530_951, 4: 7_211_805,
    5: 3_588_497, 6: 1_649_230, 7: 677_233, 8: 237_973,
    9: 64_510, 10: 10_586,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def main() -> None:
    for name, expected in FILES.items():
        assert sha256(ROOT/name) == expected, name
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_STRONG_B3_B4_FULL_LEFT_COEFFICIENT_EXTENSION"
    rows = primary["rows"]
    expected_keys = [(b4, a0, a2) for b4 in range(1, 11)
                     for a0 in range(3) for a2 in range(8)]
    actual_keys = [(row["b4_exponent"], row["a0_exponent"], row["a2_exponent"])
                   for row in rows]
    assert actual_keys == expected_keys and len(set(actual_keys)) == 240

    zero_cells = 0
    aggregates = []
    for b4 in range(1, 11):
        block = [row for row in rows if row["b4_exponent"] == b4]
        assert len(block) == 24
        for row in block:
            assert row["negative"] == 0 and row["first_negative"] is None
            if row["terms"]:
                assert 0 < row["minimum"] <= row["maximum"]
            else:
                zero_cells += 1
                assert row["minimum"] is None and row["maximum"] is None
        terms = sum(row["terms"] for row in block)
        assert terms == EXPECTED_TERMS[b4]
        aggregates.append({"b4_exponent": b4, "terms": terms})

    # Independent support derivation: b4 occurs in right ratios 0..4, so each
    # right coefficient has b4 degree <=5 and each quadratic direct-H term has
    # degree <=10.  The left support derivation is unchanged: a0 <=2 and a2
    # <=6 in a quadratic product, with the capacity C=A2 adding one a2 degree.
    support = {"b4_max": 10, "a0_max": 2,
               "a2_margin_or_derivative_max": 6,
               "a2_capacity_margin_max": 7}
    assert sum(EXPECTED_TERMS.values()) == 91_946_174
    assert primary["aggregate_terms"] == 91_946_174
    assert primary["aggregate_negative"] == 0

    payload = {
        "schema": "rank8-low-high-strong-b4-a0-a2-independent-audit-v1",
        "status": "PASS_INDEPENDENT_STRUCTURAL_KEY_AUDIT_STRONG_B3_B4_EXTENSION",
        "pinned_inputs": FILES,
        "expected_keys": 240,
        "unique_keys": 240,
        "zero_cells": zero_cells,
        "aggregate_terms": 91_946_174,
        "aggregate_negative": 0,
        "exponent_aggregates": aggregates,
        "independent_degree_support": support,
        "scope_warning": (
            "This independently audits the no-gap degree split, the b3 base "
            "dependency, and every exact b4 cell result; it does not regenerate "
            "all 91,946,174 coefficients with a second polynomial engine."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
