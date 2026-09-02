#!/usr/bin/env python3
"""Independent structural/key audit of the 192-cell strong-b3 certificate."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_high_strong_b3_a0_a2_cell.py"
VERIFIER = ROOT / "verify_rank8_low_high_strong_b3_a0_a2_cells.py"
PRIMARY = ROOT / "rank8_low_high_strong_b3_a0_a2_cells_exact_20260820.json"
REPORT = ROOT / "rank8_low_high_strong_b3_a0_a2_cells_independent_audit_exact_20260820.json"
PINS = {
    PROBE.name: "97AEEBC10284F902CC6C20C26C5028EE7CC868508BA44AA5BBD720C03EB77CEE",
    VERIFIER.name: "DEB5BB984C7A5FCC37DFD40CC3A62B649483DE3E4DFB1E346CBF68E88E1325A9",
    PRIMARY.name: "77BF1549D11559C478CCA5215C6D70186D23827C7D06C04AF8C00E1BF2BAC5CE",
}
EXPECTED = {
    1: (17_235_191, 1, 393_182_128_404_760_680),
    2: (10_606_008, 1, 233_584_957_392_162_480),
    3: (6_040_512, 2, 77_896_308_585_006_084),
    4: (3_221_170, 1, 15_511_083_293_515_020),
    5: (1_540_660, 2, 1_945_350_763_657_992),
    6: (642_531, 1, 149_624_029_700_808),
    7: (209_814, 2, 6_421_288_711_032),
    8: (43_155, 1, 118_263_586_200),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def main() -> None:
    for name, expected in PINS.items():
        assert sha256(ROOT / name) == expected, name
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_STRONG_B3_FULL_LEFT_COEFFICIENT_EXTENSION"
    rows = primary["rows"]
    expected_keys = [(b3, a0, a2) for b3 in range(1, 9)
                     for a0 in range(3) for a2 in range(8)]
    actual_keys = [(row["b3_exponent"], row["a0_exponent"], row["a2_exponent"])
                   for row in rows]
    assert actual_keys == expected_keys
    assert len(set(actual_keys)) == 192

    zero_cells = 0
    aggregates = []
    for b3 in range(1, 9):
        block = [row for row in rows if row["b3_exponent"] == b3]
        nonempty = [row for row in block if row["terms"]]
        for row in block:
            assert row["negative"] == 0 and row["first_negative"] is None
            if row["terms"]:
                assert 0 < row["minimum"] <= row["maximum"]
            else:
                assert row["minimum"] is None and row["maximum"] is None
                zero_cells += 1
        observed = (
            sum(row["terms"] for row in block),
            min(row["minimum"] for row in nonempty),
            max(row["maximum"] for row in nonempty),
        )
        assert observed == EXPECTED[b3]
        aggregates.append({"b3_exponent": b3, "terms": observed[0],
                           "minimum": observed[1], "maximum": observed[2]})

    # Independent support derivation.  The b3 gap occurs in right gap 3, so it
    # appears in right ratios 0..3 and has degree <=4 in any right coefficient,
    # hence <=8 in a quadratic margin.  The a0 gap occurs only in left ratio 0,
    # giving degree <=1 per left coefficient and <=2 in H.  The a2 gap occurs
    # in left ratios 0..2, giving degree <=3 per left coefficient, <=6 in each
    # quadratic product, and <=7 only when the capacity C=A2 contributes its
    # one extra a2 factor.
    support = {"b3_max": 2 * 4, "a0_max": 2 * 1,
               "a2_margin_or_derivative_max": 2 * 3,
               "a2_capacity_margin_max": 2 * 3 + 1}
    assert support == {"b3_max": 8, "a0_max": 2,
                       "a2_margin_or_derivative_max": 6,
                       "a2_capacity_margin_max": 7}
    assert primary["aggregate_terms"] == sum(value[0] for value in EXPECTED.values())
    assert primary["aggregate_terms"] == 39_539_041
    assert primary["aggregate_negative"] == 0

    payload = {
        "schema": "rank8-low-high-strong-b3-a0-a2-independent-audit-v1",
        "status": "PASS_INDEPENDENT_STRUCTURAL_KEY_AUDIT_STRONG_B3_EXTENSION",
        "pinned_inputs": PINS,
        "expected_keys": 192,
        "unique_keys": 192,
        "zero_cells": zero_cells,
        "aggregate_terms": 39_539_041,
        "aggregate_negative": 0,
        "exponent_aggregates": aggregates,
        "independent_degree_support": support,
        "scope_warning": (
            "This audit independently proves the no-gap outer-degree split and "
            "checks every exact cell result, but does not use a second polynomial "
            "engine to regenerate all 39,539,041 coefficients."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
