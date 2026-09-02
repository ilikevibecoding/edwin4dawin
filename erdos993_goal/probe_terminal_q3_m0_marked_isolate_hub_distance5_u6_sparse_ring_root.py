#!/usr/bin/env python3
"""Sparse fraction-field probe for the distance-five order-six endpoints."""

from __future__ import annotations

from math import factorial
from time import perf_counter

from sympy.polys.domains import QQ
from sympy.polys.fields import field


def falling(value, rank: int):
    result = 1
    for offset in range(rank):
        result *= value - offset
    return result


def C(value, rank: int):
    return falling(value, rank) / factorial(rank)


def delta_for(a, b, j, rho, tau):
    n = a + b
    order = n + 6
    edges = n + 5
    wedges = C(a + 1, 2) + C(b + 1, 2) + 4
    connected_four = C(a + 1, 3) + C(b + 1, 3) + n + 3
    f2 = C(order, 2) - edges
    f3 = C(order, 3) - edges * (order - 2) + wedges
    z2 = edges
    z3 = edges * (order - 2) - 2 * wedges
    z4 = (
        edges * C(order - 2, 2)
        - 2 * C(edges, 2)
        - 2 * wedges * (order - 4)
        + 3 * connected_four
    )
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = p0 * c0 - f2 * r0

    nup1 = (n - j + 2) / (j - 1)
    nup2 = (n - j + 2) * (n - j + 1) / (j * (j - 1))
    nup3 = (
        (n - j + 2) * (n - j + 1) * (n - j)
        / ((j + 1) * j * (j - 1))
    )
    ndown1 = (j - 2) / (n - j + 3)
    aup1 = (a - j + 2) / (j - 1)
    bup1 = (b - j + 2) / (j - 1)
    aup2 = (a - j + 2) * (a - j + 1) / (j * (j - 1))
    bup2 = (b - j + 2) * (b - j + 1) / (j * (j - 1))
    adown1 = (j - 2) / (a - j + 3)
    bdown1 = (j - 2) / (b - j + 3)
    adown2 = (j - 2) * (j - 3) / ((a - j + 3) * (a - j + 4))
    bdown2 = (j - 2) * (j - 3) / ((b - j + 3) * (b - j + 4))

    fj = (
        3 + 4 * nup1 + nup2
        + rho * (3 + aup1 + adown1)
        + tau * (3 + bup1 + bdown1)
    )
    fprev = (
        3 * ndown1 + 4 + nup1
        + rho * (1 + 3 * adown1 + adown2)
        + tau * (1 + 3 * bdown1 + bdown2)
    )
    fnext = (
        3 * nup1 + 4 * nup2 + nup3
        + rho * (1 + 3 * aup1 + aup2)
        + tau * (1 + 3 * bup1 + bup2)
    )
    znext = (
        2 + 3 * nup1
        + rho * ((b + 1) * aup1 + (3 * b + 4) + b * adown1)
        + tau * ((a + 1) * bup1 + (3 * a + 4) + a * bdown1)
    )
    return (
        (j + 1) * f2 * determinant * (fnext + 2 * fj + fprev)
        + f2 * p0 * (
            (j + 1) * fj * (c0 + r0)
            - 3 * (p0 + f2) * (znext + 2 * fj)
        )
    )


def endpoint_stats(label, expression, elapsed):
    terms = expression.numer.terms()
    denominator_terms = expression.denom.terms()
    negatives = [(monomial, coefficient) for monomial, coefficient in terms if coefficient < 0]
    total_degree = max(sum(monomial) for monomial, _ in terms)
    print(
        label,
        {
            "terms": len(terms),
            "denominator_terms": len(denominator_terms),
            "denominator_negative": sum(
                coefficient < 0 for _, coefficient in denominator_terms
            ),
            "denominator_minimum": str(
                min(coefficient for _, coefficient in denominator_terms)
            ),
            "total_degree": total_degree,
            "negative": len(negatives),
            "minimum": str(min(coefficient for _, coefficient in terms)),
            "negative_terms": [(monomial, str(coefficient)) for monomial, coefficient in negatives[:50]],
            "seconds": round(elapsed, 3),
        },
        flush=True,
    )


def run_middle():
    _, q, v, y = field("q,v,y", QQ)
    a = q + v + y + 7
    b = q + y + 7
    j = y + 9
    n = a + b
    ua6 = falling(a, 6) / falling(n, 6)
    ub6 = falling(b, 6) / falling(n, 6)
    for label, rho, tau in (
        ("middle_u6_large", ua6, 0),
        ("middle_u6_small", 0, ub6),
    ):
        start = perf_counter()
        expression = delta_for(a, b, j, rho, tau)
        endpoint_stats(label, expression, perf_counter() - start)


def run_b5_tail():
    _, s, y = field("s,y", QQ)
    a = y + s + 6
    b = 5
    j = y + 8
    n = a + b
    ua6 = falling(a, 6) / falling(n, 6)
    start = perf_counter()
    expression = delta_for(a, b, j, ua6, 0)
    endpoint_stats("tail_b5_jge8_u6", expression, perf_counter() - start)


def run_general_tail():
    _, r, s, y = field("r,s,y", QQ)
    b = r + 6
    j = r + y + 9
    a = r + y + s + 7
    n = a + b
    ua6 = falling(a, 6) / falling(n, 6)
    start = perf_counter()
    expression = delta_for(a, b, j, ua6, 0)
    endpoint_stats("tail_bge6_jgeb3_u6", expression, perf_counter() - start)


def main():
    run_middle()
    run_b5_tail()
    run_general_tail()


if __name__ == "__main__":
    main()
