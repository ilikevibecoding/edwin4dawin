#!/usr/bin/env python3
"""Valley-first search over irregular lobsters for Erdős problem 993.

A specimen is a tuple of encoded decorations on a spine.  A gene g encodes
``p = g mod 8`` pendant leaves and ``q = floor(g/8)`` length-two arms.
After integrating out the side arms, the rooted recurrence is

    E_j = (1+x)^p (1+2x)^q (E_{j-1}+I_{j-1}),
    I_j = x (1+x)^q E_{j-1}.

The fast search uses floating point only to rank candidates.  Every alleged
witness is recomputed with exact integer coefficients and materialized as an
edge list before it is reported.
"""

from __future__ import annotations

import argparse
import heapq
import json
import math
import random
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np

REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(REPO))

from scripts.valley_scaling_probe import kadd, kmul, shift  # noqa: E402


@dataclass
class Candidate:
    loads: tuple[int, ...]
    score: tuple[float, ...]
    detail: dict


GENE_BASE = 8


def decode_gene(gene: int) -> tuple[int, int]:
    return gene % GENE_BASE, gene // GENE_BASE


def specimen_n(loads: tuple[int, ...]) -> int:
    return sum(1 + p + 2 * q for p, q in map(decode_gene, loads))


def float_poly(loads: tuple[int, ...]) -> np.ndarray:
    """Coefficient shape, repeatedly rescaled to avoid overflow."""
    excluded = np.array([1.0])
    total = np.array([1.0])
    for gene in loads:
        leaves, arms2 = decode_gene(gene)
        leaf_kernel = np.array([math.comb(leaves, k)
                                for k in range(leaves + 1)], dtype=float)
        arm_kernel = np.array([math.comb(arms2, k) * (2.0 ** k)
                               for k in range(arms2 + 1)], dtype=float)
        excluded_kernel = np.convolve(leaf_kernel, arm_kernel)
        included_kernel = np.array([math.comb(arms2, k)
                                    for k in range(arms2 + 1)], dtype=float)
        new_excluded = np.convolve(total, excluded_kernel)
        new_included = np.pad(np.convolve(excluded, included_kernel),
                              (1, 0))
        width = max(len(new_excluded), len(new_included))
        new_excluded = np.pad(new_excluded,
                              (0, width - len(new_excluded)))
        new_included = np.pad(new_included,
                              (0, width - len(new_included)))
        total = new_excluded + new_included
        scale = float(np.max(total))
        excluded = new_excluded / scale
        total = total / scale
    return total


def shape_score(poly: np.ndarray, theta: float = 0.001) -> tuple[
        tuple[float, ...], dict]:
    """Rank the best coefficient rebound after a thresholded descent."""
    peak = float(np.max(poly))
    live = poly > peak * 1e-14
    ratios = np.divide(poly[1:], poly[:-1],
                       out=np.zeros(len(poly) - 1),
                       where=poly[:-1] > peak * 1e-14)

    best_bump = 0.0
    best_bump_at = -1
    prior_descent_at = -1
    first_descent = -1
    ratio_rebound = 0.0
    ratio_rebound_factor = 0.0
    ratio_rebound_at = -1
    ratio_trough_at = -1
    running_ratio_min = float("inf")
    running_ratio_min_at = -1
    tail_start = math.ceil((2 * (len(poly) - 1) - 1) / 3)
    for j, ratio in enumerate(ratios):
        if (first_descent < 0 and live[j] and live[j + 1]
                and ratio <= 1.0 - theta):
            first_descent = j
            running_ratio_min = float(ratio)
            running_ratio_min_at = j
        elif first_descent >= 0 and live[j] and live[j + 1]:
            if ratio > best_bump:
                best_bump = float(ratio)
                best_bump_at = j
                prior_descent_at = first_descent
            if (running_ratio_min_at >= 0 and j < tail_start
                    and ratio >= (1.0 + theta) * running_ratio_min):
                factor = float(ratio / running_ratio_min)
                if (float(ratio), factor) > (
                        ratio_rebound, ratio_rebound_factor):
                    ratio_rebound = float(ratio)
                    ratio_rebound_factor = factor
                    ratio_rebound_at = j
                    ratio_trough_at = running_ratio_min_at
            if ratio < running_ratio_min:
                running_ratio_min = float(ratio)
                running_ratio_min_at = j

    prefix = np.maximum.accumulate(poly)
    suffix = np.maximum.accumulate(poly[::-1])[::-1]
    ks = np.arange(1, len(poly) - 1)
    qualifying = ks[
        (prefix[ks - 1] >= (1.0 + theta) * poly[ks])
        & live[ks]
    ]
    rebound = 0.0
    valley_index = -1
    rise_index = -1
    if qualifying.size:
        values = suffix[qualifying + 1] / poly[qualifying]
        jj = int(np.argmax(values))
        valley_index = int(qualifying[jj])
        rebound = float(values[jj])
        rise_index = valley_index + 1 + int(
            np.argmax(poly[valley_index + 1:]))

    local_valleys = np.where(
        (poly[1:-1] < poly[:-2])
        & (poly[1:-1] < poly[2:])
        & live[1:-1]
    )[0] + 1
    witness_margin = 0.0
    witness_at = -1
    if local_valleys.size:
        margins = np.minimum(poly[local_valleys - 1],
                             poly[local_valleys + 1]) / poly[local_valleys]
        jj = int(np.argmax(margins))
        witness_margin = float(margins[jj])
        witness_at = int(local_valleys[jj])

    # The leading fields create a useful gradient before a witness exists:
    # a later ratio bump is the local mechanism required to reverse a descent.
    score = (
        1.0 if witness_margin > 1.0 + 1e-10 else 0.0,
        witness_margin,
        1.0 if ratio_rebound_at >= 0 else 0.0,
        ratio_rebound,
        ratio_rebound_factor,
        best_bump,
        rebound,
        -abs(best_bump_at - prior_descent_at)
        if best_bump_at >= 0 else -1e9,
    )
    detail = {
        "witness_margin_float": witness_margin,
        "witness_index_float": witness_at,
        "best_post_descent_ratio": best_bump,
        "best_post_descent_ratio_index": best_bump_at,
        "prior_descent_index": prior_descent_at,
        "ratio_rebound": ratio_rebound,
        "ratio_rebound_factor": ratio_rebound_factor,
        "ratio_rebound_index": ratio_rebound_at,
        "ratio_trough_index": ratio_trough_at,
        "rebound": rebound,
        "valley_index": valley_index,
        "rise_index": rise_index,
        "degree": len(poly) - 1,
    }
    return score, detail


