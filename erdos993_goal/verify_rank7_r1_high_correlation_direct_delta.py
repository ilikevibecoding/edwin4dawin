#!/usr/bin/env python3
"""Exact direct terminal-broom Delta census for high-correlation leaf roots.

The positive-excess core parametrization is exhaustive for trees.  Unlike
the surrounding cone calculations, this replay computes i_0,...,i_7 and
the rooted deletion coefficients directly by independence-polynomial DP;
there are no scalar c5/c6/c7 or a/b relaxations.
"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from enumerate_rank7_b2_42_root_profile_all_partitions import (
    assignment_count,
    multiset_permutations,
    statistics,
)
from enumerate_rank7_r1_high_correlation_bulk import exact_c5_integer
from verify_rank7_terminal_broom_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)
from verify_rank7_terminal_broom_rooted_c4_moment import partitions


MAX_RANK = 7


def poly_add(left, right):
    length = max(len(left), len(right))
    return tuple(
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(length)
    )


def poly_mul(left, right):
    result = [0] * min(MAX_RANK + 1, len(left) + len(right) - 1)
    for left_rank, left_value in enumerate(left):
        for right_rank, right_value in enumerate(right):
            rank = left_rank + right_rank
            if rank > MAX_RANK:
                break
            result[rank] += left_value * right_value
    return tuple(result)


def leaf_polynomial(count):
    return tuple(comb(count, rank) for rank in range(min(count, MAX_RANK) + 1))


def rooted_core_dp(adjacency, leaf_slots, vertex, parent):
    excluded = leaf_polynomial(leaf_slots[vertex])
    included = (0, 1)
    for child in adjacency[vertex]:
        if child == parent:
            continue
        child_excluded, child_included = rooted_core_dp(
            adjacency, leaf_slots, child, vertex
        )
        excluded = poly_mul(
            excluded, poly_add(child_excluded, child_included)
        )
        included = poly_mul(included, child_excluded)
    return excluded, included


def full_tree_polynomial(adjacency, leaf_slots):
    excluded, included = rooted_core_dp(adjacency, leaf_slots, 0, -1)
    return poly_add(excluded, included)


def delete_root_and_neighbor_polynomial(adjacency, leaf_slots, vertex):
    """I(A-{q,vertex}) for a pendant root q adjacent to core vertex."""
    assert leaf_slots[vertex] >= 1
    # The other leaves at vertex become isolated when the core vertex is
    # deleted.  Each neighbouring core component remains intact.
    result = leaf_polynomial(leaf_slots[vertex] - 1)
    for neighbor in adjacency[vertex]:
        excluded, included = rooted_core_dp(
            adjacency, leaf_slots, neighbor, vertex
        )
        result = poly_mul(result, poly_add(excluded, included))
    return result


def delta_functions():
    n, c2, c3, c4, c5, c6, c7, a, b = sp.symbols(
        "n c2 c3 c4 c5 c6 c7 a b", integer=True
    )
    substitutions = {
        c[0]: 1,
        c[1]: n,
        c[2]: c2,
        c[3]: c3,
        c[4]: c4,
        c[5]: c5,
        c[6]: c6,
        c[7]: c7,
        h[5]: c5 - a,
        h[6]: c6 - b,
    }
    raw = newton_coefficients(exact_decomposition())
    arguments = (n, c2, c3, c4, c5, c6, c7, a, b)
    expressions = [
        sp.expand(raw[rank].subs(substitutions, simultaneous=True))
        for rank in range(7)
    ]
    return expressions, [
        sp.lambdify(arguments, expression, "math")
        for expression in expressions
    ]


def tree_shapes(order):
    if order == 1:
        graph = nx.Graph()
        graph.add_node(0)
        return (graph,)
    return tuple(nx.nonisomorphic_trees(order))


def make_witness(
    beta,
    partition,
    shape_index,
    edges,
    weights,
    degrees,
    leaf_slots,
    root_vertex,
    coefficients,
    deletion,
    deltas,
):
    return {
        "B2": beta,
        "partition": list(partition),
        "shape_index": shape_index,
        "core_edges": [list(edge) for edge in edges],
        "weights_by_vertex": list(weights),
        "core_degree": list(degrees),
        "leaf_slots": list(leaf_slots),
        "root_neighbor_vertex": root_vertex,
        "root_neighbor_excess": weights[root_vertex],
        "c0_through_c7": list(coefficients),
        "J0_through_J7": list(deletion),
        "a_i4_J": deletion[4],
        "b_i5_J": deletion[5],
        "Delta0_through_Delta6": list(deltas),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=23)
    parser.add_argument("--b2-min", type=int, default=26)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    assert args.n >= 3

    expressions, delta_fns = delta_functions()
    total_excess = args.n - 2
    by_beta = defaultdict(list)
    for part in partitions(total_excess, total_excess):
        beta = sum(comb(value, 2) for value in part)
        if beta >= args.b2_min:
            by_beta[beta].append(tuple(part))
    assert by_beta

    shape_cache = {}
    counts = {
        "excess_partitions": 0,
        "shape_assignment_pairs": 0,
        "degree_feasible_weighted_cores": 0,
        "root_neighbor_vertex_cases": 0,
        "pendant_root_vertices_collapsed_by_same_neighbor": 0,
    }
    global_minima = [None] * 7
    beta_reports = {}
    failure = None

    for beta in sorted(by_beta, reverse=True):
        beta_counts = {
            "excess_partitions": len(by_beta[beta]),
            "shape_assignment_pairs": 0,
            "degree_feasible_weighted_cores": 0,
            "root_neighbor_vertex_cases": 0,
            "pendant_root_vertices_collapsed_by_same_neighbor": 0,
        }
        beta_minima = [None] * 7
        for partition in by_beta[beta]:
            counts["excess_partitions"] += 1
            order = len(partition)
            shapes = shape_cache.setdefault(order, tree_shapes(order))
            expected_assignments = assignment_count(partition)
            assignment_seen = 0
            gamma = sum(comb(value, 3) for value in partition)
            for weights in multiset_permutations(partition):
                assignment_seen += 1
                for shape_index, tree in enumerate(shapes):
                    counts["shape_assignment_pairs"] += 1
                    beta_counts["shape_assignment_pairs"] += 1
                    degrees = tuple(tree.degree(vertex) for vertex in range(order))
                    if any(degrees[i] > weights[i] + 1 for i in range(order)):
                        continue
                    counts["degree_feasible_weighted_cores"] += 1
                    beta_counts["degree_feasible_weighted_cores"] += 1
                    leaf_slots = tuple(
                        weights[i] + 1 - degrees[i] for i in range(order)
                    )
                    eligible_vertices = [
                        vertex
                        for vertex in range(order)
                        if leaf_slots[vertex] >= 1
                    ]
                    assert eligible_vertices
                    edges = tuple(tree.edges())
                    adjacency = tuple(
                        tuple(tree.neighbors(vertex)) for vertex in range(order)
                    )
                    coefficients = full_tree_polynomial(adjacency, leaf_slots)
                    assert len(coefficients) == MAX_RANK + 1
                    assert coefficients[0] == 1
                    assert coefficients[1] == args.n
                    assert coefficients[2] == comb(args.n - 1, 2)
                    assert coefficients[3] == comb(args.n - 2, 3) + beta

                    # Independently audit c4 and c5 against the exact degree
                    # motif identities used in the bulk table.
                    _, checked_slots, edge, connected_four, _ = statistics(
                        tree, weights
                    )
                    assert tuple(checked_slots) == leaf_slots
                    c4_expected = (
                        comb(args.n - 3, 4)
                        + (args.n - 5) * beta
                        + (args.n - 3)
                        - gamma
                        - edge
                    )
                    assert coefficients[4] == c4_expected
                    assert coefficients[5] == exact_c5_integer(
                        args.n,
                        beta,
                        gamma,
                        edge,
                        connected_four,
                        coefficients[4],
                    )

                    collapsed = sum(leaf_slots[vertex] - 1 for vertex in eligible_vertices)
                    counts["pendant_root_vertices_collapsed_by_same_neighbor"] += collapsed
                    beta_counts["pendant_root_vertices_collapsed_by_same_neighbor"] += collapsed
                    for root_vertex in eligible_vertices:
                        counts["root_neighbor_vertex_cases"] += 1
                        beta_counts["root_neighbor_vertex_cases"] += 1
                        deletion = delete_root_and_neighbor_polynomial(
                            adjacency, leaf_slots, root_vertex
                        )
                        deletion = deletion + (0,) * (MAX_RANK + 1 - len(deletion))
                        arguments = (
                            args.n,
                            coefficients[2],
                            coefficients[3],
                            coefficients[4],
                            coefficients[5],
                            coefficients[6],
                            coefficients[7],
                            deletion[4],
                            deletion[5],
                        )
                        deltas = tuple(function(*arguments) for function in delta_fns)
                        assert all(isinstance(value, int) for value in deltas)
                        witness = None
                        for rank, value in enumerate(deltas):
                            if (
                                global_minima[rank] is None
                                or value < global_minima[rank]["value"]
                                or beta_minima[rank] is None
                                or value < beta_minima[rank]["value"]
                            ):
                                if witness is None:
                                    witness = make_witness(
                                        beta,
                                        partition,
                                        shape_index,
                                        edges,
                                        weights,
                                        degrees,
                                        leaf_slots,
                                        root_vertex,
                                        coefficients,
                                        deletion,
                                        deltas,
                                    )
                            if global_minima[rank] is None or value < global_minima[rank]["value"]:
                                global_minima[rank] = {
                                    "value": value,
                                    "witness": witness,
                                }
                            if beta_minima[rank] is None or value < beta_minima[rank]["value"]:
                                beta_minima[rank] = {
                                    "value": value,
                                    "witness": witness,
                                }
                            if value < 0:
                                failure = {"rank": rank, "value": value, "witness": witness}
                                break
                        if failure is not None:
                            break
                    if failure is not None:
                        break
                if failure is not None:
                    break
            if failure is None:
                assert assignment_seen == expected_assignments
            if failure is not None:
                break
        beta_reports[str(beta)] = {
            "counts": beta_counts,
            "rank_minima": beta_minima,
        }
        print(
            "PASS_B2" if failure is None else "FAIL_B2",
            beta,
            "core_cases",
            beta_counts["degree_feasible_weighted_cores"],
            "root_neighbor_cases",
            beta_counts["root_neighbor_vertex_cases"],
            "minima",
            [item["value"] if item else None for item in beta_minima],
            flush=True,
        )
        if failure is not None:
            break

    report = {
        "status": (
            "PASS_EXACT_DIRECT_DELTA_NONNEGATIVE"
            if failure is None
            else "FAIL_EXACT_TREE_COUNTEREXAMPLE"
        ),
        "scope": {
            "n": args.n,
            "root_degree": 1,
            "B2_min": args.b2_min,
            "ranks": list(range(7)),
        },
        "root_case_semantics": (
            "one case per eligible positive-core neighbour vertex; all pendant "
            "root leaves incident with the same neighbour give identical rooted "
            "coefficients and are collapsed; automorphism-equivalent weighted "
            "core assignments may be repeated, which is a safe overcount"
        ),
        "method": (
            "all excess partitions, all nonisomorphic positive-core trees, all "
            "distinct weight assignments, exact degree capacity, exact truncated "
            "independence-polynomial DP for A and J=A-N[q], exact Delta0..6"
        ),
        "counts": counts,
        "positive_core_shape_counts": {
            str(order): len(shapes) for order, shapes in sorted(shape_cache.items())
        },
        "delta_expressions": [str(expression) for expression in expressions],
        "rank_minima": global_minima,
        "B2_reports": beta_reports,
        "failure": failure,
    }
    Path(args.output).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "scope": report["scope"],
                "counts": counts,
                "rank_minima": [item["value"] for item in global_minima],
                "failure": failure,
            },
            indent=2,
        ),
        flush=True,
    )
    return 0 if failure is None else 1


if __name__ == "__main__":
    raise SystemExit(main())
