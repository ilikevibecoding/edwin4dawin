#!/usr/bin/env python3
"""Prove fixed-rank terminal phase gaps for a path plus isolates.

Let B=P_(L+1)+tK_1, with the two endpoints of the path protected.
The quantity T_q(B) is the doubled recursive phase gap from (12vi).
For each requested fixed rank this script:

1. derives T_q as a polynomial in the isolate count t and path
   length L on the stable range L>=2q-4;
2. changes from powers of t to the binomial basis binom(t,j);
3. proves every coefficient is nonnegative after L=2q-4+x;
4. derives the exact small-L polynomials from direct path moments and
   proves their binomial coefficients nonnegative.

The result is an all-t, all-L theorem at every certified fixed rank.
"""

from __future__ import annotations

import argparse
import json
from itertools import combinations
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_bare_path_terminal_phase_gap import path_row
from stress_sibling_theta_core_recursive_phase_split import (
    core_blocks_from_moments,
    recursive_blocks_fast,
)


def path_row_direct(
    order: int, rank: int
) -> tuple[sp.Integer, sp.Integer, sp.Integer, sp.Integer]:
    """Return exact (count,sum h,sum h^2,sum c) for a small path."""
    if rank < 0 or rank > order:
        return (sp.Integer(0),) * 4
    count = mass = square = components = 0
    for chosen_tuple in combinations(range(order), rank):
        chosen = set(chosen_tuple)
        if any(vertex + 1 in chosen for vertex in chosen):
            continue
        residual = [
            vertex
            for vertex in range(order)
            if vertex not in chosen
            and vertex - 1 not in chosen
            and vertex + 1 not in chosen
        ]
        residual_set = set(residual)
        h_value = len(residual)
        edges = sum(
            vertex + 1 in residual_set for vertex in residual
        )
        c_value = h_value - edges
        count += 1
        mass += h_value
        square += h_value * h_value
        components += c_value
    return tuple(
        sp.Integer(value)
        for value in (count, mass, square, components)
    )


def row_with_isolates(
    order,
    rank,
    isolates,
    *,
    direct: bool,
) -> tuple[sp.Expr, sp.Expr, sp.Expr, sp.Expr]:
    """Residual moment row for P_order plus ``isolates`` singletons."""
    if isinstance(rank, int) and rank < 0:
        return (sp.Integer(0),) * 4
    values = [sp.Integer(0)] * 4
    maximum_selected = (
        isolates
        if isinstance(isolates, int)
        else rank
    )
    if not isinstance(maximum_selected, int):
        raise TypeError(
            "a symbolic rank requires a fixed integer isolate count"
        )
    for selected_isolates in range(maximum_selected + 1):
        if direct:
            path_values = path_row_direct(
                int(order), rank - selected_isolates
            )
        else:
            path_values = path_row(order, rank - selected_isolates)
        count, mass, square, components = path_values
        unselected = isolates - selected_isolates
        phase = (
            count,
            mass + unselected * count,
            square
            + 2 * unselected * mass
            + unselected**2 * count,
            components + unselected * count,
        )
        multiplier = sp.binomial(isolates, selected_isolates)
        for index in range(4):
            values[index] += multiplier * phase[index]
    return tuple(sp.expand(value) for value in values)


