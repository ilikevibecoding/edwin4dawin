#!/usr/bin/env python3
"""Adversarial search for failure of parity-ratio monotonicity.

For a polynomial ``p = (p_0,...,p_alpha)`` define

    M_k = p_{k-1} p_{k+2} / (p_k p_{k+1}),  1 <= k <= alpha-2.

The candidate invariant is ``M_k <= 1`` for every independence polynomial
of a forest.  Equivalently, the adjacent coefficient ratios decrease along
each parity class:

    p_{k+2}/p_{k+1} <= p_k/p_{k-1}.

This script evolves the irregular-lobster representation used by
``caterpillar_evolution.py``.  Floating point is used only for ranking.
Every champion and every alleged failure is recomputed with exact integers.
"""

from __future__ import annotations

import argparse
import heapq
import json
import random
import time
from pathlib import Path

import numpy as np

from caterpillar_evolution import (
    Candidate,
    exact_poly,
    float_poly,
    mutate,
    seeds,
    specimen_n,
    tree_edges,
)


def exact_margin(poly: list[int]) -> dict:
    best: dict | None = None
    for k in range(1, len(poly) - 2):
        left = poly[k - 1] * poly[k + 2]
        right = poly[k] * poly[k + 1]
        record = {
            "k": k,
            "left": left,
            "right": right,
            "difference": left - right,
            "ratio": left / right,
        }
        if best is None or left * best["right"] > best["left"] * right:
            best = record
    return best or {
        "k": None,
        "left": 0,
        "right": 1,
        "difference": -1,
        "ratio": 0.0,
    }


def parity_score(poly: np.ndarray) -> tuple[tuple[float, ...], dict]:
    peak = float(np.max(poly))
    best_ratio = 0.0
    best_k = -1
    best_live_ratio = 0.0
    best_live_k = -1
    for k in range(1, len(poly) - 2):
        den = float(poly[k] * poly[k + 1])
        if den <= 0.0:
            continue
        ratio = float(poly[k - 1] * poly[k + 2] / den)
        if ratio > best_ratio:
            best_ratio = ratio
            best_k = k
        if min(poly[k - 1:k + 3]) >= peak * 1e-13:
            if ratio > best_live_ratio:
                best_live_ratio = ratio
                best_live_k = k
    # Prefer a numerically live comparison.  The all-support value is retained
    # as a secondary objective so a genuine tail failure is not discarded.
    score = (
        1.0 if best_live_ratio > 1.0 + 1e-9 else 0.0,
        best_live_ratio,
        best_ratio,
        -abs(best_live_k - (len(poly) - 1) / 2),
    )
    return score, {
        "best_live_ratio_float": best_live_ratio,
        "best_live_k_float": best_live_k,
        "best_ratio_float": best_ratio,
        "best_k_float": best_k,
        "degree": len(poly) - 1,
    }


def evaluate(loads: tuple[int, ...]) -> Candidate:
    score, detail = parity_score(float_poly(loads))
    return Candidate(loads, score, detail)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--population", type=int, default=140)
    parser.add_argument("--generations", type=int, default=1500)
    parser.add_argument("--max-spine", type=int, default=220)
    parser.add_argument("--max-load", type=int, default=64)
    parser.add_argument("--max-n", type=int, default=4000)
    parser.add_argument("--seed", type=int, default=1993)
    parser.add_argument("--output", type=Path,
                        default=Path("parity_ratio_evolution.json"))
    args = parser.parse_args()
    rng = random.Random(args.seed)

    population = [
        evaluate(x)
        for x in seeds(
            rng, args.population, args.max_spine, args.max_load, args.max_n
        )
    ]
    tested = len(population)
    started = time.time()
    archive: list[tuple[tuple[float, ...], tuple[int, ...], int, dict]] = []

    for generation in range(args.generations):
        population.sort(key=lambda item: item.score, reverse=True)
        champion = population[0]
        heapq.heappush(
            archive,
            (champion.score, champion.loads, generation, champion.detail),
        )
        if len(archive) > 60:
            heapq.heappop(archive)

        if generation % 20 == 0 or champion.score[0] > 0.0:
            poly = exact_poly(champion.loads)
            exact = exact_margin(poly)
            print(
                f"g={generation} tested={tested} n={specimen_n(champion.loads)} "
                f"float={champion.detail['best_live_ratio_float']:.12g} "
                f"exact={exact['ratio']:.12g} k={exact['k']} "
                f"elapsed={time.time()-started:.1f}s",
                flush=True,
            )
            if exact["difference"] > 0:
                n, edges = tree_edges(champion.loads)
                result = {
                    "parameters": vars(args) | {"output": str(args.output)},
                    "tested": tested,
                    "generation": generation,
                    "n": n,
                    "loads": champion.loads,
                    "edges": edges,
                    "polynomial": poly,
                    "failure": exact,
                }
                args.output.write_text(
                    json.dumps(result, indent=2), encoding="utf-8"
                )
                print("EXACT PARITY-RATIO FAILURE", flush=True)
                return 1

        elite = population[:max(8, args.population // 8)]
        children = list(elite)
        seen = {candidate.loads for candidate in children}
        attempts = 0
        while (
            len(children) < args.population
            and attempts < 30 * args.population
        ):
            attempts += 1
            parent = rng.choice(elite[:max(3, len(elite) // 2)])
            child_loads = mutate(
                parent.loads,
                rng,
                args.max_spine,
                args.max_load,
                args.max_n,
            )
            if child_loads in seen:
                continue
            seen.add(child_loads)
            children.append(evaluate(child_loads))
            tested += 1
        population = children

    population.sort(key=lambda item: item.score, reverse=True)
    champion = population[0]
    poly = exact_poly(champion.loads)
    result = {
        "parameters": vars(args) | {"output": str(args.output)},
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "failure": None,
        "champion": {
            "loads": champion.loads,
            "n": specimen_n(champion.loads),
            "score": champion.score,
            "detail": champion.detail,
            "exact": exact_margin(poly),
            "coefficient_count": len(poly),
        },
        "archive": [
            {
                "score": score,
                "loads": loads,
                "generation": generation,
                "detail": detail,
            }
            for score, loads, generation, detail
            in sorted(archive, reverse=True)
        ],
    }
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "n": result["champion"]["n"],
                "loads": result["champion"]["loads"],
                "coefficient_count":
                    result["champion"]["coefficient_count"],
                "exact": result["champion"]["exact"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
