#!/usr/bin/env python3
"""Probe the exact q=e star-product boundary for the four open Psi sums.

At q=e the active-root forest P is a disjoint union of stars with centre
degrees m_i>=0, while H=P-S is edgeless on e=sum_i m_i vertices.  Hence

    I(P;x)=prod_i ((1+x)**m_i+x),    I(H;x)=(1+x)**e.

This script derives p_0,...,p_6 from the degree power sums and attempts a
complete product-binomial certificate for unique Psi sums 12,14,15,16.
It is a probe until every exact basis coefficient is nonnegative.
"""

from __future__ import annotations

import itertools
import math

import sympy as sp

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    interval_cells,
    unique_expressions,
)


RANK = 6
OPEN_INDICES = (11, 13, 14, 15)


def derive_product_coefficients():
    x, m = sp.symbols("x m")
    parameters = sp.symbols(
        "d M " + " ".join(f"S{degree}" for degree in range(2, RANK + 1)),
        integer=True,
        nonnegative=True,
    )
    d, M, *higher = parameters
    power_sums = {0: d, 1: M} | {
        degree: higher[degree - 2] for degree in range(2, RANK + 1)
    }
    factor = sum(sp.binomial(m, degree) * x**degree for degree in range(RANK + 1)) + x
    factor = sp.expand_func(factor)
    log_factor = sp.series(sp.log(factor), x, 0, RANK + 1).removeO().expand()

    def sum_over_centres(expression):
        polynomial = sp.Poly(sp.expand(expression), m)
        return sp.expand(sum(
            coefficient * power_sums[exponent[0]]
            for exponent, coefficient in polynomial.terms()
        ))

    log_product = sum(
        sum_over_centres(log_factor.coeff(x, degree)) * x**degree
        for degree in range(1, RANK + 1)
    )
    product = sp.series(sp.exp(log_product), x, 0, RANK + 1).removeO().expand()
    coefficients = tuple(sp.expand(product.coeff(x, degree)) for degree in range(RANK + 1))
    return parameters, coefficients


def product_binomial_certificate(expression, parameters, label):
    d, M, *higher = parameters
    t, u, v = sp.symbols("t u v", integer=True, nonnegative=True)
    positive_centres = u + 1
    # Total y-degree is at most seven: p1*p6 and its H analogues are extremal.
    y = sp.symbols("y0:7", integer=True, nonnegative=True)
    y_power_sums = {
        degree: sum(value**degree for value in y)
        for degree in range(1, RANK + 1)
    }
    substitutions = {
        d: positive_centres + t,
        M: positive_centres + y_power_sums[1],
    }
    for degree in range(2, RANK + 1):
        substitutions[higher[degree - 2]] = positive_centres + sum(
            math.comb(degree, exponent) * y_power_sums[exponent]
            for exponent in range(1, degree + 1)
        )
    substituted = sp.Poly(sp.expand(2 * expression.subs(substitutions)), *y)
    print(label, "y_terms", len(substituted.terms()), "y_degree", substituted.total_degree(), flush=True)

    product_binomial = {}
    for powers, coefficient in substituted.terms():
        choices = [
            [
                (
                    index,
                    sp.factorial(index)
                    * sp.functions.combinatorial.numbers.stirling(power, index, kind=2),
                )
                for index in range(power + 1)
            ]
            for power in powers
        ]
        for selected in itertools.product(*choices):
            multiindex = tuple(item[0] for item in selected)
            factor = sp.prod(item[1] for item in selected)
            if factor:
                product_binomial[multiindex] = sp.expand(
                    product_binomial.get(multiindex, 0) + coefficient * factor
                )

    by_partition = {}
    for multiindex, coefficient in product_binomial.items():
        partition = tuple(sorted((entry for entry in multiindex if entry), reverse=True))
        coefficient = sp.expand(coefficient)
        if partition in by_partition:
            assert sp.expand(by_partition[partition] - coefficient) == 0
        else:
            by_partition[partition] = coefficient

    def difference_at_zero(poly, a, b):
        out = sp.expand(poly)
        for _ in range(a):
            out = sp.expand(out.subs(v, v + 1) - out)
        for _ in range(b):
            out = sp.expand(out.subs(t, t + 1) - out)
        return sp.expand(out.subs({v: 0, t: 0}))

    negatives = []
    zeros = 0
    positives = 0
    for partition in sorted(by_partition, key=lambda item: (sum(item), item)):
        support = max(1, len(partition))
        coefficient = sp.expand(by_partition[partition].subs(u, v + support - 1))
        for a in range(sp.degree(coefficient, v) + 1):
            for b in range(sp.degree(coefficient, t) + 1):
                value = difference_at_zero(coefficient, a, b)
                if value < 0:
                    negatives.append((partition, support, a, b, value, sp.factor(coefficient)))
                elif value == 0:
                    zeros += 1
                else:
                    positives += 1
    print(
        label,
        "partitions", len(by_partition),
        "positive_basis", positives,
        "zero_basis", zeros,
        "negative_basis", len(negatives),
        flush=True,
    )
    if negatives:
        for row in negatives[:10]:
            print("NEG", row, flush=True)
    return negatives


def main():
    parameters, product_coefficients = derive_product_coefficients()
    _d, M, *_ = parameters
    cells = interval_cells(P, H)
    expressions = unique_expressions(cells)
    assert len(expressions) == 16
    substitutions = {P[index]: product_coefficients[index] for index in range(7)}
    substitutions.update({H[index]: sp.expand_func(sp.binomial(M, index)) for index in range(7)})
    # p7 does not occur in the four open sums.
    open_expressions = [sp.factor(expressions[index].subs(substitutions)) for index in OPEN_INDICES]

    t = sp.symbols("t", integer=True, nonnegative=True)
    no_positive = {parameters[0]: t, M: 0}
    no_positive.update({parameter: 0 for parameter in parameters[2:]})
    for index, expression in zip(OPEN_INDICES, open_expressions):
        label = f"sum{index + 1}"
        zero_case = sp.factor(2 * expression.subs(no_positive))
        print(label, "no_positive_twice", zero_case, flush=True)
        product_binomial_certificate(expression, parameters, label)


if __name__ == "__main__":
    main()
