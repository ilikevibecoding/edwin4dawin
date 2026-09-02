#!/usr/bin/env python3
"""Exact lightweight vertex diagnostic for refined selected-edge probes."""

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


def polynomial_for(row, order_base=14):
    numerator = sp.expand(sp.fraction(derive()["strong_parent_cone_before_common"])[0])
    polynomial, variables = mapped_polynomial(
        (1, 1, 1), row["adjacency"], row["common"], row["endpoints"],
        "centers", 1, 0, 0, row["uv_common"], order_base, numerator=numerator,
        parent_state="P", selected_excess_states=row["states"],
        positive_parent_interval=row["positive_parent_interval"],
        endpoint_lower_modes=row["endpoint_modes"],
        parent_lower_mode=row["parent_mode"],
        wedge_partition_mode=row["wedge_mode"],
        additional_remainder_base=row["additional_remainder_base"],
    )
    return polynomial.as_expr(), variables


def main() -> None:
    # The only surviving hard cell after structural pruning is target 72,
    # positive y, zero z, and the exact lower parent face.
    row = next(
        item for item in cases()
        if item["target_index"] == 72 and item["states"] == ("F", "P", "Z")
    )
    expression, (N, X, Y, Z, R, T, L) = polynomial_for(row)
    geometry_vertices = {
        "H": (0, 0, 0, 0),
        "X": (1, 0, 0, 0),
        "Y": (0, 1, 0, 0),
        "Z": (0, 0, 1, 0),
        "R": (0, 0, 0, 1),
    }
    rows = []
    for geometry_name, geometry in geometry_vertices.items():
        for wedge in (0, 1):
            for parent in (0, 1):
                value = sp.Poly(sp.expand(expression.subs({
                    X: geometry[0], Y: geometry[1], Z: geometry[2],
                    R: geometry[3], T: wedge, L: parent,
                })), N)
                coefficients = [sp.Rational(item) for item in value.all_coeffs()]
                negatives = [str(item) for item in coefficients if item < 0]
                rows.append({
                    "geometry": geometry_name,
                    "wedge": wedge,
                    "parent": parent,
                    "degree_N": value.degree(),
                    "negative_coefficients": negatives,
                    "minimum_coefficient": str(min(coefficients)),
                })
    polynomial = sp.Poly(expression, N, X, Y, Z, R, T, L)
    coefficients, stats = homogeneous_coefficients_fast(
        polynomial, 10, 10
    )
    negative_rows = [
        {"key": list(coefficient_key), "value": str(value)}
        for coefficient_key, value in sorted(
            coefficients.items(), key=lambda item: item[1]
        )
        if value < 0
    ]
    order15_expression, order15_variables = polynomial_for(row, 15)
    order15_polynomial = sp.Poly(order15_expression, *order15_variables)
    order15_attempts = []
    for elevation in range(11):
        order15_coefficients, order15_stats = homogeneous_coefficients_fast(
            order15_polynomial, elevation, elevation
        )
        order15_negative = sum(value < 0 for value in order15_coefficients.values())
        order15_attempts.append({
            "elevation": elevation,
            **order15_stats,
            "negative": int(order15_negative),
            "minimum": str(min(order15_coefficients.values())),
        })
        if not order15_negative:
            break
    print(json.dumps({
        "case": key(row),
        "negative_vertex_rows": [row for row in rows if row["negative_coefficients"]],
        "elevation10_stats": stats,
        "elevation10_negative_rows": negative_rows,
        "order15_attempts": order15_attempts,
        "all_vertex_rows": rows,
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
