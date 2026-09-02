#!/usr/bin/env python3
"""Replay the compact endpoint-bundle formulas against the recurrence."""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import networkx as nx

from analyze_deepest_support_leaf_bundle_differences import (
    add_leaf_bundle,
    forward_coefficients,
)
from derive_rank3_deepest_bundle_coefficients import direct_total
from prove_rank3_deepest_bundle_first_coefficient import (
    first_coefficient_formula,
)


def correction(
    tree: nx.Graph,
    root: int,
    support: int,
    case: str,
) -> int:
    n = len(tree)
    dv = tree.degree(root)
    ds = tree.degree(support)
    if case == "root":
        Av = sum(
            tree.degree(neighbor) - 1 for neighbor in tree[root]
        )
        return (
            -26
            + 24 * n
            + 16 * n**2
            - 34 * dv
            - 4 * dv**2
            - 20 * n * dv
            - 28 * ds
            - 8 * Av
            + 56 * int(tree.has_edge(root, support))
        )
    As = sum(
        tree.degree(neighbor) - 1 for neighbor in tree[support]
    )
    return (
        -88
        + 4 * n
        + 6 * n**2
        - 32 * dv
        + 90 * ds
        - 20 * ds**2
        - 16 * n * ds
        - 40 * As
    )


def predicted_coefficients(
    tree: nx.Graph,
    root: int,
    support: int,
    leaf: int,
    case: str,
) -> dict[int, int]:
    """Return the compact c1,...,c5 formulas."""
    h_order = len(tree) - 1
    # H=tree-leaf.  Its old endpoint degrees and distance-two counts
    # are the variables in the symbolic certificate.
    H = tree.subgraph(set(tree) - {leaf})
    dv = H.degree(root)
    ds = H.degree(support)
    a = int(H.has_edge(root, support))
    g = int(nx.shortest_path_length(H, root, support) == 2)
    Av = sum(H.degree(neighbor) - 1 for neighbor in H[root])
    As = sum(H.degree(neighbor) - 1 for neighbor in H[support])

    if case == "root":
        half_c2 = (
            6 * As
            + 16 * Av
            - 7 * a**2
            - 10 * a * ds
            - 10 * a * dv
            - 14 * a * g
            + 16 * a * h_order
            + 19 * a
            + 3 * ds**2
            + 9 * ds
            + 8 * dv**2
            - 25 * dv
            - 10 * g
            + 48 * h_order
            + 18
        )
        c3 = 12 * h_order + 32 * a + 140
    else:
        half_c2 = (
            6 * As
            + 16 * Av
            - 7 * a**2
            - 10 * a * ds
            - 10 * a * dv
            - 14 * a * g
            + 16 * a * h_order
            + 25 * a
            + 3 * ds**2
            + 3 * ds
            + 8 * dv**2
            - 25 * dv
            - 10 * g
            + 30 * h_order
        )
        c3 = 12 * h_order + 32 * a + 92

    c1 = (
        first_coefficient_formula(tree, root, support, leaf)
        + correction(tree, root, support, case)
    )
    return {1: c1, 2: 2 * half_c2, 3: c3, 4: 32, 5: 0}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-h-order", type=int, default=9)
    parser.add_argument("--random-c1", type=int, default=200)
    parser.add_argument("--random-maximum-order", type=int, default=100)
    args = parser.parse_args()

    checks = 0
    configurations = 0
    failures: list[dict] = []
    minima = {
        case: {index: None for index in range(1, 5)}
        for case in ("root", "support")
    }
    tree_count = 0
    for order in range(2, args.maximum_h_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            tree_count += 1
            H = nx.convert_node_labels_to_integers(tree0)
            code = (
                nx.to_graph6_bytes(H, header=False)
                .decode("ascii")
                .strip()
            )
            for root in H:
                for support in H:
                    if root == support:
                        continue
                    for case in ("root", "support"):
                        C = H.copy()
                        leaf = order
                        C.add_edge(
                            root if case == "root" else support,
                            leaf,
                        )
                        values = [
                            direct_total(
                                add_leaf_bundle(C, leaf, amount),
                                root,
                                support,
                            )
                            for amount in range(6)
                        ]
                        actual = forward_coefficients(values)
                        expected = predicted_coefficients(
                            C, root, support, leaf, case
                        )
                        configurations += 1
                        for index, predicted in expected.items():
                            checks += 1
                            record = {
                                "h_order": order,
                                "graph6": code,
                                "root": root,
                                "support": support,
                                "case": case,
                                "coefficient_index": index,
                                "actual": actual[index],
                                "predicted": predicted,
                            }
                            if index <= 4:
                                current = minima[case][index]
                                if (
                                    current is None
                                    or actual[index] < current["actual"]
                                ):
                                    minima[case][index] = record
                            if actual[index] != predicted:
                                failures.append(record)

    rng = random.Random(993_330_730)
    random_checks = 0
    for sample in range(args.random_c1):
        order = rng.randint(2, args.random_maximum_order)
        H = (
            nx.path_graph(2)
            if order == 2
            else nx.from_prufer_sequence(
                [rng.randrange(order) for _ in range(order - 2)]
            )
        )
        root, support = rng.sample(list(H), 2)
        for case in ("root", "support"):
            C = H.copy()
            leaf = order
            C.add_edge(root if case == "root" else support, leaf)
            actual_c1 = (
                direct_total(
                    add_leaf_bundle(C, leaf, 1), root, support
                )
                - direct_total(C, root, support)
            )
            predicted_c1 = predicted_coefficients(
                C, root, support, leaf, case
            )[1]
            record = {
                "sample": sample,
                "h_order": order,
                "root": root,
                "support": support,
                "case": case,
                "coefficient_index": 1,
                "actual": actual_c1,
                "predicted": predicted_c1,
            }
            random_checks += 1
            if actual_c1 != predicted_c1:
                failures.append(record)

    report = {
        "status": (
            "PASS_RANK3_ENDPOINT_COLLISION_COEFFICIENT_REPLAY"
            if not failures
            else "FAIL_RANK3_ENDPOINT_COLLISION_COEFFICIENT_REPLAY"
        ),
        "maximum_h_order": args.maximum_h_order,
        "nonisomorphic_tree_count": tree_count,
        "marked_configurations": configurations,
        "coefficient_checks": checks,
        "random_c1_checks": random_checks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minima": minima,
        "formulas_checked": {
            "c1": "general closed formula plus endpoint correction",
            "c2": "two endpoint-specific local formulas",
            "c3": "12m+32a+140 (root), 12m+32a+92 (support)",
            "c4": 32,
            "c5": 0,
        },
    }
    output = Path(
        "rank3_endpoint_collision_coefficient_replay_20260730.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
