#!/usr/bin/env python3
"""Exact local perturbations of the dangerous Galvin forest factor.

Start with m copies of the t-legged length-two spider.  Replace ``r`` of
them by spiders with ``s`` additional length-one legs, and optionally attach
``ell`` leaves to the bouquet root.  The polynomial is evaluated from a
closed grouped formula in FLINT and multiplied by the certified 102-vertex
component.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from flint import fmpz_poly as Poly

from verify_perfect_matching_lc_failure import decorated_polynomial


X = Poly([0, 1])
P1 = Poly([1, 1])
P2 = Poly([1, 2])
FIXED = Poly(decorated_polynomial())


def valley_profile(poly: Poly) -> dict:
    a = list(poly)
    first_descent = next(
        (j for j in range(len(a) - 1) if a[j + 1] < a[j]), None
    )
    best = None
    first_reascent = None
    if first_descent is not None:
        for j in range(first_descent + 1, len(a) - 1):
            numerator = a[j + 1]
            denominator = a[j]
            if (
                best is None
                or numerator * best["denominator"]
                > best["numerator"] * denominator
            ):
                best = {
                    "index": j,
                    "numerator": int(numerator),
                    "denominator": int(denominator),
                    "difference": int(numerator - denominator),
                    "ratio": int(numerator) / int(denominator),
                }
            if first_reascent is None and numerator > denominator:
                first_reascent = j
    return {
        "degree": len(a) - 1,
        "first_descent": first_descent,
        "first_reascent": first_reascent,
        "unimodal": first_reascent is None,
        "best_post_descent": best,
    }


def factor_polynomial(
    m: int, t: int, replacements: int, extra_short_legs: int, leaves: int
) -> Poly:
    standard_excluded = P2**t
    standard_total = standard_excluded + X * P1**t
    mutant_excluded = standard_excluded * P1**extra_short_legs
    mutant_total = mutant_excluded + X * P1**t
    ordinary = m - replacements
    root_excluded = (
        standard_total**ordinary
        * mutant_total**replacements
        * P1**leaves
    )
    root_included = (
        standard_excluded**ordinary
        * mutant_excluded**replacements
    )
    return root_excluded + X * root_included


def better(record: dict, champion: dict | None) -> bool:
    if champion is None:
        return True
    left = record["profile"]["best_post_descent"]
    right = champion["profile"]["best_post_descent"]
    if left is None:
        return False
    if right is None:
        return True
    return (
        left["numerator"] * right["denominator"]
        > right["numerator"] * left["denominator"]
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--m", type=int, default=408)
    parser.add_argument("--t", type=int, default=12)
    parser.add_argument("--r-min", type=int, default=0)
    parser.add_argument("--r-max", type=int, default=20)
    parser.add_argument("--s-min", type=int, default=1)
    parser.add_argument("--s-max", type=int, default=3)
    parser.add_argument("--leaves-min", type=int, default=0)
    parser.add_argument("--leaves-max", type=int, default=5)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("forest_factor_local_perturbation_search.json"),
    )
    args = parser.parse_args()

    champion = None
    tested = 0
    started = time.time()
    for short_legs in range(args.s_min, args.s_max + 1):
        for replacements in range(args.r_min, args.r_max + 1):
            if replacements > args.m:
                continue
            for leaves in range(args.leaves_min, args.leaves_max + 1):
                factor = factor_polynomial(
                    args.m,
                    args.t,
                    replacements,
                    short_legs,
                    leaves,
                )
                forest = FIXED * factor
                result = valley_profile(forest)
                tested += 1
                record = {
                    "parameters": {
                        "m": args.m,
                        "t": args.t,
                        "replacements": replacements,
                        "extra_short_legs": short_legs,
                        "root_leaves": leaves,
                    },
                    "factor_order": (
                        1
                        + args.m * (1 + 2 * args.t)
                        + replacements * short_legs
                        + leaves
                    ),
                    "profile": result,
                }
                if better(record, champion):
                    champion = record
                if not result["unimodal"]:
                    record["factor_polynomial"] = [int(c) for c in factor]
                    record["forest_polynomial"] = [int(c) for c in forest]
                    payload = {
                        "status": "counterexample",
                        "tested": tested,
                        "elapsed_seconds": time.time() - started,
                        "witness": record,
                    }
                    args.output.write_text(
                        json.dumps(payload, indent=2), encoding="utf-8"
                    )
                    print(json.dumps(payload, indent=2), flush=True)
                    return 1
        ratio = champion["profile"]["best_post_descent"]["ratio"]
        print(
            f"extra_short_legs={short_legs} tested={tested} "
            f"champion={ratio:.15f} at {champion['parameters']}",
            flush=True,
        )

    payload = {
        "status": "no_counterexample",
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "ranges": {
            "m": args.m,
            "t": args.t,
            "replacements": [args.r_min, args.r_max],
            "extra_short_legs": [args.s_min, args.s_max],
            "root_leaves": [args.leaves_min, args.leaves_max],
        },
        "champion": champion,
    }
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
