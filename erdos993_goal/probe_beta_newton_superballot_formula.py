#!/usr/bin/env python3
"""Fit universal row formulas for Q=U Tau^{-1} after Newton row scaling."""

import sympy as sp

from fast_bottom_forward import beta_coefficients, inverse_upper, matmul
from probe_beta_newton_coordinates import beta_newton_lower, inverse_lower_unit
from probe_beta_newton_superballot_bridge import super_ballot


P = sp.symbols("p")


def universal_bridge(size):
    n = size - 1
    upper = matmul(
        inverse_lower_unit(beta_newton_lower(size)), beta_coefficients(size)
    )
    quotient = matmul(upper, inverse_upper(super_ballot(size)))
    return [
        [
            sp.Rational(value.numerator, value.denominator)
            / sp.rf(row + 5, n - row)
            for value in quotient[row]
        ]
        for row in range(size)
    ]


def fit_row(data, maximum_total_degree=34):
    for used in range(5, min(35, len(data) - 3) + 1):
        train = data[:used]
        test = data[used:]
        for numerator_degree in range(used):
            denominator_degree = used - numerator_degree - 1
            if numerator_degree + denominator_degree > maximum_total_degree:
                continue
            candidate = sp.factor(
                sp.rational_interpolate(train, numerator_degree, P)
            )
            if all(sp.cancel(candidate.subs(P, x) - y) == 0 for x, y in test):
                return numerator_degree, denominator_degree, candidate
    return None


def main():
    size = 45
    bridge = universal_bridge(size)
    for row in range(11):
        data = [(column, bridge[row][column]) for column in range(row, size)]
        print(f"r={row} fit={fit_row(data)}")


if __name__ == "__main__":
    main()
