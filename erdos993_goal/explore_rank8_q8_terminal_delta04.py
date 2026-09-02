#!/usr/bin/env python3
"""Low-memory symbolic exploration of the remaining rank-eight coefficients."""

from __future__ import annotations

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def main() -> None:
    coefficients = newton_coefficients(residual())
    n = sp.symbols("n", integer=True, positive=True)
    exact = {c[0]: 1, c[1]: n, c[2]: choose_poly(n - 1, 2)}
    for rank in range(5):
        coefficient = sp.expand(coefficients[rank].subs(exact))
        variables = (*c[3:9], h[6], h[7], n)
        print("rank", rank, "terms", len(sp.Poly(coefficient, *variables).terms()))
        print("d2_h7", sp.factor(sp.diff(coefficient, h[7], 2)))
        print("d_c8", sp.factor(sp.diff(coefficient, c[8])))

    S, E = sp.symbols("S E", nonnegative=True)
    c8_q7 = c[7] * (14 * c[7] - c[6]) / (16 * c[6])
    for rank in range(5):
        coefficient = coefficients[rank].subs(exact)
        capacity_q7 = coefficient.subs(
            {
                h[6]: S * c[6],
                h[7]: E * (n - 7) * S * c[6] / 7,
                c[8]: c8_q7,
            },
            simultaneous=True,
        )
        curvature = sp.factor(sp.diff(capacity_q7, c[7], 2))
        print("rank", rank, "q7_capacity_d2_c7", curvature)

    Z = sp.symbols("Z", nonnegative=True)
    q = 6 * c[7] / ((n - 7) * c[6])
    coefficient4 = coefficients[4].subs(exact)
    S_lcross = 1 - q + q * Z
    lcross = coefficient4.subs(
        {h[6]: S_lcross * c[6], h[7]: c[7] * Z, c[8]: c8_q7},
        simultaneous=True,
    )
    print("rank 4 lcross_d2_Z", sp.factor(sp.diff(lcross, Z, 2)))
    S_uc7 = 7 * q / 6 + (1 - 7 * q / 6) * Z
    uc7 = coefficient4.subs(
        {h[6]: S_uc7 * c[6], h[7]: c[7], c[8]: c8_q7},
        simultaneous=True,
    )
    print("rank 4 uc7_d2_Z", sp.factor(sp.diff(uc7, Z, 2)))

    mu4_lower = n - 12 + sp.Rational(8, 1) / n
    c4_bracket = sp.factor(-512 * n + 5408 + sp.Rational(1728, 5) * mu4_lower)
    c3_bracket = 42 * n**2 - 1102 * n + 5752
    scalar = sp.factor(c3_bracket + (n - 3) * c4_bracket / 4)
    scalar_shifted = sp.Poly(sp.expand((20 * n * scalar).subs(n, sp.symbols("m", nonnegative=True) + 23)))
    base_polynomial = 21 * n**4 - 358 * n**3 + 1963 * n**2 - 3698 * n + 2072
    with_c3_upper = sp.factor(base_polynomial + choose_poly(n, 3) * scalar)
    print("rank 4 lcross_c4_bracket", c4_bracket)
    print("rank 4 lcross_scalar_after_extension", scalar)
    print("rank 4 lcross_scalar_shifted_coeffs", scalar_shifted.all_coeffs())
    print("rank 4 lcross_with_c3_upper", with_c3_upper)
    path_bracket = sp.factor(
        (
            c[3] * c3_bracket
            + c[4] * (-512 * n + 5408)
            + 1728 * c[5]
            + base_polynomial
        ).subs(
            {
                c[3]: choose_poly(n - 2, 3),
                c[4]: choose_poly(n - 3, 4),
                c[5]: choose_poly(n - 4, 5),
            }
        )
    )
    print("rank 4 lcross_path_bracket", path_bracket)

    mu5_lower = n - 15 + sp.Rational(10, 1) / n
    y_lower = (2 * mu5_lower - 7) / 14
    c4_curvature_payment = sp.factor(
        4112 + 3360 * y_lower - sp.Rational(64, 5) * (n - 4)
    )
    m = sp.symbols("m", nonnegative=True)
    c4_curvature_shift = sp.Poly(
        sp.expand((35 * n * c4_curvature_payment).subs(n, m + 23)), m
    )
    print("rank 4 c7_curvature_c4_payment", c4_curvature_payment)
    print("rank 4 c7_curvature_payment_shift", c4_curvature_shift.all_coeffs())

    for rank in (0, 1):
        derivative = sp.diff(coefficients[rank].subs(exact), c[8])
        path_endpoint = {
            c[j]: choose_poly(n - j + 1, j) for j in range(3, 9)
        }
        path_endpoint.update(
            {
                h[6]: choose_poly(n - 7, 6),
                h[7]: choose_poly(n - 8, 7),
            }
        )
        value = sp.factor(derivative.subs(path_endpoint))
        print("rank", rank, "path_endpoint_dc8", value)


if __name__ == "__main__":
    main()
