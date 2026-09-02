#!/usr/bin/env python3
"""Derive exact rank-three bundle coefficients at protected endpoints.

Let H be a tree containing distinct protected vertices v and s.  Add a
new vertex t adjacent to one protected endpoint, and then add d leaf
children at t.  This script derives the binomial-basis coefficients of
the actual sibling-Theta increment

    T(d) = 2 (d_3(C_d + z_s, v) - d_3(C_d, v)).

There are two cases:

* root collision: t is adjacent to v;
* support collision: t is adjacent to s.

The formulas use only independence counts i_k(F) and total residual
edge counts e_k(F) over the independent k-sets of the indicated
minors of H.  No graph inequalities are imposed in this derivation.
"""

from __future__ import annotations

import json
from math import comb
from pathlib import Path

import sympy as sp

from derive_rank3_deepest_bundle_coefficients import theta_core_rank3


def binomial_transform(values: list[sp.Expr]) -> list[sp.Expr]:
    result: list[sp.Expr] = []
    work = [sp.expand(value) for value in values]
    while work:
        result.append(sp.factor(work[0]))
        work = [
            sp.expand(work[index + 1] - work[index])
            for index in range(len(work) - 1)
        ]
    return result


def bundle_independent(
    absent: tuple[sp.Symbol, ...],
    selected: tuple[sp.Symbol, ...],
    d: int,
    rank: int,
) -> sp.Expr:
    """Independence count for a t-centered d-leaf bundle.

    If t is absent, the d leaves are freely selected and the remainder
    is ``absent``.  If t is selected, its parent is deleted and the
    remainder is ``selected``.
    """
    return sp.expand(
        sum(
            comb(d, amount) * absent[rank - amount]
            for amount in range(min(d, rank) + 1)
        )
        + (selected[rank - 1] if rank >= 1 else 0)
    )


def bundle_residual_edges(
    absent_edges: tuple[sp.Symbol, ...],
    parent_closed: tuple[sp.Symbol, ...],
    parent_deleted: tuple[sp.Symbol, ...],
    parent_deleted_edges: tuple[sp.Symbol, ...],
    d: int,
    rank: int,
) -> sp.Expr:
    """Residual-edge sum for a t-centered d-leaf bundle.

    The four terms respectively count residual edges in the old graph,
    the old parent--t edge, the d edges from t to its leaf children,
    and the contribution when t itself is selected.
    """
    return sp.expand(
        sum(
            comb(d, amount) * absent_edges[rank - amount]
            for amount in range(min(d, rank) + 1)
        )
        + parent_closed[rank]
        + d * parent_deleted[rank]
        + (parent_deleted_edges[rank - 1] if rank >= 1 else 0)
    )


def root_collision() -> tuple[list[sp.Expr], dict[str, object]]:
    """Return coefficients when the bundle center t is adjacent to v."""
    H = sp.symbols("H0:6")
    R = sp.symbols("R0:5")  # H-v
    U = sp.symbols("U0:4")  # H-N[v]
    L = sp.symbols("L0:5")  # H-s
    Q = sp.symbols("Q0:4")  # H-{v,s}
    W = sp.symbols("W0:3")  # (H-N[v])-s, or U if s was deleted
    V = sp.symbols("V0:4")  # H-N[s]
    X = sp.symbols("X0:4")  # (H-N[s])-v, or V if v was deleted
    A = sp.symbols("A0:3")  # (H-v)-N_{H-v}[s]
    EH = sp.symbols("EH0:4")
    ER = sp.symbols("ER0:3")
    EL = sp.symbols("EL0:3")
    EQ = sp.symbols("EQ0:2")

    values: list[sp.Expr] = []
    for d in range(7):
        b = lambda rank: bundle_independent(H, R, d, rank)

        # In J=C_d-v, the bundle is a disjoint K_{1,d}; both the
        # t-absent and t-present remainder are H-v.
        j = lambda rank: bundle_independent(R, R, d, rank)

        # C_d-N[v] is (H-N[v]) plus d isolated vertices.
        r3 = sum(
            comb(d, amount) * U[3 - amount]
            for amount in range(min(d, 3) + 1)
        )

        eb3 = bundle_residual_edges(EH, U, R, ER, d, 3)

        # J is the disjoint union of R and K_{1,d}.  There is no
        # parent--t edge after v is deleted, so omit parent_closed.
        def ej(rank: int) -> sp.Expr:
            return sp.expand(
                sum(
                    comb(d, amount) * ER[rank - amount]
                    for amount in range(min(d, rank) + 1)
                )
                + d * R[rank]
                + ER[rank - 1]
            )

        old_core = theta_core_rank3(
            b(3),
            b(4),
            b(5),
            j(1),
            j(2),
            j(3),
            j(4),
            r3,
            eb3,
            ej(2),
            ej(1),
        )

        # Minors required by the ordinary leaf update at s.
        ell = lambda rank: bundle_independent(L, Q, d, rank)
        kseq = lambda rank: bundle_independent(Q, Q, d, rank)
        wseq = lambda rank: sum(
            comb(d, amount) * W[rank - amount]
            for amount in range(min(d, rank) + 1)
        )
        rs = lambda rank: bundle_independent(V, X, d, rank)
        js = lambda rank: bundle_independent(A, A, d, rank)
        el = lambda rank: bundle_residual_edges(
            EL, W, Q, EQ, d, rank
        )

        def ek(rank: int) -> sp.Expr:
            return sp.expand(
                sum(
                    comb(d, amount) * EQ[rank - amount]
                    for amount in range(min(d, rank) + 1)
                )
                + d * Q[rank]
                + (EQ[rank - 1] if rank >= 1 else 0)
            )

        new_core = theta_core_rank3(
            b(3) + ell(2),
            b(4) + ell(3),
            b(5) + ell(4),
            j(1) + kseq(0),
            j(2) + kseq(1),
            j(3) + kseq(2),
            j(4) + kseq(3),
            r3 + wseq(2),
            eb3 + rs(3) + el(2),
            ej(2) + js(2) + ek(1),
            ej(1) + js(1) + ek(0),
        )
        values.append(2 * sp.expand(new_core - old_core))
    return binomial_transform(values), {
        "H": H,
        "R": R,
        "U": U,
        "L": L,
        "Q": Q,
        "W": W,
        "V": V,
        "X": X,
        "A": A,
        "EH": EH,
        "ER": ER,
        "EL": EL,
        "EQ": EQ,
    }


