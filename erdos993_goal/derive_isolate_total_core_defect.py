#!/usr/bin/env python3
"""Derive the full one-core strong-isolate defect.

Let F_q(B,v) be the sum of the five unscaled theta-core phase
blocks returned by ``core_blocks_from_moments``.  This script expands

    F_q(B + K1,v) - F_q(B,v) - F_(q-1)(B,v)

using only four adjacent residual-moment rows of B-v, two adjacent
rows of B, and the corresponding root-link counts.  The P4 protected
gap is the ordinary support-leaf recursion of this one-core defect.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from stress_sibling_theta_core_recursive_phase_split import (
    core_blocks_from_moments,
)


def row_symbols(prefix: str) -> tuple[sp.Symbol, ...]:
    return sp.symbols(
        f"{prefix}n {prefix}s {prefix}h {prefix}c"
    )


def add_isolate(
    current: tuple[sp.Expr, ...],
    lower: tuple[sp.Expr, ...],
) -> tuple[sp.Expr, ...]:
    """Residual moment row after adjoining one isolated vertex."""
    n, s, h, c = current
    m, t, j2, d = lower
    return (
        n + m,
        s + n + t,
        h + 2 * s + n + j2,
        c + n + d,
    )


def root_data(
    base: tuple[sp.Expr, ...],
    deleted: tuple[sp.Expr, ...],
    link_count: sp.Expr,
) -> tuple[sp.Expr, ...]:
    n, s, h, c = base
    x, deleted_mass, _, _ = deleted
    return (
        n,
        s,
        h,
        c,
        x,
        x - link_count,
        deleted_mass + link_count,
    )


def main() -> None:
    q = sp.Symbol("q", integer=True, positive=True)

    # Rows of B at ranks q and q-1.
    b0 = row_symbols("b0")
    b1 = row_symbols("b1")

    # Rows of J=B-v at ranks q,q-1,q-2,q-3.
    j0 = row_symbols("j0")
    j1 = row_symbols("j1")
    j2 = row_symbols("j2")
    j3 = row_symbols("j3")

    # Counts in R=B-N[v] at ranks q and q-1.
    r0, r1 = sp.symbols("r0 r1")

    old_a = root_data(b0, j0, r0)
    old_blocks = core_blocks_from_moments(q, old_a, j1, j2)

    new_b0 = add_isolate(b0, b1)
    new_j0 = add_isolate(j0, j1)
    new_j1 = add_isolate(j1, j2)
    new_j2 = add_isolate(j2, j3)
    new_a = root_data(new_b0, new_j0, r0 + r1)
    new_blocks = core_blocks_from_moments(
        q, new_a, new_j1, new_j2
    )

    lower_a = root_data(b1, j1, r1)
    lower_blocks = core_blocks_from_moments(
        q - 1, lower_a, j2, j3
    )

    defects = {
        name: sp.factor(
            sp.expand(
                new_blocks[name]
                - old_blocks[name]
                - lower_blocks[name]
            )
        )
        for name in old_blocks
    }
    shadow = sp.factor(
        sp.expand(
            defects["root"] + defects["phi"] + defects["mass"]
        )
    )
    component_square = sp.factor(
        sp.expand(defects["psi"] + defects["chi"])
    )
    total = sp.factor(sp.expand(shadow + component_square))

    # Record whether the high row j3 cancels.  It does cancel from the
    # shadow half (which contains no P row); the component-square half
    # may retain it and thereby reveal the correct full state space.
    high_row_symbols = set(j3)
    assert not (shadow.free_symbols & high_row_symbols)

    # Apply the universal residual-mass identity and the root
    # deletion/link count split.  This must replay the previously
    # derived compact shadow defect exactly.
    r2 = sp.Symbol("r2")
    shadow_reduction_substitutions = {
        b0[0]: j0[0] + r1,
        b1[0]: j1[0] + r2,
        b0[1]: j0[1] + (q + 1) * r0,
        b1[1]: q * (j0[0] + r1),
        j1[1]: q * j0[0],
        j2[1]: (q - 1) * j1[0],
    }
    shadow_reduced = sp.factor(
        sp.expand(
            shadow.subs(shadow_reduction_substitutions) / 4
        )
    )
    m, M, X = j2[0], j1[0], j0[0]
    shadow_expected = (
        2 * M**2
        + 4 * M * m
        - 2 * M * r1
        - 2 * M * r2
        + 2 * X * m
        - (2 * q + 1) * X * r2
        + (2 * q - 1) * m * r0
        + 2 * m * r1
    )
    assert sp.expand(shadow_reduced - shadow_expected) == 0

    # For a forest and rank k,
    #
    #   S_k=(k+1)i_(k+1),
    #   H_k-C_k=(k+1)(k+2)i_(k+2)+3e_k.
    #
    # Substitute these identities into the component-square half.
    # Counts of B split as i_k(B)=i_k(J)+i_(k-1)(R).
    jp1, jp2, rp1 = sp.symbols("jp1 jp2 rp1")
    eb0, eb1, ej1, ej2, ej3 = sp.symbols(
        "eb0 eb1 ej1 ej2 ej3"
    )
    forest_substitutions = {
        b0[0]: j0[0] + r1,
        b1[0]: j1[0] + r2,
        b0[1]: (q + 1) * (jp1 + r0),
        b1[1]: q * (j0[0] + r1),
        j0[1]: (q + 1) * jp1,
        j1[1]: q * j0[0],
        j2[1]: (q - 1) * j1[0],
        j3[1]: (q - 2) * j2[0],
        b0[3]: (
            b0[2]
            - (q + 1) * (q + 2) * (jp2 + rp1)
            - 3 * eb0
        ),
        b1[3]: (
            b1[2]
            - q * (q + 1) * (jp1 + r0)
            - 3 * eb1
        ),
        j1[3]: j1[2] - q * (q + 1) * jp1 - 3 * ej1,
        j2[3]: (
            j2[2] - (q - 1) * q * j0[0] - 3 * ej2
        ),
        j3[3]: (
            j3[2] - (q - 2) * (q - 1) * j1[0] - 3 * ej3
        ),
    }
    component_forest_half = sp.factor(
        sp.expand(
            component_square.subs(forest_substitutions) / 2
        )
    )
    p = j3[0]
    edge_burden = (
        p * eb0
        + m * eb1
        + p * ej1
        + (M + 2 * m + r2) * ej2
        + (X + M + r1) * ej3
    )
    count_reserve = sp.factor(
        sp.expand(component_forest_half + 3 * edge_burden)
    )
    assert not (
        count_reserve.free_symbols
        & {eb0, eb1, ej1, ej2, ej3}
    )

    report = {
        "status": "PASS_ISOLATE_TOTAL_CORE_DEFECT_IDENTITY",
        "definition": (
            "F_q(B+K1,v)-F_q(B,v)-F_(q-1)(B,v), where F is the "
            "sum of the five doubled unscaled theta-core blocks"
        ),
        "block_defects": {
            name: str(value) for name, value in defects.items()
        },
        "shadow_defect": str(shadow),
        "shadow_defect_reduced_divided_by_four": str(
            shadow_reduced
        ),
        "shadow_replay_matches_prior_identity": True,
        "component_square_defect": str(component_square),
        "component_square_forest_reduction": (
            "component_square_defect = "
            "2*(count_reserve - 3*edge_burden)"
        ),
        "component_square_count_reserve": str(count_reserve),
        "component_square_edge_burden": str(edge_burden),
        "total_defect": str(total),
        "expanded_term_counts": {
            "shadow": len(sp.Add.make_args(sp.expand(shadow))),
            "component_square": len(
                sp.Add.make_args(sp.expand(component_square))
            ),
            "total": len(sp.Add.make_args(sp.expand(total))),
        },
        "high_rank_minus_three_row_cancels": {
            "shadow": not bool(shadow.free_symbols & high_row_symbols),
            "component_square": not bool(
                component_square.free_symbols & high_row_symbols
            ),
            "total": not bool(total.free_symbols & high_row_symbols),
            "surviving_symbols": sorted(
                str(symbol)
                for symbol in total.free_symbols & high_row_symbols
            ),
        },
        "next_step": (
            "Apply the support-leaf recursion to the compact shadow "
            "identity and the forest count-minus-edge reduction."
        ),
    }
    Path(
        "isolate_total_core_defect_identity_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
