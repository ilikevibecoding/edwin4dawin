#!/usr/bin/env python3
"""Assemble the exact all-parent theorem for the h+k=2 g1 diagonal."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_diagonal2_all_parent_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_DIAGONAL2_ALL_PARENT_ROOT"
CELLS = ((0, 2), (1, 1), (2, 0))

DEPENDENCIES = {
    "prove_iso_n5_g1_internal_ordinary_diagonal2_large_order_root.py":
        "66270072D0BF8F34E7ADC4102A47F3DE0CE00D6430F4B91108CB6CE76C3D9CA6",
    "iso_n5_g1_internal_ordinary_diagonal2_large_order_exact_root_20260830.json":
        "DF6E8F06A46C6208E0C6493C9F000EB6944637D33157B6503E4564179B610F7D",
    "prove_iso_n5_g1_internal_ordinary_low6_finite_all_parent_root.py":
        "2D1E7EE9C92A2F75CAD47325508A0D5D2F60352F22A23D0F7652F9D0938BD19B",
    "iso_n5_g1_internal_ordinary_low6_finite_all_parent_exact_root_20260830.json":
        "E9563D5C3EE7D6C24D101CB4C1736913DDCBC68311CEB2451C6725B834380906",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in DEPENDENCIES}
    assert actual == DEPENDENCIES
    large = json.loads(
        (HERE / "iso_n5_g1_internal_ordinary_diagonal2_large_order_exact_root_20260830.json")
        .read_text(encoding="utf-8")
    )
    finite = json.loads(
        (HERE / "iso_n5_g1_internal_ordinary_low6_finite_all_parent_exact_root_20260830.json")
        .read_text(encoding="utf-8")
    )
    assert large["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_DIAGONAL2_LARGE_ORDER_ROOT"
    assert finite["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW6_FINITE_ALL_PARENT_ROOT"
    assert large["cutoff_A_order"] == 10
    assert large["blend_theta"] == "1/2"
    assert large["cells"] == [list(index) for index in CELLS]
    assert large["proved_cells_total"] == 6
    assert large["aggregate_Bernstein_controls"] == 70_200
    assert finite["A_orders_covered"] == [0, 9]
    assert all(list(index) in finite["cells"] for index in CELLS)
    assert finite["negative_values"] == 0
    assert finite["exact_cell_checks"] == 752_580
    assert finite["ordered_mark_pairs"] == 125_430
    minima = [
        Fraction(row["minimum_power_coefficient"])
        for face in large["faces"] for row in face["cells"]
    ]
    assert min(minima) == Fraction(2, 3)

    report = {
        "marker": MARKER,
        "cells": [list(index) for index in CELLS],
        "coverage": {
            "finite": "all parent forests and ordered distinct marks with |A|=0..9",
            "large": "all induced-forest parent data with |A|>=10 on both mark faces",
        },
        "finite_certificate": {
            "ordered_mark_pairs": finite["ordered_mark_pairs"],
            "exact_checks_all_six_low_cells": finite["exact_cell_checks"],
            "negative_values": finite["negative_values"],
            "ordered_stream_sha256": finite["ordered_stream_sha256"],
        },
        "large_certificate": {
            "cutoff_A_order": large["cutoff_A_order"],
            "blend_theta": large["blend_theta"],
            "Bernstein_controls": large["aggregate_Bernstein_controls"],
            "minimum_power_coefficient": str(min(minima)),
        },
        "dependencies_sha256": DEPENDENCIES,
        "status": "exact all-parent theorem for every h+k=2 cell",
        "scope": (
            "Internal-spine ordinary-parent g1, ell=8+h with h,k>=0, and "
            "only the three Newton cells h+k=2.  The h+k<=1 cells, small ell, "
            "other modes, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "cells": report["cells"],
        "coverage": report["coverage"],
        "finite_certificate": report["finite_certificate"],
        "large_certificate": report["large_certificate"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