def terminal_gap(
    rank_q: int,
    length,
    isolates: sp.Symbol,
    *,
    direct: bool,
) -> sp.Expr:
    """Return T_q(P_(L+1)+tK_1) from exact phase moments."""

    def prow(order, rank):
        return row_with_isolates(
            order, rank, isolates, direct=direct
        )

    def pcount(order, rank):
        return prow(order, rank)[0]

    q = rank_q
    N, S, H, C = prow(length + 1, q)
    X = pcount(length, q)
    root_residual = pcount(length - 1, q)
    Y = X - root_residual
    HX = prow(length, q)[1] + root_residual
    old_a = (N, S, H, C, X, Y, HX)
    old_m = prow(length, q - 1)
    old_p = prow(length, q - 2)

    support_absent = pcount(length, q)
    support_residual = pcount(length - 1, q)
    support_hit = support_absent - support_residual
    support_absent_mass = (
        prow(length, q)[1] + support_residual
    )
    root_support_absent = pcount(length - 1, q)

    lower_n, lower_s, lower_h, lower_c = prow(
        length, q - 1
    )
    lower_x = pcount(length - 1, q - 1)
    lower_root_residual = pcount(length - 2, q - 1)
    lower_y = lower_x - lower_root_residual
    lower_hx = (
        prow(length - 1, q - 1)[1] + lower_root_residual
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
    lower_m = prow(length - 1, q - 2)
    lower_p = prow(length - 1, q - 3)

    M, T, J2, D = old_m
    A1 = pcount(length - 1, q - 1)
    residual1 = pcount(length - 2, q - 1)
    B1 = A1 - residual1
    HA1 = prow(length - 1, q - 1)[1] + residual1
    m, u, k2, e = lower_m

    P, U, K2, E = old_p
    A2 = pcount(length - 1, q - 2)
    residual2 = pcount(length - 2, q - 2)
    B2 = A2 - residual2
    HA2 = prow(length - 1, q - 2)[1] + residual2
    p, V, L2, F = lower_p

    new_a = (
        N + lower_n,
        S + support_absent + lower_s,
        H
        + 2 * support_absent_mass
        + support_absent
        + lower_h,
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
    return sp.expand_func(
        sp.expand(
            sum(new_blocks.values())
            - sum(old_blocks.values())
            - sum(lower_blocks.values())
        )
    )


def binomial_coefficients(
    polynomial: sp.Expr, variable: sp.Symbol
) -> list[sp.Expr]:
    """Return c_j in f(t)=sum_j c_j binom(t,j)."""
    expanded = sp.expand_func(sp.expand(polynomial))
    degree = sp.Poly(expanded, variable).degree()
    values = [
        sp.expand(expanded.subs(variable, value))
        for value in range(degree + 1)
    ]
    return [
        sp.factor(
            sum(
                (-1) ** (index - value)
                * sp.binomial(index, value)
                * values[value]
                for value in range(index + 1)
            )
        )
        for index in range(degree + 1)
    ]


def boundary_binomial_coefficients(
    rank_q: int, length: int, degree: int
) -> list[sp.Integer]:
    """Interpolate the exact graph values in the binomial basis.

    The stable symbolic path formulas use consecutive path minors.
    At L=1 two nominal minors coalesce after both endpoints are
    deleted, so using the actual graph here also avoids any convention
    about a path of negative order.
    """

    def value(isolates: int) -> int:
        base = nx.path_graph(length + 1)
        first_isolate = length + 1
        base.add_nodes_from(
            range(first_isolate, first_isolate + isolates)
        )
        return sum(
            recursive_blocks_fast(
                base,
                0,
                length,
                rank_q,
                subtract_lower=True,
            ).values()
        )

    values = [value(isolates) for isolates in range(degree + 1)]
    return [
        sp.Integer(
            sum(
                (-1) ** (index - isolate_count)
                * sp.binomial(index, isolate_count)
                * values[isolate_count]
                for isolate_count in range(index + 1)
            )
        )
        for index in range(degree + 1)
    ]


def certify_rank(rank_q: int) -> dict:
    length, isolates, excess = sp.symbols(
        "L t x", integer=True, nonnegative=True
    )
    threshold = 2 * rank_q - 4
    stable_gap = terminal_gap(
        rank_q, length, isolates, direct=False
    )
    stable_coefficients = binomial_coefficients(
        stable_gap, isolates
    )
    stable_certificates = []
    for index, coefficient in enumerate(stable_coefficients):
        shifted = sp.Poly(
            sp.expand(coefficient.subs(length, threshold + excess)),
            excess,
        )
        monomial_coefficients = shifted.all_coeffs()
        assert all(value >= 0 for value in monomial_coefficients)
        stable_certificates.append(
            {
                "power_binom_t": index,
                "coefficient_in_L": str(sp.factor(coefficient)),
                "coefficients_after_L_equals_threshold_plus_x": [
                    str(value) for value in monomial_coefficients
                ],
            }
        )

    expected_degree = 2 * rank_q - 2
    boundary_certificates = []
    for length_value in range(1, threshold):
        coefficients = boundary_binomial_coefficients(
            rank_q, length_value, expected_degree
        )
        assert all(value >= 0 for value in coefficients)
        boundary_certificates.append(
            {
                "path_length": length_value,
                "binomial_coefficients": [
                    str(value) for value in coefficients
                ],
            }
        )

    assert len(stable_coefficients) == expected_degree + 1
    return {
        "rank_q": rank_q,
        "stable_path_threshold": threshold,
        "isolate_binomial_degree": expected_degree,
        "stable_coefficients": stable_certificates,
        "boundary_certificates": boundary_certificates,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--ranks",
        type=int,
        nargs="+",
        default=[4, 5, 6],
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "path_isolate_terminal_fixed_rank_theorem_20260730.json"
        ),
    )
    args = parser.parse_args()
    ranks = sorted(set(args.ranks))
    if any(rank < 4 for rank in ranks):
        raise ValueError("all ranks must be at least four")
    certificates = [certify_rank(rank) for rank in ranks]
    report = {
        "status": "PASS_PATH_ISOLATE_TERMINAL_FIXED_RANK_THEOREM",
        "theorem": (
            "T_q(P_(L+1)+tK1)>=0 for every integer L>=1 and "
            "t>=0 at every certified rank q"
        ),
        "certified_ranks": ranks,
        "proof_method": (
            "Exact binomial-basis positivity in the isolate count; "
            "stable symbolic L-range plus exact finite boundary."
        ),
        "certificates": certificates,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
