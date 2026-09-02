#!/usr/bin/env python3
"""Exact root-retention and last-defect concavity checks for Delta^0..Delta^6.

For fixed core coefficients, the root variables are a=h5 and b=h6.  The
last defect D6 enters affinely through c7=(1-D6)c6^2/c5.  This replay proves
that every Newton coefficient Delta^0 through Delta^6 is separately concave in a, b, and D6
on n>=39 and 1/2<=a/c5<=1.  Consequently those three coordinates may be
reduced to their endpoints without sampling.
"""

from __future__ import annotations

import sympy as sp

from verify_rank7_terminal_broom_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
    t,
)


def nonnegative_coefficients(expression, variables) -> tuple[int, tuple[int, ...]]:
    polynomial = sp.Poly(sp.expand(expression), *variables, domain=sp.QQ)
    assert all(coefficient >= 0 for _, coefficient in polynomial.terms())
    return len(polynomial.terms()), tuple(polynomial.degree(v) for v in variables)


def main() -> int:
    N, S, A, B = sp.symbols("N S A B", nonnegative=True)
    coefficients = newton_coefficients(exact_decomposition())
    variables = (N, S, A, B, *c[:8], h[5], h[6])
    for rank in range(7):
        coefficient = coefficients[rank]
        root5 = -sp.diff(coefficient, h[5], 2).subs(t, 1)
        root6 = -sp.diff(coefficient, h[6], 2).subs(t, 1)
        last_defect = -sp.diff(coefficient, c[7], 2).subs(t, 1)
        root5 = root5.subs({sp.Symbol("n"): N + 39, h[6]: c[6] - B})
        root6 = root6.subs({sp.Symbol("n"): N + 39, h[5]: c[5] - A})
        last_defect = last_defect.subs(
            {sp.Symbol("n"): N + 39, h[5]: c[5] * (1 + S) / 2}
        )
        a_stats = nonnegative_coefficients(root5, variables)
        b_stats = nonnegative_coefficients(root6, variables)
        z_stats = nonnegative_coefficients(last_defect, variables)
        print(
            f"Delta^{rank}: -d2/da2 {a_stats}; "
            f"-d2/db2 {b_stats}; -d2/dc7^2 {z_stats}"
        )
    print("RANK7_LOW_MIDDLE_ROOT_Z_CONCAVITY_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
