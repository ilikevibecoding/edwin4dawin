#!/usr/bin/env python3
"""Independent small-order coverage audit for the matching quotient.

The Rust high-boundary verifier generates a tree from a maximum matching by
contracting matched edges and enumerating endpoint-incidence bits modulo
swaps inside matched pairs.  This Python replay independently compares the
resulting *set of polynomial pendant pairs* with ordinary NetworkX free-tree
enumeration at:

* order 16, alpha 8 (perfect matching), and
* order 17, alpha 9 (one unmatched vertex).

Equality, rather than merely equal counts, detects omissions in the quotient
parameterization.  Multiple quotient descriptions are harmless.
"""

from __future__ import annotations

import hashlib
import json
from itertools import combinations
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import MaskIndependencePolynomial
import replay_rank7_pgc_census_wave14 as census


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_matching_quotient_coverage_small_exact_20260817.json"
Polynomial = tuple[int, ...]
Pair = tuple[Polynomial, Polynomial]


def polynomial_pairs(graph: nx.Graph) -> tuple[int, set[Pair]]:
    engine = MaskIndependencePolynomial(graph)
    full_mask = (1 << graph.number_of_nodes()) - 1
    full = engine.polynomial(full_mask)
    pairs: set[Pair] = set()
    for leaf in (v for v in graph if graph.degree(v) == 1):
        support = next(iter(graph.neighbors(leaf)))
        deletion = full_mask ^ (1 << engine.position[leaf]) ^ (1 << engine.position[support])
        pairs.add((full, engine.polynomial(deletion)))
    alpha = len(full) - 1
    engine.polynomial.cache_clear()
    return alpha, pairs


def ordinary(order: int, alpha: int) -> tuple[int, set[Pair]]:
    eligible = 0
    pairs: set[Pair] = set()
    for tree in nx.nonisomorphic_trees(order):
        actual_alpha, actual_pairs = polynomial_pairs(tree)
        if actual_alpha == alpha:
            eligible += 1
            pairs.update(actual_pairs)
    return eligible, pairs


def perfect_expansions(quotient: nx.Graph):
    pairs = quotient.number_of_nodes()
    edges = list(nx.dfs_edges(quotient, source=0))
    assert len(edges) == pairs - 1 and edges[0][0] == 0
    for mask in range(1 << (pairs - 2)):
        graph = nx.Graph()
        graph.add_nodes_from(range(2 * pairs))
        graph.add_edges_from((2 * v, 2 * v + 1) for v in quotient)
        for index, (parent, child) in enumerate(edges):
            bit = 0 if index == 0 else (mask >> (index - 1)) & 1
            graph.add_edge(2 * parent + bit, 2 * child)
        yield graph


def near_perfect_expansions(quotient: nx.Graph, singleton: int):
    q = quotient.number_of_nodes()
    pairs = q - 1
    singleton_expanded = 2 * pairs
    first: dict[int, int] = {}
    second: dict[int, int] = {}
    next_vertex = 0
    for vertex in quotient:
        if vertex == singleton:
            continue
        first[vertex] = next_vertex
        second[vertex] = next_vertex + 1
        next_vertex += 2
    edges = list(nx.dfs_edges(quotient, source=singleton))
    free = sum(parent != singleton for parent, _ in edges)
    for mask in range(1 << free):
        graph = nx.Graph()
        graph.add_nodes_from(range(2 * pairs + 1))
        graph.add_edges_from((first[v], second[v]) for v in quotient if v != singleton)
        bit_index = 0
        for parent, child in edges:
            if parent == singleton:
                endpoint = singleton_expanded
            else:
                bit = (mask >> bit_index) & 1
                bit_index += 1
                endpoint = first[parent] if bit == 0 else second[parent]
            graph.add_edge(endpoint, first[child])
        assert bit_index == free
        yield graph


def quotient(order: int, alpha: int) -> tuple[int, set[Pair]]:
    perfect = order % 2 == 0
    matching = order - alpha
    quotient_order = matching if perfect else matching + 1
    coverings = 0
    pairs: set[Pair] = set()
    for tree in nx.nonisomorphic_trees(quotient_order):
        expansions = (
            perfect_expansions(tree)
            if perfect
            else (
                graph
                for singleton in tree
                for graph in near_perfect_expansions(tree, singleton)
            )
        )
        for graph in expansions:
            coverings += 1
            actual_alpha, actual_pairs = polynomial_pairs(graph)
            assert actual_alpha == alpha
            pairs.update(actual_pairs)
    return coverings, pairs


def quotient_forests(order: int):
    """Every unlabeled forest on ``order`` vertices as component multisets."""

    components: list[tuple[int, nx.Graph]] = []
    for size in range(1, order + 1):
        if size == 1:
            components.append((1, nx.empty_graph(1)))
        else:
            components.extend((size, tree.copy()) for tree in nx.nonisomorphic_trees(size))

    chosen: list[int] = []

    def visit(start: int, remaining: int):
        if remaining == 0:
            graph = nx.Graph()
            offset = 0
            for index in chosen:
                size, component = components[index]
                graph.add_nodes_from(range(offset, offset + size))
                graph.add_edges_from((offset + u, offset + v) for u, v in component.edges())
                offset += size
            assert offset == order
            yield graph
            return
        for index in range(start, len(components)):
            size = components[index][0]
            if size > remaining:
                break
            chosen.append(index)
            yield from visit(index, remaining - size)
            chosen.pop()

    yield from visit(0, order)


