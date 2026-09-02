#!/usr/bin/env python3
"""Evolve trees toward a violation of the one-unit extension-drift bound.

For an independence polynomial p=(i_k), define

    drift_k = (k+1)i_{k-1}i_{k+1}/(i_{k-1}i_k)
              - k i_k^2/(i_{k-1}i_k)
            = e_k-e_{k-1}.

The candidate sufficient condition for unimodality is max_k drift_k <= 1.
This program seeds from the published PatternBoost 60-vertex corpus and uses
tree-preserving mutations to maximize the drift.  Fitness uses floating point
only for ranking; every claimed violation is decided and recorded by exact
integer cross multiplication.
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

from patternboost_corpus_audit import adjacency_from_prufer
from patternboost_rebound_evolution import edges, variable_mutate


def drift_score(polynomial: list[int]) -> tuple[float, dict]:
    champion = None
    for k in range(1, len(polynomial) - 1):
        lower, middle, upper = polynomial[k - 1 : k + 2]
        numerator = (k + 1) * lower * upper - k * middle * middle
        denominator = lower * middle
        record = {
            "rank": k,
            "drift_numerator": numerator,
            "drift_denominator": denominator,
            "drift_float": numerator / denominator,
            "unit_drift_gap": denominator - numerator,
            "coefficient_window": [lower, middle, upper],
            "witness": numerator > denominator,
        }
        if (
            champion is None
            or numerator * champion["drift_denominator"]
            > champion["drift_numerator"] * denominator
        ):
            champion = record
    if champion is None:
        champion = {
            "rank": None,
            "drift_numerator": 0,
            "drift_denominator": 1,
            "drift_float": 0.0,
            "unit_drift_gap": 1,
            "coefficient_window": None,
            "witness": False,
        }
    return champion["drift_float"], champion


def evaluate(adjacency: list[list[int]], label: str, generation: int) -> dict:
    polynomial = independence_poly(len(adjacency), adjacency)
    score, detail = drift_score(polynomial)
    return {
        "adjacency": adjacency,
        "fingerprint": _adj_fingerprint(adjacency),
        "label": label,
        "generation": generation,
        "polynomial": polynomial,
        "score": score,
        "detail": detail,
    }


def dedupe(records: list[dict], limit: int) -> list[dict]:
    unique = {}
    for record in records:
        key = record["fingerprint"]
        if key not in unique or record["score"] > unique[key]["score"]:
            unique[key] = record
    return sorted(
        unique.values(), key=lambda item: item["score"], reverse=True
    )[:limit]


def compact(record: dict, include_polynomial: bool) -> dict:
    payload = {
        "order": len(record["adjacency"]),
        "label": record["label"],
        "generation": record["generation"],
        "score": record["score"],
        "detail": record["detail"],
        "edges": edges(record["adjacency"]),
    }
    if include_polynomial:
        payload["polynomial"] = record["polynomial"]
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("corpus", type=Path)
    parser.add_argument("--population", type=int, default=64)
    parser.add_argument("--generations", type=int, default=400)
    parser.add_argument("--children", type=int, default=12)
    parser.add_argument("--mutations", type=int, default=3)
    parser.add_argument("--random-injections", type=int, default=8)
    parser.add_argument("--min-order", type=int, default=0)
    parser.add_argument("--max-order", type=int, default=0)
    parser.add_argument("--seed", type=int, default=993_260726)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    records = source["records"]
    ranked = []
    for index, record in enumerate(records):
        score, detail = drift_score(record["polynomial"])
        ranked.append((score, index, detail))
    ranked.sort(reverse=True)

    population = []
    for seed_rank, (score, index, detail) in enumerate(
        ranked[: args.population]
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
        raise ValueError("require 2 <= min_order <= seed order <= max_order")

    rng = random.Random(args.seed)
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
                if child["detail"]["witness"]:
                    witness = child
                    break
            if witness is not None:
                break
        if witness is not None:
            break
        for injection in range(args.random_injections):
            n = rng.randint(min_order, max_order)
            child = evaluate(
                _random_tree(n, rng),
                f"g{generation}_random_{injection}",
                generation,
            )
            children.append(child)
            tested += 1
        population = dedupe([*population, *children], args.population)
        if generation == 1 or generation % 10 == 0:
            champion = population[0]
            print(
                f"generation={generation} tested={tested:,} "
                f"drift={champion['score']:.12f} "
                f"gap={champion['detail']['unit_drift_gap']} "
                f"rank={champion['detail']['rank']} "
                f"order={len(champion['adjacency'])}",
                flush=True,
            )

    champion = witness or population[0]
    payload = {
        "status": "UNIT_DRIFT_COUNTEREXAMPLE" if witness else "NO_FAILURE",
        "exact_integer_witness_decision": True,
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