def support_collision() -> tuple[list[sp.Expr], dict[str, object]]:
    """Return coefficients when the bundle center t is adjacent to s."""
    H = sp.symbols("H0:6")
    R = sp.symbols("R0:5")  # H-s
    K = sp.symbols("K0:5")  # H-v
    Q = sp.symbols("Q0:4")  # H-{v,s}
    U = sp.symbols("U0:4")  # H-N[v]
    W = sp.symbols("W0:3")  # (H-N[v])-s, or U if s was deleted
    V = sp.symbols("V0:4")  # H-N[s]
    A = sp.symbols("A0:3")  # (H-v)-N_{H-v}[s]
    EH = sp.symbols("EH0:4")
    ER = sp.symbols("ER0:3")
    EK = sp.symbols("EK0:3")
    EQ = sp.symbols("EQ0:2")

    values: list[sp.Expr] = []
    for d in range(7):
        b = lambda rank: bundle_independent(H, R, d, rank)
        j = lambda rank: bundle_independent(K, Q, d, rank)
        r3 = bundle_independent(U, W, d, 3)
        eb3 = bundle_residual_edges(EH, V, R, ER, d, 3)

        def ej(rank: int) -> sp.Expr:
            return bundle_residual_edges(EK, A, Q, EQ, d, rank)

        old_core = theta_core_rank3(
            b(3),
            b(4),
            b(5),
            j(1),
            j(2),
            j(3),
            j(4),
            r3,
            eb3,
            ej(2),
            ej(1),
        )

        # Removing s (or both v and s) leaves the d-leaf star as a
        # disjoint component.  Removing N[s] deletes t and leaves the
        # d children isolated.
        ell = lambda rank: bundle_independent(R, R, d, rank)
        kseq = lambda rank: bundle_independent(Q, Q, d, rank)
        wseq = lambda rank: bundle_independent(W, W, d, rank)
        rs = lambda rank: sum(
            comb(d, amount) * V[rank - amount]
            for amount in range(min(d, rank) + 1)
        )
        js = lambda rank: sum(
            comb(d, amount) * A[rank - amount]
            for amount in range(min(d, rank) + 1)
        )

        def disjoint_star_edges(
            old_edges: tuple[sp.Symbol, ...],
            old_counts: tuple[sp.Symbol, ...],
            rank: int,
        ) -> sp.Expr:
            return sp.expand(
                sum(
                    comb(d, amount) * old_edges[rank - amount]
                    for amount in range(min(d, rank) + 1)
                )
                + d * old_counts[rank]
                + (old_edges[rank - 1] if rank >= 1 else 0)
            )

        el = lambda rank: disjoint_star_edges(ER, R, rank)
        ek = lambda rank: disjoint_star_edges(EQ, Q, rank)

        new_core = theta_core_rank3(
            b(3) + ell(2),
            b(4) + ell(3),
            b(5) + ell(4),
            j(1) + kseq(0),
            j(2) + kseq(1),
            j(3) + kseq(2),
            j(4) + kseq(3),
            r3 + wseq(2),
            eb3 + rs(3) + el(2),
            ej(2) + js(2) + ek(1),
            ej(1) + js(1) + ek(0),
        )
        values.append(2 * sp.expand(new_core - old_core))
    return binomial_transform(values), {
        "H": H,
        "R": R,
        "K": K,
        "Q": Q,
        "U": U,
        "W": W,
        "V": V,
        "A": A,
        "EH": EH,
        "ER": ER,
        "EK": EK,
        "EQ": EQ,
    }


def main() -> None:
    root_coefficients, root_symbols = root_collision()
    support_coefficients, support_symbols = support_collision()
    report = {
        "status": "PASS_SYMBOLIC_ENDPOINT_COLLISION_DERIVATION",
        "normalization": "T(d)=2 times the unscaled rank-three core",
        "root_collision": {
            "coefficients": {
                str(index): str(expression)
                for index, expression in enumerate(root_coefficients)
                if expression != 0
            },
            "degree": max(
                index
                for index, expression in enumerate(root_coefficients)
                if expression != 0
            ),
            "symbols": {
                name: [str(value) for value in values]
                for name, values in root_symbols.items()
            },
        },
        "support_collision": {
            "coefficients": {
                str(index): str(expression)
                for index, expression in enumerate(support_coefficients)
                if expression != 0
            },
            "degree": max(
                index
                for index, expression in enumerate(support_coefficients)
                if expression != 0
            ),
            "symbols": {
                name: [str(value) for value in values]
                for name, values in support_symbols.items()
            },
        },
    }
    output = Path("rank3_endpoint_collision_symbolic_20260730.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
