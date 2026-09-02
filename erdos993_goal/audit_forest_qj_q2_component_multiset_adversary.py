#!/usr/bin/env python3
"""Exact finite adversarial audit of q_j(F)<=q_2(F) for forests.

This enumerates every unlabeled forest through order 15 by its unique
multiset of unlabeled tree components.  Tree rows are rebuilt by an
independent selected-root/edge-count dynamic program.  The result is search
evidence only: the all-order use in terminal induction comes instead from
the smaller-forest hypothesis q_j<=q_3 and the proved q_3<=q_2 theorem.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "forest_qj_q2_component_multiset_adversarial_20260829.json"
MAX_ORDER = 15


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolution(left: list[int], right: list[int]) -> list[int]:
    output = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        if not a:
            continue
        for j, b in enumerate(right):
            if b:
                output[i + j] += a * b
    return output


def pair_product(
    zero_a: list[int],
    one_a: list[int],
    zero_b: list[int],
    one_b: list[int],
) -> tuple[list[int], list[int]]:
    zero = convolution(zero_a, zero_b)
    first = convolution(one_a, zero_b)
    second = convolution(zero_a, one_b)
    length = max(len(first), len(second))
    one = [0] * length
    for index in range(length):
        one[index] = (
            (first[index] if index < len(first) else 0)
            + (second[index] if index < len(second) else 0)
        )
    return zero, one


def tree_rows(tree0: nx.Graph) -> tuple[list[int], list[int]]:
    """Count induced subsets with zero/exactly one edge by rooted-tree DP."""
    tree = nx.convert_node_labels_to_integers(tree0, ordering="sorted")
    root = 0
    parent = {root: -1}
    order = [root]
    for vertex in order:
        for child in tree.neighbors(vertex):
            if child == parent[vertex]:
                continue
            parent[child] = vertex
            order.append(child)

    # dp[v][selected][edge_count] is a coefficient row by subset size.
    dp: dict[int, list[list[list[int]]]] = {}
    for vertex in reversed(order):
        state = [
            [[1], [0]],       # root unselected: empty set, zero edges
            [[0, 1], [0]],    # root selected: singleton, zero edges
        ]
        for child in tree.neighbors(vertex):
            if parent.get(child) != vertex:
                continue
            child_state = dp[child]
            updated = [[[0], [0]], [[0], [0]]]
            for selected in (0, 1):
                rows = [[], []]
                for edges_left in (0, 1):
                    left = state[selected][edges_left]
                    for child_selected in (0, 1):
                        added_edge = selected * child_selected
                        for edges_right in (0, 1):
                            total_edges = edges_left + edges_right + added_edge
                            if total_edges > 1:
                                continue
                            product = convolution(left, child_state[child_selected][edges_right])
                            if len(rows[total_edges]) < len(product):
                                rows[total_edges] += [0] * (len(product) - len(rows[total_edges]))
                            for index, value in enumerate(product):
                                rows[total_edges][index] += value
                updated[selected] = [row if row else [0] for row in rows]
            state = updated
        dp[vertex] = state

    zero_parts = [dp[root][selected][0] for selected in (0, 1)]
    one_parts = [dp[root][selected][1] for selected in (0, 1)]
    length = max(map(len, zero_parts + one_parts))
    zero = [sum(row[k] if k < len(row) else 0 for row in zero_parts) for k in range(length)]
    one = [sum(row[k] if k < len(row) else 0 for row in one_parts) for k in range(length)]
    while len(zero) > 1 and zero[-1] == 0:
        zero.pop()
    while len(one) > 1 and one[-1] == 0:
        one.pop()
    assert zero[0] == 1 and zero[1] == tree.number_of_nodes()
    if tree.number_of_nodes() >= 2:
        assert one[2] == tree.number_of_edges()
    return zero, one


def literal_rows(graph: nx.Graph) -> tuple[list[int], list[int], int]:
    """Independent subset-mask reconstruction for the small DP audit."""
    graph = nx.convert_node_labels_to_integers(graph, ordering="sorted")
    order = graph.number_of_nodes()
    zero = [0] * (order + 1)
    one = [0] * (order + 1)
    edges = list(graph.edges())
    for mask in range(1 << order):
        induced_edges = sum(
            ((mask >> u) & 1) * ((mask >> v) & 1)
            for u, v in edges
        )
        size = mask.bit_count()
        if induced_edges == 0:
            zero[size] += 1
        elif induced_edges == 1:
            one[size] += 1
    while len(zero) > 1 and zero[-1] == 0:
        zero.pop()
    while len(one) > 1 and one[-1] == 0:
        one.pop()
    return zero, one, 1 << order


@dataclass(frozen=True)
class Component:
    order: int
    local_index: int
    zero: tuple[int, ...]
    one: tuple[int, ...]


def main() -> None:
    components: list[Component] = []
    tree_counts: dict[str, int] = {}
    literal_tree_checks = 0
    literal_subset_masks = 0
    component_stream = hashlib.sha256()
    for order in range(1, MAX_ORDER + 1):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        count = 0
        for local_index, tree in enumerate(trees):
            zero, one = tree_rows(tree)
            if order <= 8:
                literal_zero, literal_one, masks = literal_rows(tree)
                assert zero == literal_zero and one == literal_one
                literal_tree_checks += 1
                literal_subset_masks += masks
            components.append(Component(order, local_index, tuple(zero), tuple(one)))
            component_stream.update(
                (
                    f"{order}|{local_index}|{','.join(map(str, zero))}|"
                    f"{','.join(map(str, one))}\n"
                ).encode()
            )
            count += 1
        tree_counts[str(order)] = count

    forests_by_order = [0] * (MAX_ORDER + 1)
    rank_checks = 0
    zero_gaps = 0
    minimum_positive: tuple[int, tuple[int, ...], int] | None = None
    minimum_any: tuple[int, tuple[int, ...], int] | None = None
    counterexamples: list[dict[str, object]] = []
    stream = hashlib.sha256()

    def audit(
        total_order: int,
        signature: tuple[int, ...],
        zero: list[int],
        one: list[int],
    ) -> None:
        nonlocal rank_checks, zero_gaps, minimum_positive, minimum_any
        forests_by_order[total_order] += 1
        if total_order < 3 or len(zero) <= 2:
            return
        a = zero[2]
        z2 = one[3] if len(one) > 3 else 0
        for j in range(3, len(zero)):
            b = zero[j]
            if not b:
                continue
            zj = one[j + 1] if j + 1 < len(one) else 0
            gap = j * b * z2 - 2 * a * zj
            rank_checks += 1
            row = (gap, signature, j)
            if minimum_any is None or row < minimum_any:
                minimum_any = row
            if gap == 0:
                zero_gaps += 1
            elif gap > 0 and (minimum_positive is None or row < minimum_positive):
                minimum_positive = row
            if gap < 0:
                counterexamples.append({
                    "order": total_order,
                    "component_indices": list(signature),
                    "j": j,
                    "i2": str(a),
                    "z2": str(z2),
                    "ij": str(b),
                    "zj": str(zj),
                    "gap": str(gap),
                })
            stream.update(
                f"{total_order}|{','.join(map(str, signature))}|{j}|{a}|{z2}|{b}|{zj}|{gap}\n".encode()
            )

    def extend(
        start: int,
        total_order: int,
        signature: tuple[int, ...],
        zero: list[int],
        one: list[int],
    ) -> None:
        for index in range(start, len(components)):
            component = components[index]
            new_order = total_order + component.order
            if new_order > MAX_ORDER:
                break
            new_zero, new_one = pair_product(
                zero, one, list(component.zero), list(component.one)
            )
            new_signature = signature + (index,)
            audit(new_order, new_signature, new_zero, new_one)
            extend(index, new_order, new_signature, new_zero, new_one)

    extend(0, 0, (), [1], [0])
    assert not counterexamples, counterexamples[:3]
    assert sum(forests_by_order[1:]) > sum(tree_counts.values())

    def witness(row: tuple[int, tuple[int, ...], int] | None) -> dict[str, object] | None:
        if row is None:
            return None
        gap, signature, j = row
        return {"gap": str(gap), "component_indices": list(signature), "j": j}

    report = {
        "schema": "forest-qj-q2-component-multiset-adversarial-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_FINITE_FOREST_QJ_Q2_NO_COUNTEREXAMPLE_NOT_PROOF",
        "inequality": "2*i2(F)*z_j(F)<=j*i_j(F)*z2(F), j>=3",
        "coverage": {
            "all_unlabeled_forests_through_order": MAX_ORDER,
            "tree_component_counts": tree_counts,
            "forest_counts_by_order": {
                str(order): forests_by_order[order]
                for order in range(1, MAX_ORDER + 1)
            },
            "total_forests": sum(forests_by_order[1:]),
            "rank_checks": rank_checks,
            "literal_tree_dp_checks_orders_1_8": literal_tree_checks,
            "literal_subset_masks": literal_subset_masks,
        },
        "component_catalog_sha256": component_stream.hexdigest().upper(),
        "zero_gaps": zero_gaps,
        "minimum_gap": witness(minimum_any),
        "minimum_positive_gap": witness(minimum_positive),
        "ordered_value_stream_sha256": stream.hexdigest().upper(),
        "counterexamples": counterexamples,
        "proof_boundary": (
            "This exhaustive component-multiset census is search evidence only. "
            "In the terminal strong induction the inequality follows noncircularly "
            "for the smaller forest from q_j<=q3 and the proved q3<=q2 theorem."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["coverage"], sort_keys=True))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
