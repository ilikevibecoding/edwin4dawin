#!/usr/bin/env python3
"""Exact valley search over large multisets of known non-LC tree factors.

Every candidate vector ``c`` represents the explicit forest

    disjoint_union_i c[i] copies of T_i,

where the 22 component types are the archived order-26/order-28
log-concavity failures together with the stronger order-32 example.  Its
independence polynomial is the product of the corresponding component
polynomials.  The fitness is the largest *later* adjacent-coefficient ratio
after the first strict descent.  A ratio greater than one is an exact
counterexample to unimodality.

This complements ``known_lc_failure_product_search.py``: that program is
exhaustive for small numbers of components, while this one explores sparse
and dense multiplicity vectors containing hundreds of components.  All
polynomial arithmetic and all witness decisions use FLINT integers.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from functools import lru_cache
from pathlib import Path

from flint import fmpz_poly as Poly

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from known_lc_failure_product_search import load_factors  # noqa: E402
from pattern_family_valley_search import profile  # noqa: E402


def component_order(name: str) -> int:
    if name.startswith("n26_"):
        return 26
    if name.startswith("n28_"):
        return 28
    if name == "n32_strong":
        return 32
    raise ValueError(f"unrecognized factor name: {name}")


def vector_payload(vector: tuple[int, ...], names: list[str]) -> dict:
    return {
        name: count
        for name, count in zip(names, vector, strict=True)
        if count
    }


def exact_ratio(record: dict) -> tuple[int, int]:
    ratio = record["profile"]["best_post_descent_ratio"]
    if ratio is None:
        return 0, 1
    return ratio["numerator"], ratio["denominator"]


def ratio_float(record: dict) -> float:
    numerator, denominator = exact_ratio(record)
    return numerator / denominator


def better(left: dict, right: dict | None) -> bool:
    if right is None:
        return True
    left_num, left_den = exact_ratio(left)
    right_num, right_den = exact_ratio(right)
    return left_num * right_den > right_num * left_den


def random_vector(
    rng: random.Random,
    type_count: int,
    max_components: int,
) -> tuple[int, ...]:
    """Generate a mixture spanning sparse through moderately dense support."""

    total = rng.randint(1, max_components)
    support = rng.randint(1, min(type_count, max(2, int(total**0.5) + 2)))
    chosen = rng.sample(range(type_count), support)
    counts = [0] * type_count
    for _ in range(total):
        counts[rng.choice(chosen)] += 1
    return tuple(counts)


def mutate(
    vector: tuple[int, ...],
    rng: random.Random,
    max_components: int,
) -> tuple[int, ...]:
    counts = list(vector)
    type_count = len(counts)
    total = sum(counts)
    move = rng.randrange(7)

    if move == 0 and total < max_components:
        counts[rng.randrange(type_count)] += 1
    elif move == 1 and total > 1:
        occupied = [i for i, count in enumerate(counts) if count]
        counts[rng.choice(occupied)] -= 1
    elif move == 2 and total > 0:
        occupied = [i for i, count in enumerate(counts) if count]
        source = rng.choice(occupied)
        target = rng.randrange(type_count)
        counts[source] -= 1
        counts[target] += 1
    elif move == 3:
        # A bulk step detects scaling trajectories that one-at-a-time hill
        # climbing can miss.
        index = rng.randrange(type_count)
        delta = rng.randint(-8, 8)
        counts[index] = max(0, counts[index] + delta)
    elif move == 4:
        # Scale the whole mixture, then clip deterministically.
        factor = rng.choice((0.5, 0.75, 1.25, 1.5, 2.0))
        counts = [int(round(factor * count)) for count in counts]
    elif move == 5:
        # Replace one support type by another without changing its mass.
        occupied = [i for i, count in enumerate(counts) if count]
        if occupied:
            source = rng.choice(occupied)
            target = rng.randrange(type_count)
            if source != target:
                counts[target] += counts[source]
                counts[source] = 0
    else:
        # Seed a new phase with a nontrivial multiplicity.
        counts[rng.randrange(type_count)] += rng.randint(2, 12)

    total = sum(counts)
    if total == 0:
        counts[rng.randrange(type_count)] = 1
        total = 1
    while total > max_components:
        occupied = [i for i, count in enumerate(counts) if count]
        index = rng.choice(occupied)
        counts[index] -= 1
        total -= 1
    return tuple(counts)


def crossover(
    left: tuple[int, ...],
    right: tuple[int, ...],
    rng: random.Random,
    max_components: int,
) -> tuple[int, ...]:
    child = [
        rng.choice((a, b, (a + b) // 2))
        for a, b in zip(left, right, strict=True)
    ]
    total = sum(child)
    if total == 0:
        child[rng.randrange(len(child))] = 1
        total = 1
    while total > max_components:
        occupied = [i for i, count in enumerate(child) if count]
        index = rng.choice(occupied)
        child[index] -= 1
        total -= 1
    return tuple(child)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-components", type=int, default=180)
    parser.add_argument("--population", type=int, default=64)
    parser.add_argument("--generations", type=int, default=120)
    parser.add_argument("--children", type=int, default=10)
    parser.add_argument("--random-seeds", type=int, default=160)
    parser.add_argument("--seed", type=int, default=993_20260724)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("forest_multiplicity_evolution.json"),
    )
    args = parser.parse_args()
    if args.max_components < 1:
        raise ValueError("--max-components must be positive")

    loaded = load_factors()
    names = [name for name, _ in loaded]
    factors = [factor for _, factor in loaded]
    orders = [component_order(name) for name in names]
    rng = random.Random(args.seed)
    started = time.time()
    tested = 0
    seen: set[tuple[int, ...]] = set()

    # Each exact polynomial can contain thousands of enormous coefficients.
    # A small cache is enough for repeated elite evaluations while preventing
    # the evolutionary run from retaining every discarded polynomial.
    @lru_cache(maxsize=128)
    def evaluate(vector: tuple[int, ...]) -> dict:
        nonlocal tested
        pieces = [
            factors[index] ** count
            for index, count in enumerate(vector)
            if count
        ]
        # Multiplying small-degree pieces first avoids needless intermediate
        # coefficient growth when the support is broad.
        pieces.sort(key=len)
        while len(pieces) > 1:
            merged: list[Poly] = []
            for index in range(0, len(pieces), 2):
                if index + 1 == len(pieces):
                    merged.append(pieces[index])
                else:
                    merged.append(pieces[index] * pieces[index + 1])
            pieces = merged
        polynomial = pieces[0]
        result_profile = profile(polynomial)
        tested += 1
        return {
            "component_count": sum(vector),
            "component_multiplicities": vector_payload(vector, names),
            "forest_order": sum(
                count * order
                for count, order in zip(vector, orders, strict=True)
            ),
            "forest_degree": len(polynomial) - 1,
            "profile": result_profile,
            "_vector": vector,
            "_polynomial": polynomial,
        }

    candidates: list[tuple[int, ...]] = []
    type_count = len(factors)
    # Exact one-type scaling lines are important controls.
    scale_points = sorted(
        {
            1,
            2,
            3,
            4,
            5,
            8,
            12,
            20,
            32,
            50,
            80,
            120,
            args.max_components,
        }
    )
    for index in range(type_count):
        for count in scale_points:
            if count <= args.max_components:
                vector = [0] * type_count
                vector[index] = count
                candidates.append(tuple(vector))
    for _ in range(args.random_seeds):
        candidates.append(
            random_vector(rng, type_count, args.max_components)
        )

    population: list[dict] = []
    champion = None
    witness = None

    def consider(vector: tuple[int, ...]) -> None:
        nonlocal champion, witness
        if vector in seen or witness is not None:
            return
        seen.add(vector)
        record = evaluate(vector)
        if better(record, champion):
            champion = record
        if not record["profile"]["unimodal"]:
            witness = record
        population.append(record)

    for vector in candidates:
        consider(vector)
        if witness is not None:
            break
    population.sort(key=ratio_float, reverse=True)
    population = population[: args.population]

    for generation in range(args.generations):
        if witness is not None:
            break
        children: list[tuple[int, ...]] = []
        elite_count = max(4, len(population) // 3)
        elite = population[:elite_count]
        for parent in elite:
            vector = parent["_vector"]
            for _ in range(args.children):
                children.append(
                    mutate(vector, rng, args.max_components)
                )
        for _ in range(max(4, args.population // 2)):
            left = rng.choice(elite)["_vector"]
            right = rng.choice(population)["_vector"]
            children.append(
                crossover(left, right, rng, args.max_components)
            )
        population = []
        # Retain elites explicitly; evaluate() is cached.
        for record in elite:
            population.append(record)
        for vector in children:
            consider(vector)
            if witness is not None:
                break
        population.sort(key=ratio_float, reverse=True)
        population = population[: args.population]
        if generation % 5 == 0 and population:
            top = population[0]
            print(
                f"generation={generation} tested={tested} "
                f"ratio={ratio_float(top):.12f} "
                f"components={top['component_count']} "
                f"order={top['forest_order']} "
                f"support={len(top['component_multiplicities'])}",
                flush=True,
            )

    result = witness or champion
    assert result is not None
    serializable = {
        key: value
        for key, value in result.items()
        if not key.startswith("_")
    }
    if witness is not None:
        serializable["forest_polynomial"] = [
            int(coefficient) for coefficient in result["_polynomial"]
        ]
    payload = {
        "status": "counterexample" if witness is not None else "no_counterexample",
        "parameters": {
            key: str(value) if isinstance(value, Path) else value
            for key, value in vars(args).items()
        },
        "factor_names": names,
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "champion": serializable,
    }
    args.output.write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if witness is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
