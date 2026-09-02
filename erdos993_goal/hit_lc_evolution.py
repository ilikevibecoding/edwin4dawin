#!/usr/bin/env python3
"""Evolutionary exact search for a non-log-concave HIT.

A candidate consists of a labelled core tree and extra pendant-leaf counts.
Each core vertex receives enough mandatory leaves to make its final degree
at least three.  Hence every materialized tree has no degree-two vertex.
Fitness is the largest exact Turan ratio a[k-1]a[k+1]/a[k]^2.
"""

from __future__ import annotations

import argparse
import heapq
import json
import random
import time
from dataclasses import dataclass
from math import comb
from pathlib import Path

from toeplitz_pair_closure_search import add, mul


def random_tree(order: int, rng: random.Random) -> tuple[tuple[int, ...], ...]:
    if order == 1:
        return ((),)
    degree = [1] * order
    code = [rng.randrange(order) for _ in range(order - 2)]
    for v in code:
        degree[v] += 1
    leaves = [v for v, d in enumerate(degree) if d == 1]
    heapq.heapify(leaves)
    edges = []
    for v in code:
        u = heapq.heappop(leaves)
        edges.append((u, v))
        degree[u] -= 1
        degree[v] -= 1
        if degree[v] == 1:
            heapq.heappush(leaves, v)
    edges.append((heapq.heappop(leaves), heapq.heappop(leaves)))
    return from_edges(order, edges)


def from_edges(
    order: int, edges: list[tuple[int, int]]
) -> tuple[tuple[int, ...], ...]:
    adj = [set() for _ in range(order)]
    for u, v in edges:
        adj[u].add(v)
        adj[v].add(u)
    return tuple(tuple(sorted(row)) for row in adj)


def edges(adj):
    return [(u, v) for u, row in enumerate(adj) for v in row if u < v]


def leaf_counts(adj, extras):
    return tuple(
        max(0, 3 - len(adj[v])) + extras[v] for v in range(len(adj))
    )


def polynomial(adj, extras):
    leaves = leaf_counts(adj, extras)

    def visit(v, parent):
        excluded = [comb(leaves[v], k) for k in range(leaves[v] + 1)]
        deleted = [1]
        for child in adj[v]:
            if child == parent:
                continue
            total_child, excluded_child = visit(child, v)
            excluded = mul(excluded, total_child)
            deleted = mul(deleted, excluded_child)
        return add(excluded, [0] + deleted), excluded

    return visit(0, -1)[0]


def profile(poly):
    best = None
    for k in range(1, len(poly) - 1):
        numerator = poly[k - 1] * poly[k + 1]
        denominator = poly[k] * poly[k]
        if best is None or numerator * best["denominator"] > (
            best["numerator"] * denominator
        ):
            best = {
                "k": k,
                "numerator": numerator,
                "denominator": denominator,
                "difference": numerator - denominator,
                "decimal": numerator / denominator,
            }
    return best


@dataclass(frozen=True)
class Candidate:
    adj: tuple[tuple[int, ...], ...]
    extras: tuple[int, ...]


def mutate(candidate, rng, max_extra):
    adj = candidate.adj
    extras = list(candidate.extras)
    move = rng.randrange(5)
    if move <= 1:
        v = rng.randrange(len(extras))
        extras[v] = max(
            0, min(max_extra, extras[v] + rng.choice((-2, -1, 1, 2)))
        )
        return Candidate(adj, tuple(extras))
    if move == 2:
        for _ in range(rng.randint(2, max(2, len(extras) // 3))):
            v = rng.randrange(len(extras))
            extras[v] = rng.randint(0, max_extra)
        return Candidate(adj, tuple(extras))

    # Root at zero, detach a non-root subtree, and reattach it outside.
    parent = [-1] * len(adj)
    order = [0]
    for v in order:
        for w in adj[v]:
            if w != parent[v]:
                parent[w] = v
                order.append(w)
    v = rng.randrange(1, len(adj))
    subtree = set()
    stack = [v]
    while stack:
        u = stack.pop()
        subtree.add(u)
        stack.extend(w for w in adj[u] if w != parent[u])
    outside = [u for u in range(len(adj)) if u not in subtree]
    if not outside:
        return candidate
    new_edges = edges(adj)
    old = tuple(sorted((v, parent[v])))
    new_edges.remove(old)
    new_edges.append((v, rng.choice(outside)))
    return Candidate(from_edges(len(adj), new_edges), tuple(extras))


def key(record):
    p = record["profile"]
    return p["numerator"] / p["denominator"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--core-order", type=int, default=40)
    parser.add_argument("--max-extra", type=int, default=12)
    parser.add_argument("--population", type=int, default=80)
    parser.add_argument("--generations", type=int, default=300)
    parser.add_argument("--children", type=int, default=8)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    started = time.time()
    seen = set()
    tested = 0
    champion = None
    population = []

    def evaluate(candidate):
        nonlocal tested, champion
        if candidate in seen:
            return None
        seen.add(candidate)
        poly = polynomial(candidate.adj, candidate.extras)
        record = {
            "candidate": candidate,
            "order": len(candidate.adj)
            + sum(leaf_counts(candidate.adj, candidate.extras)),
            "degree": len(poly) - 1,
            "profile": profile(poly),
            "poly": poly,
        }
        tested += 1
        if champion is None or key(record) > key(champion):
            champion = record
        return record

    for _ in range(args.population * 3):
        candidate = Candidate(
            random_tree(args.core_order, rng),
            tuple(rng.randint(0, args.max_extra) for _ in range(args.core_order)),
        )
        record = evaluate(candidate)
        if record:
            population.append(record)
    population.sort(key=key, reverse=True)
    population = population[: args.population]

    witness = None
    for generation in range(args.generations):
        candidates = []
        for parent in population[: max(8, args.population // 2)]:
            for _ in range(args.children):
                candidates.append(mutate(parent["candidate"], rng, args.max_extra))
        for _ in range(args.population // 3):
            candidates.append(
                Candidate(
                    random_tree(args.core_order, rng),
                    tuple(
                        rng.randint(0, args.max_extra)
                        for _ in range(args.core_order)
                    ),
                )
            )
        records = [r for c in candidates if (r := evaluate(c))]
        for record in records:
            if record["profile"]["difference"] > 0:
                witness = record
                break
        population = sorted(population + records, key=key, reverse=True)[
            : args.population
        ]
        if witness:
            break
        if (generation + 1) % 10 == 0:
            print(
                f"generation={generation + 1} tested={tested:,} "
                f"best={key(champion):.12f}",
                flush=True,
            )

    chosen = witness or champion
    candidate = chosen["candidate"]
    report = {
        "status": "NON_LC_HIT" if witness else "NO_FAILURE",
        "parameters": vars(args) | {"output": str(args.output)},
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "champion": {
            "core_order": len(candidate.adj),
            "core_edges": edges(candidate.adj),
            "extra_leaves": list(candidate.extras),
            "leaf_counts": list(leaf_counts(candidate.adj, candidate.extras)),
            "order": chosen["order"],
            "degree": chosen["degree"],
            "profile": chosen["profile"],
            "polynomial": chosen["poly"] if witness else None,
        },
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
