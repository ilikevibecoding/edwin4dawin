#!/usr/bin/env python3
"""Fail-closed assembly of connected-nonadjacent M5 for distance>=3,r=0."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_connected_nonadjacent_m5_far_rzero_assembled_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_FAR_RZERO_G1_BERNSTEIN"
BRANCH_MARKER = "PASS_INDEPENDENT_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_ADAPTIVE_NATIVE_CONE_G1_BERNSTEIN"
PINS = {
    "derive_iso_n5_g1_connected_nonadjacent_m5_residual_g1_bernstein.py":
        "B1085A03641C188D57AA39BA7F59013F648C6C0C797925C0CD936B6CC77AE21E",
    "derive_iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_g1_bernstein.py":
        "5FD9F66D1D9D574A13FBF1CBE4D903CCE9721201A1BCE751674520780C0759D9",
    "probe_iso_n5_g1_connected_nonadjacent_m5_adaptive_cone_g1_bernstein.py":
        "F796C3D4A9DA03724472432391A91290899C7006E8EF1D5F25365C42EC069074",
    "audit_iso_n5_g1_connected_nonadjacent_m5_adaptive_native_cone_g1_bernstein.py":
        "617F77437A261F33E6A1E73ED240EB1816CCD8E0DCE5EFEA73EA39DF6B5278F6",
    "probe_iso_n5_g1_connected_nonadjacent_m5_s_finite_g1_bernstein.py":
        "2452D9FDEDC1D16BC06D3B3E0B15DA5C6E943010A79A07CAEA70BB4F4E8A14FC",
    "iso_n5_g1_connected_nonadjacent_m5_s_finite_probe_g1_bernstein_20260830.json":
        "B926B210096E0DA4A3AF57CBDBF47B6A791EF8EC9C549E108A61FD83920E2A75",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual_pins = {name: sha256(HERE / name) for name in PINS}
    assert actual_pins == PINS
    finite = json.loads((HERE / "iso_n5_g1_connected_nonadjacent_m5_s_finite_probe_g1_bernstein_20260830.json").read_text(encoding="utf-8"))
    assert finite["finite_scope"]["orders_A"] == [0, 12]
    assert finite["finite_scope"]["connected_nonadjacent_mark_cells"] == 748426
    assert finite["global"]["M5"]["negative"] == 0

    branches = []
    report_hashes = {}
    for sector in ("high", "low"):
        for endpoint in ("ll", "lh", "hh"):
            for order in (None, 0, 1, 2, 3, 4, 5, 6):
                label = "large" if order is None else str(order)
                name = (
                    "iso_n5_g1_connected_nonadjacent_m5_adaptive_native_audit_"
                    f"{sector}_far_zero_{label}_{endpoint}_g1_bernstein_20260830.json"
                )
                path = HERE / name
                data = json.loads(path.read_text(encoding="utf-8"))
                expected_branch = {
                    "sector": sector,
                    "distance": "far",
                    "mode": "zero",
                    "small_order": order,
                    "endpoint": endpoint,
                }
                assert data["marker"] == BRANCH_MARKER
                assert data["branch"] == expected_branch
                assert data["negative"] == 0
                assert data["dependencies_sha256"] == {
                    "probe_iso_n5_g1_connected_nonadjacent_m5_adaptive_cone_g1_bernstein.py": PINS[
                        "probe_iso_n5_g1_connected_nonadjacent_m5_adaptive_cone_g1_bernstein.py"
                    ],
                    "derive_iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_g1_bernstein.py": PINS[
                        "derive_iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_g1_bernstein.py"
                    ],
                }
                report_hashes[name] = sha256(path)
                branches.append({
                    "branch": expected_branch,
                    "homogeneous_coefficients": data["homogeneous_coefficients"],
                    "minimum": data["minimum"],
                    "zero": data["zero"],
                    "coefficient_stream_sha256": data["coefficient_stream_sha256"],
                    "report_sha256": report_hashes[name],
                })
    assert len(branches) == 48
    assert len({json.dumps(row["branch"], sort_keys=True) for row in branches}) == 48
    analytic_coefficients = sum(row["homogeneous_coefficients"] for row in branches)
    global_minimum = min(Fraction(row["minimum"]) for row in branches)

    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest G and every connected nonadjacent marked pair "
            "u,v with distance at least three and r=|B|+|C|-|A|=0, the exact "
            "rank-five residual M5 is nonnegative."
        ),
        "finite_certificate": {
            "coverage": "all connected-nonadjacent cells with |A|<=12 (a verified superset of this geometry)",
            "unlabeled_forests": finite["finite_scope"]["unlabeled_forests"],
            "cells": finite["finite_scope"]["connected_nonadjacent_mark_cells"],
            "M5_negative": finite["global"]["M5"]["negative"],
            "M5_minimum": finite["global"]["M5"]["minimum"],
            "ordered_cell_stream_sha256": finite["ordered_cell_stream_sha256"],
        },
        "analytic_certificate": {
            "coverage": "|A|>=13, distance>=3, r=0",
            "ratio_sectors": ["high delta1>=1", "low 0<=delta1<=1 and delta1+delta2>=2"],
            "ordered_rank2_endpoints": ["ll", "lh", "hh"],
            "order_branches": ["mB=0", "mB=1", "mB=2", "mB=3", "mB=4", "mB=5", "mB=6", "mB,mC>=7"],
            "branch_count": len(branches),
            "homogeneous_coefficients": analytic_coefficients,
            "global_minimum": str(global_minimum),
            "all_coefficients_strictly_positive": all(row["zero"] == 0 for row in branches),
            "branches": branches,
        },
        "coverage_assembly": {
            "finite": "|A|<=12",
            "analytic": "|A|>=13",
            "gap": "none within distance>=3,r=0 connected-nonadjacent M5",
        },
        "dependencies_sha256": PINS,
        "branch_report_sha256": report_hashes,
        "scope": (
            "Connected-nonadjacent M5 with distance>=3 and r=0 only. This does "
            "not prove r>=1, distance-two, all connected-nonadjacent M5, g1, "
            "all N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "analytic_branches": len(branches),
        "analytic_coefficients": analytic_coefficients,
        "global_minimum": str(global_minimum),
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
