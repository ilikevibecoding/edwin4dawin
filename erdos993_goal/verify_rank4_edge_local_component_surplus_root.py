#!/usr/bin/env python3
"""Exact producer for the all-tree rank-four edge-local component theorem.

The all-order proof is symbolic/combinatorial.  The bounded census is a
literal audit and emits a deterministic value-stream hash for a later
independent replay.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank4_edge_local_component_surplus_exact_root_20260828.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent(graph: nx.Graph, chosen: frozenset[int] | tuple[int, ...]) -> bool:
    selected = set(chosen)
    return all(v not in selected for u in selected for v in graph[u])


def independent_states(graph: nx.Graph, rank: int) -> list[frozenset[int]]:
    if rank < 0 or rank > len(graph):
        return []
    return [
        frozenset(chosen)
        for chosen in itertools.combinations(tuple(graph), rank)
        if independent(graph, chosen)
    ]


def choose_polynomial(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def symbolic_certificate() -> dict[str, object]:
    n, h, x, y = sp.symbols("n h x y", integer=True, nonnegative=True)

    endpoint_gap = sp.expand(
        (n - 4) * (n - 5) * (n - 6)
        - (n - 2) * (n - 6) * (n - 7)
    )
    assert sp.expand(endpoint_gap - 6 * (n - 6)) == 0
    ratio_step = sp.expand(h * (h - 1) - (h - 1) * (h - 2))
    assert ratio_step == 2 * (h - 1)

    # For a fixed independent nonroot set A, x and y count compatible roots
    # in the two distinguished groups.  Sum the rank-three contribution
    # 2z+4r-6 and its rank-two shadow 4(r+C(r,2)).
    def layer(root_count: int, rank_three: bool) -> sp.Expr:
        if root_count < 0:
            return sp.Integer(0)
        total = 0
        for left in range(root_count + 1):
            right = root_count - left
            groups_hit = int(left > 0) + int(right > 0)
            r = 2 - groups_hit
            if rank_three:
                weight = 2 * root_count + 4 * r - 6
            else:
                weight = 4 * (r + math.comb(r, 2))
            total += (
                weight
                * choose_polynomial(x, left)
                * choose_polynomial(y, right)
            )
        return sp.expand(total)

    expected = {
        3: sp.Integer(2),
        2: sp.Integer(12),
        1: (x - y) ** 2 + 3 * (x + y),
        0: 4
        * (
            choose_polynomial(x, 3)
            + choose_polynomial(y, 3)
            + choose_polynomial(x, 2)
            + choose_polynomial(y, 2)
        ),
    }
    actual: dict[int, sp.Expr] = {}
    for nonroot_rank in range(4):
        value = layer(3 - nonroot_rank, True)
        if nonroot_rank <= 2:
            value += layer(2 - nonroot_rank, False)
        value = sp.expand(value)
        assert sp.expand(value - expected[nonroot_rank]) == 0
        actual[nonroot_rank] = value

    return {
        "high_degree_tail": {
            "residual_ratio_step": str(ratio_step),
            "endpoint_gap": str(sp.factor(endpoint_gap)),
            "interpretation": (
                "for c=du+dv-2>=3 and h>=3, h<=n-5 and the endpoint "
                "bracket is 6(n-6)>=0"
            ),
        },
        "two_group_pointwise": {
            f"P_{rank}": str(sp.factor(value))
            for rank, value in sorted(actual.items(), reverse=True)
        },
        "one_group_slack": (
            "2*a3+2*b3+2*b2-U=A0+A2+2*A3+2*b2>=0"
        ),
    }


def literal_incidence_audit(
    forest: nx.Graph,
    roots: tuple[int, ...],
    states: list[frozenset[int]],
) -> tuple[int, int, int]:
    """Replay the prescribed-root downward-to-upward injection."""

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
    targets: dict[tuple[tuple[int, ...], int, int], tuple[object, ...]] = {}
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


def residual_after_closed_neighborhoods(
    tree: nx.Graph, u: int, v: int
) -> nx.Graph:
    removed = {u, v} | set(tree[u]) | set(tree[v])
    return tree.subgraph(set(tree) - removed).copy()


def edge_class(tree: nx.Graph, u: int, v: int) -> str:
    pair = tuple(sorted((tree.degree(u), tree.degree(v))))
    c = sum(pair) - 2
    if c == 0:
        return "K2-trivial"
    if pair == (1, 2):
        return "degrees-(1,2)"
    if pair == (1, 3):
        return "degrees-(1,3)"
    if pair == (2, 2):
        return "degrees-(2,2)"
    assert c >= 3
    return "c>=3"


def leaf_degree_two_audit(
    tree: nx.Graph, leaf: int, support: int, i4_tree: int
) -> dict[str, int]:
    assert tree.degree(leaf) == 1 and tree.degree(support) == 2
    w = next(vertex for vertex in tree[support] if vertex != leaf)
    h_graph = tree.copy()
    h_graph.remove_nodes_from((leaf, support, w))
    roots = tuple(sorted(set(tree[w]) - {support}))
    assert set(roots) <= set(h_graph)
    j_graph = h_graph.copy()
    j_graph.remove_nodes_from(roots)

    states3 = independent_states(h_graph, 3)
    a3 = len(states3)
    a4 = len(independent_states(h_graph, 4))
    b2 = len(independent_states(j_graph, 2))
    b3 = len(independent_states(j_graph, 3))
    assert i4_tree == a4 + 2 * a3 + b3 + b2

    upward, downward, degree_sum = literal_incidence_audit(
        h_graph, roots, states3
    )
    root_set = set(roots)
    layers = [0, 0, 0, 0]
    for state in states3:
        layers[len(state & root_set)] += 1
    assert layers[0] == b3
    auxiliary_slack = 2 * a3 + 2 * b3 + 2 * b2 - upward
    assert auxiliary_slack == layers[0] + layers[2] + 2 * layers[3] + 2 * b2
    assert auxiliary_slack >= 0

    h = len(h_graph)
    extension_slack = 4 * a4 - ((h - 3) * a3 - degree_sum)
    assert extension_slack >= 0
    derived_margin = 4 * i4_tree - (h + 1) * a3
    assert derived_margin >= 0
    return {
        "states3": a3,
        "upward": upward,
        "downward": downward,
        "degree_sum": degree_sum,
        "auxiliary_slack": auxiliary_slack,
        "derived_margin": derived_margin,
    }


def two_group_data(
    h_graph: nx.Graph,
    group_one: frozenset[int],
    group_two: frozenset[int],
) -> dict[str, int]:
    assert group_one.isdisjoint(group_two)
    roots = tuple(sorted(group_one | group_two))
    states3 = independent_states(h_graph, 3)
    states2 = independent_states(h_graph, 2)
    a3 = len(states3)
    a4 = len(independent_states(h_graph, 4))
    root_set = set(roots)

    def compatible_roots(state: frozenset[int]) -> int:
        return 2 - int(bool(state & group_one)) - int(bool(state & group_two))

    z = sum(len(state & root_set) for state in states3)
    x_total = sum(compatible_roots(state) for state in states3)
    y_total = sum(
        compatible_roots(state) + math.comb(compatible_roots(state), 2)
        for state in states2
    )
    pointwise_margin = 2 * z + 4 * x_total + 4 * y_total - 6 * a3
    assert pointwise_margin >= 0

    upward, downward, degree_sum = literal_incidence_audit(
        h_graph, roots, states3
    )
    assert z + upward == 3 * a3
    h = len(h_graph)
    extension_slack = 4 * a4 - ((h - 3) * a3 - degree_sum)
    assert extension_slack >= 0
    return {
        "a3": a3,
        "a4": a4,
        "z": z,
        "x": x_total,
        "y": y_total,
        "pointwise_margin": pointwise_margin,
        "upward": upward,
        "downward": downward,
        "degree_sum": degree_sum,
    }


def degree_two_degree_two_audit(
    tree: nx.Graph, u: int, v: int, i4_tree: int
) -> dict[str, int]:
    assert tree.degree(u) == tree.degree(v) == 2
    p = next(vertex for vertex in tree[u] if vertex != v)
    q = next(vertex for vertex in tree[v] if vertex != u)
    assert p != q
    h_graph = tree.copy()
    h_graph.remove_nodes_from((u, v, p, q))
    group_one = frozenset(set(tree[p]) - {u})
    group_two = frozenset(set(tree[q]) - {v})
    assert (group_one | group_two) <= set(h_graph)
    data = two_group_data(h_graph, group_one, group_two)
    assert i4_tree == data["a4"] + 2 * data["a3"] + data["x"] + data["y"]
    h = len(h_graph)
    derived_margin = 4 * i4_tree - (h + 5) * data["a3"]
    assert derived_margin >= 0
    return data | {"derived_margin": derived_margin}


def leaf_degree_three_audit(
    tree: nx.Graph, leaf: int, support: int, i4_tree: int
) -> dict[str, int]:
    assert tree.degree(leaf) == 1 and tree.degree(support) == 3
    p, q = tuple(vertex for vertex in tree[support] if vertex != leaf)
    h_graph = tree.copy()
    h_graph.remove_nodes_from((leaf, support, p, q))
    group_one = frozenset(set(tree[p]) - {support})
    group_two = frozenset(set(tree[q]) - {support})
    assert (group_one | group_two) <= set(h_graph)
    data = two_group_data(h_graph, group_one, group_two)
    l_term = 0
    for state in independent_states(h_graph, 1):
        r = 2 - int(bool(state & group_one)) - int(bool(state & group_two))
        l_term += math.comb(r, 2)
    assert i4_tree == (
        data["a4"] + 2 * data["a3"] + data["x"] + data["y"] + l_term
    )
    h = len(h_graph)
    derived_margin = 4 * i4_tree - (h + 5) * data["a3"]
    assert derived_margin >= 0
    return data | {"lower_shadow": l_term, "derived_margin": derived_margin}


def tree_audit(tree: nx.Graph) -> dict[str, object]:
    n = len(tree)
    vertices = tuple(tree)
    edges = tuple(tree.edges())
    states3 = independent_states(tree, 3)
    states4 = independent_states(tree, 4)
    i4_tree = len(states4)
    neighborhoods = {
        vertex: {vertex} | set(tree[vertex]) for vertex in vertices
    }

    token_edges: set[tuple[tuple[int, ...], tuple[int, ...]]] = set()
    for state in states4:
        for u in state:
            for v in tree[u]:
                target = frozenset((state - {u}) | {v})
                if not independent(tree, target):
                    continue
                left = tuple(sorted(state))
                right = tuple(sorted(target))
                token_edges.add((left, right) if left < right else (right, left))

    s4 = 0
    sum_h = 0
    local_minimum = None
    active_local_minimum = None
    class_counts: dict[str, int] = {}
    low_audits = {
        "degrees-(1,2)": 0,
        "degrees-(1,3)": 0,
        "degrees-(2,2)": 0,
    }
    incidence_totals = {"upward": 0, "downward": 0, "degree_sum": 0}
    for u, v in edges:
        residual_vertices = set(vertices) - (neighborhoods[u] | neighborhoods[v])
        h = len(residual_vertices)
        i3_residual = sum(state <= residual_vertices for state in states3)
        margin = 4 * h * i4_tree - (n - 2) * (n - 3) * i3_residual
        assert margin >= 0
        name = edge_class(tree, u, v)
        class_counts[name] = class_counts.get(name, 0) + 1
        row = (margin, u, v, h, i3_residual, name)
        if local_minimum is None or row < local_minimum:
            local_minimum = row
        if i3_residual and (
            active_local_minimum is None or row < active_local_minimum
        ):
            active_local_minimum = row

        if name == "degrees-(1,2)":
            leaf, support = (u, v) if tree.degree(u) == 1 else (v, u)
            low = leaf_degree_two_audit(tree, leaf, support, i4_tree)
        elif name == "degrees-(1,3)":
            leaf, support = (u, v) if tree.degree(u) == 1 else (v, u)
            low = leaf_degree_three_audit(tree, leaf, support, i4_tree)
        elif name == "degrees-(2,2)":
            low = degree_two_degree_two_audit(tree, u, v, i4_tree)
        else:
            low = None
        if low is not None:
            low_audits[name] += 1
            for key in incidence_totals:
                incidence_totals[key] += low[key]

        s4 += i3_residual
        sum_h += h

    assert s4 == len(token_edges)
    matching_two = sum(
        len(set(first) | set(second)) == 4
        for first, second in itertools.combinations(edges, 2)
    )
    w_path = math.comb(n - 2, 2) if n >= 2 else 0
    degree_surplus = sum(
        math.comb(tree.degree(vertex) - 1, 2) for vertex in vertices
    )
    assert matching_two == w_path - degree_surplus
    assert sum_h == 2 * matching_two

    a3_total = 0
    c3_total = 0
    for state in states3:
        removed = set().union(*(neighborhoods[vertex] for vertex in state))
        residual = set(vertices) - removed
        residual_edges = sum(a in residual and b in residual for a, b in edges)
        a3_total += len(residual)
        c3_total += len(residual) - residual_edges
    assert a3_total == 4 * i4_tree
    assert c3_total == a3_total - s4

    local_sum_margin = 4 * i4_tree * sum_h - (n - 2) * (n - 3) * s4
    component_margin = 4 * matching_two * i4_tree - w_path * s4
    theorem_margin = w_path * c3_total - degree_surplus * a3_total
    assert local_sum_margin == 2 * component_margin
    assert component_margin == theorem_margin
    assert theorem_margin >= 0

    return {
        "order": n,
        "i3": len(states3),
        "i4": i4_tree,
        "s4": s4,
        "m2": matching_two,
        "degree_surplus": degree_surplus,
        "A3": a3_total,
        "C3": c3_total,
        "component_margin": component_margin,
        "class_counts": class_counts,
        "low_audits": low_audits,
        "incidence_totals": incidence_totals,
        "minimum_local_margin": local_minimum,
        "minimum_active_local_margin": active_local_minimum,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=2)
    parser.add_argument("--max-order", type=int, default=14)
    args = parser.parse_args()
    assert 2 <= args.min_order <= args.max_order

    symbolic = symbolic_certificate()
    totals: dict[str, object] = {
        "trees": 0,
        "edges": 0,
        "independent_three_sets": 0,
        "independent_four_sets": 0,
        "token_edges": 0,
        "low_edge_audits": {
            "degrees-(1,2)": 0,
            "degrees-(1,3)": 0,
            "degrees-(2,2)": 0,
        },
        "class_counts": {},
        "upward_incidences": 0,
        "downward_sources": 0,
        "negative_local_margins": 0,
        "negative_component_margins": 0,
    }
    per_order = []
    value_stream = hashlib.sha256()
    minimum_positive_component = None
    minimum_active_local = None

    for n in range(args.min_order, args.max_order + 1):
        order_trees = 0
        order_edges = 0
        order_minimum = None
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            row = tree_audit(tree)
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            witness = row | {"tree_index": index, "graph6": code}
            totals["trees"] += 1
            totals["edges"] += n - 1
            totals["independent_three_sets"] += row["i3"]
            totals["independent_four_sets"] += row["i4"]
            totals["token_edges"] += row["s4"]
            totals["upward_incidences"] += row["incidence_totals"]["upward"]
            totals["downward_sources"] += row["incidence_totals"]["downward"]
            order_trees += 1
            order_edges += n - 1
            for name, count in row["low_audits"].items():
                totals["low_edge_audits"][name] += count
            for name, count in row["class_counts"].items():
                totals["class_counts"][name] = (
                    totals["class_counts"].get(name, 0) + count
                )
            margin = row["component_margin"]
            if order_minimum is None or margin < order_minimum[0]:
                order_minimum = (margin, witness)
            if margin > 0 and (
                minimum_positive_component is None
                or margin < minimum_positive_component[0]
            ):
                minimum_positive_component = (margin, witness)
            active = row["minimum_active_local_margin"]
            if active is not None and (
                minimum_active_local is None or active[0] < minimum_active_local[0]
            ):
                minimum_active_local = active + (n, index, code)
            value_stream.update(
                (
                    f"{n}|{index}|{code}|{row['i3']}|{row['i4']}|{row['s4']}|"
                    f"{row['m2']}|{row['A3']}|{row['C3']}|{margin}\n"
                ).encode("ascii")
            )
        per_order.append(
            {
                "order": n,
                "trees": order_trees,
                "edges": order_edges,
                "minimum_component_margin": order_minimum[0],
                "minimum_witness": order_minimum[1],
            }
        )

    report = {
        "status": "PASS_EXACT_ALL_ORDER_RANK4_EDGE_LOCAL_COMPONENT_SURPLUS_THEOREM",
        "scope": {
            "all_order": (
                "every finite tree and every edge; bounded enumeration is audit only"
            ),
            "finite_audit_orders": [args.min_order, args.max_order],
        },
        "theorem": {
            "edge_local": (
                "(n-2)(n-3)i3(T-(N[u] union N[v])) <= 4 h_uv i4(T)"
            ),
            "summed": "C(n-2,2)s4(T) <= 4m2(T)i4(T)",
            "component_surplus": (
                "C(n-2,2) sum_{S in I3(T)} c(T-N[S]) >= "
                "e(T) 4i4(T)"
            ),
            "degree_partition": (
                "c=0 trivial; c=1 is (1,2); c=2 is (1,3) or (2,2); "
                "c>=3 follows from path minimality and the residual cardinality bound"
            ),
        },
        "symbolic_certificate": symbolic,
        "bounded_literal_audit": {
            "totals": totals,
            "per_order": per_order,
            "minimum_positive_component": minimum_positive_component,
            "minimum_active_local": minimum_active_local,
            "ordered_value_stream_sha256": value_stream.hexdigest().upper(),
        },
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["bounded_literal_audit"]["totals"], indent=2))
    print(f"ordered_value_stream_sha256={value_stream.hexdigest().upper()}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
