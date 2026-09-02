#!/usr/bin/env python3
"""Certify the Chebyshev factorization behind the signed defect-one quadratic.

For n=N-1, let J_n be the quasi-Jacobi factor of the quadratic-Euler
parent.  The diagonal quadratic in the Euler index factors, after acting on
J_n, into two linear pencils made from consecutive Chebyshev families.  The
remaining diagonal multiplier is gamma_k=1/(k+1)!, a classical multiplier
sequence.  Consequently

    g_N(X) Z^2 - 2 g_(N-1)(X) Z + g_(N-2)(X)

is real stable in (X,Z) for every N>=3.

The script verifies the all-order identities over a long finite range and
records the exact formulas used by the paper proof.  The proof itself is the
Chebyshev recurrence/interlacing argument plus the Polya--Schur theorem, not
an extrapolation from the finite checks.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_defect1_quadratic_euler_parent import jacobi_block
from verify_umbral_hypergeometric_finite_free_structure import (
    X,
    hypergeometric_form,
)


OUT = Path("defect1_signed_quadratic_factorization_20260804.json")
Z = sp.symbols("z")


def chebyshev_pair(n: int) -> tuple[sp.Expr, sp.Expr]:
    """Return P_n^-, P_n^+ at x=1+X/2, including n=0,1."""
    x = 1 + X / 2
    if n % 2 == 0:
        r = n // 2
        u_r = sp.chebyshevu(r, x)
        u_previous = sp.chebyshevu(r - 1, x) if r else 0
        return sp.expand(u_r - u_previous), sp.expand(u_r + u_previous)
    r = (n - 1) // 2
    return sp.expand(sp.chebyshevu(r, x)), sp.expand(2 * sp.chebyshevt(r + 1, x))


def euler(poly: sp.Expr) -> sp.Expr:
    return sp.expand(X * sp.diff(poly, X))


def apply_euler_linear(poly: sp.Expr, constant: int, sign: int) -> sp.Expr:
    return sp.expand(constant * poly + sign * euler(poly))


def jacobi_quadratic(n: int) -> sp.Expr:
    """Q_n(E,Z)J_n with the three ordered without-replacement weights."""
    jacobi = jacobi_block(n)
    survive_survive = apply_euler_linear(
        apply_euler_linear(jacobi, n + 1, +1), n, +1
    )
    hit_survive = apply_euler_linear(
        apply_euler_linear(jacobi, n, +1), n, -1
    )
    hit_hit = apply_euler_linear(
        apply_euler_linear(jacobi, n - 1, -1), n, -1
    )
    return sp.expand(survive_survive * Z**2 - 2 * hit_survive * Z + hit_hit)


def gamma_transform(poly: sp.Expr) -> sp.Expr:
    source = sp.Poly(sp.expand(poly), X)
    return sp.expand(
        sum(
            source.nth(k) * X**k / sp.factorial(k + 1)
            for k in range(source.degree() + 1)
        )
    )


def main() -> None:
    factor_checks = []
    output_checks = []
    recurrence_checks = []
    for n in range(2, 101):
        p_minus, p_plus = chebyshev_pair(n)
        previous_minus, previous_plus = chebyshev_pair(n - 2)
        factored = sp.expand(
            n
            * (Z * p_minus - previous_minus)
            * (Z * p_plus - previous_plus)
        )
        direct = jacobi_quadratic(n)
        assert sp.expand(direct - factored) == 0
        factor_checks.append(n)

        # Each parity subsequence is a consecutive Chebyshev family.  These
        # recurrences also supply an elementary all-order verification of the
        # factor formula and the strict interlacing used in the proof.
        if n >= 4:
            older_minus, older_plus = chebyshev_pair(n - 4)
            x = 1 + X / 2
            assert sp.expand(p_minus - 2 * x * previous_minus + older_minus) == 0
            assert sp.expand(p_plus - 2 * x * previous_plus + older_plus) == 0
            recurrence_checks.append(n)

        N = n + 1
        signed = sp.expand(
            hypergeometric_form(N, 1) * Z**2
            - 2 * hypergeometric_form(N - 1, 1) * Z
            + hypergeometric_form(N - 2, 1)
        )
        from_factor = sp.expand(X * gamma_transform(factored) / n)
        assert sp.expand(signed - from_factor) == 0
        output_checks.append(N)

    report = {
        "status": "PASS_ALL_ORDER_SIGNED_QUADRATIC_FACTORIZATION",
        "signed_quadratic": "g_N(X)z^2-2g_(N-1)(X)z+g_(N-2)(X)",
        "ambient_index": "n=N-1",
        "jacobi_factor": "J_n=2F1(-n,n;3/2;-X/4)",
        "euler_quadratic": (
            "Q_n(k,z)=(n+k)(n+k+1)z^2-2(n-k)(n+k)z+"
            "(n-k)(n-k-1)"
        ),
        "factorization": (
            "Q_n(E,z)J_n=n(zP_n^- - P_(n-2)^-)(zP_n^+ - P_(n-2)^+)"
        ),
        "chebyshev_families": {
            "n=2r": "P_n^-=V_r(1+X/2), P_n^+=W_r(1+X/2)",
            "n=2r+1": "P_n^-=U_r(1+X/2), P_n^+=2T_(r+1)(1+X/2)",
        },
        "output_identity": (
            "signed_quadratic=(X/n) M_gamma[Q_n(E,z)J_n], "
            "gamma_k=1/(k+1)!"
        ),
        "stability_proof": (
            "Within each parity, P_(n-2) strictly interlaces P_n and all roots "
            "lie in (-4,0), so P_(n-2)/P_n maps the upper half-plane to the "
            "lower half-plane.  Hence each linear pencil is real stable.  The "
            "sequence gamma_k=1/(k+1)! is a Polya--Schur multiplier sequence, "
            "because its exponential generating function is "
            "I_1(2sqrt(t))/sqrt(t) and has only negative real zeros."
        ),
        "exact_factor_range_n": [factor_checks[0], factor_checks[-1]],
        "exact_factor_checks": len(factor_checks),
        "exact_output_range_N": [output_checks[0], output_checks[-1]],
        "exact_output_checks": len(output_checks),
        "chebyshev_recurrence_checks": len(recurrence_checks),
        "scope": (
            "The displayed identities follow all-order from the stated "
            "Chebyshev recurrences and coefficient formula.  The finite checks "
            "are replay evidence.  The real-stability conclusion uses standard "
            "Chebyshev interlacing and the Polya--Schur multiplier theorem."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
