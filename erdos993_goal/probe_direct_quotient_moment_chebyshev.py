#!/usr/bin/env python3
"""Test the Catalan-moment Chebyshev route for direct G(1)^(-1) C."""

from fractions import Fraction as F
from itertools import combinations

import sympy as sp

from fast_bottom_forward import (
    beta_coefficients,
    central_k,
    eye,
    inverse_upper,
    matmul,
)
from probe_beta_newton_coordinates import beta_newton_lower, inverse_lower_unit
from probe_switch_gauge_quotient import confluent_switch_coefficients


x = sp.symbols("x")


def preceding_factor(q):
    lower_inverse = inverse_lower_unit(beta_newton_lower(q))
    g_upper = matmul(lower_inverse, confluent_switch_coefficients(q, F(1)))
    b_upper = matmul(lower_inverse, beta_coefficients(q))
    transition = matmul(inverse_upper(g_upper), b_upper)
    reversal = [row[::-1] for row in eye(q)]
    return matmul(matmul(transition, central_k(q + 1)), reversal)


def poly(row):
    return sp.Poly(sum(sp.Rational(v.numerator, v.denominator) * x**i for i, v in enumerate(row)), x)


def wronskian(polynomials):
    k = len(polynomials)
    matrix = [
        [sp.diff(polynomials[i].as_expr(), x, j) for j in range(k)]
        for i in range(k)
    ]
    return sp.Poly(sp.factor(sp.det(sp.Matrix(matrix))), x)


def positive_on_interval(p, left=sp.Rational(0), right=sp.Rational(4)):
    if p.is_zero:
        return False, "zero"
    roots = p.count_roots(left, right)
    sample = p.eval(sp.Rational(2))
    return roots == 0 and sample > 0, (roots, sample)


def main():
    for q in range(2, 13):
        polynomials = [poly(row) for row in preceding_factor(q)]
        checked = 0
        for k in range(1, min(q, 5) + 1):
            expected = -1 if (k * (k - 1) // 2) % 2 else 1
            for rows in combinations(range(q), k):
                w = wronskian([polynomials[i] for i in rows])
                oriented = sp.Poly(expected * w.as_expr(), x)
                ok, detail = positive_on_interval(oriented)
                checked += 1
                if not ok:
                    print(
                        f"q={q} FAIL k={k} rows={rows} detail={detail} "
                        f"wronskian={sp.factor(w.as_expr())}"
                    )
                    return
        print(f"q={q} PASS checked={checked}", flush=True)


if __name__ == "__main__":
    main()
