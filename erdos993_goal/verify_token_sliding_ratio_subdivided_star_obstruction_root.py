#!/usr/bin/env python3
"""Exact verifier for the subdivided-star ratio-monotonicity obstruction.

For S_d, the tree obtained by subdividing every edge of K_{1,d} once,
the independence and one-induced-edge polynomials have closed forms

    A_d=(1+2x)^d+x(1+x)^d,
    B_d=d*x^2*((1+2x)^(d-1)+(1+x)^(d-1)).

This script independently reconstructs both rows with a generic rooted-tree
DP truncated to induced-edge counts zero and one, verifies the formulas, and
records the smallest member of this family whose token-sliding ratio is not
monotone.  The obstruction concerns only that strengthening, not the averaged
component-surplus target or Erdos Problem 993.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
import os
from pathlib import Path

import networkx as nx


ROOT = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int]) -> list[int]:
    out = [0] * max(len(left), len(right))
    for index in range(len(out)):
        out[index] = (left[index] if index < len(left) else 0) + (
            right[index] if index < len(right) else 0
        )
    return out


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    return out


def shift(poly: list[int]) -> list[int]:
    return [0, *poly]


def first_edge_rows(tree: nx.Graph) -> tuple[list[int], list[int]]:
    """Generic tree DP for subsets inducing exactly zero or one edge."""
    n = tree.number_of_nodes()
    adjacency = [sorted(tree.neighbors(vertex)) for vertex in range(n)]
    parent = [-2] * n
    parent[0] = -1
    order = [0]
    for vertex in order:
        for neighbor in adjacency[vertex]:
            if neighbor == parent[vertex]:
                continue
            assert parent[neighbor] == -2
            parent[neighbor] = vertex
            order.append(neighbor)
    assert len(order) == n
    children = [[] for _ in range(n)]
    for vertex in order[1:]:
        children[parent[vertex]].append(vertex)

    states: list[tuple[list[int], list[int], list[int], list[int]] | None] = [
        None
    ] * n
    for vertex in reversed(order):
        excluded_zero = [1]
        excluded_one = [0]
        included_zero = [0, 1]
        included_one = [0]
        for child in children[vertex]:
            child_state = states[child]
            assert child_state is not None
            e0, e1, i0, i1 = child_state

            child_zero = add(e0, i0)
            child_one = add(e1, i1)
            new_excluded_one = add(
                multiply(excluded_one, child_zero),
                multiply(excluded_zero, child_one),
            )
            excluded_zero = multiply(excluded_zero, child_zero)
            excluded_one = new_excluded_one

            # With the current root selected, an included child creates the
            # unique root-child edge; an excluded child may instead contain
            # the unique edge internally.
            new_included_one = add(
                multiply(included_one, e0),
                multiply(included_zero, add(e1, i0)),
            )
            included_zero = multiply(included_zero, e0)
            included_one = new_included_one
        states[vertex] = (
            excluded_zero,
            excluded_one,
            included_zero,
            included_one,
        )

    root_state = states[0]
    assert root_state is not None
    e0, e1, i0, i1 = root_state
    return add(e0, i0), add(e1, i1)


def subdivided_star(arms: int) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(1 + 2 * arms))
    for index in range(arms):
        arm = 1 + 2 * index
        leaf = arm + 1
        graph.add_edge(0, arm)
        graph.add_edge(arm, leaf)
    assert nx.is_tree(graph)
    return graph


def closed_rows(arms: int) -> tuple[list[int], list[int]]:
    independence = []
    one_edge = []
    for rank in range(arms + 2):
        independence.append(
            (2**rank * math.comb(arms, rank) if rank <= arms else 0)
            + (math.comb(arms, rank - 1) if 1 <= rank <= arms + 1 else 0)
        )
        one_edge.append(
            arms
            * (2 ** (rank - 2) + 1)
            * math.comb(arms - 1, rank - 2)
            if 2 <= rank <= arms + 1
            else 0
        )
    return independence, one_edge


def ratio(independence: list[int], one_edge: list[int], rank: int) -> Fraction:
    return Fraction(one_edge[rank + 1], rank * independence[rank])


def ratio_cross(
    independence: list[int], one_edge: list[int], rank: int
) -> int:
    return (
        one_edge[rank + 1] * (rank + 1) * independence[rank + 1]
        - one_edge[rank + 2] * rank * independence[rank]
    )


def sign_factor(arms: int, rank: int) -> int:
    t = arms - rank + 1
    return 2 ** (rank - 1) * (2 * t * t - (rank + 1) * t + 2 * rank) + t + rank


def averaged_margin(
    arms: int, independence: list[int], one_edge: list[int], rank: int
) -> int:
    order = 2 * arms + 1
    w = math.comb(order - 2, 2)
    branching_surplus = math.comb(arms - 1, 2)
    matching_two = w - branching_surplus
    assert matching_two == 3 * arms * (arms - 1) // 2
    return (
        rank * matching_two * independence[rank]
        - w * one_edge[rank + 1]
    )


def main() -> None:
    first_failures = []
    for arms in range(1, 19):
        independence, one_edge = closed_rows(arms)
        failures = []
        for rank in range(2, arms):
            cross = ratio_cross(independence, one_edge, rank)
            assert (cross < 0) == (sign_factor(arms, rank) < 0)
            if cross < 0:
                failures.append({"lower_rank": rank, "cross_margin": cross})
        if failures:
            first_failures.append({"arms": arms, "failures": failures})
    assert first_failures == [
        {
            "arms": 18,
            "failures": [
                {"lower_rank": 15, "cross_margin": -81772943040},
                {"lower_rank": 16, "cross_margin": -4088647152},
            ],
        }
    ]

    arms = 18
    tree = subdivided_star(arms)
    closed_independence, closed_one_edge = closed_rows(arms)
    dp_independence, dp_one_edge = first_edge_rows(tree)
    assert dp_independence == closed_independence
    assert dp_one_edge == closed_one_edge

    comparisons = []
    for rank in (15, 16):
        lower = ratio(closed_independence, closed_one_edge, rank)
        upper = ratio(closed_independence, closed_one_edge, rank + 1)
        cross = ratio_cross(closed_independence, closed_one_edge, rank)
        assert lower < upper
        assert sign_factor(arms, rank) == -32749
        aggregate_lower = averaged_margin(
            arms, closed_independence, closed_one_edge, rank
        )
        aggregate_upper = averaged_margin(
            arms, closed_independence, closed_one_edge, rank + 1
        )
        assert aggregate_lower > 0 and aggregate_upper > 0
        comparisons.append(
            {
                "lower_rank": rank,
                "upper_rank": rank + 1,
                "lower_ratio": str(lower),
                "upper_ratio": str(upper),
                "difference": str(lower - upper),
                "cross_margin": cross,
                "reduced_sign_factor": sign_factor(arms, rank),
                "averaged_margin_lower_rank": aggregate_lower,
                "averaged_margin_upper_rank": aggregate_upper,
            }
        )

    mode = max(range(len(closed_independence)), key=closed_independence.__getitem__)
    assert all(
        closed_independence[index] <= closed_independence[index + 1]
        for index in range(mode)
    )
    assert all(
        closed_independence[index] >= closed_independence[index + 1]
        for index in range(mode, len(closed_independence) - 1)
    )

    payload = {
        "schema": "token-sliding-ratio-subdivided-star-obstruction-root-v1",
        "status": "COUNTEREXAMPLE_EXACT_TOKEN_SLIDING_RATIO_MONOTONICITY_SUBDIVIDED_STAR",
        "family": "S_d: every edge of K_(1,d) subdivided once",
        "closed_forms": {
            "independence": "A_d=(1+2x)^d+x(1+x)^d",
            "one_induced_edge": (
                "B_d=d*x^2*((1+2x)^(d-1)+(1+x)^(d-1))"
            ),
            "ratio": (
                "q_r=(2^(r-1)+1)/(2^r+r/(d-r+1))"
            ),
            "adjacent_cross_sign_factor": (
                "2^(r-1)*(2t^2-(r+1)t+2r)+t+r, t=d-r+1"
            ),
        },
        "witness": {
            "arms": arms,
            "order": tree.number_of_nodes(),
            "edges": tree.number_of_edges(),
            "degree_sequence": sorted(
                (degree for _, degree in tree.degree()), reverse=True
            ),
            "graph6": nx.to_graph6_bytes(tree, header=False).decode().strip(),
            "comparisons": comparisons,
        },
        "minimum_within_family": {
            "no_failure_arms_at_most": 17,
            "first_failure_arms": 18,
            "first_failure_order": 37,
        },
        "independent_reconstruction": {
            "generic_zero_one_induced_edge_tree_dp_matches_closed_forms": True,
            "coefficient_count": len(closed_independence),
        },
        "independence_sequence": closed_independence,
        "independence_sequence_unimodal": True,
        "mode_rank": mode,
        "actual_uniform_averaged_candidate_passes_at_obstructed_ranks": True,
        "scope_warning": (
            "This refutes only adjacent-rank token-sliding ratio monotonicity. "
            "The same tree satisfies the actual averaged component-surplus "
            "candidate at the obstructed ranks and has a unimodal independence "
            "sequence; it is not a counterexample to Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    output = ROOT / "token_sliding_ratio_subdivided_star_obstruction_exact_root_20260828.json"
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"])
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(output))


if __name__ == "__main__":
    main()
