#!/usr/bin/env python3
"""Test whether the corrected Catalan-square/beta product is Riordan."""

from __future__ import annotations

from fractions import Fraction as F

import sympy as sp

from fast_bottom_forward import catalan, matmul
from verify_newton_checker_offdiag_homotopy import beta_checker_inverse


def main():
    q = 16
    v = beta_checker_inverse(q)
    r = [
        [F((-1) ** (j - i) * catalan(j - i + 1)) if j >= i else F(0) for j in range(q)]
        for i in range(q)
    ]
    x = matmul(r, v)
    z = sp.symbols("z")
    columns = [
        sum(sp.Rational(x[k][n].numerator, x[k][n].denominator) * z**n for n in range(k, q))
        for k in range(5)
    ]
    g = columns[0]
    f = sp.series(columns[1] / g, z, 0, q).removeO()
    print("g", sp.factor(g))
    print("f", f)
    for k in range(1, 5):
        predicted = sp.series(g * f**k, z, 0, q).removeO()
        first = next(
            (n for n in range(q) if sp.expand(predicted).coeff(z, n) != columns[k].coeff(z, n)),
            None,
        )
        print("ordinary column", k, "first failure", first)

    normalized_columns = [columns[k] / sp.Rational(x[k][k].numerator, x[k][k].denominator) for k in range(5)]
    ng = normalized_columns[0]
    nf = sp.series(normalized_columns[1] / ng, z, 0, q).removeO()
    for k in range(1, 5):
        predicted = sp.series(ng * nf**k, z, 0, q).removeO()
        first = next(
            (n for n in range(q) if sp.expand(predicted).coeff(z, n) != normalized_columns[k].coeff(z, n)),
            None,
        )
        print("column-normalized ordinary", k, "first failure", first)

    # Exponential Riordan convention: divide lower row n by n! and multiply
    # column k by k! before applying the same ordinary-series test.
    ecolumns = [
        sum(
            sp.Rational(x[k][n].numerator, x[k][n].denominator)
            * sp.factorial(k)
            / sp.factorial(n)
            * z**n
            for n in range(k, q)
        )
        for k in range(5)
    ]
    eg = ecolumns[0]
    ef = sp.series(ecolumns[1] / eg, z, 0, q).removeO()
    print("eg", eg)
    print("ef", ef)
    for k in range(1, 5):
        predicted = sp.series(eg * ef**k, z, 0, q).removeO()
        first = next(
            (n for n in range(q) if sp.expand(predicted).coeff(z, n) != ecolumns[k].coeff(z, n)),
            None,
        )
        print("exponential column", k, "first failure", first)


if __name__ == "__main__":
    main()
