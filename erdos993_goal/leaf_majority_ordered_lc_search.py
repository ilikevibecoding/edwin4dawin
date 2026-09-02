#!/usr/bin/env python3
"""Exact evolutionary falsifier for a leaf-majority ordered-LC lemma.

A candidate is a tree on ``core_order`` labelled skeleton vertices together
with pendant-leaf multiplicities on those vertices.  Only materialized trees
whose actual number L of degree-one vertices and number H of nonleaves obey

    L >= H + leaf_surplus

are accepted.  The default surplus 2 is the identity forced by a tree with
no degree-two vertices.  Fitness is the largest exact ordered-log-concavity
ratio

    (k + 1) a[k - 1] a[k + 1] / (k a[k]^2).

A ratio above one is a finite exact counterexample to the proposed lemma.
Passing is only falsification evidence.
"""

from __future__ import annotations

import argparse
import json
import random
import time
from dataclasses import dataclass
from pathlib import Path

from hit_lc_evolution import edges, from_edges, random_tree
from toeplitz_pair_closure_search import add, mul


@dataclass(frozen=True)
class Candidate:
    adjacency: tuple[tuple[int, ...], ...]
    leaves: tuple[int, ...]


def actual_leaf_profile(candidate: Candidate) -> tuple[int, int, int]:
    skeleton_leaves = sum(
        len(candidate.adjacency[v]) + candidate.leaves[v] == 1
        for v in range(len(candidate.adjacency))
    )
    pendant_leaves = sum(candidate.leaves)
    total_order = len(candidate.adjacency) + pendant_leaves
    leaves = skeleton_leaves + pendant_leaves
    return leaves, total_order - leaves, total_order


def polynomial(candidate: Candidate) -> list[int]:
    adjacency = candidate.adjacency
    leaves = candidate.leaves

    def visit(vertex: int, parent: int) -> tuple[list[int], list[int]]:
        excluded = [1]
        for _ in range(leaves[vertex]):
            excluded = mul(excluded, [1, 1])
        included_companions = [1]
        for child in adjacency[vertex]:
            if child == parent:
                continue
            total_child, excluded_child = visit(child, vertex)
            excluded = mul(excluded, total_child)
            included_companions = mul(
                included_companions, excluded_child
            )
        return add(excluded, [0, *included_companions]), excluded

    return visit(0, -1)[0]


def ordered_profile(poly: list[int]) -> dict:
    best = None
    for k in range(1, len(poly) - 1):
        numerator = (k + 1) * poly[k - 1] * poly[k + 1]
        denominator = k * poly[k] * poly[k]
        if (
            best is None
            or numerator * best["denominator"]
            > best["numerator"] * denominator
        ):
            best = {
                "k": k,
                "numerator": numerator,
                "denominator": denominator,
                "difference": numerator - denominator,
                "decimal": numerator / denominator,
            }
    assert best is not None
    return best


def random_allocation(
    order: int, total: int, rng: random.Random
) -> tuple[int, ...]:
    counts = [0] * order
    for _ in range(total):
        counts[rng.randrange(order)] += 1
    return tuple(counts)


