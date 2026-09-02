#!/usr/bin/env python3
"""Assemble the exact all-parent theorem for the h+k=3 g1 diagonal."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_diagonal3_all_parent_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_DIAGONAL3_ALL_PARENT_ROOT"
CELLS = ((0, 3), (1, 2), (2, 1), (3, 0))

DEPENDENCIES = {
    "prove_iso_n5_g1_internal_ordinary_diagonal3_large_order_root.py":
        "238FA3929752605B4EC1E4C92C806BCC3FCF36118F682CEB8EFA922F00E4B910",
    "iso_n5_g1_internal_ordinary_diagonal3_large_order_exact_root_20260830.json":
        "08777DB02B8764199DFB23ACBDC5839E941564354ED13C936B41028E59B3DB3B",
    "prove_iso_n5_g1_internal_ordinary_diagonal3_finite_all_parent_root.py":
        "80FBBD3CA82963CB5E91DC65A6B63AEFDFDF7565B24FECAF6B03BF80B270931F",
    "iso_n5_g1_internal_ordinary_diagonal3_finite_all_parent_exact_root_20260830.json":
        "77F7DA5FBE9447490FA90C5AE6A3873EE3DCC4A18C14538B80DE07A35FE5E937",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in DEPENDENCIES}
    assert actual == DEPENDENCIES
    large = json.loads(
        (HERE / "iso_n5_g1_internal_ordinary_diagonal3_large_order_exact_root_20260830.json")
        .read_text(encoding="utf-8")
    )
    finite = json.loads(
        (HERE / "iso_n5_g1_internal_ordinary_diagonal3_finite_all_parent_exact_root_20260830.json")
        .read_text(encoding="utf-8")
    )
    assert large["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_DIAGONAL3_LARGE_ORDER_ROOT"
    assert finite["marker"] == "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_DIAGONAL3_FINITE_ALL_PARENT_ROOT"
    assert large["cutoff_A_order"] == 10
    assert large["cells_per_face"] == 4
    assert large["proved_cells_total"] == 8
    assert finite["A_orders_covered"] == [0, 9]
    assert finite["cells"] == [list(index) for index in CELLS]
    assert finite["negative_values"] == 0
    assert finite["exact_cell_checks"] == 501_720
    assert finite["ordered_mark_pairs"] == 125_430
    for row in large["adjacent_face"]:
        assert int(row["bernstein_controls"]) > 0
        assert not row["minimum_power_coefficient"].startswith("-")
    assert len(large["nonadjacent_correction"]) == 4

    report = {
        "marker": MARKER,
        "cells": [list(index) for index in CELLS],
        "coverage": {
            "finite": "all parent forests and ordered distinct marks with |A|=0..9",
            "large": "all induced-forest parent data with |A|>=10 on both mark faces",
        },
        "finite_certificate": {
            "ordered_mark_pairs": finite["ordered_mark_pairs"],
            "exact_cell_checks": finite["exact_cell_checks"],
            "negative_values": finite["negative_values"],
            "ordered_stream_sha256": finite["ordered_stream_sha256"],
        },
        "large_certificate": {
            "cutoff_A_order": large["cutoff_A_order"],
            "adjacent_Bernstein_controls": sum(
                row["bernstein_controls"] for row in large["adjacent_face"]
            ),
            "minimum_power_coefficient": str(min(
                Fraction(row["minimum_power_coefficient"])
                for row in large["adjacent_face"]
            )),
            "nonadjacent_positive_corrections": len(large["nonadjacent_correction"]),
        },
        "dependencies_sha256": DEPENDENCIES,
        "status": "exact all-parent theorem for every h+k=3 cell",
        "scope": (
            "Internal-spine ordinary-parent g1, ell=8+h with h,k>=0, and "
            "only the four Newton cells h+k=3.  Lower cells, small ell, other "
            "modes, and Erdos Problem 993 remain separate."
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
