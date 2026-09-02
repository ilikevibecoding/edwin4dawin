#!/usr/bin/env python3
"""Derive the strong-isolate defect for an adjacent protected pair.

The base is K2 + t K1, with the endpoints of K2 protected.  This is
the L=1 path boundary where the nominal consecutive-path minors
coalesce.  The script constructs the exact moment rows symbolically
and derives

  D_q(t)=T_q(t+1)-T_q(t)-T_(q-1)(t).
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from stress_sibling_theta_core_recursive_phase_split import (
    core_blocks_from_moments,
)


def isolate_row(n, k):
    count = sp.binomial(n, k)
    residual = n - k
    return (
        count,
        residual * count,
        residual**2 * count,
        residual * count,
    )


def edge_isolate_row(t, k):
    neither = sp.binomial(t, k)
    one = 2 * sp.binomial(t, k - 1)
    return (
        neither + one,
        (t - k + 2) * neither + (t - k + 1) * one,
        (t - k + 2) ** 2 * neither
        + (t - k + 1) ** 2 * one,
        (t - k + 1) * neither + (t - k + 1) * one,
    )


def terminal_gap(q, t):
    b = lambda rank: edge_isolate_row(t, rank)
    j = lambda rank: isolate_row(t + 1, rank)
    k = lambda rank: isolate_row(t, rank)

    N, S, H, C = b(q)
    X = j(q)[0]
    root_residual = k(q)[0]
    Y = X - root_residual
    HX = j(q)[1] + root_residual
    old_a = (N, S, H, C, X, Y, HX)
    old_m = j(q - 1)
    old_p = j(q - 2)

    support_absent = j(q)[0]
    support_residual = k(q)[0]
    support_hit = support_absent - support_residual
    support_absent_mass = j(q)[1] + support_residual
    root_support_absent = k(q)[0]

    lower_n, lower_s, lower_h, lower_c = j(q - 1)
    lower_x = k(q - 1)[0]
    lower_root_residual = k(q - 1)[0]
    lower_y = sp.Integer(0)
    lower_hx = k(q - 1)[1] + lower_root_residual
    lower_a = (
        lower_n,
        lower_s,
        lower_h,
        lower_c,
        lower_x,
        lower_y,
        lower_hx,
    )
    lower_m = k(q - 2)
    lower_p = k(q - 3)

    M, T, J2, D = old_m
    A1 = k(q - 1)[0]
    residual1 = k(q - 1)[0]
    B1 = sp.Integer(0)
    HA1 = k(q - 1)[1] + residual1
    m, u, k2, e = lower_m

    P, U, K2, E = old_p
    A2 = k(q - 2)[0]
    residual2 = k(q - 2)[0]
    B2 = sp.Integer(0)
    HA2 = k(q - 2)[1] + residual2
    p, V, L2, F = lower_p

    new_a = (
        N + lower_n,
        S + support_absent + lower_s,
        H + 2 * support_absent_mass + support_absent + lower_h,
        C + support_hit + lower_c,
        X + lower_x,
        Y + lower_y,
        HX + root_support_absent + lower_hx,
    )
    new_m = (
        M + m,
        T + A1 + u,
        J2 + 2 * HA1 + A1 + k2,
        D + B1 + e,
    )
    new_p = (
        P + p,
        U + A2 + V,
        K2 + 2 * HA2 + A2 + L2,
        E + B2 + F,
    )

    old = core_blocks_from_moments(q, old_a, old_m, old_p)
    lower = core_blocks_from_moments(
        q - 1, lower_a, lower_m, lower_p
    )
    new = core_blocks_from_moments(q, new_a, new_m, new_p)
    return sp.expand(
        sum(new.values()) - sum(old.values()) - sum(lower.values())
    )


def main() -> None:
    q, t, r, x = sp.symbols(
        "q t r x", integer=True, nonnegative=True
    )
    gap = sp.factor(sp.combsimp(terminal_gap(q, t)))
    defect = sp.factor(
        sp.combsimp(
            sp.expand(
                terminal_gap(q, t + 1)
                - terminal_gap(q, t)
                - terminal_gap(q - 1, t)
            )
        )
    )
    defect_polynomial = sp.factor(
        defect
        * sp.factorial(q)
        * sp.factorial(q - 2)
        * sp.factorial(-q + t + 3)
        * sp.factorial(-q + t + 4)
        / (4 * sp.factorial(t) ** 2)
    )
    shifted_polynomial = sp.Poly(
        sp.expand(
            defect_polynomial.subs(
                {q: r + 4, t: r + x + 1}
            )
        ),
        r,
        x,
    )
    shifted_terms = [
        {
            "r_degree": monomial[0],
            "x_degree": monomial[1],
            "coefficient": int(coefficient),
        }
        for monomial, coefficient in shifted_polynomial.terms()
    ]
    positive_certificate = all(
        term["coefficient"] > 0 for term in shifted_terms
    )
    if not positive_certificate:
        raise AssertionError("shifted positivity certificate failed")
    report = {
        "status": (
            "PASS_ADJACENT_ENDPOINT_ISOLATE_P4_ALL_RANKS"
        ),
        "base": "K2 + t K1 with the K2 endpoints protected",
        "terminal_gap_T_q_t": str(gap),
        "strong_isolate_defect_D_q_t": str(defect),
        "valid_nonzero_range": "q >= 4 and t >= q-3",
        "positive_shift": {
            "substitution": "q=r+4, t=q-3+x=r+x+1",
            "variables": "r,x nonnegative integers",
            "polynomial": str(shifted_polynomial.as_expr()),
            "nonzero_terms": len(shifted_terms),
            "minimum_coefficient": min(
                term["coefficient"] for term in shifted_terms
            ),
            "all_coefficients_strictly_positive": (
                positive_certificate
            ),
            "terms": shifted_terms,
        },
        "zero_range": (
            "For 0 <= t < q-3 every involved face row is beyond "
            "the independence number, so D_q(t)=0."
        ),
        "conclusion": (
            "D_q(t)>=0 for every q>=4 and t>=0; hence P4 holds "
            "on the adjacent-endpoint terminal family."
        ),
    }
    Path(
        "adjacent_endpoint_isolate_p4_identity_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
