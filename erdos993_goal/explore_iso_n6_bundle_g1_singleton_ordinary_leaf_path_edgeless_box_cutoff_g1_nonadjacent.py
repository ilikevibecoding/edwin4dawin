#!/usr/bin/env python3
"""Search for a finite path/edgeless endpoint cutoff for the G1 leaf delta."""

from __future__ import annotations

import argparse
from collections import defaultdict
import hashlib

import numpy as np
import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import isolate_multiply
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_g1_nonadjacent import (
    choose,
    replace_rows,
    structural,
)


def row_order(variable, n):
    name = str(variable)
    base = {"R": n, "S": n - 1, "X": n - 1, "Y": n - 2}[name[0]]
    removed = {"E": 0, "U": 1, "V": 1, "W": 2}[name[1]]
    return base - removed, int(name[2:])


def endpoints(variable, n):
    order, rank = row_order(variable, n)
    return choose(order - rank + 1, rank), choose(order, rank)


def bernstein_coefficients(power_coefficients, degree):
    result = []
    for index in range(degree + 1):
        result.append(sp.expand(sum(
            power_coefficients.get(power, 0)
            * sp.binomial(index, power) / sp.binomial(degree, power)
            for power in range(index + 1)
        )))
    return result


def domain_sign(value, n, t, minimum):
    value = sp.expand(value)
    if value == 0:
        return 0, sp.Integer(0)
    h = sp.Symbol("h", nonnegative=True)
    z = sp.Symbol("z", nonnegative=True)
    shifted = sp.Poly(sp.expand(value.subs({
        n: minimum + h,
        t: sp.Rational(11, 10) * (minimum + h) * z,
    })), h, z)
    grouped = defaultdict(dict)
    for (h_power, z_power), coefficient in shifted.terms():
        grouped[h_power][z_power] = coefficient
    values = []
    for powers in grouped.values():
        degree = max(powers, default=0)
        values.extend(bernstein_coefficients(powers, degree))
    if all(coefficient >= 0 for coefficient in values):
        return 1, min(values)
    if all(coefficient <= 0 for coefficient in values):
        return -1, max(values)
    return None, min(values)


