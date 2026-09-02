#!/usr/bin/env python3
"""Symbolic all-order proof certificate for the full-left core network.

The twice-reduced coefficient columns D_m,R_m are generated from positive
two-term seed columns by layers of positive upper-bidiagonal operations.
For 0 <= s <= m, the partial columns have explicit falling-factorial forms
with a quadratic residual.  Two polynomial identities prove the layer
recurrences for arbitrary m,s,n.  Seed and endpoint identities then prove
the complete positive bidiagonal factorization at every finite width.

Unlike the companion finite Neville audits, the central checks here are
symbolic identities in independent indeterminates and therefore all-order.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUT = Path("full_left_core_network_proof_20260803.json")
n, m, s = sp.symbols("n m s")


def q_even(mm=m, ss=s):
    d = mm - ss
    return sp.factor(
        2 * (2 * mm + 5) / (mm + 1)
        * (
            4 * mm * (mm + 1) * n**2
            + (22 * mm**2 + 25 * mm + 3 - 3 * ss * (2 * mm + 1)) * n
            + 15 * mm**2
            + 27 * mm
            + 9
            + 3 * (4 * mm + 5) * d
            + 3 * d * (d - 1)
        )
    )


def q_odd(mm=m, ss=s):
    d = mm - ss
    return sp.factor(
        2 * (2 * mm + 5) * (2 * mm + 7) / (mm + 2)
        * (
            (2 * mm + 1) * (2 * mm + 3) * n**2
            + (16 * mm**2 + 41 * mm + 21 + 6 * (mm + 1) * d) * n
            + 3 * (mm + 2) * (5 * mm + 6)
            + 12 * (mm + 2) * d
            + 3 * d * (d - 1)
        )
    )


def even_pivot(mm=m):
    return 2 * (2 * mm + 1) * (2 * mm + 5) * (4 * mm + 3)


def odd_pivot(mm=m):
    return (
        2
        * (mm + 1)
        * (2 * mm + 3)
        * (2 * mm + 5)
        * (2 * mm + 7)
        * (4 * mm + 5)
        / (mm + 2)
    )


def even_subdiagonal(mm=m):
    return 4 * mm / ((2 * mm + 1) * (4 * mm + 3))


def odd_subdiagonal(mm=m):
    return (2 * mm + 1) / ((mm + 1) * (4 * mm + 5))


def main():
    qe = q_even()
    qo = q_odd()

    # The falling/rising common factors reduce the two layer recurrences to
    # these fixed cubic identities.
    even_layer = sp.factor(
        (n + s + 1) * qe
        - (n - 2 * m + s) * q_even(m, s - 1)
        - q_odd(m - 1, s - 1)
    )
    odd_layer = sp.factor(
        (n + s + 1) * qo
        - (n - 2 * m + s - 1) * q_odd(m, s - 1)
        - 2 * (m + 1) * (2 * m + 7) * q_even(m, s - 1)
    )

    # At s=0, the gamma-ratio factor
    # (n+2)(n+4)_(-2)=1/(n+3) leaves a two-term seed column.
    even_seed = sp.factor(
        q_even(m, 0) / (n + 3)
        - even_pivot(m)
        * (1 + even_subdiagonal(m) * (n - 2 * m))
    )
    odd_seed = sp.factor(
        q_odd(m, 0) / (n + 3)
        - odd_pivot(m)
        * (1 + odd_subdiagonal(m) * (n - (2 * m + 1)))
    )
    boundary_seed = sp.factor(q_even(0, 0) / (n + 3) - 30)

    # At s=m, the partial columns are precisely the reduced D_m,R_m
    # columns derived algebraically from E_m,O_m.
    d_endpoint = sp.factor(
        q_even(m, m)
        - 2 * (2 * m + 5) / (m + 1)
        * (
            4 * m * (m + 1) * n**2
            + (16 * m**2 + 22 * m + 3) * n
            + 15 * m**2
            + 27 * m
            + 9
        )
    )
    r_endpoint = sp.factor(
        q_odd(m, m)
        - 2 * (2 * m + 5) * (2 * m + 7) / (m + 2)
        * (
            (2 * m + 1) * (2 * m + 3) * n**2
            + (16 * m**2 + 41 * m + 21) * n
            + 3 * (m + 2) * (5 * m + 6)
        )
    )

    # Verify that the two endpoint quadratics really arise from the original
    # E_m,O_m columns by the two pair cancellations.  Common positive
    # falling/rising factors have been divided out in these identities.
    p_cubic = (
        n**3
        + 3 * (m + 3) * n**2
        + sp.Rational(1, 4) * (48 * m + 119) * n
        + 3 * (15 * m**2 + 56 * m + 47) / (4 * (m + 1))
    )
    d_pair_reduction = sp.factor(
        (2 * n + 3) * (2 * n + 5) * (n + m + 2) * (n + m + 3)
        - 4 * (n - m) * p_cubic
        - q_even(m, m)
    )
    r_pair_reduction = sp.factor(
        8 * (m + 1) * (2 * m + 7) * p_cubic
        - (n + m + 2) * q_even(m + 1, m + 1)
        - q_odd(m, m)
    )

    residuals = {
        "even_layer": even_layer,
        "odd_layer": odd_layer,
        "even_seed": even_seed,
        "odd_seed": odd_seed,
        "boundary_seed": boundary_seed,
        "d_endpoint": d_endpoint,
        "r_endpoint": r_endpoint,
        "d_pair_reduction": d_pair_reduction,
        "r_pair_reduction": r_pair_reduction,
    }
    status = "PASS" if all(value == 0 for value in residuals.values()) else "FAIL"
    report = {
        "status": status,
        "symbolic_zero_residuals": {
            name: str(value) for name, value in residuals.items()
        },
        "positive_network_weights": {
            "even_layer_edge": "1",
            "odd_layer_edge": "2*(r+1)*(2*r+7)",
            "even_pivot": "2*(2*m+1)*(2*m+5)*(4*m+3)",
            "odd_pivot": (
                "2*(m+1)*(2*m+3)*(2*m+5)*(2*m+7)*(4*m+5)/(m+2)"
            ),
            "even_seed_subdiagonal": "4*m/((2*m+1)*(4*m+3))",
            "odd_seed_subdiagonal": "(2*m+1)/((m+1)*(4*m+5))",
        },
        "scope": (
            "All-order symbolic proof of the positive layer factorization "
            "for the twice-reduced core.  Combined with the two explicit "
            "TN pair-reduction factors and the Pascal falling-factorial "
            "collocation matrix, this proves the complete left factor TN."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(status, report)


if __name__ == "__main__":
    main()
