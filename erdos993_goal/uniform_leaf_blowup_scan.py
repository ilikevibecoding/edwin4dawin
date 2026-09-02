#!/usr/bin/env python3
"""Scan uniform leaf blow-ups of non-log-concave trees for nonunimodality.

If G has n vertices and independence polynomial P(x)=sum a_k x^k, attach
r new leaves to every vertex of G.  The result is again a tree and

    I(G circle rK_1;x)
      = sum_k a_k x^k (1+x)^(r(n-k)).

For r >= 2 it is also homeomorphically irreducible: every old vertex has
degree at least three and every new vertex is a leaf.  Thus a failure found
here would be a particularly clean finite counterexample to Erdos 993.
"""

from __future__ import annotations

import argparse
import json
import time
from math import comb
from pathlib import Path

from verify_galvin_ts_failure import closed_form as galvin_polynomial
from verify_strong_lc_32_tree import EXPECTED as STRONG32


def leaf_blowup(poly: list[int], order: int, leaves: int) -> list[int]:
    degree = leaves * order
    out = [0] * (degree + 1)
    for k, value in enumerate(poly):
        exponent = leaves * (order - k)
        for j in range(exponent + 1):
            out[k + j] += value * comb(exponent, j)
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def first_rebound(poly: list[int]) -> dict | None:
    descended = False
    first_descent = None
    for k in range(len(poly) - 1):
        if poly[k + 1] < poly[k]:
            if first_descent is None:
                first_descent = k
            descended = True
        elif descended and poly[k + 1] > poly[k]:
            return {
                "first_descent": first_descent,
                "rebound_at": k,
                "window_start": max(0, k - 3),
                "window": poly[max(0, k - 3) : min(len(poly), k + 5)],
            }
    return None


def ratio_margin(poly: list[int]) -> dict:
    """Largest post-first-descent adjacent ratio, as an exact comparison."""
    first_descent = next(
        (
            k
            for k in range(len(poly) - 1)
            if poly[k + 1] < poly[k]
        ),
        len(poly) - 1,
    )
    best_k = first_descent
    best_num = 0
    best_den = 1
    for k in range(first_descent, len(poly) - 1):
        num, den = poly[k + 1], poly[k]
        if num * best_den > best_num * den:
            best_k, best_num, best_den = k, num, den
    return {
        "first_descent": first_descent,
        "best_post_descent_k": best_k,
        "best_ratio_numerator": best_num,
        "best_ratio_denominator": best_den,
        "best_ratio_float": best_num / best_den if best_den else 0.0,
    }


def bases() -> list[dict]:
    result = [
        {
            "name": "strong32",
            "order": 32,
            "polynomial": list(STRONG32),
        }
    ]
    for m, t in ((4, 4), (8, 6), (14, 8), (20, 10)):
        result.append(
            {
                "name": f"galvin_m{m}_t{t}",
                "order": 1 + m + 2 * m * t,
                "polynomial": galvin_polynomial(m, t),
            }
        )
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-leaves", type=int, default=100)
    parser.add_argument("--step", type=int, default=1)
    parser.add_argument(
        "--base",
        action="append",
        default=[],
        help="base name to scan (repeatable; default scans all)",
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    started = time.time()

    rows = []
    failure = None
    selected = [
        base
        for base in bases()
        if not args.base or base["name"] in set(args.base)
    ]
    if not selected:
        raise ValueError(f"no matching base in {args.base!r}")
    for base in selected:
        print(
            f"{base['name']}: n={base['order']} alpha="
            f"{len(base['polynomial']) - 1}",
            flush=True,
        )
        closest = None
        for r in range(1, args.max_leaves + 1, args.step):
            poly = leaf_blowup(base["polynomial"], base["order"], r)
            rebound = first_rebound(poly)
            margin = ratio_margin(poly)
            candidate = {
                "leaves_per_vertex": r,
                "new_order": base["order"] * (r + 1),
                "new_alpha": len(poly) - 1,
                **margin,
            }
            if (
                closest is None
                or candidate["best_ratio_numerator"]
                * closest["best_ratio_denominator"]
                > closest["best_ratio_numerator"]
                * candidate["best_ratio_denominator"]
            ):
                closest = candidate
            if rebound is not None:
                failure = {
                    "base": {
                        key: value
                        for key, value in base.items()
                        if key != "polynomial"
                    },
                    "leaves_per_vertex": r,
                    "new_order": base["order"] * (r + 1),
                    "new_polynomial": poly,
                    **rebound,
                }
                break
        rows.append(
            {
                "base": {
                    key: value
                    for key, value in base.items()
                    if key != "polynomial"
                },
                "closest_post_descent_ratio": closest,
            }
        )
        print(
            f"  closest={closest['best_ratio_float']:.12f} "
            f"at r={closest['leaves_per_vertex']}, "
            f"k={closest['best_post_descent_k']}",
            flush=True,
        )
        if failure is not None:
            break

    payload = {
        "status": "counterexample" if failure else "no_rebound",
        "parameters": vars(args) | {"out": str(args.out)},
        "rows": rows,
        "failure": failure,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
