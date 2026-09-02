#!/usr/bin/env python3
"""Certify positivity and the polarized contraction form of the group core.

The all-order stability proof of the signed defect-one quadratic implies that

    K_N(X,Y)=g_N(X)g_N(Y)-2g_(N-1)(X)g_(N-1)(Y)
             +g_(N-2)(X)g_(N-2)(Y)

is real stable.  This replay verifies a closed positive formula for every
coefficient and the two-slot polarized differential identity for G_(N,d).
The identities are symbolic/all-order; the finite ranges are audit evidence.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("defect1_positive_apolar_core_20260804.json")
Y, Z1, Z2, W1, W2 = sp.symbols("Y z1 z2 w1 w2")


def coefficient_closed(N: int, k: int) -> sp.Rational:
    if not 1 <= k <= N:
        return sp.S.Zero
    return sp.binomial(N + k - 1, N - k) / sp.factorial(k)


def positivity_ratio(N: sp.Expr, a: sp.Expr, b: sp.Expr) -> sp.Expr:
    numerator = 2 * (a + b - 1) * (
        a * b
        + (2 * N**2 - 4 * N + 1) * (a + b)
        - 3 * N**2
        + 6 * N
        - 2
    )
    denominator = (
        (N + a - 2) * (N + a - 1)
        * (N + b - 2) * (N + b - 1)
    )
    return sp.factor(sp.sympify(numerator) / sp.sympify(denominator))


def dsum(poly: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(order, k) * sp.diff(poly, X, k, Y, order - k)
        for k in range(order + 1)
    ))


def direct_group(N: int, d: int) -> sp.Expr:
    seeds_x = [hypergeometric_form(N - s, 1) for s in range(3)]
    seeds_y = [seed.subs(X, Y) for seed in seeds_x]
    return sp.expand(
        dsum(seeds_x[0] * seeds_y[0], d)
        - 2 * dsum(seeds_x[1] * seeds_y[1], d - 2)
        + dsum(seeds_x[2] * seeds_y[2], d - 4)
    )


def polarized_group(N: int, d: int) -> sp.Expr:
    g, h, j = [hypergeometric_form(N - s, 1) for s in range(3)]
    phi_x = g + h * (Z1 + Z2) + j * Z1 * Z2
    phi_y = (
        g.subs(X, Y)
        + h.subs(X, Y) * (W1 + W2)
        + j.subs(X, Y) * W1 * W2
    )
    product = phi_x * phi_y

    # Expand only the four state derivatives before applying S.  This is
    # algebraically identical to expanding the full six-variable operator,
    # but avoids carrying terms that the final zero specialization kills.
    zero = {Z1: 0, Z2: 0, W1: 0, W2: 0}
    state_0 = product.subs(zero)
    state_1 = (sp.diff(product, Z1, W1) + sp.diff(product, Z2, W2)).subs(zero)
    state_2 = sp.diff(product, Z1, W1, Z2, W2).subs(zero)
    return sp.expand(
        dsum(state_0, d) - dsum(state_1, d - 2) + dsum(state_2, d - 4)
    )


def squarefree_core(N: int) -> sp.Expr:
    """Top z1*z2 coefficient of Psi_X Phi_Y modulo z_i^2."""
    g, h, j = [hypergeometric_form(N - s, 1) for s in range(3)]
    psi_x = g * Z1 * Z2 - h * (Z1 + Z2) + j
    phi_y = (
        g.subs(X, Y)
        + h.subs(X, Y) * (Z1 + Z2)
        + j.subs(X, Y) * Z1 * Z2
    )
    px = sp.Poly(psi_x, Z1, Z2)
    py = sp.Poly(phi_y, Z1, Z2)
    return sp.expand(
        px.coeff_monomial(1) * py.coeff_monomial(Z1 * Z2)
        + px.coeff_monomial(Z1) * py.coeff_monomial(Z2)
        + px.coeff_monomial(Z2) * py.coeff_monomial(Z1)
        + px.coeff_monomial(Z1 * Z2) * py.coeff_monomial(1)
    )


def main() -> None:
    coefficient_checks = 0
    positivity_checks = 0
    for N in range(3, 61):
        polys = [sp.Poly(hypergeometric_form(N - s, 1), X) for s in range(3)]
        for s, poly in enumerate(polys):
            for k in range(1, N - s + 1):
                assert poly.nth(k) == coefficient_closed(N - s, k)
                coefficient_checks += 1

        for a in range(1, N + 1):
            for b in range(1, N + 1):
                observed = (
                    coefficient_closed(N, a) * coefficient_closed(N, b)
                    - 2 * coefficient_closed(N - 1, a) * coefficient_closed(N - 1, b)
                    + coefficient_closed(N - 2, a) * coefficient_closed(N - 2, b)
                )
                expected = sp.factor(
                    coefficient_closed(N, a)
                    * coefficient_closed(N, b)
                    * positivity_ratio(N, a, b)
                )
                assert observed == expected
                assert expected > 0
                positivity_checks += 1

    contraction_checks = []
    for m in range(1, 6):
        N, d = 3 * m + 4, 2 * m + 5
        assert sp.expand(polarized_group(N, d) - direct_group(N, d)) == 0
        contraction_checks.append(m)

    squarefree_core_checks = []
    for N in range(3, 31):
        g, h, j = [hypergeometric_form(N - s, 1) for s in range(3)]
        expected = sp.expand(
            g * g.subs(X, Y)
            - 2 * h * h.subs(X, Y)
            + j * j.subs(X, Y)
        )
        assert sp.expand(squarefree_core(N) - expected) == 0
        squarefree_core_checks.append(N)

    n, a, b = sp.symbols("N a b", positive=True, integer=True)
    ratio_residual = sp.factor(
        1
        - 2 * (n - a) * (n - b) / ((n + a - 1) * (n + b - 1))
        + (
            (n - a) * (n - a - 1) * (n - b) * (n - b - 1)
            / ((n + a - 1) * (n + a - 2) * (n + b - 1) * (n + b - 2))
        )
        - positivity_ratio(n, a, b)
    )
    assert ratio_residual == 0

    report = {
        "status": "PASS_ALL_ORDER_POSITIVE_APOLAR_CORE_AND_POLARIZED_CONTRACTION",
        "seed_coefficient": "[X^k]g_(N,1)=binom(N+k-1,N-k)/k!",
        "core": "g_N(X)g_N(Y)-2g_(N-1)(X)g_(N-1)(Y)+g_(N-2)(X)g_(N-2)(Y)",
        "coefficient_ratio": (
            "2(a+b-1)(ab+(2N^2-4N+1)(a+b)-3N^2+6N-2)/"
            "((N+a-2)(N+a-1)(N+b-2)(N+b-1))"
        ),
        "positivity_reason": (
            "The bracket is increasing in a,b for N>=2 and at a=b=1 "
            "equals (N-1)^2; all denominator factors are positive."
        ),
        "stable_polarization": (
            "Phi_N=g_N+g_(N-1)(z1+z2)+g_(N-2)z1z2 is the polarization "
            "of U^2 F_N(X,-1/U), hence is real stable."
        ),
        "group_contraction": (
            "G_(N,d)=[S^(d-4)(S^2-D_z1D_w1)(S^2-D_z2D_w2) "
            "Phi_N(X,z)Phi_N(Y,w)]_(z=w=0)"
        ),
        "squarefree_core": (
            "The same core is [z1 z2] of the squarefree product of "
            "Psi_N(X)=g_N z1z2-g_(N-1)(z1+z2)+g_(N-2) and Phi_N(Y). "
            "Both factors are stable; Sinclair Proposition 3.7 makes the "
            "squarefree product stable, giving an independent core proof."
        ),
        "seed_coefficient_checks": coefficient_checks,
        "strict_positive_core_coefficient_checks": positivity_checks,
        "endpoint_contraction_checks_m": contraction_checks,
        "squarefree_core_identity_checks_N": squarefree_core_checks,
        "scope": (
            "Coefficient and contraction identities are all-order algebra. "
            "The finite checks are replay evidence.  Stability of the core "
            "comes both from degree-two Grace apolarity and from stable "
            "squarefree multiplication of the two polarizations; the remaining "
            "group task is stability of the displayed "
            "two-slot graded contraction on this special polarized input."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
