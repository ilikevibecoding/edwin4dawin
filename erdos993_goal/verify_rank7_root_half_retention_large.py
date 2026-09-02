#!/usr/bin/env python3
"""Exact half-retention bounds for rooted trees of order n>=39."""

from __future__ import annotations

import sympy as sp


def choose_polynomial(v, k: int):
    return sp.prod(v - j for j in range(k)) / sp.factorial(k)


def main() -> int:
    N = sp.symbols("N", nonnegative=True)
    n = N + 39
    # Coefficientwise path minimality gives c5>=C(n-4,5) and
    # c6>=C(n-5,6).  For J=A-N[q], |J|<=n-2, so
    # i4(J)<=C(n-2,4) and i5(J)<=C(n-2,5).
    margins = (
        choose_polynomial(n - 4, 5) - 2 * choose_polynomial(n - 2, 4),
        choose_polynomial(n - 5, 6) - 2 * choose_polynomial(n - 2, 5),
    )
    expected = (
        (N + 34)
        * (N + 35)
        * (N**3 + 86 * N**2 + 2341 * N + 19416)
        / 120,
        (N + 33)
        * (N + 34)
        * (N**4 + 110 * N**3 + 4283 * N**2 + 66694 * N + 303600)
        / 720,
    )
    for rank, (margin, factorization) in enumerate(zip(margins, expected), start=5):
        assert sp.factor(margin - factorization) == 0
        polynomial = sp.Poly(sp.expand(margin), N, domain=sp.QQ)
        assert all(coefficient > 0 for _, coefficient in polynomial.terms())
        print(
            f"rank {rank}: terms={len(polynomial.terms())} "
            f"factor={sp.factor(margin)}"
        )
    print("RANK7_ROOT_HALF_RETENTION_N39_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
