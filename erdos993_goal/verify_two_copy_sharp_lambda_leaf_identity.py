#!/usr/bin/env python3
"""Verify a two-copy identity for the sharp Lambda leaf remainder.

Let F=H+l, let v be the support of l, and put G=H-v.  Partition the
independent q-sets of F into

    A = I_q(H),                  B = l + I_(q-1)(G).

For K in A, adding l changes the residual order and component count by

    x_K = 1[v not in K],
    y_K = 1[v not in K and K meets N_H(v)].

Write N,S,H2,C for the residual moments of A measured in H, X=sum x,
Y=sum y, and HX=sum h_K x_K.  Write M,T,J2,D for the residual moments
of I_(q-1)(G).  Then the sharp leaf remainder E_q(F,l) is exactly

    N*Y - 2*N*HX + 2*S*X - N*X + X^2
      + 2*(q-3)*N*M
      + M*(C+Y) + N*D
      - M*(H2+2*HX+X) - N*J2
      + 2*(S+X)*T.

Equivalently, this is an AA residual-change payment plus the complete
two-copy cross-payment between A and B.  The BB block cancels exactly:
the constant in Theta_q=Lambda_q-i_q^2 is q-3, equal to the constant
in Lambda_(q-1).

The symbolic proof below is general.  The finite audit independently
reconstructs every ordered-pair term and compares its sum with the
moment implementation of E_q.
"""

from __future__ import annotations

import argparse
import itertools
import json
from collections import defaultdict
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_nested_sharp_lambda_forest_pruning import recursion_gap


def symbolic_verification() -> sp.Expr:
    q = sp.symbols("q")
    N, S, H2, C = sp.symbols("N S H2 C")
    X, Y, HX = sp.symbols("X Y HX")
    M, T, J2, D = sp.symbols("M T J2 D")

    def theta(count, mass, square, components):
        return (
            (q - 3) * count**2
            + components * count
            - square * count
            + mass**2
        )

    theta_full = theta(
        N + M,
        S + X + T,
        H2 + 2 * HX + X + J2,
        C + Y + D,
    )
    theta_old = theta(N, S, H2, C)
    # Lambda_(q-1) has the same constant q-3.
    lambda_lower = (
        (q - 3) * M**2 + D * M - J2 * M + T**2
    )
    direct = sp.expand(theta_full - theta_old - lambda_lower)

    aa_payment = (
        N * Y - 2 * N * HX + 2 * S * X - N * X + X**2
    )
    cross_payment = (
        2 * (q - 3) * N * M
        + M * (C + Y)
        + N * D
        - M * (H2 + 2 * HX + X)
        - N * J2
        + 2 * (S + X) * T
    )
    displayed = sp.expand(aa_payment + cross_payment)
    assert sp.expand(direct - displayed) == 0
    return displayed


def independent_sets(graph: nx.Graph, rank: int) -> list[frozenset[int]]:
    result = []
    for vertices in itertools.combinations(graph.nodes(), rank):
        chosen = frozenset(vertices)
        if all(
            not (left in chosen and right in chosen)
            for left, right in graph.edges()
        ):
            result.append(chosen)
    return result


def residual_h_c(
    graph: nx.Graph, chosen: frozenset[int]
) -> tuple[int, int]:
    remaining = set(graph) - set(chosen)
    for vertex in chosen:
        remaining -= set(graph[vertex])
    residual = graph.subgraph(remaining)
    return (
        len(remaining),
        nx.number_connected_components(residual)
        if remaining
        else 0,
    )


