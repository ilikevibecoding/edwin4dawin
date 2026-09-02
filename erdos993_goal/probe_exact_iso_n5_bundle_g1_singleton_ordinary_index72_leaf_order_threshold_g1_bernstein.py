#!/usr/bin/env python3
"""Exact order-threshold probe for the sole surviving index-72 leaf face."""

from __future__ import annotations

import json

import sympy as sp

from derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein import derive
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_selected_edge_refined_g1_bernstein import (
    cases,
    key,
)
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein import (
    homogeneous_coefficients_fast,
    mapped_polynomial,
)


def main() -> None:
    row = next(
        item for item in cases()
        if item["target_index"] == 72 and item["states"] == ("F", "P", "Z")
    )
    numerator = sp.expand(sp.fraction(derive()["strong_parent_cone_before_common"])[0])
    base_polynomial, variables = mapped_polynomial(
        (1, 1, 1), row["adjacency"], row["common"], row["endpoints"],
        "centers", 1, 0, 0, row["uv_common"], 14, numerator=numerator,
        parent_state="P", positive_parent_interval="lower",
        selected_excess_states=row["states"],
        endpoint_lower_modes=row["endpoint_modes"],
        parent_lower_mode=row["parent_mode"],
        wedge_partition_mode=row["wedge_mode"],
        additional_remainder_base=row["additional_remainder_base"],
    )
    N = variables[0]
    reports = []
    for order_base in range(15, 31):
        polynomial = sp.Poly(
            sp.expand(base_polynomial.as_expr().subs({N: N + order_base - 14})),
            *variables,
        )
        attempts = []
        passed = False
        for elevation in range(11):
            coefficients, stats = homogeneous_coefficients_fast(
                polynomial, elevation, elevation
            )
            negative = sum(value < 0 for value in coefficients.values())
            attempts.append({
                "elevation": elevation,
                **stats,
                "negative": int(negative),
                "minimum": str(min(coefficients.values())),
            })
            if not negative:
                passed = True
                break
        reports.append({
            "order_base": order_base,
            "passed": passed,
            "attempts": attempts,
        })
        print(json.dumps({
            "case": key(row), "order_base": order_base, "passed": passed,
            "last": attempts[-1],
        }, sort_keys=True), flush=True)
        if passed:
            break
    print(json.dumps({
        "case": key(row), "reports": reports,
        "scope": "Exact threshold probe only; no theorem claim.",
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