def general_forest_expansions(quotient: nx.Graph, singleton_set: frozenset[int]):
    q = quotient.number_of_nodes()
    paired = [v for v in quotient if v not in singleton_set]
    matching = len(paired)
    order = 2 * matching + len(singleton_set)
    first: dict[int, int] = {}
    second: dict[int, int] = {}
    next_vertex = 0
    for vertex in quotient:
        first[vertex] = next_vertex
        next_vertex += 1
        if vertex not in singleton_set:
            second[vertex] = next_vertex
            next_vertex += 1
    assert next_vertex == order
    edges = sorted((min(u, v), max(u, v)) for u, v in quotient.edges())
    seen: set[int] = set()
    incidence_bits: dict[tuple[int, int], int] = {}
    free = 0
    for edge_index, (u, v) in enumerate(edges):
        for vertex in (u, v):
            if vertex in singleton_set:
                continue
            if vertex in seen:
                incidence_bits[(edge_index, vertex)] = free
                free += 1
            else:
                seen.add(vertex)
    for pattern in range(1 << free):
        graph = nx.Graph()
        graph.add_nodes_from(range(order))
        graph.add_edges_from((first[v], second[v]) for v in paired)
        for edge_index, (u, v) in enumerate(edges):
            endpoints = []
            for vertex in (u, v):
                bit_index = incidence_bits.get((edge_index, vertex))
                bit = 0 if bit_index is None else (pattern >> bit_index) & 1
                endpoints.append(first[vertex] if bit == 0 else second[vertex])
            graph.add_edge(*endpoints)
        yield graph


def general_forest_quotient(order: int, alpha: int) -> tuple[int, int, set[Pair]]:
    unmatched = 2 * alpha - order
    designations = 0
    coverings = 0
    pairs: set[Pair] = set()
    for quotient_graph in quotient_forests(alpha):
        for singleton_tuple in combinations(quotient_graph, unmatched):
            singleton_set = frozenset(singleton_tuple)
            if any(u in singleton_set and v in singleton_set for u, v in quotient_graph.edges()):
                continue
            designations += 1
            for graph in general_forest_expansions(quotient_graph, singleton_set):
                coverings += 1
                actual_alpha, actual_pairs = polynomial_pairs(graph)
                if actual_alpha == alpha:
                    pairs.update(actual_pairs)
    return designations, coverings, pairs


def ordinary_forest_pairs(
    order: int, alpha: int,
    tree_pairs: list[set[tuple[Polynomial, Polynomial]]],
    forests: list[set[Polynomial]],
) -> set[Pair]:
    pairs: set[Pair] = set()
    for component_order in range(2, order + 1):
        common_order = order - component_order
        for full_component, reduced_component in tree_pairs[component_order]:
            for common in forests[common_order]:
                full = census.multiply(full_component, common)
                if len(full) - 1 != alpha:
                    continue
                pairs.add((full, census.multiply(reduced_component, common)))
    return pairs


def main() -> None:
    tree_cases = []
    for order, alpha in ((16, 8), (17, 9)):
        eligible, ordinary_pairs = ordinary(order, alpha)
        coverings, quotient_pairs = quotient(order, alpha)
        assert quotient_pairs == ordinary_pairs
        tree_cases.append({
            "order": order,
            "alpha": alpha,
            "ordinary_eligible_free_trees": eligible,
            "quotient_covering_expansions": coverings,
            "distinct_polynomial_pendant_pairs": len(ordinary_pairs),
            "missing_from_quotient": 0,
            "extraneous_from_quotient": 0,
        })
        print(
            f"order={order} alpha={alpha} eligible={eligible} "
            f"coverings={coverings} pairs={len(ordinary_pairs)}",
            flush=True,
        )
    _, _, tree_pairs, forests = census.enumerate_rows(16)
    forest_cases = []
    for order, alpha in ((14, 8), (15, 8), (16, 8)):
        ordinary_pairs = ordinary_forest_pairs(order, alpha, tree_pairs, forests)
        designations, coverings, quotient_pairs = general_forest_quotient(order, alpha)
        assert quotient_pairs == ordinary_pairs
        forest_cases.append({
            "order": order,
            "alpha": alpha,
            "unmatched_singletons": 2 * alpha - order,
            "independent_singleton_designations": designations,
            "quotient_endpoint_coverings": coverings,
            "distinct_polynomial_pendant_pairs": len(ordinary_pairs),
            "missing_from_quotient": 0,
            "extraneous_from_quotient": 0,
        })
        print(
            f"forest order={order} alpha={alpha} designations={designations} "
            f"coverings={coverings} pairs={len(ordinary_pairs)}",
            flush=True,
        )
    report = {
        "status": "PASS_EXACT_MATCHING_QUOTIENT_SMALL_ORDER_COVERAGE",
        "comparison": "exact equality of polynomial pendant-pair sets",
        "connected_tree_cases": tree_cases,
        "all_forest_cases": forest_cases,
        "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
