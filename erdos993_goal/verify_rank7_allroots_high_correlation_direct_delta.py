#!/usr/bin/env python3
"""Exact rank-seven terminal Delta census for every root at n=23, B2>=26.

This extends the certified leaf-root weighted-core enumeration without
changing it.  Every non-leaf vertex lies in the positive-excess core.  Thus
all roots are covered by:

* one case for each core vertex itself; and
* one collapsed leaf-root case for each core vertex carrying at least one
  leaf (all such leaves give the same rooted coefficient rows).

All coefficient and Delta evaluations are literal integer tree-DP values.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from math import comb
from pathlib import Path

from enumerate_rank7_b2_42_root_profile_all_partitions import (
    assignment_count,
    multiset_permutations,
    statistics,
)
from enumerate_rank7_r1_high_correlation_bulk import exact_c5_integer
from verify_rank7_r1_high_correlation_direct_delta import (
    MAX_RANK,
    delete_root_and_neighbor_polynomial,
    delta_functions,
    full_tree_polynomial,
    leaf_polynomial,
    make_witness,
    partitions,
    poly_add,
    poly_mul,
    rooted_core_dp,
    tree_shapes,
)


def delete_closed_neighborhood_core_root_polynomial(
    adjacency: tuple[tuple[int, ...], ...],
    leaf_slots: tuple[int, ...],
    root_vertex: int,
) -> tuple[int, ...]:
    """Return I(A-N[q]) when q is a positive-core vertex.

    The root, all leaves incident with it, and every adjacent core vertex are
    deleted.  Leaves incident with a deleted adjacent core vertex survive as
    isolated vertices.  Every core branch beyond such a neighbour survives
    as an intact rooted component.
    """

    result: tuple[int, ...] = (1,)
    for neighbor in adjacency[root_vertex]:
        result = poly_mul(result, leaf_polynomial(leaf_slots[neighbor]))
        for branch in adjacency[neighbor]:
            if branch == root_vertex:
                continue
            excluded, included = rooted_core_dp(
                adjacency, leaf_slots, branch, neighbor
            )
            result = poly_mul(result, poly_add(excluded, included))
    return result


def allroot_witness(
    base: dict[str, object],
    root_kind: str,
    actual_root_degree: int,
) -> dict[str, object]:
    out = dict(base)
    out["root_kind"] = root_kind
    out["actual_root_degree"] = actual_root_degree
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=23)
    parser.add_argument("--b2-min", type=int, default=26)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    assert args.n >= 3

    expressions, delta_fns = delta_functions()
    total_excess = args.n - 2
    by_beta: dict[int, list[tuple[int, ...]]] = defaultdict(list)
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
        "leaf_root_neighbor_cases": 0,
        "core_root_vertex_cases": 0,
        "all_root_cases": 0,
        "pendant_leaf_vertices_collapsed_by_same_neighbor": 0,
    }
    global_minima: list[dict[str, object] | None] = [None] * 7
    beta_reports: dict[str, object] = {}
    failure = None

    for beta in sorted(by_beta, reverse=True):
        beta_counts = {
            "excess_partitions": len(by_beta[beta]),
            "shape_assignment_pairs": 0,
            "degree_feasible_weighted_cores": 0,
            "leaf_root_neighbor_cases": 0,
            "core_root_vertex_cases": 0,
            "all_root_cases": 0,
            "pendant_leaf_vertices_collapsed_by_same_neighbor": 0,
        }
        beta_minima: list[dict[str, object] | None] = [None] * 7
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
                    edges = tuple(tree.edges())
                    adjacency = tuple(
                        tuple(tree.neighbors(vertex)) for vertex in range(order)
                    )
                    coefficients = full_tree_polynomial(adjacency, leaf_slots)
                    coefficients = coefficients + (0,) * (
                        MAX_RANK + 1 - len(coefficients)
                    )
                    assert len(coefficients) == MAX_RANK + 1
                    assert coefficients[0] == 1
                    assert coefficients[1] == args.n
                    assert coefficients[2] == comb(args.n - 1, 2)
                    assert coefficients[3] == comb(args.n - 2, 3) + beta

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

                    root_cases: list[tuple[str, int, int, tuple[int, ...]]] = []
                    for vertex in range(order):
                        deletion = delete_closed_neighborhood_core_root_polynomial(
                            adjacency, leaf_slots, vertex
                        )
                        root_cases.append(
                            ("positive_core_vertex", vertex, weights[vertex] + 1, deletion)
                        )
                        counts["core_root_vertex_cases"] += 1
                        beta_counts["core_root_vertex_cases"] += 1
                        if leaf_slots[vertex] >= 1:
                            deletion = delete_root_and_neighbor_polynomial(
                                adjacency, leaf_slots, vertex
                            )
                            root_cases.append(("pendant_leaf", vertex, 1, deletion))
                            counts["leaf_root_neighbor_cases"] += 1
                            beta_counts["leaf_root_neighbor_cases"] += 1
                            collapsed = leaf_slots[vertex] - 1
                            counts[
                                "pendant_leaf_vertices_collapsed_by_same_neighbor"
                            ] += collapsed
                            beta_counts[
                                "pendant_leaf_vertices_collapsed_by_same_neighbor"
                            ] += collapsed

                    for root_kind, root_vertex, root_degree, deletion in root_cases:
                        counts["all_root_cases"] += 1
                        beta_counts["all_root_cases"] += 1
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
                                or value < int(global_minima[rank]["value"])
                                or beta_minima[rank] is None
                                or value < int(beta_minima[rank]["value"])
                            ):
                                if witness is None:
                                    base = make_witness(
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
                                    witness = allroot_witness(
                                        base, root_kind, root_degree
                                    )
                            if (
                                global_minima[rank] is None
                                or value < int(global_minima[rank]["value"])
                            ):
                                global_minima[rank] = {"value": value, "witness": witness}
                            if (
                                beta_minima[rank] is None
                                or value < int(beta_minima[rank]["value"])
                            ):
                                beta_minima[rank] = {"value": value, "witness": witness}
                            if value < 0:
                                failure = {
                                    "rank": rank,
                                    "value": value,
                                    "witness": witness,
                                }
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
            "weighted_cores",
            beta_counts["degree_feasible_weighted_cores"],
            "all_root_cases",
            beta_counts["all_root_cases"],
            "minima",
            [item["value"] if item else None for item in beta_minima],
            flush=True,
        )
        if failure is not None:
            break

    report = {
        "status": (
            "PASS_EXACT_ALLROOT_DIRECT_DELTA_NONNEGATIVE"
            if failure is None
            else "FAIL_EXACT_TREE_COUNTEREXAMPLE"
        ),
        "scope": {
            "n": args.n,
            "root_scope": "every vertex, with same-neighbour pendant leaves collapsed",
            "B2_min": args.b2_min,
            "ranks": list(range(7)),
        },
        "method": (
            "all excess partitions, all nonisomorphic positive-core trees, all "
            "distinct weight assignments, exact degree capacity, every core "
            "root and every distinct pendant-leaf rooted state, literal exact "
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
