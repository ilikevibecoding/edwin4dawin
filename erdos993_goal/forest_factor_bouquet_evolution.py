#!/usr/bin/env python3
"""Evolve an explicit tree factor that makes the certified forest nonunimodal.

The fixed component is the 102-vertex perfect-matching tree from
``verify_perfect_matching_lc_failure.py``.  Candidate second components use
the broad spider-bouquet grammar in the public search repository.  Fitness is
the exact valley ratio of the product polynomial, which is the independence
polynomial of their disjoint union.
"""

from __future__ import annotations

import argparse
import heapq
import json
import random
import sys
import time
from collections import Counter
from pathlib import Path

from flint import fmpz_poly as Poly

HERE = Path(__file__).resolve().parent
PUBLIC = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(PUBLIC))
sys.path.insert(0, str(HERE))

from scripts.valley_search import (  # noqa: E402
    SWEEPS,
    _gadget_polys,
    _path_poly,
    bouquet_poly,
    bouquet_size,
    canon,
    mutate_spec,
    spec_label,
)
from verify_perfect_matching_lc_failure import decorated_polynomial  # noqa: E402
from verify_strong_lc_32_tree import EXPECTED as STRONG_LC_32  # noqa: E402


FIXED = Poly(decorated_polynomial())
FIXED_ORDER = 102
X = Poly([0, 1])
ONE_PLUS_X = Poly([1, 1])


def fast_bouquet_poly(spec) -> list[int]:
    """The public bouquet recurrence, grouped and evaluated in FLINT."""

    gadgets, paths, leaves = spec
    root_excluded = Poly([1])
    root_included = Poly([1])
    for legs, multiplicity in Counter(gadgets).items():
        excluded, included = _gadget_polys(legs)
        root_excluded *= (Poly(excluded) + Poly(included)) ** multiplicity
        root_included *= Poly(excluded) ** multiplicity
    for length, multiplicity in Counter(paths).items():
        root_excluded *= Poly(_path_poly(length)) ** multiplicity
        root_included *= Poly(_path_poly(length - 1)) ** multiplicity
    if leaves:
        root_excluded *= ONE_PLUS_X**leaves
    return [int(c) for c in root_excluded + X * root_included]


def rebound_profile(coefficients: list[int]) -> dict:
    """Score only ratios strictly after the first downward step."""

    first_descent = next(
        (
            j
            for j in range(len(coefficients) - 1)
            if coefficients[j + 1] < coefficients[j]
        ),
        None,
    )
    if first_descent is None:
        return {
            "ratio": 0.0,
            "pos": -1,
            "rise_pos": -1,
            "first_descent": None,
            "witness": False,
        }
    best_num = 0
    best_den = 1
    best_index = -1
    first_reascent = None
    for j in range(first_descent + 1, len(coefficients) - 1):
        numerator = coefficients[j + 1]
        denominator = coefficients[j]
        if numerator * best_den > best_num * denominator:
            best_num = numerator
            best_den = denominator
            best_index = j
        if first_reascent is None and numerator > denominator:
            first_reascent = j
    return {
        "ratio": best_num / best_den if best_index >= 0 else 0.0,
        "pos": best_index,
        "rise_pos": first_reascent if first_reascent is not None else -1,
        "first_descent": first_descent,
        "witness": first_reascent is not None,
    }


def evaluate(spec) -> dict:
    factor = fast_bouquet_poly(spec)
    product = [int(c) for c in FIXED * Poly(factor)]
    valley = rebound_profile(product)
    return {
        "spec": [[list(g) for g in spec[0]], list(spec[1]), spec[2]],
        "label": spec_label(spec),
        "factor_order": bouquet_size(*spec),
        "factor_degree": len(factor) - 1,
        "forest_order": FIXED_ORDER + bouquet_size(*spec),
        "forest_degree": len(product) - 1,
        "valley": valley,
        "factor_polynomial": factor if valley["witness"] else None,
        "forest_polynomial": product if valley["witness"] else None,
    }


