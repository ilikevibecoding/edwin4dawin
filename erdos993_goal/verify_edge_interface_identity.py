#!/usr/bin/env python3
"""Exact replay for the edge-interface identities used on Erdős 993.

For an edge e=uv of a tree T, let H_e be obtained from T-{u,v} by adding
all edges between N_T(u)-{v} and N_T(v)-{u}.  The script verifies

    I(T)   = I(T/e) + x I(H_e),
    I(T_e) = (1+x) I(T/e) + x I(H_e),

where T_e subdivides e once.  It also records (but does not assume)
unimodality and mode-alignment data for I(H_e).
"""

from __future__ import annotations

import argparse
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import networkx as nx


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    size = max(len(left), len(right))
    return tuple(
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(size)
    )


def shift(poly: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + poly


def multiply(
    left: tuple[int, ...], right: tuple[int, ...]
) -> tuple[int, ...]:
    result = [0] * (len(left) + len(right) - 1)
    for left_index, left_value in enumerate(left):
        for right_index, right_value in enumerate(right):
            result[left_index + right_index] += left_value * right_value
    return tuple(result)


def independence_polynomial(graph: nx.Graph) -> tuple[int, ...]:
    """Return I(graph) exactly, using memoized vertex deletion."""
    nodes = list(graph)
    position = {node: index for index, node in enumerate(nodes)}
    adjacency = [0] * len(nodes)
    for left, right in graph.edges():
        left_index = position[left]
        right_index = position[right]
        adjacency[left_index] |= 1 << right_index
        adjacency[right_index] |= 1 << left_index

    @lru_cache(maxsize=None)
    def solve(mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1,)
        # Branch at a maximum-degree remaining vertex.
        candidates = (
            index for index in range(len(nodes)) if mask & (1 << index)
        )
        vertex = max(
            candidates, key=lambda index: (adjacency[index] & mask).bit_count()
        )
        without_vertex = mask & ~(1 << vertex)
        without_closed_neighborhood = without_vertex & ~adjacency[vertex]
        return add(
            solve(without_vertex),
            shift(solve(without_closed_neighborhood)),
        )

    return solve((1 << len(nodes)) - 1)


def contract_edge(tree: nx.Graph, left: int, right: int) -> nx.Graph:
    contracted = nx.Graph()
    contracted.add_nodes_from(node for node in tree if node != right)
    for first, second in tree.edges():
        first = left if first == right else first
        second = left if second == right else second
        if first != second:
            contracted.add_edge(first, second)
    return contracted


def subdivide_edge(tree: nx.Graph, left: int, right: int) -> nx.Graph:
    subdivided = tree.copy()
    subdivided.remove_edge(left, right)
    new_vertex = max(tree.nodes(), default=-1) + 1
    while new_vertex in subdivided:
        new_vertex += 1
    subdivided.add_edges_from(
        [(left, new_vertex), (new_vertex, right)]
    )
    return subdivided


def edge_interface(tree: nx.Graph, left: int, right: int) -> nx.Graph:
    interface = tree.subgraph(
        [node for node in tree if node not in {left, right}]
    ).copy()
    left_frontier = set(tree.neighbors(left)) - {right}
    right_frontier = set(tree.neighbors(right)) - {left}
    interface.add_edges_from(
        (first, second)
        for first in left_frontier
        for second in right_frontier
    )
    return interface


def modes(poly: tuple[int, ...]) -> list[int]:
    maximum = max(poly)
    return [index for index, value in enumerate(poly) if value == maximum]


def is_unimodal(poly: tuple[int, ...]) -> bool:
    descending = False
    for left, right in zip(poly, poly[1:]):
        if descending and right > left:
            return False
        if right < left:
            descending = True
    return True


def is_log_concave(poly: tuple[int, ...]) -> bool:
    return all(
        poly[index] ** 2 >= poly[index - 1] * poly[index + 1]
        for index in range(1, len(poly) - 1)
    )


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(
        nx.convert_node_labels_to_integers(graph), header=False
    ).decode("ascii").strip()


def trees_of_order(order: int):
    if order == 1:
        graph = nx.Graph()
        graph.add_node(0)
        yield graph
    elif order == 2:
        graph = nx.Graph()
        graph.add_edge(0, 1)
        yield graph
    else:
        yield from nx.nonisomorphic_trees(order)


def check(max_order: int) -> dict:
    tree_count = 0
    edge_count = 0
    identity_checks = 0
    interface_unimodality_failures = []
    first_interface_lc_failure = None
    maximum_mode_gap = -1
    maximum_mode_gap_witness = None

    for order in range(2, max_order + 1):
        for tree in trees_of_order(order):
            tree_count += 1
            tree_poly = independence_polynomial(tree)
            for left, right in tree.edges():
                edge_count += 1
                contracted = contract_edge(tree, left, right)
                subdivided = subdivide_edge(tree, left, right)
                interface = edge_interface(tree, left, right)

                contracted_poly = independence_polynomial(contracted)
                subdivided_poly = independence_polynomial(subdivided)
                interface_poly = independence_polynomial(interface)

                first_rhs = add(contracted_poly, shift(interface_poly))
                second_rhs = add(
                    multiply((1, 1), contracted_poly),
                    shift(interface_poly),
                )
                assert tree_poly == first_rhs
                assert subdivided_poly == second_rhs
                identity_checks += 2

                if not is_unimodal(interface_poly):
                    interface_unimodality_failures.append(
                        {
                            "tree_order": order,
                            "tree_graph6": graph6(tree),
                            "edge": [left, right],
                            "interface_polynomial": interface_poly,
                        }
                    )
                if (
                    first_interface_lc_failure is None
                    and not is_log_concave(interface_poly)
                ):
                    first_interface_lc_failure = {
                        "tree_order": order,
                        "tree_graph6": graph6(tree),
                        "edge": [left, right],
                        "interface_graph6": graph6(interface),
                        "interface_polynomial": interface_poly,
                        "lc_failure_indices": [
                            index
                            for index in range(1, len(interface_poly) - 1)
                            if interface_poly[index] ** 2
                            < interface_poly[index - 1]
                            * interface_poly[index + 1]
                        ],
                    }

                # The two summands in I(T_e) have modes modes(I(T/e))
                # or one step to their right, and 1+modes(I(H_e)).
                smoothed_modes = modes(
                    multiply((1, 1), contracted_poly)
                )
                shifted_interface_modes = [
                    index + 1 for index in modes(interface_poly)
                ]
                gap = min(
                    abs(first - second)
                    for first in smoothed_modes
                    for second in shifted_interface_modes
                )
                if gap > maximum_mode_gap:
                    maximum_mode_gap = gap
                    maximum_mode_gap_witness = {
                        "tree_order": order,
                        "tree_graph6": graph6(tree),
                        "edge": [left, right],
                        "contracted_polynomial": contracted_poly,
                        "interface_polynomial": interface_poly,
                        "smoothed_contracted_modes": smoothed_modes,
                        "shifted_interface_modes": shifted_interface_modes,
                        "gap": gap,
                    }

    return {
        "certificate": "passed",
        "scope": {
            "tree_orders": [2, max_order],
            "unlabeled_trees": tree_count,
            "edge_instances": edge_count,
            "exact_identity_checks": identity_checks,
        },
        "identities": [
            "I(T) = I(T/e) + x I(H_e)",
            "I(T_e) = (1+x) I(T/e) + x I(H_e)",
        ],
        "interface_unimodality_failures": interface_unimodality_failures,
        "first_interface_log_concavity_failure": first_interface_lc_failure,
        "maximum_summand_mode_gap": maximum_mode_gap,
        "maximum_summand_mode_gap_witness": maximum_mode_gap_witness,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=13)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = check(args.max_order)
    encoded = json.dumps(report, indent=2) + "\n"
    if args.output:
        args.output.write_text(encoded, encoding="utf-8")
        digest = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
        print(f"wrote {args.output}")
        print(f"sha256 {digest}")
    print(encoded, end="")


if __name__ == "__main__":
    main()
