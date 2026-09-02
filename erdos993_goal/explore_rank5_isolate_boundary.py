#!/usr/bin/env python3
"""Inspect the tight boundary faces of isolate-payment certificates."""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    tensor_bernstein_fast,
)
from verify_rank5_isolate_payment_monotonicity import (
    cleared_numerator,
    coefficient_regions,
    parameter_data,
    raw_forward_differences,
    remove_nonnegative_monomial_factor,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--difference", type=int, default=6)
    parser.add_argument("--region", default="q_upper")
    parser.add_argument("--coefficient-region")
    parser.add_argument("--derivatives", action="store_true")
    args = parser.parse_args()

    differences, coefficient_variables = raw_forward_differences()
    box_variables, normalized_variables, _, q_regions = parameter_data(13)
    X, T, A, W, V, Z = box_variables
    D, r, q = normalized_variables
    raw = differences[args.difference - 1]
    q_regions = [item for item in q_regions if item[0] == args.region]
    assert len(q_regions) == 1
    _, r_value, D_value, q_value = q_regions[0]

    for (
        coefficient_name,
        bound,
        x_value,
        v_numerator,
        v_denominator,
    ) in coefficient_regions(box_variables, 13):
        if (
            args.coefficient_region
            and coefficient_name != args.coefficient_region
        ):
            continue
        common = cleared_numerator(
            raw,
            coefficient_variables,
            box_variables,
            normalized_variables,
            c0_bound=bound,
            core_order=13,
        )
        endpoint = sp.expand(
            common.xreplace({D: D_value, r: r_value, q: q_value})
        )
        v_degree = sp.Poly(endpoint, V).degree()
        mapped = endpoint.xreplace(
            {X: x_value, V: v_numerator / v_denominator}
        )
        rational = sp.cancel(mapped * v_denominator**v_degree)
        numerator, denominator = sp.fraction(rational)
        assert denominator > 0
        residual, monomial = remove_nonnegative_monomial_factor(
            sp.expand(numerator), box_variables
        )
        if args.derivatives:
            for variable in box_variables:
                derivative = sp.diff(residual, variable)
                derivative_degrees, derivative_coefficients = (
                    tensor_bernstein_fast(
                        sp.expand(derivative), box_variables
                    )
                )
                derivative_minimum, derivative_index = (
                    minimum_with_index(derivative_coefficients)
                )
                negative_minimum, negative_index = minimum_with_index(
                    -derivative_coefficients
                )
                print(
                    coefficient_name,
                    "derivative",
                    variable,
                    "degrees",
                    derivative_degrees,
                    "min",
                    derivative_minimum,
                    "at",
                    derivative_index,
                    "negative_min",
                    negative_minimum,
                    "at",
                    negative_index,
                    flush=True,
                )
            a_boundary = 0 if args.region == "q_half_high_r" else 1
            reduced = sp.expand(
                residual.subs({T: 0, A: a_boundary})
            )
            reduced_variables = (X, W, V, Z)
            for variable in reduced_variables:
                derivative = sp.diff(reduced, variable)
                derivative_degrees, derivative_coefficients = (
                    tensor_bernstein_fast(
                        sp.expand(derivative), reduced_variables
                    )
                )
                derivative_minimum, derivative_index = (
                    minimum_with_index(derivative_coefficients)
                )
                negative_minimum, negative_index = minimum_with_index(
                    -derivative_coefficients
                )
                print(
                    coefficient_name,
                    "reduced_derivative",
                    variable,
                    "degrees",
                    derivative_degrees,
                    "min",
                    derivative_minimum,
                    "at",
                    derivative_index,
                    "negative_min",
                    negative_minimum,
                    "at",
                    negative_index,
                    flush=True,
                )
        a_boundary = 0 if args.region == "q_half_high_r" else 1
        boundary = sp.factor(
            residual.subs({T: 0, A: a_boundary, V: 1, Z: 1})
        )
        degrees, coefficients = tensor_bernstein_fast(
            sp.expand(boundary), (X, W)
        )
        minimum, index = minimum_with_index(coefficients)
        print(
            coefficient_name,
            "monomial",
            monomial,
            "boundary_degrees",
            degrees,
            "boundary_Bernstein_minimum",
            minimum,
            "index",
            index,
            flush=True,
        )
        print("factor_list", sp.factor_list(boundary), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