def mutate(
    candidate: Candidate,
    rng: random.Random,
    max_total_leaves: int,
) -> Candidate:
    adjacency = candidate.adjacency
    leaves = list(candidate.leaves)
    move = rng.randrange(6)

    if move <= 2 and sum(leaves):
        source_choices = [v for v, value in enumerate(leaves) if value]
        source = rng.choice(source_choices)
        target = rng.randrange(len(leaves))
        if target != source:
            amount = rng.randint(1, min(leaves[source], 4))
            leaves[source] -= amount
            leaves[target] += amount
        return Candidate(adjacency, tuple(leaves))

    if move == 3:
        delta = rng.choice((-2, -1, 1, 2))
        if delta > 0 and sum(leaves) + delta <= max_total_leaves:
            for _ in range(delta):
                leaves[rng.randrange(len(leaves))] += 1
        elif delta < 0 and sum(leaves):
            for _ in range(min(-delta, sum(leaves))):
                choices = [v for v, value in enumerate(leaves) if value]
                leaves[rng.choice(choices)] -= 1
        return Candidate(adjacency, tuple(leaves))

    # Detach a non-root skeleton subtree and reattach its root outside it.
    parent = [-1] * len(adjacency)
    order = [0]
    for vertex in order:
        for neighbor in adjacency[vertex]:
            if neighbor != parent[vertex]:
                parent[neighbor] = vertex
                order.append(neighbor)
    vertex = rng.randrange(1, len(adjacency))
    subtree: set[int] = set()
    stack = [vertex]
    while stack:
        current = stack.pop()
        subtree.add(current)
        stack.extend(
            neighbor
            for neighbor in adjacency[current]
            if neighbor != parent[current]
        )
    outside = [v for v in range(len(adjacency)) if v not in subtree]
    new_edges = edges(adjacency)
    new_edges.remove(tuple(sorted((vertex, parent[vertex]))))
    new_edges.append((vertex, rng.choice(outside)))
    return Candidate(
        from_edges(len(adjacency), new_edges), tuple(leaves)
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--core-order", type=int, default=48)
    parser.add_argument("--leaf-surplus", type=int, default=2)
    parser.add_argument(
        "--max-condition-slack",
        type=int,
        default=2,
        help="reject trees farther than this above the leaf condition",
    )
    parser.add_argument("--min-attached-leaves", type=int, default=0)
    parser.add_argument("--extra-leaf-budget", type=int, default=24)
    parser.add_argument("--population", type=int, default=100)
    parser.add_argument("--generations", type=int, default=400)
    parser.add_argument("--children", type=int, default=8)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    minimum_total = args.min_attached_leaves
    maximum_total = (
        args.core_order + args.leaf_surplus + args.extra_leaf_budget
    )
    seen: set[Candidate] = set()
    population: list[dict] = []
    champion = None
    witness = None
    tested = 0
    rejected_leaf_condition = 0
    started = time.time()

    def evaluate(candidate: Candidate) -> dict | None:
        nonlocal champion, tested, rejected_leaf_condition
        if candidate in seen:
            return None
        seen.add(candidate)
        leaves, nonleaves, total_order = actual_leaf_profile(candidate)
        condition_slack = leaves - nonleaves - args.leaf_surplus
        if (
            condition_slack < 0
            or condition_slack > args.max_condition_slack
        ):
            rejected_leaf_condition += 1
            return None
        poly = polynomial(candidate)
        profile = ordered_profile(poly)
        record = {
            "candidate": candidate,
            "leaves": leaves,
            "nonleaves": nonleaves,
            "order": total_order,
            "alpha": len(poly) - 1,
            "condition_slack": condition_slack,
            "profile": profile,
            "polynomial": poly,
        }
        tested += 1
        if (
            champion is None
            or profile["numerator"]
            * champion["profile"]["denominator"]
            > champion["profile"]["numerator"]
            * profile["denominator"]
        ):
            champion = record
        return record

    for _ in range(args.population * 12):
        total = rng.randint(minimum_total, maximum_total)
        candidate = Candidate(
            random_tree(args.core_order, rng),
            random_allocation(args.core_order, total, rng),
        )
        if record := evaluate(candidate):
            population.append(record)

    def score(record: dict) -> float:
        profile = record["profile"]
        return profile["numerator"] / profile["denominator"]

    population.sort(key=score, reverse=True)
    population = population[: args.population]

    completed_generations = 0
    for generation in range(args.generations):
        candidates = []
        for parent in population[: max(10, args.population // 2)]:
            for _ in range(args.children):
                candidates.append(
                    mutate(parent["candidate"], rng, maximum_total)
                )
        for _ in range(max(1, args.population // 2)):
            total = rng.randint(minimum_total, maximum_total)
            candidates.append(
                Candidate(
                    random_tree(args.core_order, rng),
                    random_allocation(args.core_order, total, rng),
                )
            )
        records = [
            record
            for candidate in candidates
            if (record := evaluate(candidate)) is not None
        ]
        completed_generations = generation + 1
        for record in records:
            if record["profile"]["difference"] > 0:
                witness = record
                break
        population = sorted(
            population + records, key=score, reverse=True
        )[: args.population]
        if witness:
            break
        if completed_generations % 20 == 0:
            print(
                f"generation={completed_generations} tested={tested:,} "
                f"best={score(champion):.12f}",
                flush=True,
            )

    chosen = witness or champion
    assert chosen is not None
    candidate = chosen["candidate"]
    report = {
        "status": (
            "ORDERED_LC_COUNTEREXAMPLE" if witness else "NO_FAILURE"
        ),
        "exact_integer_arithmetic": True,
        "condition": "actual leaves >= actual nonleaves + leaf_surplus",
        "parameters": {
            **vars(args),
            "output": str(args.output),
        },
        "generations_completed": completed_generations,
        "tested": tested,
        "rejected_leaf_condition": rejected_leaf_condition,
        "elapsed_seconds": time.time() - started,
        "champion": {
            "skeleton_order": len(candidate.adjacency),
            "skeleton_edges": edges(candidate.adjacency),
            "attached_leaf_counts": list(candidate.leaves),
            "actual_leaves": chosen["leaves"],
            "actual_nonleaves": chosen["nonleaves"],
            "condition_slack": chosen["condition_slack"],
            "order": chosen["order"],
            "alpha": chosen["alpha"],
            "profile": chosen["profile"],
            "polynomial": (
                chosen["polynomial"] if witness else None
            ),
        },
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
