#!/usr/bin/env python3
"""Evolve heterogeneous leaf blow-ups of a Galvin tree for a true rebound.

The base tree T(m,t) has one outer root, m gadget centers, and t paths of
length two below each center.  Every original vertex receives p>=2 new
leaves, so every generated graph is a homeomorphically irreducible tree.

Fitness is not a log-concavity defect.  It is the largest adjacent
coefficient ratio strictly *after* the first descent.  A ratio above one is
therefore an exact nonunimodality certificate and would disprove Erdos 993.
"""

from __future__ import annotations

import argparse
import heapq
import json
import random
import sys
import time
from functools import lru_cache
from pathlib import Path

from flint import fmpz_poly as Poly


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])
ONE_PLUS_X = Poly([1, 1])

Arm = tuple[int, int]  # middle padding, terminal-leaf padding
Copy = tuple[int, tuple[Arm, ...]]  # center padding, arms
Genotype = tuple[int, tuple[Copy, ...]]  # outer-root padding, copies


def canon(root_padding: int, copies) -> Genotype:
    return (
        int(root_padding),
        tuple(
            sorted(
                (
                    int(center),
                    tuple(sorted((int(a), int(b)) for a, b in arms)),
                )
                for center, arms in copies
            )
        ),
    )


def uniform_genotype(m: int, t: int, padding: int) -> Genotype:
    return canon(
        padding,
        [(padding, [(padding, padding)] * t) for _ in range(m)],
    )


@lru_cache(maxsize=None)
def kernel(padding: int) -> Poly:
    return ONE_PLUS_X**padding


@lru_cache(maxsize=None)
def arm_state(arm: Arm) -> tuple[Poly, Poly]:
    middle_padding, leaf_padding = arm
    leaf_e = kernel(leaf_padding)
    leaf_a = leaf_e + X
    middle_e = kernel(middle_padding) * leaf_a
    middle_d = X * leaf_e
    return middle_e + middle_d, middle_e


@lru_cache(maxsize=None)
def copy_state(copy: Copy) -> tuple[Poly, Poly]:
    center_padding, arms = copy
    excluded = kernel(center_padding)
    forbidden = Poly([1])
    for arm in arms:
        total_child, excluded_child = arm_state(arm)
        excluded *= total_child
        forbidden *= excluded_child
    return excluded + X * forbidden, excluded


@lru_cache(maxsize=20_000)
def polynomial(genotype: Genotype) -> Poly:
    root_padding, copies = genotype
    excluded = kernel(root_padding)
    forbidden = Poly([1])
    for copy in copies:
        total_child, excluded_child = copy_state(copy)
        excluded *= total_child
        forbidden *= excluded_child
    return excluded + X * forbidden


def profile(genotype: Genotype, keep_window: bool = False) -> dict:
    coefficients = [int(c) for c in polynomial(genotype)]
    first_descent = next(
        (
            k
            for k in range(len(coefficients) - 1)
            if coefficients[k + 1] < coefficients[k]
        ),
        len(coefficients) - 1,
    )
    best_num, best_den, best_k = 0, 1, -1
    # Exclude the first descending edge itself.  The selected edge is a
    # genuine later rebound candidate.
    for k in range(first_descent + 1, len(coefficients) - 1):
        num, den = coefficients[k + 1], coefficients[k]
        if num * best_den > best_num * den:
            best_num, best_den, best_k = num, den, k
    if best_k < 0:
        best_k = first_descent
        best_num = 0
        best_den = 1
    first_reascent = next(
        (
            k
            for k in range(first_descent + 1, len(coefficients) - 1)
            if coefficients[k + 1] > coefficients[k]
        ),
        None,
    )
    root_padding, copies = genotype
    padding_total = root_padding + sum(
        center + sum(a + b for a, b in arms)
        for center, arms in copies
    )
    result = {
        "genotype": genotype,
        "tree_order": 1
        + len(copies) * (1 + 2 * len(copies[0][1]))
        + padding_total,
        "degree": len(coefficients) - 1,
        "first_descent": first_descent,
        "best_rebound_k": best_k,
        "best_num": best_num,
        "best_den": best_den,
        "ratio": best_num / best_den,
        "first_reascent": first_reascent,
    }
    if keep_window or first_reascent is not None:
        k = first_reascent if first_reascent is not None else best_k
        start, stop = max(0, k - 5), min(len(coefficients), k + 7)
        result["coefficient_window_start"] = start
        result["coefficient_window"] = coefficients[start:stop]
    return result


