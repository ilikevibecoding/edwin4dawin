#!/usr/bin/env python3
"""Exact replay for the rank-five endpoint-degree (1,3) edge theorem."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import os
from pathlib import Path

import networkx as nx

from verify_rank5_edge_local_degree2_degree2_theorem_root import (
    independent,
    independence_coefficients,
    literal_incidence_audit,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_edge_local_leaf_degree3_theorem_exact_20260825.json"
CORE_LEMMA_SOURCE = HERE / "verify_rank5_edge_local_degree2_degree2_theorem_root.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=4)
    parser.add_argument("--max-order", type=int, default=13)
    args = parser.parse_args()
    assert 4 <= args.min_order <= args.max_order

    totals = {
        "trees": 0,
        "oriented_leaf_degree3_edges": 0,
        "independent_four_sets_in_residuals": 0,
        "upward_incidences": 0,
        "downward_sources": 0,
        "negative_two_group_auxiliary_margins": 0,
        "negative_edge_local_margins": 0,
    }
    per_order: list[dict[str, int]] = []
    minimum_auxiliary_active = None
    minimum_positive_edge_margin = None

    for n in range(args.min_order, args.max_order + 1):
        local_trees = 0
        local_edges = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            local_trees += 1
            totals["trees"] += 1
            coefficients_tree = independence_coefficients(tree, 5)
            i5_tree = coefficients_tree[5]
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            for leaf, degree_three in (
                (u, v)
                for u, v in tree.edges()
                for u, v in ((u, v), (v, u))
                if tree.degree(u) == 1 and tree.degree(v) == 3
            ):
                local_edges += 1
                totals["oriented_leaf_degree3_edges"] += 1
                boundary = tuple(
                    sorted(vertex for vertex in tree[degree_three] if vertex != leaf)
                )
                assert len(boundary) == 2
                left_boundary, right_boundary = boundary
                residual = tree.copy()
                residual.remove_nodes_from((leaf, degree_three, *boundary))
                left_roots = frozenset(tree[left_boundary]) - {degree_three}
                right_roots = frozenset(tree[right_boundary]) - {degree_three}
                assert left_roots.isdisjoint(right_roots)
                roots = tuple(sorted(left_roots | right_roots))
                states4 = [
                    frozenset(chosen)
                    for chosen in itertools.combinations(tuple(residual), 4)
                    if independent(residual, chosen)
                ]
                states3 = [
                    frozenset(chosen)
                    for chosen in itertools.combinations(tuple(residual), 3)
                    if independent(residual, chosen)
                ]
                states2 = [
                    frozenset(chosen)
                    for chosen in itertools.combinations(tuple(residual), 2)
                    if independent(residual, chosen)
                ]
                a = independence_coefficients(residual, 5)
                assert len(states4) == a[4]
                upward, downward, degree_sum = literal_incidence_audit(
                    residual, roots, states4
                )
                root_set = set(roots)
                z = sum(len(state & root_set) for state in states4)
                assert z + upward == 4 * a[4]

                def compatible_groups(state: frozenset[int]) -> int:
                    return (
                        2
                        - int(bool(state & left_roots))
                        - int(bool(state & right_roots))
                    )

                x_total = sum(compatible_groups(state) for state in states4)
                y_total = sum(
                    (r := compatible_groups(state)) + r * (r - 1) // 2
                    for state in states3
                )
                lower_rank_bonus = sum(
                    (r := compatible_groups(state)) * (r - 1) // 2
                    for state in states2
                )
                auxiliary = 2 * z + 5 * x_total + 5 * y_total - 6 * a[4]
                assert auxiliary >= 0
                totals["negative_two_group_auxiliary_margins"] += auxiliary < 0

                # I(T)=(1+x)I(K)+xI(H).  Expanding I(K) by the two
                # compatible boundary roots gives this exact rank-five row.
                predicted_i5 = (
                    a[5]
                    + 2 * a[4]
                    + x_total
                    + y_total
                    + lower_rank_bonus
                )
                assert predicted_i5 == i5_tree
                extension_lower = (
                    (residual.number_of_nodes() - 4) * a[4] - degree_sum
                )
                assert 5 * a[5] >= extension_lower
                assert degree_sum <= 2 * upward
                h = residual.number_of_nodes()
                edge_margin = 5 * h * i5_tree - (n - 2) * (n - 3) * a[4]
                assert edge_margin >= 0
                totals["negative_edge_local_margins"] += edge_margin < 0

                witness = {
                    "order": n,
                    "tree_index": index,
                    "graph6": code,
                    "oriented_edge": [leaf, degree_three],
                    "boundary_vertices": list(boundary),
                    "h": h,
                    "a4": a[4],
                    "i5_tree": i5_tree,
                    "Z": z,
                    "X": x_total,
                    "Y": y_total,
                    "lower_rank_bonus": lower_rank_bonus,
                }
                if a[4] and (
                    minimum_auxiliary_active is None
                    or auxiliary < minimum_auxiliary_active[0]
                ):
                    minimum_auxiliary_active = (
                        auxiliary,
                        witness | {"auxiliary_margin": auxiliary},
                    )
                if edge_margin > 0 and (
                    minimum_positive_edge_margin is None
                    or (edge_margin, n, index, leaf, degree_three)
                    < minimum_positive_edge_margin[0]
                ):
                    minimum_positive_edge_margin = (
                        (edge_margin, n, index, leaf, degree_three),
                        witness | {"edge_local_margin": edge_margin},
                    )

                totals["independent_four_sets_in_residuals"] += a[4]
                totals["upward_incidences"] += upward
                totals["downward_sources"] += downward

        per_order.append(
            {"order": n, "trees": local_trees, "oriented_leaf_degree3_edges": local_edges}
        )
        print(
            f"LEAF_DEGREE3_ORDER {n} TREES {local_trees} ORIENTED_EDGES {local_edges}",
            flush=True,
        )

    assert totals["negative_two_group_auxiliary_margins"] == 0
    assert totals["negative_edge_local_margins"] == 0
    payload = {
        "schema": "rank5-edge-local-leaf-degree3-theorem-v1",
        "status": "PASS_EXACT_ALL_ORDER_LEAF_DEGREE3_THEOREM_BOUNDED_INJECTION_AUDIT",
        "theorem": (
            "Every tree edge with endpoint degrees (1,3) satisfies "
            "(n-2)(n-3)i4(T-N[u]-N[v])<=5(n-4)i5(T)."
        ),
        "all_order_inputs": {
            "two_group_pointwise_lemma_source_sha256": sha256(CORE_LEMMA_SOURCE),
            "extra_rank2_term": "sum_{S in I2(H)} C(r(S),2)>=0",
            "derived_strong_bound": "5*i5(T)>=(h+4)*i4(H)",
        },
        "bounded_census": {
            "orders": [args.min_order, args.max_order],
            "totals": totals,
            "per_order": per_order,
            "minimum_auxiliary_active": (
                None if minimum_auxiliary_active is None else minimum_auxiliary_active[1]
            ),
            "minimum_positive_edge_margin": (
                None if minimum_positive_edge_margin is None else minimum_positive_edge_margin[1]
            ),
        },
        "remaining_endpoint_degree_pairs": [
            [1, 4],
            [2, 3],
            [1, 5],
            [2, 4],
            [3, 3],
        ],
        "proof_boundary": (
            "The companion note derives the leaf-degree3 coefficient row from "
            "the already proved two-group pointwise lemma.  The bounded census "
            "does not prove the five listed edge types."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("CORE_LEMMA_SOURCE", sha256(CORE_LEMMA_SOURCE))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
