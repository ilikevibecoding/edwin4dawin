#!/usr/bin/env python3
"""Adversarial rooted-tree evolution for terminal-isolate burden."""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from copy import deepcopy
from fractions import Fraction
from pathlib import Path

from flint import fmpz_poly

PUBLIC_REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(PUBLIC_REPO))

from nm_optimizer import (  # noqa: E402
    _adj_fingerprint,
    _random_tree,
    _validate_tree,
    mutate,
)

from patternboost_rebound_evolution import edges
from random_leaf_gsb_local_payment import coeff, tree_polynomial


ONE_PLUS_X = fmpz_poly([1, 1])


def evaluate(
    adjacency: list[list[int]],
    root: int,
    minimum_rank: int,
    label: str,
    generation: int,
) -> dict:
    base = tree_polynomial(adjacency)
    total = base * ONE_PLUS_X
    avoiding = tree_polynomial(adjacency, deleted=root)
    best = None
    detail = None
    for rank in range(minimum_rank, total.degree() + 1):
        bm = int(coeff(total, rank - 1))
        br = int(coeff(total, rank))
        if not bm or not br or br < bm:
            continue
        u = Fraction(rank * br, bm)
        rho_previous = Fraction(
            bm - int(coeff(avoiding, rank - 1)), bm
        )
        rho = Fraction(
            br - int(coeff(avoiding, rank)), br
        )
        burden = (
            rank * (u + 1) * rho_previous
            - (rank + 1) * u * rho
        )
        if best is None or burden > best:
            best = burden
            detail = {
                "rank": rank,
                "burden": str(burden),
                "burden_float": float(burden),
                "u": str(u),
                "rho_previous": str(rho_previous),
                "rho": str(rho),
                "b_previous": bm,
                "b_current": br,
            }
    return {
        "adjacency": adjacency,
        "root": root,
        "fingerprint": f"{root}|{_adj_fingerprint(adjacency)}",
        "label": label,
        "generation": generation,
        "score": -1e100 if best is None else float(best),
        "detail": detail,
        "witness": best is not None and best > 0,
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


def compact(record: dict) -> dict:
    adjacency = record["adjacency"]
    return {
        "order": len(adjacency),
        "root": record["root"],
        "root_degree": len(adjacency[record["root"]]),
        "label": record["label"],
        "generation": record["generation"],
        "detail": record["detail"],
        "edges": edges(adjacency),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--order", type=int, default=60)
    parser.add_argument("--minimum-rank", type=int, default=6)
    parser.add_argument("--population", type=int, default=48)
    parser.add_argument("--generations", type=int, default=300)
    parser.add_argument("--children", type=int, default=8)
    parser.add_argument("--mutations", type=int, default=3)
    parser.add_argument("--random-injections", type=int, default=6)
    parser.add_argument("--seed", type=int, default=993_20260728)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    started = time.time()
    population = []
    attempts = 0
    while len(population) < args.population:
        adjacency = _random_tree(args.order, rng)
        candidates = sorted(
            range(args.order),
            key=lambda vertex: len(adjacency[vertex]),
            reverse=True,
        )
        roots = candidates[:3] + rng.sample(
            range(args.order), min(3, args.order)
        )
        for root in roots:
            record = evaluate(
                adjacency,
                root,
                args.minimum_rank,
                f"random_seed_{attempts}_root_{root}",
                0,
            )
            if record["detail"] is not None:
                population.append(record)
        attempts += 1
    population = dedupe(population, args.population)
    tested = len(population)
    witness = next(
        (record for record in population if record["witness"]), None
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
                    _, adjacency = mutate(
                        len(adjacency), adjacency, rng
                    )
                if not _validate_tree(len(adjacency), adjacency):
                    continue
                root = parent["root"]
                if rng.random() < 0.12:
                    root = rng.randrange(len(adjacency))
                child = evaluate(
                    adjacency,
                    root,
                    args.minimum_rank,
                    f"g{generation}_p{parent_index}_c{child_index}",
                    generation,
                )
                tested += 1
                if child["detail"] is not None:
                    children.append(child)
                if child["witness"]:
                    witness = child
                    break
            if witness is not None:
                break
        if witness is not None:
            break
        for injection in range(args.random_injections):
            adjacency = _random_tree(args.order, rng)
            root = rng.randrange(args.order)
            child = evaluate(
                adjacency,
                root,
                args.minimum_rank,
                f"g{generation}_random_{injection}",
                generation,
            )
            tested += 1
            if child["detail"] is not None:
                children.append(child)
        population = dedupe(
            [*population, *children], args.population
        )
        if generation == 1 or generation % 10 == 0:
            champion = population[0]
            print(
                f"generation={generation} tested={tested:,} "
                f"burden={champion['score']:.12g} "
                f"rank={champion['detail']['rank']} "
                f"root_degree="
                f"{len(champion['adjacency'][champion['root']])}",
                flush=True,
            )

    champion = witness or population[0]
    report = {
        "status": "COUNTEREXAMPLE" if witness else "NO_FAILURE",
        "parameters": vars(args) | {"out": str(args.out)},
        "tested_rooted_trees": tested,
        "elapsed_seconds": time.time() - started,
        "champion": compact(champion),
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2), flush=True)
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())

