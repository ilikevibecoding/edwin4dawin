#!/usr/bin/env python3
"""Assemble the exact all-parent theorem for small-broom k-Newton index 2."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k2_all_parent_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K2_ALL_PARENT_ROOT"
CELLS = tuple((ell, 2) for ell in range(1, 8))

DEPENDENCIES = {
    "census_iso_n5_g1_internal_ordinary_small_all_parent_finite_root.py":
        "667E2560C0FC14D9E54249C9A79BC70EC22D3D46466737C375E7791086ACFACD",
    "iso_n5_g1_internal_ordinary_small_all_parent_finite_root_20260830.json":
        "6CF37C45B401E0BCB2A6B776EAE420F01C88A7AD626B7DE47D7A85764EA175DA",
    "prove_iso_n5_g1_internal_ordinary_small_k2_large_order_root.py":
        "1D577C19CBC64242F9C89FFFBD1483046D1D44E06DFB5DE2088292A09F9353F3",
    "iso_n5_g1_internal_ordinary_small_k2_large_order_exact_root_20260830.json":
        "D246E55813DAC7726E6204D96846F2BCD539EA0A476EA1111E7D3875BCC76BDD",
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
        (HERE / "iso_n5_g1_internal_ordinary_small_k2_large_order_exact_root_20260830.json")
        .read_text(encoding="utf-8")
    )

    assert finite["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_ALL_PARENT_FINITE_ROOT"
    assert finite["A_orders_covered"] == [0, 9]
    assert finite["small_lengths"] == [1, 7]
    assert finite["negative_values"] == 0
    assert finite["ordered_mark_pairs"] == 125_430
    assert finite["exact_cell_checks"] == 6_146_070
    assert set(CELLS) <= {tuple(cell) for cell in finite["cells"]}

    assert large["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K2_LARGE_ORDER_ROOT"
    assert large["cutoff_A_order"] == 10
    assert large["small_lengths"] == [1, 7]
    assert large["k_index"] == 2
    assert large["blend_theta"] == "1/2"
    assert large["cells"] == [list(cell) for cell in CELLS]
    assert large["proved_cells_total"] == 14
    assert large["aggregate_Bernstein_controls"] == 163_800
    minima = [
        Fraction(row["minimum_power_coefficient"])
        for face in large["faces"] for row in face["cells"]
    ]
    assert min(minima) == Fraction(2, 3)

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
            "cutoff_A_order": large["cutoff_A_order"],
            "blend_theta": large["blend_theta"],
            "Bernstein_controls": large["aggregate_Bernstein_controls"],
            "minimum_power_coefficient": str(min(minima)),
        },
        "dependencies_sha256": DEPENDENCIES,
        "status": "exact all-parent theorem for every ell=1..7 at k-Newton index 2",
        "scope": (
            "Internal-spine/broom ordinary-parent g1, small broom lengths ell=1..7, "
            "all integer collision-leaf counts, all parent forests, and only k-Newton "
            "index 2. Indices 0..1, the whole mode, other modes, and Erdos Problem 993 "
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
