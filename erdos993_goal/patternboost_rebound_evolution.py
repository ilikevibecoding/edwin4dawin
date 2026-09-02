#!/usr/bin/env python3
"""Evolve published non-LC trees toward a genuine coefficient valley.

The seed population comes from Ramos--Sun's 60-vertex PatternBoost corpus,
but fitness is global: it rewards an adjacent-ratio rebound after a descent,
then pushes that rebound left of the proved decreasing-tail boundary, and
only then rewards height.  All polynomials and witness decisions use exact
integer arithmetic.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from copy import deepcopy
from pathlib import Path

PUBLIC_REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(PUBLIC_REPO))

from indpoly import independence_poly  # noqa: E402
from nm_optimizer import (  # noqa: E402
    _adj_fingerprint,
    _random_tree,
    _validate_tree,
    mutate,
)

from bouquet_ratio_evolution import ratio_score
from patternboost_corpus_audit import adjacency_from_prufer


def pattern_tree(k: int, n: int, ell: int, m: int) -> list[list[int]]:
    """Construct U(k,n,ell,m) from the published closed-form hierarchy."""
    adjacency: list[list[int]] = []

    def vertex() -> int:
        adjacency.append([])
        return len(adjacency) - 1

    def edge(left: int, right: int) -> None:
        adjacency[left].append(right)
        adjacency[right].append(left)

    def subdivided_star(parent: int, legs: int) -> int:
        torso = vertex()
        edge(parent, torso)
        for _ in range(legs):
            support = vertex()
            leaf = vertex()
            edge(torso, support)
            edge(support, leaf)
        return torso

    outer = vertex()
    subdivided_star(outer, ell)
    for _ in range(m):
        middle = vertex()
        edge(outer, middle)
        for _ in range(k):
            subdivided_star(middle, n)
    return adjacency


def edges(adjacency: list[list[int]]) -> list[list[int]]:
    return [
        [u, v]
        for u, neighbors in enumerate(adjacency)
        for v in neighbors
        if u < v
    ]


def remove_vertex(
    adjacency: list[list[int]], removed: int
) -> list[list[int]]:
    mapping = {
        old: old - int(old > removed)
        for old in range(len(adjacency))
        if old != removed
    }
    return [
        sorted(mapping[neighbor] for neighbor in adjacency[old]
               if neighbor != removed)
        for old in range(len(adjacency))
        if old != removed
    ]


def variable_mutate(
    adjacency: list[list[int]],
    rng: random.Random,
    min_order: int,
    max_order: int,
) -> list[list[int]]:
    """One topology mutation, permitting controlled order changes."""
    n = len(adjacency)
    operations = ["fixed", "fixed", "fixed"]
    if n < max_order:
        operations.extend(["add_leaf", "add_leaf", "subdivide"])
    if n > min_order and any(len(neighbors) == 1 for neighbors in adjacency):
        operations.append("delete_leaf")
    if n > min_order and any(len(neighbors) == 2 for neighbors in adjacency):
        operations.append("suppress")
    operation = rng.choice(operations)

    if operation == "fixed":
        _, changed = mutate(n, deepcopy(adjacency), rng)
        return changed
    if operation == "add_leaf":
        changed = deepcopy(adjacency)
        parent = rng.randrange(n)
        changed.append([parent])
        changed[parent].append(n)
        changed[parent].sort()
        return changed
    if operation == "delete_leaf":
        leaf = rng.choice(
            [vertex for vertex, neighbors in enumerate(adjacency)
             if len(neighbors) == 1]
        )
        return remove_vertex(adjacency, leaf)
    if operation == "subdivide":
        changed = deepcopy(adjacency)
        u, v = rng.choice(edges(changed))
        changed[u].remove(v)
        changed[v].remove(u)
        new = len(changed)
        changed.append([u, v])
        changed[u].append(new)
        changed[v].append(new)
        changed[u].sort()
        changed[v].sort()
        return changed
    if operation == "suppress":
        vertex = rng.choice(
            [v for v, neighbors in enumerate(adjacency)
             if len(neighbors) == 2]
        )
        left, right = adjacency[vertex]
        changed = remove_vertex(adjacency, vertex)
        left -= int(left > vertex)
        right -= int(right > vertex)
        if right not in changed[left]:
            changed[left].append(right)
            changed[right].append(left)
            changed[left].sort()
            changed[right].sort()
        return changed
    raise AssertionError(operation)


def evaluate(
    adjacency: list[list[int]], label: str, generation: int
) -> dict:
    polynomial = independence_poly(len(adjacency), adjacency)
    score, detail = ratio_score(polynomial)
    return {
        "adjacency": adjacency,
        "fingerprint": _adj_fingerprint(adjacency),
        "label": label,
        "generation": generation,
        "polynomial": polynomial,
        "score": score,
        "detail": detail,
    }


def compact(record: dict, include_polynomial: bool = False) -> dict:
    out = {
        "order": len(record["adjacency"]),
        "label": record["label"],
        "generation": record["generation"],
        "score": record["score"],
        "detail": record["detail"],
        "edges": edges(record["adjacency"]),
    }
    if include_polynomial:
        out["polynomial"] = record["polynomial"]
    return out


def dedupe(records: list[dict], limit: int) -> list[dict]:
    unique: dict[str, dict] = {}
    for record in records:
        key = record["fingerprint"]
        if key not in unique or record["score"] > unique[key]["score"]:
            unique[key] = record
    return sorted(
        unique.values(), key=lambda item: item["score"], reverse=True
    )[:limit]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("corpus", type=Path)
    parser.add_argument(
        "--pattern-seed",
        help="Use one U(k,n,ell,m) seed, formatted k,n,ell,m.",
    )
    parser.add_argument("--population", type=int, default=64)
    parser.add_argument("--generations", type=int, default=300)
    parser.add_argument("--children", type=int, default=12)
    parser.add_argument("--mutations", type=int, default=3)
    parser.add_argument("--random-injections", type=int, default=8)
    parser.add_argument(
        "--min-order",
        type=int,
        default=0,
        help="Minimum variable order; zero fixes it to the seed order.",
    )
    parser.add_argument(
        "--max-order",
        type=int,
        default=0,
        help="Maximum variable order; zero fixes it to the seed order.",
    )
    parser.add_argument("--seed", type=int, default=993_260726)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    population = []
    records = []
    if args.pattern_seed:
        parameters = tuple(
            int(value) for value in args.pattern_seed.split(",")
        )
        if len(parameters) != 4:
            raise ValueError("--pattern-seed requires k,n,ell,m")
        seed_adjacency = pattern_tree(*parameters)
        population.append(
            evaluate(
                seed_adjacency,
                f"pattern_U_{args.pattern_seed}",
                0,
            )
        )
        while len(population) < args.population:
            adjacency = deepcopy(seed_adjacency)
            for _ in range(rng.randint(1, max(2, args.mutations * 3))):
                _, adjacency = mutate(len(adjacency), adjacency, rng)
            if _validate_tree(len(adjacency), adjacency):
                population.append(
                    evaluate(
                        adjacency,
                        f"pattern_seed_mutation_{len(population)}",
                        0,
                    )
                )
        population = dedupe(population, args.population)
    else:
        source = json.loads(args.corpus.read_text(encoding="utf-8"))
        records = source["records"]
        # Corpus polynomials are already exact.  Rank all seeds without
        # rebuilding their trees, then decode only the retained population.
        ranked_seeds = []
        for index, record in enumerate(records):
            score, detail = ratio_score(record["polynomial"])
            ranked_seeds.append((score, index, detail))
        ranked_seeds.sort(key=lambda item: item[0], reverse=True)

        for seed_rank, (score, index, detail) in enumerate(
            ranked_seeds[: args.population]
        ):
            source_record = records[index]
            adjacency = adjacency_from_prufer(
                source_record["prufer_code_one_based"]
            )
            population.append(
                {
                    "adjacency": adjacency,
                    "fingerprint": _adj_fingerprint(adjacency),
                    "label": (
                        f"published_line_{source_record['first_line']}"
                        f"_rank_{seed_rank}"
                    ),
                    "generation": 0,
                    "polynomial": source_record["polynomial"],
                    "score": score,
                    "detail": detail,
                }
            )

    seed_order = len(population[0]["adjacency"])
    min_order = args.min_order or seed_order
    max_order = args.max_order or seed_order
    if not (2 <= min_order <= seed_order <= max_order):
        raise ValueError(
            "require 2 <= min_order <= seed_order <= max_order"
        )

    tested = len(population)
    started = time.time()
    witness = next(
        (record for record in population if record["detail"]["witness"]),
        None,
    )
    for generation in range(1, args.generations + 1):
        if witness is not None:
            break
        elite = population[: max(4, args.population // 3)]
        children = []
        for parent_index, parent in enumerate(elite):
            for child_index in range(args.children):
                adjacency = deepcopy(parent["adjacency"])
                for _ in range(rng.randint(1, args.mutations)):
                    adjacency = variable_mutate(
                        adjacency, rng, min_order, max_order
                    )
                if not _validate_tree(len(adjacency), adjacency):
                    continue
                child = evaluate(
                    adjacency,
                    f"g{generation}_p{parent_index}_c{child_index}",
                    generation,
                )
                tested += 1
                children.append(child)
                if child["detail"]["witness"] is not None:
                    witness = child
                    break
            if witness is not None:
                break
        if witness is not None:
            break
        for injection in range(args.random_injections):
            injection_order = rng.randint(min_order, max_order)
            adjacency = _random_tree(
                injection_order, rng
            )
            children.append(
                evaluate(
                    adjacency,
                    f"g{generation}_random_{injection}",
                    generation,
                )
            )
            tested += 1
        population = dedupe(
            [*population, *children], args.population
        )
        if generation == 1 or generation % 10 == 0:
            champion = population[0]
            detail = champion["detail"]
            print(
                f"generation={generation} tested={tested:,} "
                f"legal={detail['legal_rebound_ratio']:.12f} "
                f"any={detail['any_rebound_ratio']:.12f} "
                f"gap={detail['boundary_gap']} "
                f"alpha={detail['alpha']}",
                flush=True,
            )

    champion = witness or population[0]
    payload = {
        "status": "COUNTEREXAMPLE" if witness else "NO_COUNTEREXAMPLE",
        "exact_integer_arithmetic": True,
        "parameters": {
            key: str(value) if isinstance(value, Path) else value
            for key, value in vars(args).items()
        },
        "published_seed_polynomials_ranked": len(records),
        "tested_trees": tested,
        "elapsed_seconds": time.time() - started,
        "champion": compact(champion, witness is not None),
    }
    args.output.write_text(
        json.dumps(payload, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": payload["status"],
                "tested_trees": tested,
                "elapsed_seconds": payload["elapsed_seconds"],
                "champion": payload["champion"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
