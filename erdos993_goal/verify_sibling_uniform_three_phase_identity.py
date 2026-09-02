#!/usr/bin/env python3
"""Prove and replay a three-phase identity for the sibling reserve.

Let S be a forest rooted at v, let F_t add t sibling leaves at v, and
put J=S-v.  At rank q, write the residual moments of I_q(S) as

    (N,S1,H,C) = (count, sum h, sum h^2, sum c).

For K in I_q(S), put x_K=1[v notin K] and
y_K=1[v notin K and K meets N_S(v)], and write

    X=sum x_K, Y=sum y_K, HX=sum h_K x_K.

Write (M,T,J2,D) for the same four moments of I_(q-1)(J), and
(P,U,K2,E) for I_(q-2)(J).  The corrected sibling surplus is

    C_q = E_q(F_2,leaf)-E_q(F_1,leaf)-Lambda_(q-1)(J).

It is exactly the polynomial returned by ``three_phase_polynomial``.
The identity follows by classifying independent q-sets according to
whether they choose zero, one, or both sibling leaves.  This file
proves the symbolic identity and replays it on small rooted trees.
Nonnegativity of the resulting polynomial remains a proof obligation.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_nested_sharp_lambda_forest_pruning import recursion_gap
from scan_uniform_shift_moment_recursion import values
from verify_two_copy_sharp_lambda_leaf_identity import (
    independent_sets,
    residual_h_c,
)


def theta(
    q,
    count,
    mass,
    square,
    components,
):
    return (
        (q - 3) * count**2
        + components * count
        - square * count
        + mass**2
    )


def three_phase_polynomial(
    q,
    N,
    S1,
    H,
    C,
    X,
    Y,
    HX,
    M,
    T,
    J2,
    D,
    P,
    U,
    K2,
    E,
):
    return (
        C * P
        + D * M
        + D * P
        + E * M
        + E * N
        - H * P
        - 4 * HX * M
        - 4 * HX * P
        - J2 * M
        - J2 * P
        - K2 * M
        - K2 * N
        + q * M * M
        + 2 * q * M * P
        - 6 * M * P
        + 4 * M * S1
        + 2 * M * U
        + 2 * M * X
        + 2 * M * Y
        + 2 * q * N * P
        - 6 * N * P
        - 4 * N * T
        - 2 * N * X
        - 2 * P * T
        - 4 * P * X
        + 2 * P * Y
        + 2 * S1 * U
        + T * T
        + 2 * T * U
        + 4 * T * X
        + 4 * U * X
        + 2 * X * X
    )


def symbolic_verification() -> sp.Expr:
    q = sp.symbols("q")
    N, S1, H, C, X, Y, HX = sp.symbols(
        "N S1 H C X Y HX"
    )
    M, T, J2, D = sp.symbols("M T J2 D")
    P, U, K2, E = sp.symbols("P U K2 E")

    # Zero selected leaves: adding t absent siblings changes h by
    # t*x and c by t*y.
    def zero_phase(t):
        return (
            N,
            S1 + t * X,
            H + 2 * t * HX + t * t * X,
            C + t * Y,
        )

    # In F_2 there are two labeled one-leaf phases.  The other
    # unselected sibling is an isolated residual vertex.
    one_plain = (M, T, J2, D)
    one_with_isolate = (
        M,
        T + M,
        J2 + 2 * T + M,
        D + M,
    )
    both = (P, U, K2, E)

    z0 = zero_phase(0)
    z1 = zero_phase(1)
    z2 = zero_phase(2)
    moments_f0 = z0
    moments_f1 = tuple(
        z1[index] + one_plain[index] for index in range(4)
    )
    moments_f2 = tuple(
        z2[index]
        + 2 * one_with_isolate[index]
        + both[index]
        for index in range(4)
    )

    # I_(q-1)(J+isolated vertex) has an absent-isolate phase with
    # residual moments one_with_isolate and a selected phase both.
    lower = tuple(
        one_with_isolate[index] + both[index]
        for index in range(4)
    )
    lower_lambda = (
        (q - 3) * lower[0] ** 2
        + lower[3] * lower[0]
        - lower[2] * lower[0]
        + lower[1] ** 2
    )
    direct = sp.expand(
        theta(q, *moments_f2)
        - 2 * theta(q, *moments_f1)
        + theta(q, *moments_f0)
        - lower_lambda
    )
    displayed = sp.expand(
        three_phase_polynomial(
            q,
            N,
            S1,
            H,
            C,
            X,
            Y,
            HX,
            M,
            T,
            J2,
            D,
            P,
            U,
            K2,
            E,
        )
    )
    assert sp.expand(direct - displayed) == 0
    return displayed


def moments(
    graph: nx.Graph, rank: int
) -> tuple[int, int, int, int]:
    chosen_sets = independent_sets(graph, rank)
    hs: list[int] = []
    cs: list[int] = []
    for chosen in chosen_sets:
        h, c = residual_h_c(graph, chosen)
        hs.append(h)
        cs.append(c)
    return len(chosen_sets), sum(hs), sum(h * h for h in hs), sum(cs)


def finite_audit(maximum_order: int) -> dict:
    rooted_leaves = ranks = 0
    failures: list[dict] = []
    minimum: tuple[int, dict] | None = None
    for order in range(2, maximum_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            h_graph = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                h_graph, header=False
            ).decode("ascii").strip()
            for old_leaf in [
                vertex
                for vertex in h_graph
                if h_graph.degree(vertex) == 1
            ]:
                root = next(iter(h_graph[old_leaf]))
                base = h_graph.subgraph(
                    set(h_graph) - {old_leaf}
                ).copy()
                lower = base.subgraph(
                    set(base) - {root}
                ).copy()
                new_leaf = order
                full = h_graph.copy()
                full.add_edge(root, new_leaf)
                smaller_full = full.subgraph(
                    set(full) - {old_leaf}
                ).copy()
                large_e = recursion_gap(full, new_leaf)
                small_e = recursion_gap(smaller_full, new_leaf)
                lower_values = values(lower) if lower else {}
                for q in set(large_e) | set(small_e):
                    N, S1, H, C = moments(base, q)
                    absent_sets = independent_sets(base, q)
                    X = Y = HX = 0
                    root_neighbors = set(base[root])
                    for chosen in absent_sets:
                        if root in chosen:
                            continue
                        X += 1
                        h_value, _ = residual_h_c(base, chosen)
                        HX += h_value
                        if chosen & root_neighbors:
                            Y += 1
                    M, T, J2, D = moments(lower, q - 1)
                    P, U, K2, E = moments(lower, q - 2)
                    formula = three_phase_polynomial(
                        q,
                        N,
                        S1,
                        H,
                        C,
                        X,
                        Y,
                        HX,
                        M,
                        T,
                        J2,
                        D,
                        P,
                        U,
                        K2,
                        E,
                    )
                    lower_lambda = lower_values.get(
                        q - 1, (0, 0, 0, 0)
                    )[0]
                    direct = (
                        large_e.get(q, 0)
                        - small_e.get(q, 0)
                        - lower_lambda
                    )
                    record = {
                        "order": order,
                        "graph6": code,
                        "root": root,
                        "old_sibling_leaf": old_leaf,
                        "rank_q": q,
                        "direct_uniform_sibling_surplus": direct,
                        "three_phase_polynomial": formula,
                    }
                    if direct != formula:
                        failures.append(record)
                    if minimum is None or formula < minimum[0]:
                        minimum = (formula, record)
                    ranks += 1
                rooted_leaves += 1
    return {
        "maximum_unlabeled_tree_order": maximum_order,
        "checked_rooted_sibling_instances": rooted_leaves,
        "checked_ranks": ranks,
        "identity_failure_count": len(failures),
        "identity_failures": failures[:20],
        "minimum_polynomial_record": (
            minimum[1] if minimum is not None else None
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=8)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "sibling_uniform_three_phase_identity_"
            "certificate_20260729.json"
        ),
    )
    args = parser.parse_args()
    displayed = symbolic_verification()
    audit = finite_audit(args.maximum_order)
    report = {
        "status": (
            "PASS_SIBLING_UNIFORM_THREE_PHASE_IDENTITY"
            if not audit["identity_failure_count"]
            else "FAIL_SIBLING_UNIFORM_THREE_PHASE_IDENTITY"
        ),
        "symbolic_identity_proved": True,
        "displayed_polynomial": str(displayed),
        "structural_explanation": (
            "A single lower Lambda cancels the one new cross phase "
            "created by choosing exactly one of the two siblings."
        ),
        **audit,
        "warning": (
            "The identity is proved; nonnegativity of its constrained "
            "moment polynomial is not yet proved."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
