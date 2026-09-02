#!/usr/bin/env python3
"""Convolve the 102-vertex non-LC tree with exact Galvin-tree factors.

The factor

    G(m,t) = ((1+2x)^t + x(1+x)^t)^m + x(1+2x)^(mt)

is the independence polynomial of the Galvin tree consisting of a root
joined to ``m`` copies of a subdivided ``t``-leaf star.  Consequently
``A(x) G(m,t)`` is the independence polynomial of an explicit two-component
forest, where A is the certified 102-vertex perfect-matching tree.

Every coefficient comparison is exact; decimals are only for ranking.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from flint import fmpz_poly as Poly

from pattern_family_valley_search import profile
from verify_perfect_matching_lc_failure import decorated_polynomial
from verify_strong_lc_32_tree import EXPECTED as STRONG_LC_32


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])
P1 = Poly([1, 1])
P2 = Poly([1, 2])

def better(left: dict, right: dict | None) -> bool:
    if right is None:
        return True
    lratio = left["profile"]["best_post_descent_ratio"]
    rratio = right["profile"]["best_post_descent_ratio"]
    if lratio is None:
        return False
    if rratio is None:
        return True
    return (
        lratio["numerator"] * rratio["denominator"]
        > rratio["numerator"] * lratio["denominator"]
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--t-min", type=int, default=2)
    parser.add_argument("--t-max", type=int, default=40)
    parser.add_argument("--m-min", type=int, default=1)
    parser.add_argument("--m-max", type=int, default=300)
    parser.add_argument(
        "--m-step",
        type=int,
        default=1,
        help="Profile only m congruent to m-min modulo this step.",
    )
    parser.add_argument(
        "--base",
        choices=("perfect_matching_102", "strong_lc_32"),
        default="perfect_matching_102",
    )
    parser.add_argument("--degree-max", type=int, default=15_000)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("forest_factor_galvin_search.json"),
    )
    args = parser.parse_args()

    if args.base == "perfect_matching_102":
        fixed = Poly(decorated_polynomial())
        base_order = 102
    else:
        fixed = Poly(STRONG_LC_32)
        base_order = 32
    base_degree = len(fixed) - 1
    champion = None
    tested = 0
    started = time.time()

    for t in range(args.t_min, args.t_max + 1):
        q = P2**t
        s = q + X * P1**t
        # Jump straight to the requested lower endpoint.  Building every
        # unused prefix power is prohibitively expensive when a narrow exact
        # refinement window starts at a large m.
        s_power = s ** (args.m_min - 1)
        q_power = q ** (args.m_min - 1)
        for m in range(args.m_min, args.m_max + 1):
            s_power *= s
            q_power *= q
            if (m - args.m_min) % args.m_step:
                continue
            degree = base_degree + m * (t + 1)
            if degree > args.degree_max:
                break
            factor = s_power + X * q_power
            forest = fixed * factor
            result = profile(forest)
            tested += 1
            record = {
                "parameters": {"m": m, "t": t},
                "base": args.base,
                "factor_degree": len(factor) - 1,
                "forest_degree": len(forest) - 1,
                "forest_order": base_order + 1 + m * (1 + 2 * t),
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
        ratio = champion["profile"]["best_post_descent_ratio"]
        print(
            f"t={t} tested={tested} champion="
            f"{ratio['decimal']:.12f} at {champion['parameters']}",
            flush=True,
        )

    payload = {
        "status": "no_counterexample",
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "ranges": {
            "t": [args.t_min, args.t_max],
            "m": [args.m_min, args.m_max],
            "m_step": args.m_step,
            "degree_max": args.degree_max,
            "base": args.base,
        },
        "champion": champion,
    }
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
