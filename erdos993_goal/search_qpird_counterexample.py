#!/usr/bin/env python3
"""Heuristic search for a rooted-tree counterexample to QPIRD.

The search mutates a rooted tree by rooted subtree prune-and-regraft
and scores the smallest exact operative margin

    (k+1) H_k/H_{k-1} - (k+1) C_{k+1}/C_k - 1.

A negative score is a counterexample to the quantitative rooted
inequality.  This is only a falsification search, never a proof.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from fractions import Fraction
from pathlib import Path

import networkx as nx
from flint import fmpz_poly

from verify_rooted_forest_two_ratio_dominance import (
    ONE,
    ONE_PLUS_X,
    X,
    coeff,
    rooted_pair,
    stable_float,
)


DEFAULT_SEED_GRAPH6 = "MsaA?CA?_CG??@?@?"
DEFAULT_SEED_ROOT = 11


def adjacency_from_graph(graph: nx.Graph) -> list[list[int]]:
    mapping = {v: i for i, v in enumerate(graph.nodes())}
    adjacency = [[] for _ in mapping]
    for u, v in graph.edges():
        a, b = mapping[u], mapping[v]
        adjacency[a].append(b)
        adjacency[b].append(a)
    return adjacency


def edges_from_adjacency(
    adjacency: list[list[int]],
) -> list[tuple[int, int]]:
    return [
        (u, v)
        for u, neighbors in enumerate(adjacency)
        for v in neighbors
        if u < v
    ]


def clone_adjacency(adjacency: list[list[int]]) -> list[list[int]]:
    return [neighbors.copy() for neighbors in adjacency]


def grow_with_random_leaves(
    adjacency: list[list[int]], order: int, rng: random.Random
) -> list[list[int]]:
    result = clone_adjacency(adjacency)
    while len(result) < order:
        parent = rng.randrange(len(result))
        leaf = len(result)
        result.append([parent])
        result[parent].append(leaf)
    return result


def rooted_parent_and_subtrees(
    adjacency: list[list[int]], root: int
) -> tuple[list[int], list[list[int]]]:
    n = len(adjacency)
    parent = [-2] * n
    parent[root] = -1
    order = [root]
    for u in order:
        for v in adjacency[u]:
            if v == parent[u]:
                continue
            parent[v] = u
            order.append(v)
    subtree_vertices: list[list[int]] = [[] for _ in range(n)]
    for u in reversed(order):
        subtree_vertices[u].append(u)
        if parent[u] >= 0:
            subtree_vertices[parent[u]].extend(subtree_vertices[u])
    return parent, subtree_vertices


def mutate_subtree(
    adjacency: list[list[int]], root: int, rng: random.Random
) -> list[list[int]]:
    n = len(adjacency)
    parent, subtrees = rooted_parent_and_subtrees(adjacency, root)
    u = rng.randrange(n - 1)
    if u >= root:
        u += 1
    old_parent = parent[u]
    forbidden = set(subtrees[u])
    candidates = [
        v
        for v in range(n)
        if v not in forbidden and v != old_parent
    ]
    if not candidates:
        return clone_adjacency(adjacency)
    new_parent = rng.choice(candidates)
    result = clone_adjacency(adjacency)
    result[u].remove(old_parent)
    result[old_parent].remove(u)
    result[u].append(new_parent)
    result[new_parent].append(u)
    return result


def score(
    adjacency: list[list[int]], root: int, minimum_rank: int
) -> dict | None:
    c_poly, d_poly = rooted_pair(adjacency, root)
    h_poly = c_poly + ONE_PLUS_X * d_poly
    b_poly = ONE_PLUS_X * (c_poly + X * d_poly)
    best: dict | None = None

    for k in range(minimum_rank, c_poly.degree() + 1):
        c = coeff(c_poly, k)
        cp = coeff(c_poly, k + 1)
        hm = coeff(h_poly, k - 1)
        h = coeff(h_poly, k)
        bk = coeff(b_poly, k)
        bkp = coeff(b_poly, k + 1)
        if c <= 0 or hm <= 0 or bkp < bk:
            continue
        numerator = (k + 1) * c * h - (
            (k + 1) * cp + c
        ) * hm
        denominator = c * hm
        margin = Fraction(numerator, denominator)
        if best is None or margin < best["margin"]:
            best = {
                "k": k,
                "margin": margin,
                "numerator": numerator,
                "denominator": denominator,
                "C": [int(x) for x in c_poly],
                "D": [int(x) for x in d_poly],
                "B_k": bk,
                "B_k_plus_1": bkp,
                "rise_slack": bkp - bk,
            }
    return best


def serializable_item(
    adjacency: list[list[int]], root: int, item: dict
) -> dict:
    return {
        "order": len(adjacency),
        "root": root,
        "root_degree": len(adjacency[root]),
        "k": item["k"],
        "margin": str(item["margin"]),
        "decimal": stable_float(item["margin"]),
        "numerator": item["numerator"],
        "denominator": item["denominator"],
        "B_k": item["B_k"],
        "B_k_plus_1": item["B_k_plus_1"],
        "rise_slack": item["rise_slack"],
        "edges": edges_from_adjacency(adjacency),
        "C": item["C"],
        "D": item["D"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--order", type=int, default=30)
    parser.add_argument("--steps", type=int, default=100_000)
    parser.add_argument("--restarts", type=int, default=8)
    parser.add_argument("--minimum-rank", type=int, default=1)
    parser.add_argument("--seed", type=int, default=993_20260729)
    parser.add_argument("--temperature", type=float, default=0.08)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("qpird_targeted_search_20260729.json"),
    )
    args = parser.parse_args()
    if args.order < 2:
        raise ValueError("order must be at least 2")

    rng = random.Random(args.seed)
    seed_graph = nx.from_graph6_bytes(DEFAULT_SEED_GRAPH6.encode())
    seed_adjacency = adjacency_from_graph(seed_graph)
    if args.order < len(seed_adjacency):
        seed_adjacency = [[] for _ in range(args.order)]
        for vertex in range(1, args.order):
            parent = rng.randrange(vertex)
            seed_adjacency[vertex].append(parent)
            seed_adjacency[parent].append(vertex)

    evaluations = 0
    accepted = 0
    global_best: tuple[list[list[int]], int, dict] | None = None
    first_failure = None

    for restart in range(args.restarts):
        if restart == 0 and args.order >= 14:
            current_adjacency = grow_with_random_leaves(
                seed_adjacency, args.order, rng
            )
            current_root = DEFAULT_SEED_ROOT
        else:
            current_adjacency = [[] for _ in range(args.order)]
            for vertex in range(1, args.order):
                parent = rng.randrange(vertex)
                current_adjacency[vertex].append(parent)
                current_adjacency[parent].append(vertex)
            current_root = rng.randrange(args.order)

        current = score(
            current_adjacency, current_root, args.minimum_rank
        )
        evaluations += 1
        if current is None:
            continue

        for step in range(args.steps):
            candidate_adjacency = mutate_subtree(
                current_adjacency, current_root, rng
            )
            candidate_root = current_root
            if rng.random() < 0.04:
                candidate_root = rng.randrange(args.order)
            candidate = score(
                candidate_adjacency,
                candidate_root,
                args.minimum_rank,
            )
            evaluations += 1
            if candidate is None:
                continue

            old_value = stable_float(current["margin"])
            new_value = stable_float(candidate["margin"])
            progress = step / max(1, args.steps - 1)
            temperature = args.temperature * (1.0 - progress)
            accept = new_value <= old_value
            if not accept and temperature > 0:
                accept = rng.random() < math.exp(
                    -(new_value - old_value) / temperature
                )
            if accept:
                current_adjacency = candidate_adjacency
                current_root = candidate_root
                current = candidate
                accepted += 1

            if (
                global_best is None
                or candidate["margin"] < global_best[2]["margin"]
            ):
                global_best = (
                    clone_adjacency(candidate_adjacency),
                    candidate_root,
                    candidate,
                )
                print(
                    f"best={candidate['margin']} "
                    f"({stable_float(candidate['margin']):.12g}), "
                    f"restart={restart}, step={step}, "
                    f"k={candidate['k']}",
                    flush=True,
                )
                if candidate["margin"] < 0:
                    first_failure = serializable_item(
                        candidate_adjacency,
                        candidate_root,
                        candidate,
                    )
                    break
        if first_failure is not None:
            break

    if global_best is None:
        raise RuntimeError("search produced no operative score")
    best_adjacency, best_root, best_item = global_best
    report = {
        "status": (
            "QPIRD_COUNTEREXAMPLE"
            if first_failure is not None
            else "NO_FAILURE_HEURISTIC"
        ),
        "order": args.order,
        "steps_per_restart": args.steps,
        "restarts": args.restarts,
        "minimum_rank": args.minimum_rank,
        "seed": args.seed,
        "temperature": args.temperature,
        "evaluations": evaluations,
        "accepted_mutations": accepted,
        "best": serializable_item(
            best_adjacency, best_root, best_item
        ),
        "first_failure": first_failure,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
