#!/usr/bin/env python3
"""Free-form evolutionary falsification search for the forest 2SB inequality.

Unlike ``bouquet_parity_search.py``, this search mutates arbitrary fixed-order
trees by leaf moves, prune-and-regraft operations, pendant concentration, and
degree-two relocation.  Every prospective witness is checked with exact
integer arithmetic.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from copy import deepcopy
from pathlib import Path

PUBLIC_REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(PUBLIC_REPO))

from indpoly import independence_poly  # noqa: E402
from nm_optimizer import (  # noqa: E402
    _adj_fingerprint,
    _random_tree,
    _validate_tree,
    generate_seeds,
    mutate,
)


def exact_margin(
    poly: list[int],
    min_index: int,
    ranking: str,
    scope: str,
    extension_offset: int = 2,
    inequality: str = "two-step",
) -> dict:
    best = None
    alpha = len(poly) - 1
    tail_start = (2 * alpha + 1) // 3
    last_r = len(poly) - 4
    if scope == "prefix":
        last_r = min(last_r, tail_start - 2)
    for r in range(min_index, last_r + 1):
        if inequality == "two-step":
            left = (r + 3) * poly[r + 3] * poly[r]
            right = (
                (r + 1) * poly[r + 1] + extension_offset * poly[r]
            ) * poly[r + 2]
            additive_denominator = poly[r] * poly[r + 2]
        elif inequality == "ordered-lc":
            left = (r + 2) * poly[r + 2] * poly[r]
            right = (
                (r + 1) * poly[r + 1] * poly[r + 1]
                + extension_offset * poly[r] * poly[r + 1]
            )
            additive_denominator = poly[r] * poly[r + 1]
        else:
            raise ValueError(f"unknown inequality: {inequality}")
        if right == 0:
            continue
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
        candidate["ranking_score"] = (
            candidate["additive_gap"]
            if ranking == "additive-gap"
            else candidate["ratio"]
        )
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
        "ranking_score": -1.0 if ranking == "additive-gap" else 0.0,
    }
    result["scope"] = scope
    result["tail_start"] = tail_start
    result["last_tested_r"] = last_r
    return result


def evaluate(
    adj: list[list[int]],
    min_index: int,
    ranking: str,
    scope: str,
    extension_offset: int,
    inequality: str,
) -> dict:
    poly = independence_poly(len(adj), adj)
    return {
        "margin": exact_margin(
            poly,
            min_index,
            ranking,
            scope,
            extension_offset,
            inequality,
        ),
        "alpha": len(poly) - 1,
        "polynomial": poly,
    }


def edge_list(adj: list[list[int]]) -> list[list[int]]:
    return [
        [u, v]
        for u, neighbors in enumerate(adj)
        for v in neighbors
        if u < v
    ]


def record(
    adj: list[list[int]],
    label: str,
    generation: int,
    min_index: int,
    ranking: str,
    scope: str,
    extension_offset: int,
    inequality: str,
) -> dict:
    result = evaluate(
        adj,
        min_index,
        ranking,
        scope,
        extension_offset,
        inequality,
    )
    return {
        "adj": adj,
        "fingerprint": _adj_fingerprint(adj),
        "label": label,
        "generation": generation,
        **result,
    }


def ratio(item: dict) -> float:
    return item["margin"]["ranking_score"]


def compact(item: dict, include_certificate: bool = False) -> dict:
    result = {
        "order": len(item["adj"]),
        "alpha": item["alpha"],
        "label": item["label"],
        "generation": item["generation"],
        "margin": item["margin"],
        "edges": edge_list(item["adj"]),
    }
    if include_certificate:
        result["polynomial"] = item["polynomial"]
    return result


def dedupe(items: list[dict], limit: int) -> list[dict]:
    best: dict[str, dict] = {}
    for item in items:
        incumbent = best.get(item["fingerprint"])
        if incumbent is None or ratio(item) > ratio(incumbent):
            best[item["fingerprint"]] = item
    return sorted(best.values(), key=ratio, reverse=True)[:limit]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=200)
    parser.add_argument("--population", type=int, default=48)
    parser.add_argument("--generations", type=int, default=300)
    parser.add_argument("--children-per-parent", type=int, default=10)
    parser.add_argument("--min-index", type=int, default=3)
    parser.add_argument(
        "--extension-offset",
        type=int,
        default=2,
        help=(
            "Test mu[k+2] <= mu[k] + offset.  Use 0 for parity "
            "monotonicity and 2 for the original sign-propagation bound."
        ),
    )
    parser.add_argument(
        "--inequality",
        choices=("two-step", "ordered-lc"),
        default="two-step",
        help=(
            "Choose the two-rank extension inequality or adjacent ordered "
            "log-concavity.  For strict ordered log-concavity use "
            "--inequality ordered-lc --extension-offset 0."
        ),
    )
    parser.add_argument(
        "--ranking",
        choices=("ratio", "additive-gap"),
        default="additive-gap",
    )
    parser.add_argument(
        "--scope",
        choices=("prefix", "all"),
        default="prefix",
    )
    parser.add_argument("--seed", type=int, default=9932407)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("two_step_freeform_search.json"),
    )
    args = parser.parse_args()

    if args.order < 4:
        raise ValueError("--order must be at least 4")
    rng = random.Random(args.seed)
    started = time.time()
    tested = 0

    population = []
    for n, adj, label in generate_seeds(
        args.order, args.population * 2, rng
    ):
        if n != args.order:
            continue
        item = record(
            adj,
            label,
            0,
            args.min_index,
            args.ranking,
            args.scope,
            args.extension_offset,
            args.inequality,
        )
        tested += 1
        if item["margin"]["difference"] > 0:
            args.output.write_text(
                json.dumps(
                    {
                        "status": "counterexample",
                        "tested": tested,
                        "witness": compact(item, True),
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )
            print("EXACT 2SB FAILURE", flush=True)
            print(json.dumps(compact(item, True), indent=2), flush=True)
            return 1
        population.append(item)

    while len(population) < args.population:
        adj = _random_tree(args.order, rng)
        population.append(
            record(
                adj,
                f"extra_random_{len(population)}",
                0,
                args.min_index,
                args.ranking,
                args.scope,
                args.extension_offset,
                args.inequality,
            )
        )
        tested += 1
    population = dedupe(population, args.population)

    for generation in range(1, args.generations + 1):
        elite_count = max(4, args.population // 3)
        children = []
        for parent in population[:elite_count]:
            for child_number in range(args.children_per_parent):
                adj = deepcopy(parent["adj"])
                for _ in range(rng.randint(1, 3)):
                    _, adj = mutate(args.order, adj, rng)
                if not _validate_tree(args.order, adj):
                    continue
                child = record(
                    adj,
                    f"g{generation}_p{child_number}",
                    generation,
                    args.min_index,
                    args.ranking,
                    args.scope,
                    args.extension_offset,
                    args.inequality,
                )
                tested += 1
                if child["margin"]["difference"] > 0:
                    payload = {
                        "status": "counterexample",
                        "parameters": vars(args) | {
                            "output": str(args.output)
                        },
                        "tested": tested,
                        "elapsed_seconds": time.time() - started,
                        "witness": compact(child, True),
                    }
                    args.output.write_text(
                        json.dumps(payload, indent=2), encoding="utf-8"
                    )
                    print("EXACT 2SB FAILURE", flush=True)
                    print(json.dumps(payload["witness"], indent=2), flush=True)
                    return 1
                children.append(child)

        for injection in range(max(2, args.population // 8)):
            adj = _random_tree(args.order, rng)
            children.append(
                record(
                    adj,
                    f"g{generation}_inject{injection}",
                    generation,
                    args.min_index,
                    args.ranking,
                    args.scope,
                    args.extension_offset,
                    args.inequality,
                )
            )
            tested += 1

        population = dedupe(population + children, args.population)
        if generation == 1 or generation % 10 == 0:
            champion = population[0]
            print(
                f"generation={generation} tested={tested} "
                f"score={ratio(champion):.12g} "
                f"r={champion['margin']['r']} "
                f"alpha={champion['alpha']}",
                flush=True,
            )

    payload = {
        "status": "no_failure",
        "parameters": vars(args) | {"output": str(args.output)},
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "champions": [compact(item) for item in population[:10]],
        "scope_note": "Finite exact falsification search, not a proof.",
    }
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
