#!/usr/bin/env python3
"""Adversarial exact search for a failure of the two-step ratio condition.

This reuses the broad spider-bouquet grammar from the project's direct-valley
search.  It ranks a tree with independence coefficients ``a`` by

    max_k a[k-1] a[k+2] / (a[k] a[k+1]).

A value greater than one is an exact counterexample to the candidate (TS)
invariant.  It need not be a counterexample to unimodality.
"""

from __future__ import annotations

import argparse
import heapq
import json
import random
import sys
import time
from pathlib import Path

PUBLIC_REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(PUBLIC_REPO))

from scripts.valley_search import (  # noqa: E402
    SWEEPS,
    bouquet_poly,
    bouquet_size,
    canon,
    mutate_spec,
    spec_label,
)


def exact_ts_margin(poly: list[int], scope: str = "prefix") -> dict:
    alpha = len(poly) - 1
    tail_start = (2 * alpha + 1) // 3
    last_k = len(poly) - 3
    if scope == "prefix":
        last_k = min(last_k, tail_start - 2)
    best: dict | None = None
    for k in range(1, last_k + 1):
        left = poly[k - 1] * poly[k + 2]
        right = poly[k] * poly[k + 1]
        if right == 0:
            continue
        if best is None or left * best["right"] > best["left"] * right:
            best = {
                "k": k,
                "left": left,
                "right": right,
                "difference": left - right,
                "ratio": left / right,
            }
    result = best or {
        "k": None,
        "left": 0,
        "right": 1,
        "difference": -1,
        "ratio": 0.0,
    }
    result["scope"] = scope
    result["tail_start"] = tail_start
    result["last_tested_k"] = last_k
    return result


def exact_two_step_extension_margin(
    poly: list[int],
    min_index: int = 0,
    ranking: str = "ratio",
    scope: str = "all",
) -> dict:
    best: dict | None = None
    alpha = len(poly) - 1
    tail_start = (2 * alpha + 1) // 3
    last_r = len(poly) - 4
    if scope == "prefix":
        last_r = min(last_r, tail_start - 2)
    for r in range(min_index, last_r + 1):
        left = (r + 3) * poly[r + 3] * poly[r]
        right = ((r + 1) * poly[r + 1] + 2 * poly[r]) * poly[r + 2]
        if right == 0:
            continue
        additive_denominator = poly[r] * poly[r + 2]
        candidate = {
            "r": r,
            "left": left,
            "right": right,
            "difference": left - right,
            "ratio": left / right,
            "additive_numerator": left - right,
            "additive_denominator": additive_denominator,
            "additive_gap": (left - right) / additive_denominator,
        }
        if best is None:
            best = candidate
            continue
        if ranking == "ratio":
            better = left * best["right"] > best["left"] * right
        else:
            better = (
                candidate["additive_numerator"]
                * best["additive_denominator"]
                > best["additive_numerator"] * additive_denominator
            )
        if better:
            best = candidate
    result = best or {
        "r": None,
        "left": 0,
        "right": 1,
        "difference": -1,
        "ratio": 0.0,
        "additive_numerator": -1,
        "additive_denominator": 1,
        "additive_gap": -1.0,
    }
    result["scope"] = scope
    result["tail_start"] = tail_start
    result["last_tested_r"] = last_r
    return result


def evaluate(
    spec,
    scope: str = "prefix",
    metric: str = "ts",
    min_index: int = 0,
    ranking: str = "ratio",
) -> dict:
    gadgets, paths, leaves = spec
    poly = bouquet_poly(list(gadgets), tuple(paths), leaves)
    margin = (
        exact_ts_margin(poly, scope)
        if metric == "ts"
        else exact_two_step_extension_margin(
            poly, min_index, ranking, scope
        )
    )
    margin["ranking_score"] = (
        margin["additive_gap"]
        if metric == "two-step-extension" and ranking == "additive-gap"
        else margin["ratio"]
    )
    return {
        "label": spec_label(spec),
        "spec": [[list(legs) for legs in gadgets], list(paths), leaves],
        "n": bouquet_size(gadgets, paths, leaves),
        "alpha": len(poly) - 1,
        "margin": margin,
        "polynomial": poly if margin["difference"] > 0 else None,
    }


def score(record: dict) -> float:
    margin = record["margin"]
    if margin.get("k") is None and margin.get("r") is None:
        return -1.0e300
    return margin["ranking_score"]


def restore_spec(record: dict):
    return (
        tuple(tuple(legs) for legs in record["spec"][0]),
        tuple(record["spec"][1]),
        record["spec"][2],
    )


def retain(
    heap: list[tuple[float, int, dict]],
    record: dict,
    counter: int,
    limit: int,
) -> None:
    item = (score(record), counter, record)
    if len(heap) < limit:
        heapq.heappush(heap, item)
    elif item[0] > heap[0][0]:
        heapq.heapreplace(heap, item)