def exact_poly(loads: tuple[int, ...]) -> list[int]:
    excluded = [1]
    total = [1]
    for gene in loads:
        leaves, arms2 = decode_gene(gene)
        leaf_kernel = [math.comb(leaves, k)
                       for k in range(leaves + 1)]
        arm_kernel = [math.comb(arms2, k) * (2 ** k)
                      for k in range(arms2 + 1)]
        included_kernel = [math.comb(arms2, k)
                           for k in range(arms2 + 1)]
        new_excluded = kmul(total, kmul(leaf_kernel, arm_kernel))
        new_included = shift(kmul(excluded, included_kernel))
        excluded = new_excluded
        total = kadd(new_excluded, new_included)
    return total


def exact_valley(poly: list[int]) -> dict | None:
    descended = False
    descent_at = -1
    for k in range(1, len(poly)):
        if not descended and poly[k] < poly[k - 1]:
            descended = True
            descent_at = k - 1
        elif descended and poly[k] > poly[k - 1]:
            return {
                "descent_ratio_indices": [descent_at, descent_at + 1],
                "rise_ratio_indices": [k - 1, k],
                "descent_coefficients": [poly[descent_at],
                                         poly[descent_at + 1]],
                "rise_coefficients": [poly[k - 1], poly[k]],
            }
    return None


def tree_edges(loads: tuple[int, ...]) -> tuple[int, list[tuple[int, int]]]:
    spine = len(loads)
    edges = [(j, j + 1) for j in range(spine - 1)]
    nxt = spine
    for vertex, gene in enumerate(loads):
        leaves, arms2 = decode_gene(gene)
        for _ in range(leaves):
            edges.append((vertex, nxt))
            nxt += 1
        for _ in range(arms2):
            middle = nxt
            terminal = nxt + 1
            nxt += 2
            edges.extend(((vertex, middle), (middle, terminal)))
    return nxt, edges


def evaluate(loads: tuple[int, ...]) -> Candidate:
    score, detail = shape_score(float_poly(loads))
    return Candidate(loads, score, detail)


