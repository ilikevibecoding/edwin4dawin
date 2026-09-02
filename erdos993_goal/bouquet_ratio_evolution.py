#!/usr/bin/env python3
"""Evolve spider-bouquet trees by coefficient-ratio rebound.

The public #993 searches ranked trees mainly by valley height.  This search
instead starts at the known 26-vertex log-concavity failures and ranks the
mechanism needed to turn their harmless tail bump into a valley:

  * a strict coefficient descent has already happened;
  * a later adjacent coefficient ratio rises after an earlier ratio trough;
  * the rebound migrates left of the proved decreasing-tail boundary; and
  * its absolute ratio approaches (and, for a witness, exceeds) one.

All coefficients and all witness decisions are exact integers.
"""

from __future__ import annotations

import argparse
import heapq
import json
import math
import random
import sys
import time
from collections import Counter
from pathlib import Path

REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(REPO))

from scripts.valley_scaling_probe import (  # noqa: E402
    kadd,
    kmul,
    kpow,
    path_poly,
    shift,
)
from scripts.valley_search import (  # noqa: E402
    bouquet_adj,
    bouquet_size,
    canon,
    mutate_spec,
    spec_label,
)

Spec = tuple[tuple[tuple[int, ...], ...], tuple[int, ...], int]

_GADGET_CACHE: dict[tuple[int, ...], tuple[list[int], list[int]]] = {}


def gadget_state(legs: tuple[int, ...]) -> tuple[list[int], list[int]]:
    key = tuple(sorted(legs))
    hit = _GADGET_CACHE.get(key)
    if hit is not None:
        return hit
    counts = Counter(key)
    excluded = [1]
    included = [1]
    for length, count in counts.items():
        excluded = kmul(excluded, kpow(path_poly(length), count))
        included = kmul(included, kpow(path_poly(length - 1), count))
    ans = excluded, shift(included)
    _GADGET_CACHE[key] = ans
    return ans


def fast_poly(spec: Spec) -> list[int]:
    gadgets, root_paths, root_leaves = spec
    excluded = [1]
    included_product = [1]
    for legs in gadgets:
        child_excluded, child_included = gadget_state(legs)
        excluded = kmul(excluded,
                        kadd(child_excluded, child_included))
        included_product = kmul(included_product, child_excluded)
    for length in root_paths:
        excluded = kmul(excluded, path_poly(length))
        included_product = kmul(included_product,
                                 path_poly(length - 1))
    if root_leaves:
        excluded = kmul(excluded, kpow([1, 1], root_leaves))
    return kadd(excluded, shift(included_product))


def first_valley(poly: list[int]) -> dict | None:
    descent = -1
    for k in range(len(poly) - 1):
        if descent < 0 and poly[k + 1] < poly[k]:
            descent = k
        elif descent >= 0 and poly[k + 1] > poly[k]:
            return {
                "descent_ratio_index": descent,
                "rise_ratio_index": k,
                "descent_coefficients": [poly[descent], poly[descent + 1]],
                "rise_coefficients": [poly[k], poly[k + 1]],
            }
    return None


def ratio_score(poly: list[int]) -> tuple[tuple[float, ...], dict]:
    alpha = len(poly) - 1
    tail_start = math.ceil((2 * alpha - 1) / 3)
    ratios = [(poly[k + 1], poly[k]) for k in range(alpha)]
    first_descent = next(
        (k for k, (num, den) in enumerate(ratios) if num < den), -1)

    trough: tuple[int, int, int] | None = None
    legal_best: tuple[int, int, int, int] | None = None
    any_best: tuple[int, int, int, int] | None = None
    if first_descent >= 0:
        trough = (*ratios[first_descent], first_descent)
        for k in range(first_descent + 1, alpha):
            num, den = ratios[k]
            tnum, tden, tk = trough
            if num * tden > tnum * den:
                rec = (num, den, k, tk)
                if (any_best is None
                        or num * any_best[1] > any_best[0] * den):
                    any_best = rec
                if k < tail_start and (
                        legal_best is None
                        or num * legal_best[1] > legal_best[0] * den):
                    legal_best = rec
            if num * tden < tnum * den:
                trough = (num, den, k)

    witness = first_valley(poly)
    legal_ratio = (legal_best[0] / legal_best[1]
                   if legal_best else 0.0)
    any_ratio = any_best[0] / any_best[1] if any_best else 0.0
    any_factor = (
        (any_best[0] * ratios[any_best[3]][1])
        / (any_best[1] * ratios[any_best[3]][0])
        if any_best else 0.0
    )
    boundary_gap = (
        max(0, any_best[2] - (tail_start - 1))
        if any_best else alpha + 1
    )
    # The final fallback rewards flatness only after a ratio rebound exists.
    mode = max(range(len(poly)), key=poly.__getitem__)
    adjacent_after_mode = (
        poly[mode + 1] / poly[mode] if mode < alpha else 0.0)
    score = (
        1.0 if witness else 0.0,
        1.0 if legal_best else 0.0,
        legal_ratio,
        1.0 if any_best else 0.0,
        -float(boundary_gap),
        any_ratio,
        any_factor,
        adjacent_after_mode,
    )
    detail = {
        "alpha": alpha,
        "tail_start": tail_start,
        "first_descent_ratio_index": first_descent,
        "legal_rebound_ratio": legal_ratio,
        "legal_rebound_index": legal_best[2] if legal_best else -1,
        "legal_trough_index": legal_best[3] if legal_best else -1,
        "any_rebound_ratio": any_ratio,
        "any_rebound_factor": any_factor,
        "any_rebound_index": any_best[2] if any_best else -1,
        "any_trough_index": any_best[3] if any_best else -1,
        "boundary_gap": boundary_gap,
        "mode": mode,
        "adjacent_after_mode": adjacent_after_mode,
        "witness": witness,
    }
    return score, detail