def hill_climb(
    seeds: list[dict],
    max_n: int,
    generations: int,
    population_size: int,
    rng: random.Random,
    seen: set,
    scope: str,
    metric: str,
    min_index: int,
    ranking: str,
) -> tuple[dict | None, list[dict], int]:
    population = sorted(seeds, key=score, reverse=True)[:population_size]
    tested = 0
    for generation in range(generations):
        children: list[dict] = []
        elite = population[: max(4, population_size // 3)]
        for parent in elite:
            parent_spec = restore_spec(parent)
            for _ in range(10):
                child_spec = mutate_spec(parent_spec, rng, max_n)
                key = canon(child_spec)
                if key in seen:
                    continue
                seen.add(key)
                child = evaluate(
                    child_spec, scope, metric, min_index, ranking
                )
                tested += 1
                if child["margin"]["difference"] > 0:
                    return child, population, tested
                children.append(child)
        population = sorted(population + children, key=score, reverse=True)[
            :population_size
        ]
        if generation % 10 == 0 and population:
            champion = population[0]
            print(
                f"generation={generation} tested={tested} "
                f"score={score(champion):.12g} "
                f"index={champion['margin'].get('k', champion['margin'].get('r'))} "
                f"n={champion['n']} "
                f"{champion['label']}",
                flush=True,
            )
    return None, population, tested


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sweep", default="all")
    parser.add_argument("--max-n", type=int, default=500)
    parser.add_argument("--generations", type=int, default=300)
    parser.add_argument("--population", type=int, default=48)
    parser.add_argument("--top", type=int, default=80)
    parser.add_argument("--seed", type=int, default=2407993)
    parser.add_argument(
        "--scope",
        choices=("prefix", "all"),
        default="prefix",
        help=(
            "prefix checks only k <= ceil((2 alpha-1)/3)-2, the range "
            "needed before the proved decreasing tail; all checks every k"
        ),
    )
    parser.add_argument(
        "--metric",
        choices=("ts", "two-step-extension"),
        default="ts",
    )
    parser.add_argument(
        "--min-index",
        type=int,
        default=0,
        help="minimum k (TS) or r (two-step-extension) considered in ranking",
    )
    parser.add_argument(
        "--ranking",
        choices=("ratio", "additive-gap"),
        default="ratio",
        help=(
            "rank 2SB candidates by the multiplicative left/right ratio or "
            "by mu[r+2]-mu[r]-2; additive-gap avoids trivial large-order "
            "near-equality"
        ),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("bouquet_parity_search.json"),
    )
    args = parser.parse_args()

    names = list("ABCD") if args.sweep == "all" else args.sweep.split(",")
    rng = random.Random(args.seed)
    heap: list[tuple[float, int, dict]] = []
    seen: set = set()
    tested = 0
    counter = 0
    started = time.time()
    witness = None

    for name in names:
        sweep_count = 0
        for spec in SWEEPS[name](args.max_n):
            key = canon(spec)
            if key in seen:
                continue
            seen.add(key)
            record = evaluate(
                spec,
                args.scope,
                args.metric,
                args.min_index,
                args.ranking,
            )
            record["source"] = f"sweep-{name}"
            tested += 1
            sweep_count += 1
            counter += 1
            if record["margin"]["difference"] > 0:
                witness = record
                break
            retain(heap, record, counter, args.top)
        print(f"sweep={name} checked={sweep_count}", flush=True)
        if witness is not None:
            break

    population: list[dict] = []
    if witness is None and heap and args.generations:
        seeds = [item[2] for item in sorted(heap, reverse=True)]
        witness, population, hill_tested = hill_climb(
            seeds,
            args.max_n,
            args.generations,
            args.population,
            rng,
            seen,
            args.scope,
            args.metric,
            args.min_index,
            args.ranking,
        )
        tested += hill_tested

    champions = sorted(
        [item[2] for item in heap] + population, key=score, reverse=True
    )
    unique_champions: list[dict] = []
    champion_specs: set = set()
    for record in champions:
        key = canon(restore_spec(record))
        if key in champion_specs:
            continue
        champion_specs.add(key)
        unique_champions.append(record)
        if len(unique_champions) == args.top:
            break

    payload = {
        "parameters": {
            "sweep": args.sweep,
            "max_n": args.max_n,
            "generations": args.generations,
            "population": args.population,
            "top": args.top,
            "seed": args.seed,
            "scope": args.scope,
            "metric": args.metric,
            "min_index": args.min_index,
            "ranking": args.ranking,
        },
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "witness": witness,
        "champions": [
            {key: value for key, value in record.items() if key != "polynomial"}
            for record in unique_champions
        ],
    }
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    if witness is not None:
        print("EXACT TS FAILURE", flush=True)
        print(json.dumps(witness, indent=2), flush=True)
        return 1
    champion = unique_champions[0] if unique_champions else None
    print(
        json.dumps(
            {
                "tested": tested,
                "elapsed_seconds": payload["elapsed_seconds"],
                "witness": None,
                "champion": champion,
                "output": str(args.output),
            },
            indent=2,
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