def mutate(loads: tuple[int, ...], rng: random.Random, max_spine: int,
           max_load: int, max_n: int) -> tuple[int, ...]:
    out = list(loads)
    choice = rng.randrange(8)
    if choice <= 2:
        j = rng.randrange(len(out))
        delta = rng.choice((-5, -2, -1, 1, 2, 5))
        out[j] = min(max_load, max(0, out[j] + delta))
    elif choice == 3 and len(out) < max_spine:
        j = rng.randrange(len(out) + 1)
        near = out[min(j, len(out) - 1)] if out else 0
        out.insert(j, min(max_load, max(0, near + rng.randint(-3, 3))))
    elif choice == 4 and len(out) > 2:
        del out[rng.randrange(len(out))]
    elif choice == 5 and len(out) > 2:
        a = rng.randrange(len(out))
        b = rng.randrange(a, len(out))
        out[a:b + 1] = reversed(out[a:b + 1])
    elif choice == 6:
        a = rng.randrange(len(out))
        b = rng.randrange(a + 1, len(out) + 1)
        block = out[a:b]
        room = max_spine - len(out)
        if room:
            block = block[:room]
            j = rng.randrange(len(out) + 1)
            out[j:j] = block
    else:
        # Phase-separated blocks are useful seeds and mutations.
        a = rng.randrange(len(out))
        b = rng.randrange(a, len(out))
        level = rng.randint(0, max_load)
        out[a:b + 1] = [level] * (b - a + 1)

    while specimen_n(tuple(out)) > max_n and len(out) > 2:
        j = max(range(len(out)),
                key=lambda k: sum(decode_gene(out[k])))
        leaves, arms2 = decode_gene(out[j])
        if arms2:
            out[j] = leaves + GENE_BASE * (arms2 - 1)
        elif leaves:
            out[j] = leaves - 1
        else:
            out.pop()
    return tuple(out)


def seeds(rng: random.Random, population: int, max_spine: int,
          max_load: int, max_n: int) -> list[tuple[int, ...]]:
    ans: list[tuple[int, ...]] = []
    patterns = [
        (0, max_load),
        (2, 5),
        (0, 2, max_load),
        (max_load, 0, 0),
        (1, 4, 1, max_load),
    ]
    for pattern in patterns:
        length = min(max_spine, max(4, max_n // (2 + max(pattern))))
        specimen = tuple(pattern[j % len(pattern)] for j in range(length))
        while specimen_n(specimen) > max_n:
            specimen = specimen[:-1]
        ans.append(specimen)
    while len(ans) < population:
        length = rng.randint(4, max_spine)
        specimen = tuple(rng.randint(0, max_load) for _ in range(length))
        while specimen_n(specimen) > max_n:
            specimen = specimen[:-1]
        if len(specimen) >= 2:
            ans.append(specimen)
    return ans


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--population", type=int, default=100)
    parser.add_argument("--generations", type=int, default=1000)
    parser.add_argument("--max-spine", type=int, default=160)
    parser.add_argument("--max-load", type=int, default=40)
    parser.add_argument("--max-n", type=int, default=2500)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path,
                        default=Path("caterpillar_evolution.json"))
    args = parser.parse_args()
    rng = random.Random(args.seed)

    population = [evaluate(x) for x in seeds(
        rng, args.population, args.max_spine, args.max_load, args.max_n)]
    archive: list[tuple[tuple[float, ...], tuple[int, ...], int, dict]] = []
    tested = len(population)
    started = time.time()

    for generation in range(args.generations):
        population.sort(key=lambda x: x.score, reverse=True)
        champion = population[0]
        heapq.heappush(archive, (champion.score, champion.loads, generation,
                                champion.detail))
        if len(archive) > 50:
            heapq.heappop(archive)

        if champion.score[0] > 0.0:
            poly = exact_poly(champion.loads)
            witness = exact_valley(poly)
            if witness is not None:
                n, edges = tree_edges(champion.loads)
                result = {
                    "tested": tested,
                    "generation": generation,
                    "n": n,
                    "loads": champion.loads,
                    "edges": edges,
                    "polynomial": poly,
                    "exact_witness": witness,
                }
                args.output.write_text(json.dumps(result, indent=2),
                                       encoding="utf-8")
                print("EXACT WITNESS", json.dumps(result), flush=True)
                return 0

        if generation % 25 == 0:
            print(f"g={generation} tested={tested} "
                  f"score={champion.score} "
                  f"n={specimen_n(champion.loads)} "
                  f"spine={len(champion.loads)} "
                  f"elapsed={time.time()-started:.1f}s", flush=True)

        elite = population[:max(5, args.population // 8)]
        children = list(elite)
        seen = {c.loads for c in children}
        attempts = 0
        while len(children) < args.population and attempts < 20 * args.population:
            attempts += 1
            parent = rng.choice(elite[:max(2, len(elite) // 2)])
            child_loads = mutate(parent.loads, rng, args.max_spine,
                                 args.max_load, args.max_n)
            if child_loads in seen:
                continue
            seen.add(child_loads)
            children.append(evaluate(child_loads))
            tested += 1
        population = children

    population.sort(key=lambda x: x.score, reverse=True)
    result = {
        "parameters": vars(args) | {"output": str(args.output)},
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "witness": None,
        "champion": {
            "loads": population[0].loads,
            "n": specimen_n(population[0].loads),
            "score": population[0].score,
            "detail": population[0].detail,
        },
        "archive": [
            {"score": score, "loads": loads, "detail": detail}
            for score, loads, _generation, detail
            in sorted(archive, reverse=True)
        ],
    }
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result["champion"], indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
