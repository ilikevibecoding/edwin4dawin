#!/usr/bin/env python3
"""Certify strong-Q5 payment-margin monotonicity for large terminal cores.

Let C be the inward terminal core, H its rooted deletion correction, and
let s isolated sibling leaves occur in B-p.  If R_s denotes the exact
strong-Q5 preservation margin

    R_s = M_s - a_s d_s e_s(a_s+d_s),

then R_s is a polynomial of degree fifteen in s.  This verifier proves all
fifteen Newton coefficients Delta^j R_0 nonnegative on the exact low-rank
terminal cone for core order at least 20 and

    X=i3(C)/i4(C) <= 12/35.

Consequently R_s>=R_0 for every integer s>=0.  The X cap is exactly the
sharp path-ratio cap at core order 20 and decreases at larger orders.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import platform
from collections import deque
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank5_isolate_payment_margin_monotonicity_root import (
    raw_margin_forward_differences,
)
from verify_rank5_isolate_payment_monotonicity import (
    cleared_numerator,
    parameter_data,
    remove_nonnegative_monomial_factor,
    verify_q_concavity,
)
from certify_rank5_ratio_payment_order28_large_cores_root import raw_ratio_margin


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_strong_q5_isolate_margin_x_cap_exact_root_20260826.json"
CORE_ORDER_FLOOR = 20
X_CAP = sp.Rational(12, 35)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def shift_forward_differences(differences, base_smoothing, orders):
    """Translate Newton coefficients from s=0 to s=base_smoothing."""
    shifted = {}
    for order in orders:
        shifted[order] = sp.expand(
            sum(
                math.comb(base_smoothing, higher - order)
                * differences[higher - 1]
                for higher in range(order, 16)
            )
        )
    return shifted


def verify_shifted_q_concavity(
    differences_by_order, coefficient_variables, base_smoothing
):
    c0, c1, c2, c3, _, _, _, k = coefficient_variables
    smoothing = sp.symbols("smoothing", integer=True, nonnegative=True)
    d_s = (
        c3
        + smoothing * c2
        + smoothing * (smoothing - 1) * c1 / 2
        + smoothing * (smoothing - 1) * (smoothing - 2) * c0 / 6
    )
    square_values = [
        sp.expand(d_s.subs(smoothing, base_smoothing + offset) ** 2)
        for offset in range(16)
    ]
    square_differences = {}
    for order in range(1, 16):
        square_values = [
            sp.expand(square_values[index + 1] - square_values[index])
            for index in range(len(square_values) - 1)
        ]
        square_differences[order] = square_values[0]
    for order, difference in differences_by_order.items():
        assert sp.expand(
            sp.diff(difference, k, 2) + 100 * square_differences[order]
        ) == 0


def coefficient_regions_with_cap(box_variables):
    """Partition the exact c0 bounds on 0<=X<=12/35."""
    X, _, _, _, V, _ = box_variables
    threshold = sp.Rational(4, CORE_ORDER_FLOOR - 2)
    assert threshold < X_CAP
    high_x = threshold + (X_CAP - threshold) * X
    critical_denominator = high_x * (CORE_ORDER_FLOOR - 1)
    critical_numerator = high_x + 4
    return (
        ("pair_low_x", "pair", threshold * X, V, sp.S.One),
        (
            "pair_low_ratio",
            "pair",
            high_x,
            critical_numerator * V,
            critical_denominator,
        ),
        (
            "order_high_ratio",
            "order",
            high_x,
            critical_numerator
            + (critical_denominator - critical_numerator) * V,
            critical_denominator,
        ),
    )


def certify_patch(
    coefficients,
    degrees,
    maximum_depth,
    polynomial=None,
    variables=None,
):
    initial_bounds = tuple((sp.S.Zero, sp.S.One) for _ in degrees)
    stack = [(coefficients, 0, initial_bounds)]
    leaves = 0
    deepest = 0
    smallest = None
    axis_order = (0, 3, 4, 5, 1, 2)
    while stack:
        patch, depth, bounds = stack.pop()
        minimum, index = minimum_with_index(patch)
        if minimum >= 0:
            leaves += 1
            deepest = max(deepest, depth)
            smallest = minimum if smallest is None else min(smallest, minimum)
            continue
        if depth >= maximum_depth:
            sample = None
            if polynomial is not None and variables is not None:
                midpoint_substitution = {
                    variable: (lower + upper) / 2
                    for variable, (lower, upper) in zip(variables, bounds)
                }
                sample = sp.factor(polynomial.subs(midpoint_substitution))
            raise AssertionError(
                f"unresolved minimum={minimum} index={index} depth={depth} "
                f"bounds={bounds} midpoint_value={sample}"
            )
        interiorities = [
            min(position, degree - position) / degree if degree else 0
            for position, degree in zip(index, degrees)
        ]
        if max(interiorities) > 0:
            axis = max(range(len(degrees)), key=interiorities.__getitem__)
        else:
            axis = axis_order[depth % len(axis_order)]
        left, right = split_bernstein_midpoint(patch, axis)
        lower, upper = bounds[axis]
        midpoint = (lower + upper) / 2
        left_bounds = list(bounds)
        right_bounds = list(bounds)
        left_bounds[axis] = (lower, midpoint)
        right_bounds[axis] = (midpoint, upper)
        stack.append((right, depth + 1, tuple(right_bounds)))
        stack.append((left, depth + 1, tuple(left_bounds)))
    assert smallest is not None
    return leaves, deepest, smallest


def certify_difference(
    order,
    raw,
    coefficient_variables,
    box_variables,
    normalized_variables,
    root_regions,
    maximum_depth,
    initial_only,
    selected_root_region,
    selected_coefficient_region,
    boundary_analysis,
):
    X, _, _, _, V, _ = box_variables
    D, r, q = normalized_variables
    regions = coefficient_regions_with_cap(box_variables)
    if selected_coefficient_region:
        regions = tuple(
            row for row in regions if row[0] == selected_coefficient_region
        )
        if not regions:
            raise ValueError(
                f"unknown coefficient region: {selected_coefficient_region}"
            )
    numerators = {
        bound: cleared_numerator(
            raw,
            coefficient_variables,
            box_variables,
            normalized_variables,
            c0_bound=bound,
            core_order=CORE_ORDER_FLOOR,
        )
        for bound in {row[1] for row in regions}
    }
    rows = []
    for root_name, r_value, D_value, q_value in root_regions:
        if selected_root_region and root_name != selected_root_region:
            continue
        for coefficient_name, bound, x_value, v_numerator, v_denominator in regions:
            if (
                selected_coefficient_region
                and coefficient_name != selected_coefficient_region
            ):
                continue
            endpoint = sp.expand(
                numerators[bound].xreplace(
                    {D: D_value, r: r_value, q: q_value}
                )
            )
            v_degree = sp.Poly(endpoint, V).degree()
            mapped = endpoint.xreplace(
                {X: x_value, V: v_numerator / v_denominator}
            )
            rational = sp.cancel(mapped * v_denominator**v_degree)
            numerator, denominator = sp.fraction(rational)
            assert denominator > 0
            polynomial, monomial_factor = remove_nonnegative_monomial_factor(
                sp.expand(numerator), box_variables
            )
            local_boundary = None
            if boundary_analysis:
                local_variables = sp.symbols(
                    "local_X local_T local_A local_W local_V local_Z",
                    nonnegative=True,
                )
                local_X, local_T, local_A, local_W, local_V, local_Z = (
                    local_variables
                )
                _, T_box, A_box, W_box, V_box, Z_box = box_variables
                local_polynomial = sp.Poly(
                    sp.expand(
                        polynomial.subs(
                            {
                                X: local_X,
                                T_box: local_T,
                                A_box: local_A,
                                W_box: 1 - local_W,
                                V_box: 1 - local_V,
                                Z_box: local_Z,
                            },
                            simultaneous=True,
                        )
                    ),
                    *local_variables,
                )
                local_terms = local_polynomial.terms()
                minimum_total_degree = min(
                    sum(monomial) for monomial, _ in local_terms
                )
                leading_terms = [
                    (list(monomial), str(coefficient))
                    for monomial, coefficient in local_terms
                    if sum(monomial) == minimum_total_degree
                ]
                local_boundary = {
                    "terms": len(local_terms),
                    "minimum_total_degree": minimum_total_degree,
                    "leading_terms": leading_terms,
                    "negative_leading_coefficients": sum(
                        1
                        for monomial, coefficient in local_terms
                        if (
                            sum(monomial) == minimum_total_degree
                            and bool(coefficient < 0)
                        )
                    ),
                }
                slice_polynomial = sp.factor(
                    polynomial.subs(
                        {
                            T_box: 0,
                            A_box: 0,
                            W_box: 1,
                            V_box: 1,
                        },
                        simultaneous=True,
                    )
                )
                slice_degrees, slice_coefficients = tensor_bernstein_fast(
                    sp.expand(slice_polynomial), (X, Z_box)
                )
                slice_minimum, slice_index = minimum_with_index(
                    slice_coefficients
                )
                local_boundary["extremal_XZ_slice"] = {
                    "factorization": str(slice_polynomial),
                    "degrees": [int(value) for value in slice_degrees],
                    "minimum_Bernstein_coefficient": str(slice_minimum),
                    "minimum_index": [int(value) for value in slice_index],
                    "sample_values": {
                        f"X={x_value},Z={z_value}": str(
                            sp.factor(
                                slice_polynomial.subs(
                                    {X: x_value, Z_box: z_value}
                                )
                            )
                        )
                        for x_value in (
                            sp.Rational(1, 16),
                            sp.Rational(1, 8),
                            sp.Rational(1, 4),
                            sp.Rational(1, 2),
                            sp.S.One,
                        )
                        for z_value in (sp.S.Zero, sp.S.One)
                    },
                }
            degrees, coefficients = tensor_bernstein_fast(
                polynomial, box_variables
            )
            initial_minimum, initial_index = minimum_with_index(coefficients)
            if initial_only:
                leaves, deepest, terminal_minimum = 1, 0, initial_minimum
            elif initial_minimum >= 0:
                leaves, deepest, terminal_minimum = 1, 0, initial_minimum
            else:
                leaves, deepest, terminal_minimum = certify_patch(
                    coefficients,
                    degrees,
                    maximum_depth,
                    polynomial,
                    box_variables,
                )
            rows.append({
                "difference": order,
                "region": f"{root_name}/{coefficient_name}",
                "degrees": [int(value) for value in degrees],
                "initial_minimum": str(initial_minimum),
                "initial_minimum_index": [int(value) for value in initial_index],
                "terminal_minimum": str(terminal_minimum),
                "subdivision_leaves": leaves,
                "maximum_depth": deepest,
                "Bernstein_coefficients": int(coefficients.size) * leaves,
                "removed_nonnegative_monomial": [
                    int(value) for value in monomial_factor
                ],
                "initial_coefficients_sha256": hashlib.sha256(
                    "\n".join(str(value) for value in coefficients.flat).encode("ascii")
                ).hexdigest().upper(),
                "local_boundary_analysis": local_boundary,
            })
    expected_count = (
        1
        if selected_root_region and selected_coefficient_region
        else 3
        if selected_root_region
        else 4
        if selected_coefficient_region
        else 12
    )
    assert len(rows) == expected_count
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-difference", type=int, default=1)
    parser.add_argument("--max-difference", type=int, default=15)
    parser.add_argument("--maximum-depth", type=int, default=30)
    parser.add_argument("--initial-only", action="store_true")
    parser.add_argument("--base-smoothing", type=int, default=0)
    parser.add_argument("--root-region")
    parser.add_argument("--coefficient-region")
    parser.add_argument("--boundary-analysis", action="store_true")
    parser.add_argument("--direct-smoothing", type=int)
    args = parser.parse_args()
    assert 1 <= args.min_difference <= args.max_difference <= 15
    assert args.base_smoothing >= 0
    assert args.direct_smoothing is None or args.direct_smoothing >= 0
    assert not (args.base_smoothing and args.direct_smoothing is not None)

    if args.direct_smoothing is not None:
        direct, coefficient_variables = raw_ratio_margin(
            args.direct_smoothing
        )
        c0, c1, c2, c3, _, _, _, k = coefficient_variables
        smoothing = sp.Integer(args.direct_smoothing)
        d_s = (
            c3
            + smoothing * c2
            + smoothing * (smoothing - 1) * c1 / 2
            + smoothing * (smoothing - 1) * (smoothing - 2) * c0 / 6
        )
        assert sp.expand(sp.diff(direct, k, 2) + 100 * d_s**2) == 0
        selected_orders = [0]
        differences_by_order = {0: direct}
    else:
        differences, coefficient_variables = raw_margin_forward_differences()
        selected_orders = list(
            range(args.min_difference, args.max_difference + 1)
        )
        if args.base_smoothing:
            differences_by_order = shift_forward_differences(
                differences, args.base_smoothing, selected_orders
            )
            verify_shifted_q_concavity(
                differences_by_order, coefficient_variables, args.base_smoothing
            )
        else:
            verify_q_concavity(differences, coefficient_variables)
            differences_by_order = {
                order: differences[order - 1] for order in selected_orders
            }
    box_variables, normalized_variables, _, root_regions = parameter_data(
        CORE_ORDER_FLOOR
    )
    rows = []
    for order in selected_orders:
        order_rows = certify_difference(
            order,
            differences_by_order[order],
            coefficient_variables,
            box_variables,
            normalized_variables,
            root_regions,
            args.maximum_depth,
            args.initial_only,
            args.root_region,
            args.coefficient_region,
            args.boundary_analysis,
        )
        rows.extend(order_rows)
        minimum = min(sp.Rational(row["terminal_minimum"]) for row in order_rows)
        label = "INITIAL_DIAGNOSTIC" if args.initial_only else "PASS"
        order_name = (
            f"R_{args.direct_smoothing}"
            if args.direct_smoothing is not None
            else f"Delta^{order}"
        )
        print(
            f"{order_name} {label} cells={len(order_rows)} "
            f"minimum={minimum} coefficients="
            f"{sum(row['Bernstein_coefficients'] for row in order_rows):,}",
            flush=True,
        )
        if args.initial_only:
            for row in order_rows:
                print(
                    f"  {row['region']} minimum={row['initial_minimum']} "
                    f"index={row['initial_minimum_index']} "
                    f"degrees={row['degrees']} "
                    f"monomial={row['removed_nonnegative_monomial']}",
                    flush=True,
                )
                if row["local_boundary_analysis"] is not None:
                    print(
                        "    boundary_analysis="
                        f"{row['local_boundary_analysis']}",
                        flush=True,
                    )

    if (
        args.initial_only
        or args.direct_smoothing is not None
        or args.min_difference != 1
        or args.max_difference != 15
    ):
        print("PARTIAL_DIAGNOSTIC_PASS_NOT_ASSEMBLED")
        return 0

    assert not args.root_region and not args.coefficient_region
    assert len(rows) == 180
    assert all(sp.Rational(row["terminal_minimum"]) >= 0 for row in rows)
    dependencies = {
        "verify_rank5_isolate_payment_margin_monotonicity_root.py": sha256(
            HERE / "verify_rank5_isolate_payment_margin_monotonicity_root.py"
        ),
        "verify_rank5_isolate_payment_monotonicity.py": sha256(
            HERE / "verify_rank5_isolate_payment_monotonicity.py"
        ),
        "verify_rank5_leaf_induction_reduction.py": sha256(
            HERE / "verify_rank5_leaf_induction_reduction.py"
        ),
        "explore_rank4_three_halves_grouped.py": sha256(
            HERE / "explore_rank4_three_halves_grouped.py"
        ),
    }
    payload = {
        "schema": "rank5-strong-q5-isolate-margin-x-cap-root-v1",
        "status": "PASS_EXACT_RANK5_STRONG_Q5_ISOLATE_MARGIN_MONOTONICITY_X_LE_12_OVER_35",
        "theorem": (
            "For every terminal core of order at least 20 satisfying the exact "
            "low-rank terminal cone and i3(C)/i4(C)<=12/35, all fifteen "
            "forward differences Delta^j R_0 are nonnegative. Hence "
            "R_s>=R_0 for every integer sibling-isolate count s>=0."
        ),
        "core_order_floor": CORE_ORDER_FLOOR,
        "x_cap": str(X_CAP),
        "forward_differences": 15,
        "cells": rows,
        "coverage": {
            "analytic_cells": len(rows),
            "negative_terminal_minima": sum(
                sp.Rational(row["terminal_minimum"]) < 0 for row in rows
            ),
            "total_Bernstein_coefficients": sum(
                row["Bernstein_coefficients"] for row in rows
            ),
            "maximum_depth": max(row["maximum_depth"] for row in rows),
        },
        "immutable_inputs": dependencies,
        "software": {
            "python": platform.python_version(),
            "sympy": sp.__version__,
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is the sibling-isolate tail for core order at least 20. "
            "Small cores and the strong-Q5 induction assembly remain separate."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("CELLS", payload["coverage"]["analytic_cells"])
    print("COEFFICIENTS", payload["coverage"]["total_Bernstein_coefficients"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
