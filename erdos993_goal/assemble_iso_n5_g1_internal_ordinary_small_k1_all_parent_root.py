#!/usr/bin/env python3
"""Assemble the exact all-parent theorem for small-broom k-Newton index 1."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k1_all_parent_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K1_ALL_PARENT_ROOT"
CELLS = tuple((ell, 1) for ell in range(1, 8))

DEPENDENCIES = {
    "census_iso_n5_g1_internal_ordinary_small_all_parent_finite_root.py":
        "667E2560C0FC14D9E54249C9A79BC70EC22D3D46466737C375E7791086ACFACD",
    "iso_n5_g1_internal_ordinary_small_all_parent_finite_root_20260830.json":
        "6CF37C45B401E0BCB2A6B776EAE420F01C88A7AD626B7DE47D7A85764EA175DA",
    "prove_iso_n5_g1_internal_ordinary_small_k1_large_order_root.py":
        "56E9616E00862599C357E3804A1EEE995B44EF6E2E54E7250F3827AC8B6D4C52",
    "iso_n5_g1_internal_ordinary_small_k1_large_order_exact_root_20260830.json":
        "2AB7C606E6FF94670AAC6C5294796172F48620BDA88C6C4FA963C074F5139948",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in DEPENDENCIES}
    assert actual == DEPENDENCIES
    finite = json.loads(
        (HERE / "iso_n5_g1_internal_ordinary_small_all_parent_finite_root_20260830.json")
        .read_text(encoding="utf-8")
    )
    large = json.loads(
        (HERE / "iso_n5_g1_internal_ordinary_small_k1_large_order_exact_root_20260830.json")
        .read_text(encoding="utf-8")
    )

    assert finite["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_ALL_PARENT_FINITE_ROOT"
    assert finite["A_orders_covered"] == [0, 9]
    assert finite["small_lengths"] == [1, 7]
    assert finite["negative_values"] == 0
    assert finite["ordered_mark_pairs"] == 125_430
    assert finite["exact_cell_checks"] == 6_146_070
    assert set(CELLS) <= {tuple(cell) for cell in finite["cells"]}

    assert large["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K1_LARGE_ORDER_ROOT"
    assert large["cutoff"] == 10
    assert large["small_lengths"] == [1, 7]
    assert large["k_index"] == 1
    assert set(large["cell_weights"]) == {f"{ell},1" for ell in range(1, 8)}
    assert set(large["cell_weights"].values()) == {"3/4"}
    assert large["negative_power_coefficients"] == 0
    assert large["total_bernstein_controls"] == 544_320
    assert large["total_power_coefficients"] == 3_265_920
    assert Fraction(large["global_minimum_positive_power_coefficient"]) == Fraction(9, 80)

    report = {
        "marker": MARKER,
        "cells": [list(cell) for cell in CELLS],
        "coverage": {
            "finite": "all parent forests and ordered distinct marks with A-order 0..9",
            "large": "all parent forests and both parent-mark geometries with A-order at least 10",
        },
        "finite_certificate": {
            "ordered_mark_pairs": finite["ordered_mark_pairs"],
            "exact_cell_checks_in_shared_49_cell_census": finite["exact_cell_checks"],
            "negative_values": finite["negative_values"],
            "ordered_stream_sha256": finite["ordered_stream_sha256"],
        },
        "large_certificate": {
            "cutoff_A_order": large["cutoff"],
            "blend_theta": "3/4",
            "Bernstein_controls": large["total_bernstein_controls"],
            "power_coefficients": large["total_power_coefficients"],
            "minimum_positive_power_coefficient": large["global_minimum_positive_power_coefficient"],
        },
        "dependencies_sha256": DEPENDENCIES,
        "status": "exact all-parent theorem for every ell=1..7 at k-Newton index 1",
        "scope": (
            "Internal-spine/broom ordinary-parent g1, small broom lengths ell=1..7, "
            "all integer collision-leaf counts, all parent forests, and only k-Newton "
            "index 1. Index 0, the whole mode, other modes, and Erdos Problem 993 "
            "remain separate."
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
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