def doubled_pair_terms(
    forest: nx.Graph, leaf: int, rank: int
) -> dict[
    tuple[frozenset[int], frozenset[int]],
    int,
]:
    """Return ordered-pair contributions whose sum is 2*E_rank."""
    support = next(iter(forest[leaf]))
    old = forest.subgraph(set(forest) - {leaf}).copy()
    lower = forest.subgraph(
        set(forest) - {leaf, support}
    ).copy()
    absent_sets = independent_sets(old, rank)
    selected_leaf_cores = independent_sets(lower, rank - 1)
    result: defaultdict[
        tuple[frozenset[int], frozenset[int]], int
    ] = defaultdict(int)

    full_stats = {
        chosen: residual_h_c(forest, chosen)
        for chosen in absent_sets
    }
    old_stats = {
        chosen: residual_h_c(old, chosen)
        for chosen in absent_sets
    }

    # AA block: only the change caused by the absent leaf remains.
    for left in absent_sets:
        h_left_full, c_left_full = full_stats[left]
        h_left_old, c_left_old = old_stats[left]
        for right in absent_sets:
            h_right_full, c_right_full = full_stats[right]
            h_right_old, c_right_old = old_stats[right]
            result[(left, right)] += (
                c_left_full
                + c_right_full
                - (h_left_full - h_right_full) ** 2
                - c_left_old
                - c_right_old
                + (h_left_old - h_right_old) ** 2
            )

    # AB and BA blocks.  The BB block is exactly Lambda_(q-1)(G)
    # and has already canceled.
    for absent in absent_sets:
        h_absent, c_absent = full_stats[absent]
        for core in selected_leaf_cores:
            selected = frozenset(set(core) | {leaf})
            h_core, c_core = residual_h_c(lower, core)
            kernel = (
                2 * (rank - 3)
                + c_absent
                + c_core
                - (h_absent - h_core) ** 2
            )
            result[(absent, selected)] += kernel
            result[(selected, absent)] += kernel

    return {
        key: value for key, value in result.items() if value
    }


def finite_audit(maximum_order: int) -> dict:
    trees = leaves = ranks = pair_terms = 0
    identity_failures: list[dict] = []
    negative_pair_terms = 0
    negative_pair_examples: list[dict] = []

    for order in range(2, maximum_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            trees += 1
            for leaf in [
                vertex
                for vertex in tree
                if tree.degree(vertex) == 1
            ]:
                gaps = recursion_gap(tree, leaf)
                for q, direct in gaps.items():
                    terms = doubled_pair_terms(tree, leaf, q)
                    pair_sum = sum(terms.values())
                    record = {
                        "order": order,
                        "graph6": code,
                        "leaf": leaf,
                        "rank_q": q,
                        "direct_remainder": direct,
                        "doubled_pair_sum": pair_sum,
                    }
                    if pair_sum != 2 * direct:
                        identity_failures.append(record)
                    for (left, right), value in terms.items():
                        if value < 0:
                            negative_pair_terms += 1
                            if len(negative_pair_examples) < 20:
                                negative_pair_examples.append(
                                    {
                                        **record,
                                        "left_set": sorted(left),
                                        "right_set": sorted(right),
                                        "pair_contribution": value,
                                    }
                                )
                    pair_terms += len(terms)
                    ranks += 1
                leaves += 1

    return {
        "maximum_unlabeled_tree_order": maximum_order,
        "checked_trees": trees,
        "checked_leaves": leaves,
        "checked_ranks": ranks,
        "checked_nonzero_ordered_pair_terms": pair_terms,
        "identity_failure_count": len(identity_failures),
        "identity_failures": identity_failures[:20],
        "negative_individual_pair_term_count": negative_pair_terms,
        "negative_individual_pair_term_examples": (
            negative_pair_examples
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=8)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "two_copy_sharp_lambda_leaf_identity_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    displayed = symbolic_verification()
    audit = finite_audit(args.maximum_order)
    report = {
        "status": (
            "PASS_TWO_COPY_SHARP_LAMBDA_LEAF_IDENTITY"
            if not audit["identity_failure_count"]
            else "FAIL_TWO_COPY_SHARP_LAMBDA_LEAF_IDENTITY"
        ),
        "symbolic_identity": True,
        "displayed_remainder": str(displayed),
        "structural_cancellation": (
            "The pair block in which both q-sets select the new "
            "leaf is exactly Lambda_(q-1) of the lower graph."
        ),
        **audit,
        "warning": (
            "The identity is proved. Individual pair contributions "
            "can be negative, so nonnegativity still requires an "
            "averaged switching or variance argument."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
