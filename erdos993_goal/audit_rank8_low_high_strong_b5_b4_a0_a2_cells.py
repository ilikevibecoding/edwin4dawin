#!/usr/bin/env python3
"""Independent structural/key audit of the 3,168-cell strong-b5 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FILES = {
    "probe_rank8_low_high_strong_b5_b4_a0_a2_cell.py":
        "D3D0BD450D9C1BC171F9BA60D055D23883A3BF1F295FB4B9D8EC4E9544CC2BF0",
    "verify_rank8_low_high_strong_b5_b4_a0_a2_cells.py":
        "B8662E4167A6ABF401E29D74D4D753858ED14A39DEA51ED083BDCC83C5B06C59",
    "rank8_low_high_strong_b5_b4_a0_a2_cells_exact_20260820.json":
        "E89F08432FBE629B89B3537DFF8AE00AE1805BB14DBBA279EAC5D37046D69744",
    "rank8_low_high_strong_b4_a0_a2_cells_exact_20260820.json":
        "0523B65E9345939887DB77F32EE5C41CAC4F142E9C5F4235701616E999B593AE",
    "rank8_low_high_strong_b4_a0_a2_cells_independent_audit_exact_20260820.json":
        "4DE3A98041321E29FDB2E0DA24B16C4AB477923FAFD091EEA5C2B17642D88103",
}
PRIMARY = ROOT / "rank8_low_high_strong_b5_b4_a0_a2_cells_exact_20260820.json"
REPORT = ROOT / "rank8_low_high_strong_b5_b4_a0_a2_cells_independent_audit_exact_20260821.json"
EXPECTED_TERMS = {
    1: 93_334_481,
    2: 53_005_805,
    3: 28_829_744,
    4: 15_020_331,
    5: 7_430_624,
    6: 3_468_845,
    7: 1_506_708,
    8: 598_633,
    9: 210_878,
    10: 62_700,
    11: 14_190,
    12: 1_892,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def main() -> None:
    if REPORT.exists():
        REPORT.unlink()
    for name, expected in FILES.items():
        assert (ROOT / name).is_file(), name
        assert sha256(ROOT / name) == expected, name

    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["schema"] == "rank8-low-high-strong-b5-b4-a0-a2-cells-v1"
    assert primary["status"] == "PASS_EXACT_STRONG_B3_B4_B5_FULL_LEFT_COEFFICIENT_EXTENSION"
    assert primary["source_sha256"] == FILES[
        "verify_rank8_low_high_strong_b5_b4_a0_a2_cells.py"]

    rows = primary["rows"]
    expected_keys = [(b5, b4, a0, a2)
                     for b5 in range(1, 13)
                     for b4 in range(11)
                     for a0 in range(3)
                     for a2 in range(8)]
    actual_keys = [(row["b5_exponent"], row["b4_exponent"],
                    row["a0_exponent"], row["a2_exponent"])
                   for row in rows]
    assert actual_keys == expected_keys
    assert len(actual_keys) == len(set(actual_keys)) == 3_168

    zero_cells = 0
    aggregates = []
    for b5 in range(1, 13):
        block = [row for row in rows if row["b5_exponent"] == b5]
        assert len(block) == 264
        for row in block:
            assert row["negative"] == 0
            assert row["first_negative"] is None
            if row["terms"]:
                assert 0 < row["minimum"] <= row["maximum"]
            else:
                zero_cells += 1
                assert row["minimum"] is None and row["maximum"] is None
        terms = sum(row["terms"] for row in block)
        assert terms == EXPECTED_TERMS[b5]
        aggregates.append({"b5_exponent": b5, "terms": terms})

    # Independent support derivation: b5 occurs in right ratios 0..5, so a
    # quadratic direct-H expression has b5 degree at most 12.  The existing
    # b4 degree is at most 10.  On the left, a0 occurs at most quadratically;
    # a2 has degree at most six in the margin/derivative and the capacity C=A2
    # adds one final degree.
    support = {
        "b5_max": 12,
        "b4_max": 10,
        "a0_max": 2,
        "a2_margin_or_derivative_max": 6,
        "a2_capacity_margin_max": 7,
    }
    aggregate = sum(EXPECTED_TERMS.values())
    assert aggregate == 203_484_831
    assert primary["aggregate_terms"] == aggregate
    assert primary["aggregate_negative"] == 0
    assert primary["ordered_cells"] == 3_168
    assert primary["pinned_inputs"] == {
        "probe_rank8_low_high_strong_b5_b4_a0_a2_cell.py": FILES[
            "probe_rank8_low_high_strong_b5_b4_a0_a2_cell.py"],
        "rank8_low_high_strong_b4_a0_a2_cells_exact_20260820.json": FILES[
            "rank8_low_high_strong_b4_a0_a2_cells_exact_20260820.json"],
        "rank8_low_high_strong_b4_a0_a2_cells_independent_audit_exact_20260820.json": FILES[
            "rank8_low_high_strong_b4_a0_a2_cells_independent_audit_exact_20260820.json"],
    }

    payload = {
        "schema": "rank8-low-high-strong-b5-b4-a0-a2-independent-audit-v1",
        "status": "PASS_INDEPENDENT_STRUCTURAL_KEY_AUDIT_STRONG_B3_B4_B5_EXTENSION",
        "pinned_inputs": FILES,
        "expected_keys": 3_168,
        "unique_keys": 3_168,
        "zero_cells": zero_cells,
        "aggregate_terms": aggregate,
        "aggregate_negative": 0,
        "exponent_aggregates": aggregates,
        "independent_degree_support": support,
        "scope_warning": (
            "This independently audits the no-gap degree split, immutable b4 "
            "base, and every exact b5 cell result; it does not regenerate all "
            "203,484,831 coefficients with a second polynomial engine."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
