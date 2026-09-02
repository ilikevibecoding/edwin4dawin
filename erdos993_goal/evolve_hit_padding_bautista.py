#!/usr/bin/env python3
"""Evolve heterogeneous HIT paddings of the Bautista--Ramos tree.

Every degree-two support vertex in ``TG_{m,t}`` receives ``q >= 1`` new
pendant leaves.  The original terminal leaf is retained, so the support
vertex has ``q+1`` leaf children and is no longer degree two.  For
``m,t >= 2`` the resulting tree is homeomorphically irreducible.

The symmetric hierarchy is evaluated directly with FLINT:

    support:  T = (1+x)^(q+1) + x, E = (1+x)^(q+1)
    branch:   T = prod(T_support) + x prod(E_support)
    copy:     T = prod(T_branch)  + x prod(E_branch)
    outer:    T = (1+x) prod(T_copy) + x prod(E_copy).

Genotypes are canonically sorted at every symmetric level.  Fitness is the
largest exact log-concavity ratio a[k-1]a[k+1]/a[k]^2.  A ratio above one
is a rigorous counterexample to the candidate statement that every HIT has
a log-concave independence polynomial (but not by itself to unimodality).
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

Branch = tuple[int, ...]
Copy = tuple[Branch, ...]
Genotype = tuple[Copy, ...]


def canon(raw) -> Genotype:
    return tuple(
        sorted(
            tuple(sorted(tuple(sorted(branch)) for branch in copy))
            for copy in raw
        )
    )


def uniform_genotype(m: int, t: int, q: int) -> Genotype:
    return canon([[[q] * t for _ in range(3)] for _ in range(m)])


@lru_cache(maxsize=None)
def support_state(q: int) -> tuple[Poly, Poly]:
    excluded = ONE_PLUS_X ** (q + 1)
    return excluded + X, excluded


@lru_cache(maxsize=None)
def branch_state(branch: Branch) -> tuple[Poly, Poly]:
    excluded = Poly([1])
    forbidden = Poly([1])
    for q in branch:
        total_child, excluded_child = support_state(q)
        excluded *= total_child
        forbidden *= excluded_child
    return excluded + X * forbidden, excluded


@lru_cache(maxsize=None)
def copy_state(copy: Copy) -> tuple[Poly, Poly]:
    excluded = Poly([1])
    forbidden = Poly([1])
    for branch in copy:
        total_child, excluded_child = branch_state(branch)
        excluded *= total_child
        forbidden *= excluded_child
    return excluded + X * forbidden, excluded


def polynomial(genotype: Genotype) -> Poly:
    excluded = ONE_PLUS_X
    forbidden = Poly([1])
    for copy in genotype:
        total_child, excluded_child = copy_state(copy)
        excluded *= total_child
        forbidden *= excluded_child
    return excluded + X * forbidden


def profile(genotype: Genotype) -> dict:
    p = polynomial(genotype)
    coefficients = [int(c) for c in p]
    best_num = 0
    best_den = 1
    best_k = -1
    failure_k = None
    for k in range(1, len(coefficients) - 1):
        numerator = coefficients[k - 1] * coefficients[k + 1]
        denominator = coefficients[k] * coefficients[k]
        if numerator * best_den > best_num * denominator:
            best_num, best_den, best_k = numerator, denominator, k
        if failure_k is None and numerator > denominator:
            failure_k = k
    first_descent = next(
        (
            k
            for k in range(len(coefficients) - 1)
            if coefficients[k + 1] < coefficients[k]
        ),
        None,
    )
    first_reascent = (
        next(
            (
                k
                for k in range(first_descent + 1, len(coefficients) - 1)
                if coefficients[k + 1] > coefficients[k]
            ),
            None,
        )
        if first_descent is not None
        else None
    )
    return {
        "genotype": genotype,
        "tree_order": 2
        + len(genotype) * (4 + 6 * len(genotype[0][0]))
        + sum(q for copy in genotype for branch in copy for q in branch),
        "degree": len(coefficients) - 1,
        "best_num": best_num,
        "best_den": best_den,
        "best_k": best_k,
        "ratio": best_num / best_den,
        "lc_failure_k": failure_k,
        "first_descent": first_descent,
        "first_reascent": first_reascent,
        "coefficients": coefficients if failure_k is not None else None,
    }


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
    fixed_total: bool = False,
) -> Genotype:
    raw = [[list(branch) for branch in copy] for copy in genotype]
    if fixed_total:
        transfers = rng.choice((1, 1, 1, 2, 2, 4, 8, 16))
        slots = [
            (i, j, k)
            for i in range(len(raw))
            for j in range(3)
            for k in range(len(raw[i][j]))
        ]
        for _ in range(transfers):
            donors = [
                slot
                for slot in slots
                if raw[slot[0]][slot[1]][slot[2]] > minimum
            ]
            receivers = [
                slot
                for slot in slots
                if raw[slot[0]][slot[1]][slot[2]] < maximum
            ]
            if not donors or not receivers:
                break
            source = rng.choice(donors)
            target = rng.choice(receivers)
            if source == target:
                continue
            raw[source[0]][source[1]][source[2]] -= 1
            raw[target[0]][target[1]][target[2]] += 1
        return canon(raw)

    operation = rng.random()
    if operation < 0.72:
        changes = 1 if rng.random() < 0.75 else rng.randint(2, 6)
        for _ in range(changes):
            i = rng.randrange(len(raw))
            j = rng.randrange(3)
            k = rng.randrange(len(raw[i][j]))
            delta = rng.choice((-1, 1))
            raw[i][j][k] = min(
                maximum, max(minimum, raw[i][j][k] + delta)
            )
    elif operation < 0.9:
        i = rng.randrange(len(raw))
        j = rng.randrange(3)
        delta = rng.choice((-1, 1))
        raw[i][j] = [
            min(maximum, max(minimum, q + delta)) for q in raw[i][j]
        ]
    else:
        i = rng.randrange(len(raw))
        delta = rng.choice((-1, 1))
        raw[i] = [
            [min(maximum, max(minimum, q + delta)) for q in branch]
            for branch in raw[i]
        ]
    return canon(raw)


def serializable(record: dict | None) -> dict | None:
    if record is None:
        return None
    out = dict(record)
    out["genotype"] = [
        [list(branch) for branch in copy] for copy in out["genotype"]
    ]
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m", type=int, default=8)
    parser.add_argument("--t", type=int, default=8)
    parser.add_argument("--q-min", type=int, default=1)
    parser.add_argument("--q-max", type=int, default=16)
    parser.add_argument("--seed-q-max", type=int, default=8)
    parser.add_argument(
        "--fixed-total-q",
        type=int,
        default=0,
        help=(
            "If positive, seed only the uniform value q and mutate by "
            "leaf transfers, preserving the total number of added leaves."
        ),
    )
    parser.add_argument("--population", type=int, default=64)
    parser.add_argument("--children", type=int, default=12)
    parser.add_argument("--generations", type=int, default=300)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("evolve_hit_padding_bautista.json"),
    )
    args = parser.parse_args()
    if args.m < 2 or args.t < 2:
        raise ValueError("m,t must be at least two for the HIT assertion")

    rng = random.Random(args.seed)
    started = time.time()
    seen: set[Genotype] = set()
    population: list[dict] = []
    champion = None
    witness = None
    tested = 0

    seed_values = (
        [args.fixed_total_q]
        if args.fixed_total_q > 0
        else range(args.q_min, min(args.q_max, args.seed_q_max) + 1)
    )
    for q in seed_values:
        genotype = uniform_genotype(args.m, args.t, q)
        record = profile(genotype)
        seen.add(genotype)
        tested += 1
        population.append(record)
        if better(record, champion):
            champion = record
        if record["lc_failure_k"] is not None:
            witness = record
            break
        print(
            f"uniform q={q} n={record['tree_order']} "
            f"ratio={record['ratio']:.15f} k={record['best_k']}",
            flush=True,
        )

    for generation in range(args.generations):
        if witness is not None:
            break
        population.sort(key=lambda r: r["ratio"], reverse=True)
        elite = population[: max(4, args.population // 3)]
        candidates: list[dict] = population[: args.population]
        for parent in elite:
            for _ in range(args.children):
                genotype = mutate(
                    parent["genotype"],
                    rng,
                    args.q_min,
                    args.q_max,
                    fixed_total=args.fixed_total_q > 0,
                )
                if genotype in seen:
                    continue
                seen.add(genotype)
                record = profile(genotype)
                tested += 1
                candidates.append(record)
                if better(record, champion):
                    champion = record
                if record["lc_failure_k"] is not None:
                    witness = record
                    break
            if witness is not None:
                break
        population = heapq.nlargest(
            args.population, candidates, key=lambda r: r["ratio"]
        )
        if generation % 5 == 0 or witness is not None:
            top = witness or population[0]
            print(
                f"generation={generation} tested={tested} "
                f"ratio={top['ratio']:.15f} k={top['best_k']} "
                f"n={top['tree_order']}",
                flush=True,
            )
        payload = {
            "status": "counterexample" if witness else "running",
            "parameters": vars(args) | {"out": str(args.out)},
            "tested": tested,
            "generation": generation,
            "elapsed_seconds": time.time() - started,
            "champion": serializable(champion),
            "witness": serializable(witness),
        }
        args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    payload = {
        "status": (
            "counterexample" if witness is not None else "no_counterexample"
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "tested": tested,
        "generations_completed": generation + 1,
        "elapsed_seconds": time.time() - started,
        "champion": serializable(champion),
        "witness": serializable(witness),
        "cache": {
            "support": support_state.cache_info()._asdict(),
            "branch": branch_state.cache_info()._asdict(),
            "copy": copy_state.cache_info()._asdict(),
        },
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if witness is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
