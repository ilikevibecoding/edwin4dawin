#!/usr/bin/env python3
"""Symbolic low-Newton formulas for the centered-star terminal payment.

The target is rank four (j=3), the observed extremal family for the low
terminal-payment coefficients.  This is an exact family calculation, not an
all-tree proof.
"""

from __future__ import annotations

import sympy as sp


def newton_coefficients(expression: sp.Expr, variable: sp.Symbol, degree: int):
    values = [sp.expand_func(expression.subs(variable, point)).expand() for point in range(degree + 1)]
    output = []
    for _ in range(degree + 1):
        output.append(sp.factor(values[0]))
        values = [sp.expand(right - left) for left, right in zip(values, values[1:])]
        if not values:
            break
    return output


def main() -> None:
    n, s = sp.symbols("n s", integer=True, nonnegative=True)
    j = 3
    a = sp.binomial(n - 1, 2)
    b = sp.binomial(n - 1, j)
    P = sp.binomial(n + s, 3) + sp.binomial(s + 1, 2)
    R = (n - 1) * sp.binomial(s + 1, 2)
    U = sp.binomial(n + s, j + 1) + sp.binomial(s + 1, j)
    c = (1 + s) * a
    e = (1 + s) * b
    M = sp.expand_func((j + 1) * b * c - 3 * a * e).expand()
    A = sp.expand_func(P * c - a * R).expand()
    delta = sp.expand_func(
        P * (P + a) * M - (j + 1) * A * (P * b - a * U)
    ).expand()
    main_payment = sp.expand_func((j + 1) * a * A * U).expand()
    low_remainder = sp.expand(delta - main_payment)
    assert sp.expand(delta - main_payment - low_remainder) == 0
    assert sp.Poly(delta, s).degree() == 8

    total = newton_coefficients(delta, s, 8)
    positive = newton_coefficients(main_payment, s, 8)
    low = newton_coefficients(low_remainder, s, 8)
    for rank, (whole, main, remainder) in enumerate(zip(total, positive, low)):
        assert sp.expand(whole - main - remainder) == 0
        print(f"m={rank}")
        print(f"  delta_m = {sp.factor(whole)}")
        print(f"  main_m  = {sp.factor(main)}")
        print(f"  low_m   = {sp.factor(remainder)}")
        if remainder != 0:
            print(f"  ratio   = {sp.factor(main / -remainder)}")


if __name__ == "__main__":
    main()
