#!/usr/bin/env python3
"""Exact replay for the rank-five endpoint-degree (2,2) edge theorem."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import os
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_edge_local_degree2_degree2_theorem_exact_20260825.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def conv(left: list[int], right: list[int], cap: int) -> list[int]:
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
                assert neighbor not in parent
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
                out = conv(out, add(excluded[child], included[child], cap), cap)
                inside = conv(inside, excluded[child], cap)
            excluded[vertex] = out
            included[vertex] = inside
        total = conv(total, add(excluded[root], included[root], cap), cap)
    return total + [0] * (cap + 1 - len(total))


def independent(graph: nx.Graph, chosen: tuple[int, ...] | frozenset[int]) -> bool:
    selected = set(chosen)
    return all(v not in selected for u in selected for v in graph[u])


def literal_incidence_audit(
    forest: nx.Graph, roots: tuple[int, ...], states: list[frozenset[int]]
) -> tuple[int, int, int]:
    parent: dict[int, int | None] = {}
    children: dict[int, list[int]] = {vertex: [] for vertex in forest}
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
    state_set = frozenset(states)
    upward = 0
    downward = 0
    degree_sum = 0
    targets: dict[tuple[tuple[int, ...], int, int], tuple] = {}
    for state in states:
        upward += sum(parent[vertex] is not None for vertex in state)
        degree_sum += sum(forest.degree(vertex) for vertex in state)
        for selected_parent in state:
            for child in children[selected_parent]:
                downward += 1
                selected_children = tuple(
                    grandchild
                    for grandchild in children[child]
                    if grandchild in state
                )
                if not selected_children:
                    target_state = frozenset((state - {selected_parent}) | {child})
                    assert target_state in state_set
                    target = (tuple(sorted(target_state)), child, selected_parent)
                    source = (tuple(sorted(state)), selected_parent, child, 1)
                else:
                    grandchild = min(selected_children)
                    target = (tuple(sorted(state)), grandchild, child)
                    source = (tuple(sorted(state)), selected_parent, child, 2)
                assert target not in targets
                targets[target] = source
    assert downward == len(targets)
    assert downward <= upward
    assert degree_sum == upward + downward
    return upward, downward, degree_sum


def symbolic_pointwise_certificate() -> dict[str, str]:
    x, y = sp.symbols("x y", integer=True, nonnegative=True)
    choose = lambda z, k: sp.prod(z - j for j in range(k)) / sp.factorial(k)
    expected = {
        4: sp.Integer(4),
        3: x + y + 15,
        2: 3 * (choose(x, 2) + choose(y, 2)) - 2 * x * y + 5 * (x + y),
        1: 5 * (choose(x, 3) + choose(y, 3) + choose(x, 2) + choose(y, 2)),
        0: (
            7 * (choose(x, 4) + choose(y, 4))
            + 2
            * (
                x * choose(y, 3)
                + choose(x, 2) * choose(y, 2)
                + choose(x, 3) * y
            )
            + 5 * (choose(x, 3) + choose(y, 3))
        ),
    }

    def layer(root_count: int, rank_four: bool) -> sp.Expr:
        if root_count < 0:
            return sp.Integer(0)
        result = 0
        for left in range(root_count + 1):
            right = root_count - left
            groups_hit = int(left > 0) + int(right > 0)
            if rank_four:
                weight = 2 * root_count + 5 * (2 - groups_hit) - 6
            else:
                compatible_groups = 2 - groups_hit
                weight = 5 * (
                    compatible_groups + compatible_groups * (compatible_groups - 1) // 2
                )
            result += weight * choose(x, left) * choose(y, right)
        return sp.expand(result)

    actual: dict[int, sp.Expr] = {}
    for nonroot_rank in range(5):
        value = layer(4 - nonroot_rank, True)
        if nonroot_rank <= 3:
            value += layer(3 - nonroot_rank, False)
        actual[nonroot_rank] = sp.expand(value)
        assert sp.expand(value - expected[nonroot_rank]) == 0
    nonnegative_rewrite_s2 = (
        sp.Rational(3, 2) * (x - y) ** 2
        + x * y
        + sp.Rational(7, 2) * (x + y)
    )
    assert sp.expand(expected[2] - nonnegative_rewrite_s2) == 0
    return {
        f"P_{rank}": str(sp.factor(value))
        for rank, value in actual.items()
    } | {"P_2_nonnegative_rewrite": str(nonnegative_rewrite_s2)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=4)
    parser.add_argument("--max-order", type=int, default=13)
    args = parser.parse_args()
    assert 4 <= args.min_order <= args.max_order

    totals = {
        "trees": 0,
        "degree2_degree2_edges": 0,
        "independent_four_sets_in_residuals": 0,
        "upward_incidences": 0,
        "downward_sources": 0,
        "negative_pointwise_auxiliary_margins": 0,
        "negative_edge_local_margins": 0,
    }
    per_order: list[dict[str, int]] = []
    minimum_auxiliary_active = None
    minimum_positive_edge_margin = None

    for n in range(args.min_order, args.max_order + 1):
        local_trees = 0
        local_edges = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            totals["trees"] += 1
            local_trees += 1
            coefficients_tree = independence_coefficients(tree, 5)
            i5_tree = coefficients_tree[5]
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            for u, v in tree.edges():
                if tree.degree(u) != 2 or tree.degree(v) != 2:
                    continue
                local_edges += 1
                totals["degree2_degree2_edges"] += 1
                left_boundary = next(vertex for vertex in tree[u] if vertex != v)
                right_boundary = next(vertex for vertex in tree[v] if vertex != u)
                assert left_boundary != right_boundary
                residual = tree.copy()
                residual.remove_nodes_from((u, v, left_boundary, right_boundary))
                left_roots = frozenset(tree[left_boundary]) - {u}
                right_roots = frozenset(tree[right_boundary]) - {v}
                assert left_roots.isdisjoint(right_roots)
                roots = tuple(sorted(left_roots | right_roots))
                assert set(roots) <= set(residual)
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
                a = independence_coefficients(residual, 5)
                assert len(states4) == a[4]
                upward, downward, degree_sum = literal_incidence_audit(
                    residual, roots, states4
                )
                z = sum(len(state & set(roots)) for state in states4)
                assert z + upward == 4 * a[4]
                x_total = sum(
                    2
                    - int(bool(state & left_roots))
                    - int(bool(state & right_roots))
                    for state in states4
                )
                y_total = 0
                for state in states3:
                    compatible = (
                        2
                        - int(bool(state & left_roots))
                        - int(bool(state & right_roots))
                    )
                    y_total += compatible + compatible * (compatible - 1) // 2
                auxiliary = 2 * z + 5 * x_total + 5 * y_total - 6 * a[4]
                assert auxiliary >= 0
                totals["negative_pointwise_auxiliary_margins"] += auxiliary < 0
                if a[4] and (
                    minimum_auxiliary_active is None
                    or auxiliary < minimum_auxiliary_active[0]
                ):
                    minimum_auxiliary_active = (
                        auxiliary,
                        {
                            "auxiliary_margin": auxiliary,
                            "order": n,
                            "tree_index": index,
                            "graph6": code,
                            "edge": sorted((u, v)),
                            "boundary_vertices": [left_boundary, right_boundary],
                            "h": residual.number_of_nodes(),
                            "a4": a[4],
                            "Z": z,
                            "X": x_total,
                            "Y": y_total,
                        },
                    )

                # Exact coefficient decomposition over residual ranks.
                predicted_i5 = a[5] + 2 * a[4] + x_total + y_total
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
                if edge_margin > 0 and (
                    minimum_positive_edge_margin is None
                    or (edge_margin, n, index, u, v) < minimum_positive_edge_margin[0]
                ):
                    minimum_positive_edge_margin = (
                        (edge_margin, n, index, u, v),
                        {
                            "margin": edge_margin,
                            "order": n,
                            "tree_index": index,
                            "graph6": code,
                            "edge": sorted((u, v)),
                            "boundary_vertices": [left_boundary, right_boundary],
                            "h": h,
                            "i5_tree": i5_tree,
                            "i4_residual": a[4],
                        },
                    )
                totals["independent_four_sets_in_residuals"] += a[4]
                totals["upward_incidences"] += upward
                totals["downward_sources"] += downward

        per_order.append(
            {"order": n, "trees": local_trees, "degree2_degree2_edges": local_edges}
        )
        print(
            f"DEGREE2_DEGREE2_ORDER {n} TREES {local_trees} EDGES {local_edges}",
            flush=True,
        )

    assert totals["negative_pointwise_auxiliary_margins"] == 0
    assert totals["negative_edge_local_margins"] == 0
    payload = {
        "schema": "rank5-edge-local-degree2-degree2-theorem-v1",
        "status": "PASS_EXACT_ALL_ORDER_DEGREE2_DEGREE2_THEOREM_BOUNDED_INJECTION_AUDIT",
        "theorem": (
            "Every tree edge with endpoint degrees (2,2) satisfies "
            "(n-2)(n-3)i4(T-N[u]-N[v])<=5(n-4)i5(T)."
        ),
        "symbolic_pointwise_certificate": symbolic_pointwise_certificate(),
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
            [1, 3],
            [1, 4],
            [2, 3],
            [1, 5],
            [2, 4],
            [3, 3],
        ],
        "proof_boundary": (
            "The companion note proves the two-group pointwise lemma and the "
            "(2,2) edge theorem all-order.  The bounded census is a literal "
            "audit only and does not prove the six listed edge types."
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