def better(left: dict, right: dict | None) -> bool:
    return right is None or (
        left["best_num"] * right["best_den"]
        > right["best_num"] * left["best_den"]
    )


def mutate(
    genotype: Genotype,
    rng: random.Random,
    minimum: int,
    maximum: int,
) -> Genotype:
    root_padding, frozen_copies = genotype
    copies = [
        [center, [list(arm) for arm in arms]]
        for center, arms in frozen_copies
    ]
    operation = rng.random()
    delta = rng.choice((-1, 1))
    if operation < 0.04:
        root_padding = min(maximum, max(minimum, root_padding + delta))
    elif operation < 0.16:
        i = rng.randrange(len(copies))
        copies[i][0] = min(
            maximum, max(minimum, copies[i][0] + delta)
        )
    elif operation < 0.90:
        changes = 1 if rng.random() < 0.88 else rng.randint(2, 5)
        for _ in range(changes):
            i = rng.randrange(len(copies))
            j = rng.randrange(len(copies[i][1]))
            endpoint = rng.randrange(2)
            value = copies[i][1][j][endpoint]
            copies[i][1][j][endpoint] = min(
                maximum, max(minimum, value + rng.choice((-1, 1)))
            )
    else:
        i = rng.randrange(len(copies))
        endpoint = rng.randrange(2)
        for arm in copies[i][1]:
            arm[endpoint] = min(
                maximum, max(minimum, arm[endpoint] + delta)
            )
    return canon(
        root_padding,
        [(center, arms) for center, arms in copies],
    )


def serializable(record: dict | None) -> dict | None:
    if record is None:
        return None
    result = dict(record)
    root, copies = result["genotype"]
    result["genotype"] = {
        "root_padding": root,
        "copies": [
            {
                "center_padding": center,
                "arms": [list(arm) for arm in arms],
            }
            for center, arms in copies
        ],
    }
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m", type=int, default=20)
    parser.add_argument("--t", type=int, default=10)
    parser.add_argument("--padding-min", type=int, default=2)
    parser.add_argument("--padding-max", type=int, default=10)
    parser.add_argument("--seed-padding-min", type=int, default=4)
    parser.add_argument("--seed-padding-max", type=int, default=8)
    parser.add_argument("--population", type=int, default=32)
    parser.add_argument("--children", type=int, default=8)
    parser.add_argument("--generations", type=int, default=100)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    started = time.time()
    population = []
    champion = None
    witness = None
    seen = set()
    tested = 0

    for padding in range(
        args.seed_padding_min, args.seed_padding_max + 1
    ):
        genotype = uniform_genotype(args.m, args.t, padding)
        record = profile(genotype)
        population.append(record)
        seen.add(genotype)
        tested += 1
        if better(record, champion):
            champion = record
        print(
            f"uniform p={padding}: n={record['tree_order']} "
            f"d={record['first_descent']} rebound="
            f"{record['ratio']:.15f}@{record['best_rebound_k']}",
            flush=True,
        )

    for generation in range(args.generations):
        candidates = list(population)
        elite = heapq.nlargest(
            max(3, args.population // 3),
            population,
            key=lambda item: item["ratio"],
        )
        for parent in elite:
            for _ in range(args.children):
                genotype = mutate(
                    parent["genotype"],
                    rng,
                    args.padding_min,
                    args.padding_max,
                )
                if genotype in seen:
                    continue
                seen.add(genotype)
                record = profile(genotype)
                candidates.append(record)
                tested += 1
                if better(record, champion):
                    champion = record
                if record["first_reascent"] is not None:
                    witness = profile(genotype, keep_window=True)
                    break
            if witness is not None:
                break
        population = heapq.nlargest(
            args.population,
            candidates,
            key=lambda item: item["ratio"],
        )
        if generation % 5 == 0 or witness is not None:
            print(
                f"g={generation} tested={tested:,} champion="
                f"{champion['ratio']:.15f}@{champion['best_rebound_k']} "
                f"d={champion['first_descent']}",
                flush=True,
            )
        if witness is not None:
            break

    champion = profile(champion["genotype"], keep_window=True)
    payload = {
        "status": "counterexample" if witness else "no_reascent",
        "parameters": vars(args) | {"out": str(args.out)},
        "tested": tested,
        "champion": serializable(champion),
        "witness": serializable(witness),
        "cache": {
            "arms": arm_state.cache_info()._asdict(),
            "copies": copy_state.cache_info()._asdict(),
            "polynomials": polynomial.cache_info()._asdict(),
        },
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