def restore(record: dict):
    raw = record["spec"]
    return tuple(tuple(g) for g in raw[0]), tuple(raw[1]), raw[2]


def fitness(record: dict) -> float:
    return float(record["valley"]["ratio"])


def main() -> int:
    global FIXED, FIXED_ORDER

    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=700)
    parser.add_argument("--generations", type=int, default=300)
    parser.add_argument("--population", type=int, default=64)
    parser.add_argument("--children", type=int, default=12)
    parser.add_argument("--seed", type=int, default=993102)
    parser.add_argument(
        "--base",
        choices=("perfect_matching_102", "strong_lc_32"),
        default="perfect_matching_102",
    )
    parser.add_argument("--sweeps", default="ABCD")
    parser.add_argument("--galvin-seed-m", type=int, default=0)
    parser.add_argument("--galvin-seed-t", type=int, default=12)
    parser.add_argument(
        "--sweep-limit",
        type=int,
        default=2_000,
        help="Maximum retained seed evaluations from each named sweep.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("forest_factor_bouquet_evolution.json"),
    )
    args = parser.parse_args()
    if args.base == "strong_lc_32":
        FIXED = Poly(STRONG_LC_32)
        FIXED_ORDER = 32

    rng = random.Random(args.seed)
    seen = set()
    heap: list[tuple[float, int, dict]] = []
    serial = 0
    tested = 0
    started = time.time()

    def retain(record: dict) -> None:
        nonlocal serial
        serial += 1
        item = (fitness(record), serial, record)
        if len(heap) < args.population:
            heapq.heappush(heap, item)
        elif item[0] > heap[0][0]:
            heapq.heapreplace(heap, item)

    witness = None
    if args.galvin_seed_m:
        seed_spec = (
            tuple(
                (2,) * args.galvin_seed_t
                for _ in range(args.galvin_seed_m)
            ),
            (),
            0,
        )
        seen.add(canon(seed_spec))
        seed_record = evaluate(seed_spec)
        tested += 1
        if seed_record["valley"]["witness"]:
            witness = seed_record
        else:
            retain(seed_record)
        print(
            f"galvin_seed m={args.galvin_seed_m} t={args.galvin_seed_t} "
            f"ratio={seed_record['valley']['ratio']:.12f}",
            flush=True,
        )
    for name in args.sweeps:
        checked = 0
        for spec in SWEEPS[name](args.max_n):
            if checked >= args.sweep_limit:
                break
            key = canon(spec)
            if key in seen:
                continue
            seen.add(key)
            record = evaluate(spec)
            checked += 1
            tested += 1
            if record["valley"]["witness"]:
                witness = record
                break
            retain(record)
        print(f"sweep={name} checked={checked}", flush=True)
        if witness:
            break

    population = [item[2] for item in sorted(heap, reverse=True)]
    for generation in range(args.generations):
        if witness:
            break
        children = []
        elite = population[: max(4, args.population // 3)]
        for parent in elite:
            spec = restore(parent)
            for _ in range(args.children):
                child_spec = mutate_spec(spec, rng, args.max_n)
                key = canon(child_spec)
                if key in seen:
                    continue
                seen.add(key)
                child = evaluate(child_spec)
                tested += 1
                if child["valley"]["witness"]:
                    witness = child
                    break
                children.append(child)
            if witness:
                break
        population = sorted(
            population + children, key=fitness, reverse=True
        )[: args.population]
        if generation % 10 == 0 and population:
            top = population[0]
            print(
                f"generation={generation} tested={tested} "
                f"ratio={fitness(top):.12f} "
                f"pos={top['valley']['pos']} "
                f"factor_n={top['factor_order']} {top['label']}",
                flush=True,
            )

    champion = witness or (population[0] if population else None)
    payload = {
        "status": "counterexample" if witness else "no_counterexample",
        "parameters": vars(args) | {"output": str(args.output)},
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "champion": champion,
    }
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "status": payload["status"],
                "tested": tested,
                "elapsed_seconds": payload["elapsed_seconds"],
                "champion": champion,
                "output": str(args.output),
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