def evaluate(spec: Spec) -> dict:
    poly = fast_poly(spec)
    score, detail = ratio_score(poly)
    return {
        "spec": spec,
        "n": bouquet_size(*spec),
        "score": score,
        "detail": detail,
        "poly": poly if detail["witness"] else None,
    }


def seed_specs(max_n: int) -> list[Spec]:
    specs: list[Spec] = []
    # Exact T_(3,m,n) lane containing the first n=26 LC failure.
    for m in range(2, 16):
        for n in range(m, 18):
            base = ((2,) * 3, (2,) * m, (2,) * n)
            candidates = [
                (base, (), 0),
                (((4, 2, 2), (2,) * m, (2,) * n), (), 0),
                (((3, 2, 2), (2,) * m, (2,) * n), (), 0),
                ((base + ((2, 2),)), (), 0),
            ]
            for spec in candidates:
                if bouquet_size(*spec) <= max_n:
                    specs.append(spec)
    # Repeated two-phase gadgets, plus mixed leg lengths.
    for arms in range(2, 14):
        for copies in range(2, 12):
            candidates = [
                ((tuple([(2,) * arms] * copies)), (), 0),
                ((tuple([(2,) * arms] * copies)
                  + (tuple([2] * arms + [3]),)), (), 0),
            ]
            for spec in candidates:
                if bouquet_size(*spec) <= max_n:
                    specs.append(spec)
    unique: dict[tuple, Spec] = {}
    for spec in specs:
        unique.setdefault(canon(spec), spec)
    return list(unique.values())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=800)
    parser.add_argument("--population", type=int, default=80)
    parser.add_argument("--generations", type=int, default=1500)
    parser.add_argument("--children", type=int, default=5)
    parser.add_argument("--seed", type=int, default=996)
    parser.add_argument("--output", type=Path,
                        default=Path("bouquet_ratio_evolution.json"))
    args = parser.parse_args()
    rng = random.Random(args.seed)

    seen: set[tuple] = set()
    initial: list[dict] = []
    for spec in seed_specs(args.max_n):
        key = canon(spec)
        if key in seen:
            continue
        seen.add(key)
        initial.append(evaluate(spec))
    initial.sort(key=lambda rec: rec["score"], reverse=True)
    population = initial[:args.population]
    tested = len(initial)
    started = time.time()
    archive: list[tuple[tuple[float, ...], int, dict]] = []

    for generation in range(args.generations):
        population.sort(key=lambda rec: rec["score"], reverse=True)
        champion = population[0]
        heapq.heappush(archive, (
            champion["score"], generation,
            {k: v for k, v in champion.items() if k != "poly"},
        ))
        if len(archive) > 50:
            heapq.heappop(archive)

        if champion["detail"]["witness"]:
            n, adj = bouquet_adj(*champion["spec"])
            edges = [(u, v) for u in range(n)
                     for v in adj[u] if u < v]
            result = {
                "tested": tested,
                "generation": generation,
                "n": n,
                "spec": champion["spec"],
                "label": spec_label(champion["spec"]),
                "edges": edges,
                "polynomial": champion["poly"],
                "exact_witness": champion["detail"]["witness"],
            }
            args.output.write_text(json.dumps(result, indent=2),
                                   encoding="utf-8")
            print("EXACT WITNESS", json.dumps(result), flush=True)
            return 0

        if generation % 25 == 0:
            d = champion["detail"]
            print(
                f"g={generation} tested={tested} n={champion['n']} "
                f"legal={d['legal_rebound_ratio']:.9f} "
                f"gap={d['boundary_gap']} "
                f"any={d['any_rebound_ratio']:.9f} "
                f"factor={d['any_rebound_factor']:.6f} "
                f"{spec_label(champion['spec'])} "
                f"elapsed={time.time()-started:.1f}s",
                flush=True,
            )

        pool = population[:max(8, args.population // 3)]
        children: list[dict] = []
        for parent in pool:
            for _ in range(args.children):
                child = parent["spec"]
                # Multi-step jumps are essential here: the harmless LC bump
                # often has to worsen before its index can move left.
                for _ in range(rng.randint(1, 12)):
                    child = mutate_spec(child, rng, args.max_n)
                key = canon(child)
                if key in seen:
                    continue
                seen.add(key)
                children.append(evaluate(child))
                tested += 1
        merged = sorted(population + children,
                        key=lambda rec: rec["score"], reverse=True)
        next_population = merged[:max(10, args.population // 2)]
        selected = {canon(rec["spec"]) for rec in next_population}
        # Preserve the best specimen in each bump-location bucket, even if its
        # current absolute ratio is temporarily poor.
        buckets: dict[tuple[int, int], dict] = {}
        for rec in merged:
            d = rec["detail"]
            bucket = (min(d["boundary_gap"], 20),
                      d["any_rebound_index"] - d["tail_start"])
            if bucket not in buckets:
                buckets[bucket] = rec
        for rec in buckets.values():
            key = canon(rec["spec"])
            if key not in selected and len(next_population) < args.population:
                selected.add(key)
                next_population.append(rec)
        remainder = [rec for rec in merged
                     if canon(rec["spec"]) not in selected]
        rng.shuffle(remainder)
        next_population.extend(
            remainder[:args.population - len(next_population)])
        population = next_population

    champion = max(population, key=lambda rec: rec["score"])
    result = {
        "parameters": vars(args) | {"output": str(args.output)},
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "witness": None,
        "champion": {k: v for k, v in champion.items() if k != "poly"},
        "archive": [entry[2] for entry in sorted(archive, reverse=True)],
    }
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result["champion"], indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