def affine_derivative_bounds(derivative, row_variables, endpoints_by_variable, n, t, minimum):
    active = tuple(variable for variable in row_variables if variable in derivative.free_symbols)
    polynomial = sp.Poly(derivative, *active) if active else None
    if polynomial is not None and polynomial.total_degree() > 1:
        return None
    zero = {variable: 0 for variable in active}
    constant = sp.expand(derivative.subs(zero))
    lower = upper = constant
    for variable in active:
        coefficient = sp.expand(sp.diff(derivative, variable))
        sign, _margin = domain_sign(coefficient, n, t, minimum)
        if sign is None:
            return None
        low, high = endpoints_by_variable[variable]
        lower += coefficient * (low if sign >= 0 else high)
        upper += coefficient * (high if sign >= 0 else low)
    return sp.expand(lower), sp.expand(upper)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("collision", "distinct"), required=True)
    parser.add_argument("--minimum", type=int, required=True)
    parser.add_argument("--samples", type=int, default=0)
    args = parser.parse_args()

    n = sp.Symbol("n", integer=True, positive=True)
    t = sp.Symbol("t", integer=True, nonnegative=True)
    components = build_expressions()
    complete = sp.expand(sum(components[label] for label in (
        "g2", "F", "QHL", "QHJ", "QKJ", "T"
    )))
    rrows, srows, xrows, yrows = (symbolic_rows(prefix) for prefix in "RSXY")
    if args.mode == "collision":
        expression = replace_rows(
            complete,
            H=isolate_multiply(rrows, t, 7), K=srows,
            J=isolate_multiply(srows, t, 7), L=srows,
        )
        expression = sp.expand(expression.subs(
            structural(rrows, n) | structural(srows, n - 1)
        ))
    else:
        expression = replace_rows(
            complete,
            H=isolate_multiply(rrows, t, 7), K=srows,
            J=isolate_multiply(xrows, t, 7), L=yrows,
        )
        expression = sp.expand(expression.subs(
            structural(rrows, n) | structural(srows, n - 1)
            | structural(xrows, n - 1) | structural(yrows, n - 2)
        ))

    row_variables = tuple(sorted(
        (variable for variable in expression.free_symbols if variable not in (n, t)),
        key=str,
    ))
    assert sp.Poly(expression, *row_variables).total_degree() == 2
    assert all(
        exponent <= 1
        for powers, _coefficient in sp.Poly(expression, *row_variables).terms()
        for exponent in powers
    )
    endpoints_by_variable = {
        variable: endpoints(variable, n) for variable in row_variables
    }
    forced = []
    remaining = list(row_variables)
    while True:
        progress = False
        for variable in tuple(remaining):
            derivative = sp.expand(sp.diff(expression, variable))
            others = tuple(item for item in remaining if item != variable)
            bounds = affine_derivative_bounds(
                derivative, others, endpoints_by_variable,
                n, t, args.minimum,
            )
            if bounds is None:
                continue
            lower, upper = bounds
            lower_sign, lower_margin = domain_sign(
                lower, n, t, args.minimum
            )
            upper_sign, upper_margin = domain_sign(
                upper, n, t, args.minimum
            )
            if lower_sign in (0, 1):
                endpoint = "path"
                expression = sp.expand(expression.subs(
                    variable, endpoints_by_variable[variable][0]
                ))
                margin = lower_margin
            elif upper_sign in (0, -1):
                endpoint = "edgeless"
                expression = sp.expand(expression.subs(
                    variable, endpoints_by_variable[variable][1]
                ))
                margin = -upper_margin
            else:
                continue
            forced.append((str(variable), endpoint, str(margin)))
            remaining.remove(variable)
            print("FORCED", forced[-1], "REMAINING", len(remaining))
            progress = True
            break
        if not progress:
            break

    if remaining:
        final_sign, final_margin = None, None
    else:
        final_sign, final_margin = domain_sign(expression, n, t, args.minimum)
    print("MODE", args.mode, "MINIMUM", args.minimum)
    print("FORCED_COUNT", len(forced))
    print("REMAINING_COUNT", len(remaining))
    print("REMAINING", list(map(str, remaining)))
    print("FINAL_FIXED_SIGN", final_sign, "MARGIN", final_margin)
    if args.samples and remaining:
        rng = np.random.default_rng(993)
        evaluate = sp.lambdify((n, t, *remaining), expression, "numpy")
        for order_value in (
            args.minimum, args.minimum + 1, 2 * args.minimum, 10 * args.minimum
        ):
            endpoints_numeric = [
                tuple(int(value.subs(n, order_value)) for value in endpoints_by_variable[variable])
                for variable in remaining
            ]
            bits = rng.integers(0, 2, size=(len(remaining), args.samples), dtype=np.int64)
            arrays = [
                low + bits[index] * (high - low)
                for index, (low, high) in enumerate(endpoints_numeric)
            ]
            for sibling_count in sorted({
                0, 1, order_value // 2, order_value,
                (11 * order_value - 1) // 10,
            }):
                values = np.asarray(evaluate(
                    order_value, sibling_count, *arrays
                ))
                minimum_value = int(values.min())
                print(
                    "RANDOM_CORNER_MIN", order_value, sibling_count,
                    minimum_value,
                )
                if minimum_value < 0:
                    location = int(values.argmin())
                    print("NEGATIVE_CORNER_BITS", [
                        int(bits[index, location]) for index in range(len(remaining))
                    ])
                    print("EXPLORATORY_ONLY_NO_BOX_THEOREM")
                    return
    print("FORCED_SHA256", hashlib.sha256(repr(forced).encode()).hexdigest().upper())
    print("EXPLORATORY_ONLY_NO_BOX_THEOREM")


if __name__ == "__main__":
    main()
