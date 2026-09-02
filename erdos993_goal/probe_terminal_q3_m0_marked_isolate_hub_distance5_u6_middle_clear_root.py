#!/usr/bin/env python3
"""Fast explicit-denominator check of the distance-five u6 middle vertices."""

from __future__ import annotations

import sympy as sp

from probe_terminal_q3_m0_marked_isolate_hub_distance5_u6_refinement_root import (
    build_delta,
)


def clear_stats(expression, denominator, variables):
    numerator, residual = sp.fraction(sp.cancel(expression * denominator))
    assert sp.simplify(residual - 1) == 0
    polynomial = sp.Poly(sp.expand(numerator), *variables)
    negatives = [
        (monomial, coefficient)
        for monomial, coefficient in polynomial.terms()
        if coefficient.is_negative is True
    ]
    return {
        "terms": len(polynomial.terms()),
        "total_degree": polynomial.total_degree(),
        "negative": len(negatives),
        "minimum": min(polynomial.coeffs()),
        "negative_terms": negatives,
    }


def main() -> None:
    (a, b, j, rho, tau), delta, _ = build_delta()
    n = a + b
    q, v, y = sp.symbols("q v y", integer=True, nonnegative=True)
    u_a6 = sp.prod(a - offset for offset in range(6)) / sp.prod(
        n - offset for offset in range(6)
    )
    u_b6 = sp.prod(b - offset for offset in range(6)) / sp.prod(
        n - offset for offset in range(6)
    )
    substitution = {
        j: y + 9,
        b: q + y + 7,
        a: q + v + y + 7,
    }
    common = 24 * (y + 8) * (y + 9) * (2 * q + v + y + 8)
    falling_denominator = sp.prod(
        2 * q + v + 2 * y + offset for offset in range(9, 15)
    )
    for label, rv, tv, side_denominator in (
        ("large", u_a6, 0, (q + v + 1) * (q + v + 2)),
        ("small", 0, u_b6, (q + 1) * (q + 2)),
    ):
        expression = delta.subs(
            {rho: rv, tau: tv}, simultaneous=True
        ).subs(substitution, simultaneous=True)
        denominator = common * side_denominator * falling_denominator
        print("CLEAR", label, flush=True)
        print(
            label,
            clear_stats(expression, denominator, (q, v, y)),
            flush=True,
        )


if __name__ == "__main__":
    main()
