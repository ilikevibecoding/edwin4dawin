"""Test a split-marker strengthening of the bottom target.

The desired target is F(1,X,Y), where

 F(z,X,Y) = (z d_X+d_Y)^d g(X)g(Y)
            -(z d_X+d_Y)^(d-2) h(X)h(Y).

If this trivariate polynomial were stable, specializing z=1 would prove the
bottom lemma and would explain why the stable split pieces can be summed.
Search directly for upper-half-plane roots in z after fixing X,Y there.
"""

from __future__ import annotations

import random

import numpy as np
import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


Y, Z = sp.symbols("y z")


def split_polynomial(N: int, d: int) -> sp.Poly:
    g = hypergeometric_form(N, 3)
    h = hypergeometric_form(N - 1, 3)
    expression = sum(
        sp.binomial(d, k)
        * Z**k
        * sp.diff(g, X, k)
        * sp.diff(g, X, d - k).subs(X, Y)
        for k in range(d + 1)
    ) - sum(
        sp.binomial(d - 2, k)
        * Z**k
        * sp.diff(h, X, k)
        * sp.diff(h, X, d - 2 - k).subs(X, Y)
        for k in range(d - 1)
    )
    return sp.Poly(sp.expand(expression), Z, X, Y)


def roots_in_z(poly: sp.Poly, x: complex, y: complex) -> np.ndarray:
    expression = poly.as_expr()
    univariate = sp.Poly(expression.subs({X: x, Y: y}), Z)
    coefficients = np.array([complex(c) for c in univariate.all_coeffs()])
    coefficients = np.trim_zeros(coefficients, "f")
    return np.roots(coefficients)


def main() -> None:
    rng = random.Random(993_080_3)
    for m in range(1, 7):
        N, d = 3 * m + 3, 2 * m + 3
        polynomial = split_polynomial(N, d)
        witness = None
        maximum = -float("inf")
        for trial in range(1000):
            x = rng.uniform(-100, 20) + 1j * 10 ** rng.uniform(-3, 2)
            y = rng.uniform(-100, 20) + 1j * 10 ** rng.uniform(-3, 2)
            roots = roots_in_z(polynomial, x, y)
            local = max(root.imag for root in roots)
            maximum = max(maximum, local)
            if local > 1e-7:
                witness = (trial, x, y, max(roots, key=lambda root: root.imag))
                break
        print(
            f"m={m} N={N} d={d} split_z_degree={polynomial.degree(Z)} "
            f"max_imaginary_root={maximum:.9g} witness={witness}",
            flush=True,
        )


if __name__ == "__main__":
    main()
