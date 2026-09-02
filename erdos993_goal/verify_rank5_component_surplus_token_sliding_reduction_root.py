#!/usr/bin/env python3
"""Exact token-sliding reformulation of the rank-five surplus candidate.

The identities proved here hold for every finite tree.  The bounded census is
only a diagnostic for the remaining average-degree inequality; it is not used
as an all-order proof.
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


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_component_surplus_token_sliding_reduction_exact_20260825.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent(tree: nx.Graph, chosen: tuple[int, ...] | frozenset[int]) -> bool:
    selected = set(chosen)
    return all(v not in selected for u in selected for v in tree[u])


def tree_row(tree: nx.Graph) -> dict[str, object]:
    vertices = tuple(tree)
    n = len(vertices)
    neighborhoods = {
        v: frozenset((v, *tree.neighbors(v))) for v in vertices
    }

    a4 = 0
    c4 = 0
    residual_edges = 0
    independent_four_sets = 0
    for chosen in itertools.combinations(vertices, 4):
        if not independent(tree, chosen):
            continue
        independent_four_sets += 1
        removed = frozenset().union(*(neighborhoods[v] for v in chosen))
        residual = set(vertices) - removed
        edge_count = sum(u in residual and v in residual for u, v in tree.edges())
        order = len(residual)
        components = order - edge_count
        a4 += order
        c4 += components
        residual_edges += edge_count

    independent_five_sets: list[frozenset[int]] = []
    private_neighbor_sum = 0
    token_edges: set[tuple[tuple[int, ...], tuple[int, ...]]] = set()
    for chosen in itertools.combinations(vertices, 5):
        if not independent(tree, chosen):
            continue
        state = frozenset(chosen)
        independent_five_sets.append(state)
        private_neighbor_sum += sum(
            sum(neighbor in state for neighbor in tree[v]) == 1
            for v in vertices
            if v not in state
        )
        for u in state:
            for v in tree[u]:
                if v in state:
                    continue
                target = frozenset((state - {u}) | {v})
                if not independent(tree, target):
                    continue
                left = tuple(sorted(state))
                right = tuple(sorted(target))
                token_edges.add((left, right) if left < right else (right, left))

    i5 = len(independent_five_sets)
    edges = tuple(tuple(sorted(edge)) for edge in tree.edges())
    matching_two = sum(
        len(set(first) | set(second)) == 4
        for first, second in itertools.combinations(edges, 2)
    )
    surplus = sum(math.comb(tree.degree(v) - 1, 2) for v in vertices)
    w = math.comb(n - 2, 2)
    token_edge_count = len(token_edges)

    assert a4 == 5 * i5
    assert c4 == a4 - residual_edges
    assert residual_edges == token_edge_count
    assert private_neighbor_sum == 2 * token_edge_count
    assert matching_two == w - surplus

    original_margin = w * c4 - surplus * a4
    token_margin = 5 * matching_two * i5 - w * token_edge_count
    assert original_margin == token_margin

    return {
        "order": n,
        "i4": independent_four_sets,
        "i5": i5,
        "A4": a4,
        "C4": c4,
        "residual_edge_sum": residual_edges,
        "private_neighbor_sum": private_neighbor_sum,
        "token_sliding_edges": token_edge_count,
        "degree_surplus": surplus,
        "W": w,
        "two_edge_matchings": matching_two,
        "candidate_margin": original_margin,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=6)
    parser.add_argument("--max-order", type=int, default=12)
    args = parser.parse_args()
    assert 6 <= args.min_order <= args.max_order

    totals = {
        "trees": 0,
        "independent_four_sets": 0,
        "independent_five_sets": 0,
        "token_sliding_edges": 0,
        "negative_candidate_margins": 0,
        "zero_candidate_margins": 0,
        "zero_candidate_margins_nonstar": 0,
        "zero_candidate_margins_nonstar_active": 0,
    }
    per_order = []
    global_minimum = None
    global_minimum_positive = None
    for n in range(args.min_order, args.max_order + 1):
        local_minimum = None
        local_witness = None
        tree_count = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            row = tree_row(tree)
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            candidate = (row["candidate_margin"], index, code)
            if local_minimum is None or candidate < local_minimum:
                local_minimum = candidate
                local_witness = row | {"tree_index": index, "graph6": code}
            if global_minimum is None or candidate < global_minimum[0]:
                global_minimum = (candidate, local_witness)
            if row["candidate_margin"] > 0 and (
                global_minimum_positive is None
                or candidate < global_minimum_positive[0]
            ):
                global_minimum_positive = (candidate, row | {
                    "tree_index": index,
                    "graph6": code,
                })
            totals["trees"] += 1
            totals["independent_four_sets"] += row["i4"]
            totals["independent_five_sets"] += row["i5"]
            totals["token_sliding_edges"] += row["token_sliding_edges"]
            totals["negative_candidate_margins"] += row["candidate_margin"] < 0
            totals["zero_candidate_margins"] += row["candidate_margin"] == 0
            totals["zero_candidate_margins_nonstar"] += (
                row["candidate_margin"] == 0
                and max(dict(tree.degree()).values()) != n - 1
            )
            totals["zero_candidate_margins_nonstar_active"] += (
                row["candidate_margin"] == 0
                and row["i5"] > 0
                and max(dict(tree.degree()).values()) != n - 1
            )
            tree_count += 1
        per_order.append(
            {
                "order": n,
                "trees": tree_count,
                "minimum_candidate_margin": local_minimum[0],
                "minimum_witness": local_witness,
            }
        )
        print(
            f"TOKEN_REDUCTION_ORDER {n} TREES {tree_count} "
            f"MIN_MARGIN {local_minimum[0]}",
            flush=True,
        )

    assert totals["negative_candidate_margins"] == 0
    payload = {
        "schema": "rank5-component-surplus-token-sliding-reduction-v1",
        "status": "PASS_EXACT_TOKEN_SLIDING_REDUCTION_BOUNDED_CANDIDATE_DIAGNOSTIC",
        "all_order_identities": {
            "A4": "5*i5",
            "C4": "A4-|E(TS5(T))|",
            "private_neighbor_sum": "2*|E(TS5(T))|",
            "two_edge_matchings": "C(n-2,2)-sum_v C(deg(v)-1,2)",
            "margin_identity": "W*C4-e*A4=5*m2*i5-W*|E(TS5(T))|",
            "remaining_equivalent_bound": "avgdeg(TS5(T))<=10*m2/W",
        },
        "bounded_census": {
            "orders": [args.min_order, args.max_order],
            "totals": totals,
            "per_order": per_order,
            "global_minimum": global_minimum[1],
            "global_minimum_positive": global_minimum_positive[1],
        },
        "proof_boundary": (
            "The displayed identities are exact for every tree.  The average-degree "
            "bound is equivalent to the still-unproved branching-surplus candidate; "
            "the bounded census is evidence only and does not prove it all-order."
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
