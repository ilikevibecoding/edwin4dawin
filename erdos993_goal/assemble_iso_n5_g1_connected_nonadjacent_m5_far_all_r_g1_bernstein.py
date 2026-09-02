#!/usr/bin/env python3
"""Fail-closed all-order M5 assembly for connected marks at distance >=3."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_connected_nonadjacent_m5_far_all_r_assembled_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_FAR_ALL_R_G1_BERNSTEIN"
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
    assert {name: sha256(HERE/name) for name in PINS} == PINS
    finite_path = HERE / "iso_n5_g1_connected_nonadjacent_m5_s_finite_probe_g1_bernstein_20260830.json"
    finite = json.loads(finite_path.read_text(encoding="utf-8"))
    assert finite["finite_scope"]["orders_A"] == [0, 12]
    assert finite["finite_scope"]["connected_nonadjacent_mark_cells"] == 748426
    assert finite["global"]["M5"]["negative"] == 0

    branch_specs = []
    for mode, orders in (("zero", (None,0,1,2,3,4,5,6)),
                         ("positive", (None,1,2,3,4,5,6))):
        for sector in ("high", "low"):
            for endpoint in ("ll", "lh", "hh"):
                for order in orders:
                    branch_specs.append((mode, sector, endpoint, order))
    assert len(branch_specs) == 90

    branches = []
    report_hashes = {}
    for mode, sector, endpoint, order in branch_specs:
        label = "large" if order is None else str(order)
        name = (
            "iso_n5_g1_connected_nonadjacent_m5_adaptive_native_audit_"
            f"{sector}_far_{mode}_{label}_{endpoint}_g1_bernstein_20260830.json"
        )
        path = HERE / name
        data = json.loads(path.read_text(encoding="utf-8"))
        expected = {
            "sector": sector, "distance": "far", "mode": mode,
            "small_order": order, "endpoint": endpoint,
        }
        assert data["marker"] == BRANCH_MARKER
        assert data["branch"] == expected
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
            "branch": expected,
            "homogeneous_coefficients": data["homogeneous_coefficients"],
            "minimum": data["minimum"],
            "zero": data["zero"],
            "coefficient_stream_sha256": data["coefficient_stream_sha256"],
            "report_sha256": report_hashes[name],
        })
    assert len({json.dumps(row["branch"], sort_keys=True) for row in branches}) == 90
    coefficients = sum(row["homogeneous_coefficients"] for row in branches)
    minimum = min(Fraction(row["minimum"]) for row in branches)
    assert all(row["zero"] == 0 for row in branches)

    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest G and every connected nonadjacent marked pair "
            "u,v at distance at least three, the exact rank-five residual M5 is "
            "nonnegative."
        ),
        "geometry": (
            "At distance>=3 one has r=mB+mC-n>=0 and mD=r. The analytic "
            "partition is r=0 or r>=1; after B/C exchange, mB=0,...,6 or both "
            "orders are at least seven."
        ),
        "finite_certificate": {
            "coverage": "all connected-nonadjacent cells with |A|<=12 (verified superset)",
            "unlabeled_forests": finite["finite_scope"]["unlabeled_forests"],
            "cells": finite["finite_scope"]["connected_nonadjacent_mark_cells"],
            "M5_negative": finite["global"]["M5"]["negative"],
            "ordered_cell_stream_sha256": finite["ordered_cell_stream_sha256"],
        },
        "analytic_certificate": {
            "coverage": "|A|>=13, distance>=3, every r>=0",
            "ratio_sectors": ["high", "low"],
            "rank2_endpoints": ["ll", "lh", "hh"],
            "geometry_modes": ["r=0", "r>=1"],
            "branch_count": len(branches),
            "homogeneous_coefficients": coefficients,
            "global_minimum": str(minimum),
            "all_coefficients_strictly_positive": True,
            "order_slack_extension": (
                "Every P,Q power coefficient after simplex completion is positive; "
                "no additional isolate/order-transport split is required."
            ),
            "branches": branches,
        },
        "coverage_assembly": {
            "finite": "|A|<=12",
            "analytic": "|A|>=13",
            "gap": "none within connected-nonadjacent distance>=3 M5",
        },
        "dependencies_sha256": PINS,
        "branch_report_sha256": report_hashes,
        "scope": (
            "Connected-nonadjacent M5 at distance>=3 only. Distance two, all "
            "connected-nonadjacent M5, g1, all N5, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "analytic_branches": len(branches),
        "analytic_coefficients": coefficients,
        "global_minimum": str(minimum),
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
