#!/usr/bin/env python3
"""Exact all-order cone for the singleton-ordinary index-72 p-leaf face.

This is the sole selected-edge refinement not certified at order base 14.
On the realizable face y>0,z=0, p is the leaf adjacent to v and therefore
xp=y exactly.  Starting at n=16, the strong parent-cone numerator has a
nonnegative exact homogeneous simplex/Bernstein expansion after degree-eight
elevation.  The order slack N=n-16 is retained as a free nonnegative variable,
so the certificate covers every n>=16 rather than a finite test.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein import derive
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_selected_edge_refined_g1_bernstein import (
    cases,
    key,
)
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import (
    homogeneous_coefficients,
    homogeneous_coefficients_fast,
    mapped_polynomial,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
OUTPUT = HERE / "iso_n5_bundle_g1_singleton_ordinary_index72_leaf_n16_plus_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_INDEX72_LEAF_N16_PLUS_G1_BERNSTEIN"
DEPENDENCIES = (
    "derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein.py",
    "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein.py",
    "probe_exact_iso_n5_bundle_g1_singleton_ordinary_selected_edge_refined_g1_bernstein.py",
)


def main() -> None:
    row = next(
        item for item in cases()
        if item["target_index"] == 72 and item["states"] == ("F", "P", "Z")
    )
    assert row["positive_parent_interval"] == "lower"
    numerator = sp.expand(sp.fraction(derive()["strong_parent_cone_before_common"])[0])
    polynomial, variables = mapped_polynomial(
        (1, 1, 1), row["adjacency"], row["common"], row["endpoints"],
        "centers", 1, 0, 0, row["uv_common"], 16, numerator=numerator,
        parent_state="P",
        positive_parent_interval=row["positive_parent_interval"],
        selected_excess_states=row["states"],
        endpoint_lower_modes=row["endpoint_modes"],
        parent_lower_mode=row["parent_mode"],
        wedge_partition_mode=row["wedge_mode"],
        additional_remainder_base=row["additional_remainder_base"],
    )
    elevation = 8
    fast_coefficients, stats = homogeneous_coefficients_fast(
        polynomial, elevation, elevation
    )
    # Independent literal multinomial conversion checks the optimized exact
    # degree-elevation backend coefficient for coefficient on this theorem.
    literal_coefficients, literal_stats = homogeneous_coefficients(
        polynomial, elevation, elevation
    )
    fast_as_sympy = {
        coefficient_key: sp.Rational(int(value.numerator), int(value.denominator))
        for coefficient_key, value in fast_coefficients.items()
    }
    assert fast_as_sympy == literal_coefficients
    assert stats == literal_stats
    assert all(value >= 0 for value in fast_coefficients.values())
    minimum = min(fast_coefficients.values())
    assert minimum == 31
    zero_count = sum(value == 0 for value in fast_coefficients.values())

    report = {
        "marker": MARKER,
        "theorem": (
            "The exact strong-parent-cone numerator is nonnegative on the "
            "index-72 p-leaf face for every forest order n>=16."
        ),
        "branch": key(row),
        "order_base": 16,
        "order_slack": "N=n-16>=0 retained coefficientwise",
        "geometry_elevation": elevation,
        "interval_elevation": elevation,
        "statistics": stats,
        "negative_coefficients": 0,
        "zero_coefficients": zero_count,
        "minimum_coefficient": str(minimum),
        "exact_backend_cross_check": (
            "optimized FLINT elevation equals literal exact multinomial "
            "conversion coefficient for coefficient"
        ),
        "face_geometry": (
            "p-v is selected, an unmarked degree-two centre joins u,v, "
            "d(p)=1, y=d(v)-1>0, and xp=y is the exact lower face"
        ),
        "scope": (
            "Exact all-order index-72 p-leaf strong-cone theorem for n>=16 "
            "only. No other canonical mode, all-N5, or Problem 993 claim."
        ),
        "dependencies_sha256": {
            name: hashlib.sha256((HERE / name).read_bytes()).hexdigest().upper()
            for name in DEPENDENCIES
        },
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "output": OUTPUT.name,
        "minimum_coefficient": str(minimum),
        "homogeneous_coefficients": stats["homogeneous_coefficients"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
