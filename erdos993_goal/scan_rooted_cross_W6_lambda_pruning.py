#!/usr/bin/env python3
"""Audit a two-quantity pruning route to the sharp Lambda recursion.

For a rooted forest (H,v), put G=H-v and R=H-N_H[v].  At rank q use

    A=f_q(H), B=f_(q+1)(H), C=f_(q+2)(H), X=g_(q+2)(H),
    a=f_(q-1)(G), b=f_q(G), c=f_(q+1)(G), e=g_(q+1)(G),
    r=f_q(R).

The two-copy leaf identity splits the factorial sharp-Lambda
remainder into an absent-leaf block

    D = 2Bb+b^2-2Ac-3Ar

and a cross block

    Gamma =
      2Aaq-6Aa-Ac-3Ae+2Bb-Ca-3Xa-2ac-3ar+2b^2.

Define W=6*Gamma+2*D.  Then exactly

    q!^2 E_q(H+leaf_at_v,leaf) = W/2 + (q-3)*Gamma.

Thus Gamma>=0 and W>=0 imply the sharp Lambda leaf recursion.

This script audits induction-shaped pruning candidates.  For a
degree-at-most-one vertex w != v, let Q be H-w if w is isolated and
H-{w,u} if w is a leaf with support u != v.  The lower term is absent
when u=v.  The candidates are

    Gamma_q(H,v)-Gamma_q(H-w,v)
      >= q(q-1) Gamma_(q-1)(Q,v),

    W_q(H,v)-W_q(H-w,v)
      >= q^2 W_(q-1)(Q,v).

For disconnected forests the following adaptive choice is audited:
first use a leaf in the root component; once the root is isolated,
remove an external isolate if one exists, otherwise use a leaf whose
support has maximum degree.  This is exact finite evidence, not a
proof of the two pruning inequalities.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_edge_survival_ratio_dominance import random_forest
from verify_factorial_recursive_leaf_identity import (
    at,
    factorial_sequences,
)


def rooted_quantities(
    forest: nx.Graph, root: int
) -> tuple[dict[int, int], dict[int, int], dict[int, int]]:
    """Return Gamma, W, and the factorial sharp remainder."""
    if root not in forest or not nx.is_forest(forest):
        raise ValueError("rooted_quantities requires a rooted forest")
    without_root = forest.subgraph(set(forest) - {root}).copy()
    outside_closed_root = forest.subgraph(
        set(forest) - {root} - set(forest[root])
    ).copy()
    f_h, g_h = factorial_sequences(forest)
    f_g, g_g = factorial_sequences(without_root)
    f_r, _ = factorial_sequences(outside_closed_root)

    gamma: dict[int, int] = {}
    w6: dict[int, int] = {}
    sharp: dict[int, int] = {}
    for q in range(3, len(f_h) - 1):
        A = at(f_h, q)
        B = at(f_h, q + 1)
        C = at(f_h, q + 2)
        X = at(g_h, q + 2)
        a = at(f_g, q - 1)
        b = at(f_g, q)
        c = at(f_g, q + 1)
        e = at(g_g, q + 1)
        r = at(f_r, q)
        absent = 2 * B * b + b * b - 2 * A * c - 3 * A * r
        cross = (
            2 * A * a * q
            - 6 * A * a
            - A * c
            - 3 * A * e
            + 2 * B * b
            - C * a
            - 3 * X * a
            - 2 * a * c
            - 3 * a * r
            + 2 * b * b
        )
        gamma[q] = cross
        w6[q] = 6 * cross + 2 * absent
        sharp[q] = absent + q * cross
    return gamma, w6, sharp


def symbolic_decomposition() -> dict:
    q = sp.symbols("q")
    A, B, C, X, a, b, c, e, r = sp.symbols(
        "A B C X a b c e r"
    )
    absent = 2 * B * b + b**2 - 2 * A * c - 3 * A * r
    gamma = (
        2 * A * a * q
        - 6 * A * a
        - A * c
        - 3 * A * e
        + 2 * B * b
        - C * a
        - 3 * X * a
        - 2 * a * c
        - 3 * a * r
        + 2 * b**2
    )
    w6 = 6 * gamma + 2 * absent
    assert sp.expand(
        absent + q * gamma - (w6 / 2 + (q - 3) * gamma)
    ) == 0
    return {
        "absent_block": str(absent),
        "cross_block_Gamma": str(gamma),
        "W6": str(sp.expand(w6)),
        "sharp_decomposition": (
            "q!^2 E_q = W6/2 + (q-3) Gamma"
        ),
    }


def adaptive_vertices(
    forest: nx.Graph, root: int
) -> tuple[list[int], str]:
    root_component = set(nx.node_connected_component(forest, root))
    root_leaves = [
        vertex
        for vertex in root_component
        if vertex != root and forest.degree(vertex) == 1
    ]
    if root_leaves:
        return root_leaves, "root_component_leaf"

    external = [
        vertex
        for vertex in forest
        if vertex != root and forest.degree(vertex) <= 1
    ]
    isolates = [
        vertex for vertex in external if forest.degree(vertex) == 0
    ]
    if isolates:
        return isolates, "external_isolate"
    if not external:
        return [], "terminal_root_only"

    maximum_support_degree = max(
        forest.degree(next(iter(forest[leaf])))
        for leaf in external
    )
    return (
        [
            leaf
            for leaf in external
            if forest.degree(next(iter(forest[leaf])))
            == maximum_support_degree
        ],
        "external_maximum_support_degree",
    )


def pruning_lower(
    forest: nx.Graph, root: int, removed: int
) -> nx.Graph | None:
    if forest.degree(removed) == 0:
        return forest.subgraph(set(forest) - {removed}).copy()
    support = next(iter(forest[removed]))
    if support == root:
        return None
    return forest.subgraph(
        set(forest) - {removed, support}
    ).copy()


def audit_pruning_pair(
    forest: nx.Graph,
    root: int,
    removed: int,
    family: str,
    parameters: dict,
) -> dict:
    large = rooted_quantities(forest, root)
    smaller_graph = forest.subgraph(
        set(forest) - {removed}
    ).copy()
    smaller = rooted_quantities(smaller_graph, root)
    lower_graph = pruning_lower(forest, root, removed)
    lower = (
        rooted_quantities(lower_graph, root)
        if lower_graph is not None
        else ({}, {}, {})
    )

    failures: list[dict] = []
    checks = 0
    minima: list[tuple[int, dict] | None] = [None, None]
    names = ["Gamma", "W6"]
    for index, name in enumerate(names):
        ranks = set(large[index]) | set(smaller[index]) | {
            rank + 1 for rank in lower[index]
        }
        for q in ranks:
            factor = q * (q - 1) if index == 0 else q * q
            lower_value = (
                factor * lower[index].get(q - 1, 0)
                if q >= 4
                else 0
            )
            value = (
                large[index].get(q, 0)
                - smaller[index].get(q, 0)
                - lower_value
            )
            record = {
                "family": family,
                "parameters": parameters,
                "root": root,
                "removed": removed,
                "removed_degree": forest.degree(removed),
                "rank_q": q,
                "quantity": name,
                "strong_pruning_remainder": value,
                "scaled_lower_term": lower_value,
            }
            if value < 0:
                failures.append(record)
            current = minima[index]
            if current is None or value < current[0]:
                minima[index] = (value, record)
            checks += 1
    return {
        "checks": checks,
        "failures": failures,
        "minima": [
            item[1] if item is not None else None for item in minima
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--maximum-tree-order", type=int, default=10
    )
    parser.add_argument(
        "--atlas-forest-order", type=int, default=7
    )
    parser.add_argument("--random-forests", type=int, default=200)
    parser.add_argument(
        "--random-maximum-order", type=int, default=120
    )
    parser.add_argument("--seed", type=int, default=99122)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "rooted_cross_W6_lambda_pruning_certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    symbolic = symbolic_decomposition()
    checks = rooted_instances = pruning_pairs = 0
    failures: list[dict] = []
    global_failures: list[dict] = []
    minima: dict[str, tuple[int, dict] | None] = {
        "Gamma": None,
        "W6": None,
    }
    case_counts: dict[str, int] = {}

    def audit_global(
        forest: nx.Graph, root: int, family: str, parameters: dict
    ) -> None:
        nonlocal rooted_instances
        gamma, w6, _ = rooted_quantities(forest, root)
        code = (
            nx.to_graph6_bytes(
                nx.convert_node_labels_to_integers(forest),
                header=False,
            )
            .decode("ascii")
            .strip()
        )
        for name, data in [("Gamma", gamma), ("W6", w6)]:
            for q, value in data.items():
                record = {
                    "family": family,
                    "parameters": parameters,
                    "graph6": code,
                    "root": root,
                    "rank_q": q,
                    "quantity": name,
                    "value": value,
                }
                if value < 0:
                    global_failures.append(record)
                current = minima[name]
                if current is None or value < current[0]:
                    minima[name] = (value, record)
        rooted_instances += 1

    def audit_pair(
        forest: nx.Graph,
        root: int,
        removed: int,
        family: str,
        parameters: dict,
        case: str,
    ) -> None:
        nonlocal checks, pruning_pairs
        result = audit_pruning_pair(
            forest, root, removed, family, parameters
        )
        checks += result["checks"]
        pruning_pairs += 1
        failures.extend(result["failures"])
        case_counts[case] = case_counts.get(case, 0) + 1

    # Connected trees: audit every rooted non-root leaf, a stronger
    # census than the adaptive rule needs.
    for order in range(2, args.maximum_tree_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for root in tree:
                audit_global(
                    tree,
                    root,
                    "unlabeled_tree",
                    {"order": order, "graph6": code},
                )
                for leaf in [
                    vertex
                    for vertex in tree
                    if tree.degree(vertex) == 1
                    and vertex != root
                ]:
                    audit_pair(
                        tree,
                        root,
                        leaf,
                        "unlabeled_tree",
                        {"order": order, "graph6": code},
                        "connected_any_nonroot_leaf",
                    )

    # Disconnected exact census: audit every vertex allowed by the
    # adaptive rule, not just one tie-breaking choice.
    for forest0 in nx.graph_atlas_g():
        order = len(forest0)
        if (
            order < 2
            or order > args.atlas_forest_order
            or not nx.is_forest(forest0)
            or nx.is_tree(forest0)
        ):
            continue
        forest = nx.convert_node_labels_to_integers(forest0)
        code = nx.to_graph6_bytes(
            forest, header=False
        ).decode("ascii").strip()
        for root in forest:
            audit_global(
                forest,
                root,
                "atlas_disconnected_forest",
                {"order": order, "graph6": code},
            )
            eligible, case = adaptive_vertices(forest, root)
            for removed in eligible:
                audit_pair(
                    forest,
                    root,
                    removed,
                    "atlas_disconnected_forest",
                    {"order": order, "graph6": code},
                    case,
                )

    # Large random forests: one deterministic-seed adaptive choice.
    rng = random.Random(args.seed)
    for sample in range(args.random_forests):
        forest = random_forest(
            rng, 2, args.random_maximum_order
        )
        root = rng.choice(list(forest))
        eligible, case = adaptive_vertices(forest, root)
        if not eligible:
            continue
        removed = rng.choice(eligible)
        audit_global(
            forest,
            root,
            "random_forest",
            {
                "sample": sample,
                "order": len(forest),
                "components": nx.number_connected_components(forest),
            },
        )
        audit_pair(
            forest,
            root,
            removed,
            "random_forest",
            {
                "sample": sample,
                "order": len(forest),
                "components": nx.number_connected_components(forest),
            },
            case,
        )

    report = {
        "status": (
            "PASS_ROOTED_CROSS_W6_LAMBDA_PRUNING_CANDIDATE"
            if not failures and not global_failures
            else "FAIL_ROOTED_CROSS_W6_LAMBDA_PRUNING_CANDIDATE"
        ),
        "symbolic_decomposition": symbolic,
        "maximum_unlabeled_tree_order": (
            args.maximum_tree_order
        ),
        "atlas_disconnected_forest_order": (
            args.atlas_forest_order
        ),
        "random_forest_samples": args.random_forests,
        "random_maximum_order": args.random_maximum_order,
        "checked_rooted_instances": rooted_instances,
        "checked_pruning_pairs": pruning_pairs,
        "checked_pruning_ranks_and_quantities": checks,
        "adaptive_case_counts": case_counts,
        "global_failure_count": len(global_failures),
        "global_failures": global_failures[:20],
        "pruning_failure_count": len(failures),
        "pruning_failures": failures[:20],
        "global_minima": {
            name: (
                item[1] if item is not None else None
            )
            for name, item in minima.items()
        },
        "logical_consequence_if_proved": (
            "The adaptive pruning inequalities prove Gamma_q>=0 "
            "and W6_q>=0 for every rooted forest. The symbolic "
            "identity q!^2 E_q=W6_q/2+(q-3)Gamma_q then proves "
            "the sharp Lambda leaf recursion."
        ),
        "warning": (
            "The decomposition is proved symbolically. The pruning "
            "nonnegativity statements have exact finite evidence "
            "but remain proof obligations."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
