#!/usr/bin/env python3
"""Derive the combined first-recursion phase gap on a bare path.

The base B is the path v--...--s with L edges (L+1 vertices).
All moment rows are written from the exact path independence and
one-edge sequences, so the resulting identity is symbolic in L and q.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp
from sympy.functions.combinatorial.factorials import (
    FallingFactorial as FF,
)

from stress_sibling_theta_core_recursive_phase_split import (
    core_blocks_from_moments,
)


def path_count(order, rank):
    return FF(order - rank + 1, rank) / sp.factorial(rank)


def path_row(order, rank):
    """Count, sum h, sum h^2, and sum c over I_rank(P_order)."""
    denominator = sp.factorial(rank)
    count = FF(order - rank + 1, rank) / denominator
    mass = FF(order - rank, rank + 1) / denominator
    residual_edges = FF(order - rank - 1, rank + 1) / denominator
    square = (
        mass
        + FF(order - rank - 1, rank + 2) / denominator
        + 2 * residual_edges
    )
    components = mass - residual_edges
    return count, mass, square, components


def symbolic_path_blocks():
    length, q = sp.symbols(
        "L q", integer=True, positive=True
    )
    # B=P_(L+1), J=B-v=P_L, K=B-{v,s}=P_(L-1).
    # The root and support residual minors are both P_(L-1);
    # after the opposite endpoint is removed they are P_(L-2).
    N, S, H, C = path_row(length + 1, q)
    X = path_count(length, q)
    root_residual = path_count(length - 1, q)
    Y = X - root_residual
    HX = path_row(length, q)[1] + root_residual
    old_a = (N, S, H, C, X, Y, HX)
    old_m = path_row(length, q - 1)
    old_p = path_row(length, q - 2)

    support_absent = path_count(length, q)
    support_residual = path_count(length - 1, q)
    support_hit = support_absent - support_residual
    support_absent_mass = (
        path_row(length, q)[1] + support_residual
    )
    root_support_absent = path_count(length - 1, q)

    lower_n, lower_s, lower_h, lower_c = path_row(
        length, q - 1
    )
    lower_x = path_count(length - 1, q - 1)
    lower_root_residual = path_count(length - 2, q - 1)
    lower_y = lower_x - lower_root_residual
    lower_hx = (
        path_row(length - 1, q - 1)[1]
        + lower_root_residual
    )
    lower_a = (
        lower_n,
        lower_s,
        lower_h,
        lower_c,
        lower_x,
        lower_y,
        lower_hx,
    )
    lower_m = path_row(length - 1, q - 2)
    lower_p = path_row(length - 1, q - 3)

    M, T, J2, D = old_m
    A1 = path_count(length - 1, q - 1)
    residual1 = path_count(length - 2, q - 1)
    B1 = A1 - residual1
    HA1 = path_row(length - 1, q - 1)[1] + residual1
    m, u, k2, e = lower_m

    P, U, K2, E = old_p
    A2 = path_count(length - 1, q - 2)
    residual2 = path_count(length - 2, q - 2)
    B2 = A2 - residual2
    HA2 = path_row(length - 1, q - 2)[1] + residual2
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

    old_blocks = core_blocks_from_moments(
        q, old_a, old_m, old_p
    )
    lower_blocks = core_blocks_from_moments(
        q - 1, lower_a, lower_m, lower_p
    )
    new_blocks = core_blocks_from_moments(
        q, new_a, new_m, new_p
    )
    return length, q, old_blocks, lower_blocks, new_blocks


def symbolic_gap():
    length, q, old_blocks, lower_blocks, new_blocks = (
        symbolic_path_blocks()
    )
    doubled_gap = sp.expand(
        sum(
            new_blocks[name]
            - old_blocks[name]
            - lower_blocks[name]
            for name in old_blocks
        )
    )
    factorial_gap = sp.factorial(q) ** 2 * doubled_gap
    return length, q, sp.combsimp(factorial_gap)


def main() -> None:
    length, q, factorial_gap = symbolic_gap()
    positive_factor = (
        2
        * q
        * (q - 1)
        * sp.factorial(length - q)
        * sp.factorial(length - q + 1)
        / (
            sp.factorial(length - 2 * q + 4)
            * sp.factorial(length - 2 * q + 6)
        )
    )
    sextic = sp.factor(sp.cancel(factorial_gap / positive_factor))
    assert sp.simplify(
        factorial_gap - positive_factor * sextic
    ) == 0

    x, r = sp.symbols("x r", integer=True, nonnegative=True)
    shifted = sp.Poly(
        sp.expand(sextic.subs(length, 2 * q - 4 + x)),
        x,
    )
    shifted_coefficients = shifted.all_coeffs()
    coefficient_certificates = []
    for degree, coefficient in zip(
        range(shifted.degree(), -1, -1),
        shifted_coefficients,
    ):
        in_r = sp.Poly(
            sp.expand(coefficient.subs(q, r + 4)), r
        )
        assert all(value > 0 for value in in_r.all_coeffs())
        coefficient_certificates.append(
            {
                "power_of_x": degree,
                "coefficient_in_q": str(sp.factor(coefficient)),
                "coefficients_after_q_equals_r_plus_4": [
                    int(value) for value in in_r.all_coeffs()
                ],
            }
        )

    # Below L=2q-4 the path has independence number at most q-2,
    # so every product in the five phase blocks vanishes.  On and
    # above that threshold every factorial in positive_factor has a
    # nonnegative argument and is strictly positive.
    report = {
        "status": "PASS_BARE_PATH_TERMINAL_PHASE_GAP_THEOREM",
        "quantity": "q!^2 times the doubled unscaled phase gap",
        "valid_ranks": "q>=4",
        "zero_range": "L<2q-4",
        "positive_factor": str(positive_factor),
        "sextic_Q": str(sextic),
        "shift": "x=L-(2q-4), r=q-4",
        "shifted_coefficient_certificates": coefficient_certificates,
        "expanded_term_count": len(
            sp.Add.make_args(sp.expand(factorial_gap))
        ),
        "proof_summary": (
            "For L<2q-4 all five phase products vanish. For "
            "L>=2q-4 the factorial ratio is positive. Every "
            "coefficient of Q(2q-4+x,q) has strictly positive "
            "coefficients after q=4+r, so Q>0 for x,r>=0."
        ),
    }
    Path(
        "bare_path_terminal_phase_gap_identity_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
