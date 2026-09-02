#!/usr/bin/env python3
"""Exact replay for the rank-five (leaf, degree-two) edge theorem.

The companion note contains the all-order proof.  This program checks every
algebraic reduction symbolically and audits the prescribed-root incidence map
and final edge inequality on a bounded nonisomorphic-tree census.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
import os
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_edge_local_leaf_degree2_theorem_exact_20260825.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolution(left: list[int], right: list[int], cap: int) -> list[int]:
    result = [0] * min(cap + 1, len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= cap:
                result[i + j] += a * b
    return result


def add(left: list[int], right: list[int], cap: int) -> list[int]:
    length = min(cap + 1, max(len(left), len(right)))
    return [
        (left[i] if i < len(left) else 0)
        + (right[i] if i < len(right) else 0)
        for i in range(length)
    ]


def independence_coefficients(forest: nx.Graph, cap: int = 5) -> list[int]:
    total = [1]
    seen: set[int] = set()
    for root in forest:
        if root in seen:
            continue
        parent = {root: None}
        order = [root]
        seen.add(root)
        for vertex in order:
            for neighbor in forest[vertex]:
                if neighbor == parent[vertex]:
                    continue
                assert neighbor not in parent, "input must be a forest"
                parent[neighbor] = vertex
                seen.add(neighbor)
                order.append(neighbor)
        excluded: dict[int, list[int]] = {}
        included: dict[int, list[int]] = {}
        for vertex in reversed(order):
            out = [1]
            inside = [0, 1]
            for child in forest[vertex]:
                if parent.get(child) != vertex:
                    continue
                out = convolution(out, add(excluded[child], included[child], cap), cap)
                inside = convolution(inside, excluded[child], cap)
            excluded[vertex] = out
            included[vertex] = inside
        total = convolution(total, add(excluded[root], included[root], cap), cap)
    return total + [0] * (cap + 1 - len(total))


def independent(graph: nx.Graph, chosen: frozenset[int] | tuple[int, ...]) -> bool:
    selected = set(chosen)
    return all(v not in selected for u in selected for v in graph[u])


def rooted_parent_map(
    forest: nx.Graph, roots: tuple[int, ...]
) -> tuple[dict[int, int | None], dict[int, tuple[int, ...]]]:
    parent: dict[int, int | None] = {}
    children: dict[int, list[int]] = {v: [] for v in forest}
    for root in roots:
        assert root in forest and root not in parent
        parent[root] = None
        queue = [root]
        for vertex in queue:
            for neighbor in forest[vertex]:
                if neighbor == parent[vertex]:
                    continue
                assert neighbor not in parent
                parent[neighbor] = vertex
                children[vertex].append(neighbor)
                queue.append(neighbor)
    assert set(parent) == set(forest)
    return parent, {v: tuple(sorted(items)) for v, items in children.items()}


def incidence_and_auxiliary_audit(
    forest: nx.Graph, roots: tuple[int, ...]
) -> dict[str, int | list[int]]:
    """Replay the prescribed-root downward-to-upward injection literally."""

    parent, children = rooted_parent_map(forest, roots)
    root_set = frozenset(roots)
    nonroots = frozenset(forest) - root_set
    states = [
        frozenset(chosen)
        for chosen in itertools.combinations(tuple(forest), 4)
        if independent(forest, chosen)
    ]
    state_set = frozenset(states)
    upward = 0
    downward = 0
    degree_sum = 0
    image: dict[tuple[tuple[int, ...], int, int], tuple] = {}
    by_root_count = [0] * 5

    for state in states:
        by_root_count[len(state & root_set)] += 1
        upward += len(state & nonroots)
        degree_sum += sum(forest.degree(vertex) for vertex in state)
        for selected_parent in state:
            for child in children[selected_parent]:
                downward += 1
                selected_grandchildren = tuple(
                    grandchild
                    for grandchild in children[child]
                    if grandchild in state
                )
                if not selected_grandchildren:
                    target_state = frozenset((state - {selected_parent}) | {child})
                    assert target_state in state_set
                    target = (tuple(sorted(target_state)), child, selected_parent)
                    source = (tuple(sorted(state)), selected_parent, child, 1)
                else:
                    grandchild = min(selected_grandchildren)
                    target = (tuple(sorted(state)), grandchild, child)
                    source = (tuple(sorted(state)), selected_parent, child, 2)
                assert target not in image
                image[target] = source

    assert downward == len(image)
    assert downward <= upward
    assert degree_sum == upward + downward

    coefficients = independence_coefficients(forest, 5)
    subforest = forest.subgraph(nonroots).copy()
    subcoefficients = independence_coefficients(subforest, 5)
    a4, a5 = coefficients[4], coefficients[5]
    b3, b4 = subcoefficients[3], subcoefficients[4]
    assert a4 == len(states)
    assert b4 == by_root_count[0]
    assert upward == sum((4 - j) * by_root_count[j] for j in range(5))
    extension_sum = sum(
        sum(
            vertex not in state
            and all(neighbor not in state for neighbor in forest[vertex])
            for vertex in forest
        )
        for state in states
    )
    assert extension_sum == 5 * a5
    auxiliary_slack = 5 * (a4 + b4 + b3) - 2 * upward
    decomposed_slack = (
        2 * b4
        + 5 * b3
        - by_root_count[1]
        + by_root_count[2]
        + 3 * by_root_count[3]
        + 5 * by_root_count[4]
    )
    assert auxiliary_slack == decomposed_slack
    assert auxiliary_slack >= 0
    assert 5 * a5 >= (forest.number_of_nodes() - 4) * a4 - degree_sum
    assert degree_sum <= 2 * upward
    return {
        "states": len(states),
        "upward_incidences": upward,
        "downward_sources": downward,
        "degree_sum": degree_sum,
        "root_count_profile": by_root_count,
        "auxiliary_slack": auxiliary_slack,
    }


def symbolic_certificate() -> dict[str, str]:
    q, m, t = sp.symbols("q m t", integer=True)
    choose = lambda z, k: sp.prod(z - j for j in range(k)) / sp.factorial(k)
    lower = (
        -(q - 5) * choose(m, 3)
        + choose(q - 2, 2) * choose(m - 1, 2)
        + 3 * choose(q - 1, 3) * m
        + 5 * choose(q, 4)
    )
    derivative = sp.diff(lower, m)
    assert sp.diff(lower, m, 3) == 5 - q
    assert sp.factor(sp.diff(lower, m, 2).subs(m, 1)) == (q - 3) * (q - 2) / 2
    derivative_at_one = (6 * q**3 - 39 * q**2 + 83 * q - 64) / 12
    assert sp.expand(derivative.subs(m, 1) - derivative_at_one) == 0
    assert sp.expand(derivative_at_one.subs(q, t + 6)) == (
        t**3 / 2 + 23 * t**2 / 4 + 263 * t / 12 + sp.Rational(163, 6)
    )
    left_endpoint = (q - 3) * (q - 2) * (q - 1) * (5 * q + 12) / 24
    right_endpoint = (q - 2) * (21 * q**3 - 56 * q**2 + 59 * q - 48) / 24
    assert sp.expand(lower.subs(m, 1) - left_endpoint) == 0
    assert sp.expand(lower.subs(m, 2 * q - 2) - right_endpoint) == 0
    positive_right_cubic = sp.expand(
        (21 * q**3 - 56 * q**2 + 59 * q - 48).subs(q, t + 6)
    )
    assert positive_right_cubic == 21 * t**3 + 322 * t**2 + 1655 * t + 2826
    return {
        "large_m_selected_degree_bound": (
            "The prescribed-root incidence injection applied to independent "
            "3-sets gives D3<=2U3<=6b3, hence extension counting gives "
            "4b4>=(m-9)b3; for m>=2q-1 this pays 2(q-5)b3."
        ),
        "small_m_lower_bound": str(sp.factor(lower)),
        "third_derivative": str(sp.diff(lower, m, 3)),
        "second_derivative_at_m_1": str(sp.factor(sp.diff(lower, m, 2).subs(m, 1))),
        "first_derivative_at_m_1": str(sp.factor(derivative_at_one)),
        "left_endpoint": str(sp.factor(left_endpoint)),
        "right_endpoint": str(sp.factor(right_endpoint)),
        "right_endpoint_cubic_at_q_6_plus_t": str(positive_right_cubic),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=3)
    parser.add_argument("--max-order", type=int, default=12)
    args = parser.parse_args()
    assert 3 <= args.min_order <= args.max_order

    totals = {
        "trees": 0,
        "oriented_leaf_degree2_edges": 0,
        "independent_four_sets_in_rooted_residuals": 0,
        "upward_incidences": 0,
        "downward_sources": 0,
        "negative_auxiliary_slacks": 0,
        "negative_edge_local_margins": 0,
    }
    per_order: list[dict[str, int]] = []
    minimum_positive_edge_margin = None
    minimum_auxiliary_slack_active = None

    for n in range(args.min_order, args.max_order + 1):
        local_trees = 0
        local_edges = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            local_trees += 1
            totals["trees"] += 1
            tree_coefficients = independence_coefficients(tree, 5)
            i5_tree = tree_coefficients[5]
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            for leaf, degree_two in (
                (u, v)
                for u, v in tree.edges()
                for u, v in ((u, v), (v, u))
                if tree.degree(u) == 1 and tree.degree(v) == 2
            ):
                local_edges += 1
                totals["oriented_leaf_degree2_edges"] += 1
                root = next(vertex for vertex in tree[degree_two] if vertex != leaf)
                core = tree.copy()
                core.remove_nodes_from((leaf, degree_two))
                residual = core.copy()
                residual.remove_node(root)
                roots = tuple(sorted(core.neighbors(root)))
                root_set = set(roots)
                deep = residual.subgraph(set(residual) - root_set).copy()
                a = independence_coefficients(residual, 5)
                b = independence_coefficients(deep, 5)
                for rank in range(6):
                    expected = (
                        a[rank]
                        + (2 * a[rank - 1] if rank >= 1 else 0)
                        + (b[rank - 1] if rank >= 1 else 0)
                        + (b[rank - 2] if rank >= 2 else 0)
                    )
                    assert tree_coefficients[rank] == expected

                audit = incidence_and_auxiliary_audit(residual, roots)
                totals["independent_four_sets_in_rooted_residuals"] += audit["states"]
                totals["upward_incidences"] += audit["upward_incidences"]
                totals["downward_sources"] += audit["downward_sources"]
                totals["negative_auxiliary_slacks"] += audit["auxiliary_slack"] < 0
                if audit["states"] and (
                    minimum_auxiliary_slack_active is None
                    or audit["auxiliary_slack"] < minimum_auxiliary_slack_active[0]
                ):
                    minimum_auxiliary_slack_active = (
                        audit["auxiliary_slack"],
                        {
                            "order": n,
                            "tree_index": index,
                            "graph6": code,
                            "oriented_edge": [leaf, degree_two],
                            "root": root,
                            **audit,
                        },
                    )

                h = residual.number_of_nodes()
                assert h == n - 3
                edge_margin = 5 * h * i5_tree - (n - 2) * (n - 3) * a[4]
                reduced_margin = 5 * i5_tree - (h + 1) * a[4]
                assert edge_margin == h * reduced_margin
                assert edge_margin >= 0
                totals["negative_edge_local_margins"] += edge_margin < 0
                if edge_margin > 0 and (
                    minimum_positive_edge_margin is None
                    or (edge_margin, n, index, leaf, degree_two)
                    < minimum_positive_edge_margin[0]
                ):
                    minimum_positive_edge_margin = (
                        (edge_margin, n, index, leaf, degree_two),
                        {
                            "margin": edge_margin,
                            "reduced_margin": reduced_margin,
                            "order": n,
                            "tree_index": index,
                            "graph6": code,
                            "oriented_edge": [leaf, degree_two],
                            "root": root,
                            "h": h,
                            "i5_tree": i5_tree,
                            "i4_residual": a[4],
                        },
                    )

        per_order.append(
            {"order": n, "trees": local_trees, "oriented_leaf_degree2_edges": local_edges}
        )
        print(
            f"LEAF_DEGREE2_ORDER {n} TREES {local_trees} ORIENTED_EDGES {local_edges}",
            flush=True,
        )

    assert totals["negative_auxiliary_slacks"] == 0
    assert totals["negative_edge_local_margins"] == 0
    payload = {
        "schema": "rank5-edge-local-leaf-degree2-theorem-v1",
        "status": "PASS_EXACT_ALL_ORDER_LEAF_DEGREE2_THEOREM_BOUNDED_INJECTION_AUDIT",
        "theorem": (
            "Every tree edge with endpoint degrees (1,2) satisfies "
            "(n-2)(n-3)i4(T-N[u]-N[v])<=5(n-deg(u)-deg(v))i5(T)."
        ),
        "symbolic_certificate": symbolic_certificate(),
        "bounded_census": {
            "orders": [args.min_order, args.max_order],
            "totals": totals,
            "per_order": per_order,
            "minimum_positive_edge_margin": (
                None if minimum_positive_edge_margin is None else minimum_positive_edge_margin[1]
            ),
            "minimum_auxiliary_slack_active": (
                None if minimum_auxiliary_slack_active is None else minimum_auxiliary_slack_active[1]
            ),
        },
        "remaining_endpoint_degree_pairs": [
            [1, 3],
            [2, 2],
            [1, 4],
            [2, 3],
            [1, 5],
            [2, 4],
            [3, 3],
        ],
        "proof_boundary": (
            "The companion note proves the prescribed-root auxiliary lemma and "
            "the (1,2) edge theorem all-order.  The census is an independent "
            "literal audit only and does not prove the seven listed edge types."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
