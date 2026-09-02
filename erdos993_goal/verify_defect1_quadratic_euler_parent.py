#!/usr/bin/env python3
"""Certify the common quadratic-Euler parent of three defect-one seeds.

For g=g_(N,1), h=g_(N-1,1), and j=g_(N-2,1), a single negative-rooted
polynomial A_N makes all three diagonal quadratic Euler images.  The
nonzero factor of A_N is a multiplicative finite-free convolution of a
Laguerre polynomial and a quasi-Jacobi polynomial.  The latter is a positive
linear combination of consecutive fourth-kind Chebyshev polynomials, which
gives its real-rootedness uniformly.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from verify_defect3_common_finite_free_factor import (
    finite_free_multiplicative,
    reverse_at_degree,
)
from verify_umbral_hypergeometric_finite_free_structure import (
    X,
    hypergeometric_form,
    terminating_2f2,
)


OUT = Path("defect1_quadratic_euler_parent_20260804.json")
Z = sp.symbols("z")


def parent(N: int) -> sp.Expr:
    return sp.expand(
        hypergeometric_form(N, 1)
        + sp.Rational(4 * (N - 1), 2 * N - 3) * hypergeometric_form(N - 1, 1)
        + sp.Rational(2 * N - 1, 2 * N - 3) * hypergeometric_form(N - 2, 1)
    )


def euler(poly: sp.Expr) -> sp.Expr:
    return sp.expand(X * sp.diff(poly, X))


def apply_linear_euler(poly: sp.Expr, constant: int, sign: int) -> sp.Expr:
    return sp.expand(constant * poly + sign * euler(poly))


def jacobi_block(n: int) -> sp.Expr:
    return sp.expand(
        sum(
            sp.rf(-n, k)
            * sp.rf(n, k)
            / (sp.rf(sp.Rational(3, 2), k) * sp.factorial(k))
            * (-X / 4) ** k
            for k in range(n + 1)
        )
    )


def laguerre_block(n: int) -> sp.Expr:
    return sp.expand(
        sum(
            sp.rf(-n, k)
            / (sp.rf(2, k) * sp.factorial(k))
            * X**k
            for k in range(n + 1)
        )
    )


def cleared(poly: sp.Poly) -> fmpz_poly:
    denominator = sp.ilcm(*[sp.denom(value) for value in poly.all_coeffs()])
    return fmpz_poly(
        [int(poly.nth(power) * denominator) for power in range(poly.degree() + 1)]
    )


def main() -> None:
    n_symbol, k_symbol = sp.symbols("N k", integer=True, positive=True)
    D = 2 * (n_symbol - 1) * (2 * n_symbol - 1)
    h_over_g = (n_symbol - k_symbol) / (n_symbol + k_symbol - 1)
    j_over_g = (
        (n_symbol - k_symbol)
        * (n_symbol - k_symbol - 1)
        / ((n_symbol + k_symbol - 1) * (n_symbol + k_symbol - 2))
    )
    a_over_g = sp.factor(
        1
        + 4 * (n_symbol - 1) / (2 * n_symbol - 3) * h_over_g
        + (2 * n_symbol - 1) / (2 * n_symbol - 3) * j_over_g
    )
    assert sp.factor(a_over_g - D / ((n_symbol + k_symbol - 1) * (n_symbol + k_symbol - 2))) == 0

    direct = []
    finite_free = []
    chebyshev = []
    root_records = []
    ctx.prec = 160
    for N in range(3, 61):
        n = N - 1
        g = hypergeometric_form(N, 1)
        h = hypergeometric_form(N - 1, 1)
        j = hypergeometric_form(N - 2, 1)
        a = parent(N)
        denominator = 2 * (N - 1) * (2 * N - 1)

        g_from_a = apply_linear_euler(
            apply_linear_euler(a, N - 2, +1), N - 1, +1
        ) / denominator
        h_from_a = apply_linear_euler(
            apply_linear_euler(a, N, -1), N - 2, +1
        ) / denominator
        j_from_a = apply_linear_euler(
            apply_linear_euler(a, N, -1), N - 1, -1
        ) / denominator
        assert sp.expand(g - g_from_a) == 0
        assert sp.expand(h - h_from_a) == 0
        assert sp.expand(j - j_from_a) == 0
        assert sp.expand(
            a - 2 * (2 * N - 1) * X * terminating_2f2(
                n, n, sp.Rational(3, 2), 2
            )
        ) == 0
        direct.append(N)

        jacobi = jacobi_block(n)
        laguerre = laguerre_block(n)
        output = terminating_2f2(n, n, sp.Rational(3, 2), 2)
        assert sp.expand(
            finite_free_multiplicative(
                reverse_at_degree(jacobi, n),
                reverse_at_degree(laguerre, n),
                n,
            )
            - reverse_at_degree(output, n)
        ) == 0
        finite_free.append(N)

        # With x=1+X/2, the quasi-Jacobi block is a positive combination
        # of W_(n-1)(x) and W_n(x), up to the harmless positive scaling.
        x_cheb = 1 + X / 2
        w_previous = sp.chebyshevu(n - 1, x_cheb) + (
            sp.chebyshevu(n - 2, x_cheb) if n >= 2 else 0
        )
        w_current = sp.chebyshevu(n, x_cheb) + sp.chebyshevu(n - 1, x_cheb)
        fourth_kind_combo = sp.expand(
            sp.Rational(1, 2)
            * (
                w_previous / (2 * n - 1)
                + w_current / (2 * n + 1)
            )
        )
        assert sp.expand(jacobi - fourth_kind_combo) == 0
        chebyshev.append(N)

        roots = cleared(sp.Poly(a, X)).complex_roots()
        real = sum(multiplicity for root, multiplicity in roots if root.imag.is_zero())
        nonreal = sum(multiplicity for root, multiplicity in roots if not root.imag.is_zero())
        nonpositive = all(
            root.real.upper() <= 0 for root, _ in roots if root.imag.is_zero()
        )
        assert real == N and nonreal == 0 and nonpositive
        root_records.append({"N": N, "real_roots": real, "nonreal_roots": nonreal})

    report = {
        "status": "PASS_ALL_ORDER_QUADRATIC_EULER_PARENT_IDENTITIES",
        "parent": (
            "A_N=g_N+4(N-1)/(2N-3)g_(N-1)+(2N-1)/(2N-3)g_(N-2)"
        ),
        "hypergeometric_parent": (
            "A_N=2(2N-1)X 2F2(-(N-1),N-1;3/2,2;-X/4)"
        ),
        "euler_images": {
            "g_N": "(E+N-1)(E+N-2)A_N/[2(N-1)(2N-1)]",
            "g_(N-1)": "(N-E)(E+N-2)A_N/[2(N-1)(2N-1)]",
            "g_(N-2)": "(N-E)(N-E-1)A_N/[2(N-1)(2N-1)]",
        },
        "symbolic_coefficient_parent_ratio": str(a_over_g),
        "finite_free_factorization": (
            "2F1(-n,n;3/2;-X/4) boxtimes_n 1F1(-n;2;X)"
        ),
        "root_proof_route": (
            "The first factor is a positive combination of consecutive "
            "fourth-kind Chebyshev polynomials and hence real-rooted; it has "
            "no positive-X root.  The Laguerre factor is positive-rooted, and "
            "multiplicative finite-free convolution preserves real roots and sign."
        ),
        "direct_identity_range": [direct[0], direct[-1]],
        "direct_identity_checks": len(direct),
        "finite_free_checks": len(finite_free),
        "chebyshev_checks": len(chebyshev),
        "certified_root_range": [root_records[0]["N"], root_records[-1]["N"]],
        "certified_root_cases": len(root_records),
        "scope": (
            "The Euler and hypergeometric identities are all-order coefficient "
            "identities.  The negative-root proof uses the stated classical "
            "Chebyshev interlacing and finite-free preservation theorem; the "
            "root isolations are finite replay evidence."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
