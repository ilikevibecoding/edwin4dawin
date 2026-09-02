#!/usr/bin/env python3
"""Verify a phase-kernel identity for the corrected sibling reserve.

Let S be rooted at v, add an old sibling w and a designated sibling l,
and put J=S-v.  Partition independent q-sets by whether they choose
neither sibling, exactly one, or both.  For K in I_q(S), U in
I_(q-1)(J), and W in I_(q-2)(J), write residual statistics in their
displayed base graphs as (h,c), and put

    x_K = 1[v not in K],
    y_K = 1[v not in K and K meets N_S(v)].

Define

    phi(K,U) =
      y_K+1
      -(h_K+2x_K-h_U-1)^2
      +(h_K+x_K-h_U)^2,

    psi(K,W) =
      2(q-3)+c_K+2y_K+c_W
      -(h_K+2x_K-h_W)^2,

    chi(U,W) =
      2(q-3)+c_U+c_W+1
      -(h_U+1-h_W)^2.

If N=|I_q(S)|, X=sum x_K, M=|I_(q-1)(J)|, and C_q is
the coefficient-one sibling surplus, then exactly

    2 C_q =
      -4 X(N-X)
      +4 sum_(K,U) phi(K,U)
      +2 sum_(K,W) psi(K,W)
      +2 sum_(U,W) chi(U,W)
      +2 Lambda_(q-1)(J)
      +6 M^2.

The lower Lambda cancels one, rather than two, of the two oriented
one-sibling cross blocks.  This proves the structural coefficient one.
Individual phase kernels can be negative; nonnegativity of the total
still requires an aggregate switching or variance argument.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_nested_sharp_lambda_forest_pruning import recursion_gap
from scan_uniform_shift_moment_recursion import values
from verify_sibling_uniform_three_phase_identity import (
    three_phase_polynomial,
)
from verify_two_copy_sharp_lambda_leaf_identity import (
    independent_sets,
    residual_h_c,
)


def symbolic_verification() -> None:
    q = sp.symbols("q")
    N, S1, H, C, X, Y, HX = sp.symbols(
        "N S1 H C X Y HX"
    )
    M, T, J2, D = sp.symbols("M T J2 D")
    P, U, K2, E = sp.symbols("P U K2 E")

    phi_sum = (
        2 * M * (S1 - HX)
        - 2 * (N - X) * T
        + M * (X + Y)
    )
    psi_sum = (
        2 * (q - 3) * N * P
        + P * C
        + 2 * P * Y
        + N * E
        - P * (H + 4 * HX + 4 * X)
        - N * K2
        + 2 * (S1 + 2 * X) * U
    )
    chi_sum = (
        (2 * q - 6) * M * P
        + P * D
        + M * E
        - P * J2
        - M * K2
        - 2 * P * T
        + 2 * T * U
        + 2 * M * U
    )
    lower_lambda = (
        (q - 3) * M * M + D * M - J2 * M + T * T
    )
    phase_total = sp.expand(
        -4 * X * (N - X)
        + 4 * phi_sum
        + 2 * psi_sum
        + 2 * chi_sum
        + 2 * lower_lambda
        + 6 * M * M
    )
    direct = 2 * three_phase_polynomial(
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
    assert sp.expand(phase_total - direct) == 0


def phase_kernel_sum(
    base: nx.Graph, root: int, rank_q: int
) -> dict:
    lower = base.subgraph(set(base) - {root}).copy()
    a_sets = independent_sets(base, rank_q)
    m_sets = independent_sets(lower, rank_q - 1)
    p_sets = independent_sets(lower, rank_q - 2)
    root_neighbors = set(base[root])

    a_data = []
    for chosen in a_sets:
        h, c = residual_h_c(base, chosen)
        x = int(root not in chosen)
        y = int(x and bool(chosen & root_neighbors))
        a_data.append((chosen, h, c, x, y))
    m_data = [
        (chosen, *residual_h_c(lower, chosen))
        for chosen in m_sets
    ]
    p_data = [
        (chosen, *residual_h_c(lower, chosen))
        for chosen in p_sets
    ]

    phi_sum = 0
    for _, h_k, _, x_k, y_k in a_data:
        for _, h_u, _ in m_data:
            phi_sum += (
                y_k
                + 1
                - (h_k + 2 * x_k - h_u - 1) ** 2
                + (h_k + x_k - h_u) ** 2
            )

    psi_sum = 0
    for _, h_k, c_k, x_k, y_k in a_data:
        for _, h_w, c_w in p_data:
            psi_sum += (
                2 * (rank_q - 3)
                + c_k
                + 2 * y_k
                + c_w
                - (h_k + 2 * x_k - h_w) ** 2
            )

    chi_sum = 0
    for _, h_u, c_u in m_data:
        for _, h_w, c_w in p_data:
            chi_sum += (
                2 * (rank_q - 3)
                + c_u
                + c_w
                + 1
                - (h_u + 1 - h_w) ** 2
            )

    N = len(a_data)
    X = sum(row[3] for row in a_data)
    M = len(m_data)
    lower_lambda = (
        values(lower).get(rank_q - 1, (0, 0, 0, 0))[0]
        if lower
        else 0
    )
    total = (
        -4 * X * (N - X)
        + 4 * phi_sum
        + 2 * psi_sum
        + 2 * chi_sum
        + 2 * lower_lambda
        + 6 * M * M
    )
    return {
        "N": N,
        "X": X,
        "M": M,
        "phi_sum": phi_sum,
        "psi_sum": psi_sum,
        "chi_sum": chi_sum,
        "lower_Lambda": lower_lambda,
        "phase_kernel_total": total,
    }


def finite_audit(maximum_order: int) -> dict:
    instances = ranks = 0
    failures: list[dict] = []
    negative_counts = {"phi": 0, "psi": 0, "chi": 0}
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
                designated_leaf = order
                full = h_graph.copy()
                full.add_edge(root, designated_leaf)
                without_old = full.subgraph(
                    set(full) - {old_leaf}
                ).copy()
                large_e = recursion_gap(full, designated_leaf)
                small_e = recursion_gap(
                    without_old, designated_leaf
                )
                lower = base.subgraph(set(base) - {root}).copy()
                lower_values = values(lower) if lower else {}
                for q in set(large_e) | set(small_e):
                    direct = (
                        large_e.get(q, 0)
                        - small_e.get(q, 0)
                        - lower_values.get(
                            q - 1, (0, 0, 0, 0)
                        )[0]
                    )
                    phase = phase_kernel_sum(base, root, q)
                    record = {
                        "order": order,
                        "graph6": code,
                        "root": root,
                        "old_sibling_leaf": old_leaf,
                        "rank_q": q,
                        "doubled_direct_sibling_surplus": 2 * direct,
                        **phase,
                    }
                    if phase["phase_kernel_total"] != 2 * direct:
                        failures.append(record)
                    for name in ("phi", "psi", "chi"):
                        if phase[f"{name}_sum"] < 0:
                            negative_counts[name] += 1
                    if (
                        minimum is None
                        or phase["phase_kernel_total"] < minimum[0]
                    ):
                        minimum = (
                            phase["phase_kernel_total"],
                            record,
                        )
                    ranks += 1
                instances += 1
    return {
        "maximum_unlabeled_tree_order": maximum_order,
        "checked_rooted_sibling_instances": instances,
        "checked_ranks": ranks,
        "identity_failure_count": len(failures),
        "identity_failures": failures[:20],
        "negative_aggregate_phase_sum_counts": negative_counts,
        "minimum_total_record": (
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
            "sibling_uniform_phase_kernel_identity_"
            "certificate_20260729.json"
        ),
    )
    args = parser.parse_args()
    symbolic_verification()
    audit = finite_audit(args.maximum_order)
    report = {
        "status": (
            "PASS_SIBLING_UNIFORM_PHASE_KERNEL_IDENTITY"
            if not audit["identity_failure_count"]
            else "FAIL_SIBLING_UNIFORM_PHASE_KERNEL_IDENTITY"
        ),
        "identity": (
            "2C=-4X(N-X)+4sum(phi)+2sum(psi)+2sum(chi)"
            "+2Lambda_(q-1)(J)+6M^2"
        ),
        "symbolic_identity_proved": True,
        "coefficient_one_explanation": (
            "The two oriented one-sibling cross blocks contain only "
            "one copy of 2 Lambda to cancel."
        ),
        **audit,
        "warning": (
            "The identity is proved by exact phase expansion and "
            "finite replay. Its nonnegativity is not yet proved."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
