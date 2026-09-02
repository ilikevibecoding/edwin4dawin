#!/usr/bin/env python3
"""Adversarial rooted-tree search for terminal drift components (A),(B).

The search keeps a distinguished root q and evolves the surrounding
tree.  For B=I(F) and C=I(F-q), it minimizes either

    A_r = 1+r b_r/b_(r-1)-(r+1)b_(r+1)/b_r-c_r/b_r,

or

    B_r = 1+r b_r/b_(r-1)-r c_r/c_(r-1),

over the operative ranks r>=6 satisfying u>=r and the exact
order-sensitive room condition.  Fitness is floating point, but every
margin and every failure decision is computed exactly.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from copy import deepcopy
from fractions import Fraction
from pathlib import Path

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


def evaluate(
    adjacency: list[list[int]],
    root: int,
    component: str,
    label: str,
    generation: int,
) -> dict:
    b_poly = tree_polynomial(adjacency)
    c_poly = tree_polynomial(adjacency, deleted=root)
    alpha = b_poly.degree()
    n = len(adjacency)
    best_margin = None
    best_detail = None
    for r in range(6, alpha + 1):
        bm = int(coeff(b_poly, r - 1))
        b = int(coeff(b_poly, r))
        bp = int(coeff(b_poly, r + 1))
        cm = int(coeff(c_poly, r - 1))
        c = int(coeff(c_poly, r))
        if min(bm, b) <= 0:
            continue
        u = Fraction(r * b, bm)
        if u < r:
            continue
        if (alpha - r) * (n - r) <= (r + 1) * (r + 2):
            continue
        if component == "A":
            margin = (
                1
                + u
                - Fraction((r + 1) * bp, b)
                - Fraction(c, b)
            )
        else:
            if cm <= 0:
                continue
            margin = 1 + u - Fraction(r * c, cm)
        if best_margin is None or margin < best_margin:
            best_margin = margin
            best_detail = {
                "rank_r": r,
                "u": str(u),
                "margin": str(margin),
                "margin_float": float(margin),
                "b_window": [bm, b, bp],
                "c_window": [cm, c],
            }
    if best_margin is None:
        # Ineligible candidates are retained only as a very weak fallback.
        score = -1e100
        detail = None
    else:
        score = -float(best_margin)
        detail = best_detail
    return {
        "adjacency": adjacency,
        "root": root,
        "fingerprint": f"{root}|{_adj_fingerprint(adjacency)}",
        "label": label,
        "generation": generation,
        "alpha": alpha,
        "score": score,
        "detail": detail,
        "witness": best_margin is not None and best_margin < 0,
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
        "alpha": record["alpha"],
        "root": record["root"],
        "root_degree": len(adjacency[record["root"]]),
        "label": record["label"],
        "generation": record["generation"],
        "detail": record["detail"],
        "edges": edges(adjacency),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--component", choices=("A", "B"), required=True)
    parser.add_argument("--order", type=int, default=60)
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
                args.component,
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
                    args.component,
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
                args.component,
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
            detail = champion["detail"]
            print(
                f"component={args.component} generation={generation} "
                f"tested={tested:,} margin={detail['margin_float']:.12g} "
                f"rank={detail['rank_r']} alpha={champion['alpha']} "
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
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2), flush=True)
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
