#!/usr/bin/env python3
"""Search the 2026 pattern-tree family for ratio rebounds near the live prefix.

The ordinary valley scorer can be dominated by the almost-flat step directly
after a smooth mode.  A genuine mechanism for nonunimodality instead requires
an adjacent-coefficient ratio

    r_j = a_{j+1}/a_j

to rise after a previous post-mode trough.  Moreover, the decreasing-tail
theorem makes every rebound at or beyond

    L = floor((2 alpha + 1)/3)

harmless.  This program therefore records exact ratio rebounds and ranks
them first by whether they enter the live prefix j < L, then by their signed
distance j-L, and finally by the rebound ratio.

The polynomial family and its exact FLINT implementation are imported from
``pattern_family_valley_search.py``.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from flint import fmpz_poly as Poly

from pattern_family_valley_search import P2, X, spider


def ratio_gt(left: tuple[int, int], right: tuple[int, int]) -> bool:
    return left[0] * right[1] > right[0] * left[1]


def ratio_lt(left: tuple[int, int], right: tuple[int, int]) -> bool:
    return left[0] * right[1] < right[0] * left[1]


def ratio_record(
    ratio: tuple[int, int], index: int, trough: tuple[int, int, int]
) -> dict:
    num, den = ratio
    tnum, tden, tindex = trough
    return {
        "index": index,
        "trough_index": tindex,
        "numerator": num,
        "denominator": den,
        "difference": num - den,
        "decimal": num / den,
        "rise_factor_decimal": (num * tden) / (den * tnum),
    }


def rebound_profile(poly: Poly) -> dict:
    coefficients = [int(value) for value in poly]
    alpha = len(coefficients) - 1
    tail_start = (2 * alpha + 1) // 3
    ratios = [
        (coefficients[index + 1], coefficients[index])
        for index in range(alpha)
    ]
    first_descent = next(
        (
            index
            for index, (numerator, denominator) in enumerate(ratios)
            if numerator < denominator
        ),
        None,
    )
    first_ascent = None
    any_best = None
    prefix_best = None
    closest = None

    if first_descent is not None:
        trough = (*ratios[first_descent], first_descent)
        for index in range(first_descent + 1, alpha):
            ratio = ratios[index]
            if ratio_gt(ratio, trough[:2]):
                record = ratio_record(ratio, index, trough)
                if any_best is None or ratio_gt(
                    ratio,
                    (any_best["numerator"], any_best["denominator"]),
                ):
                    any_best = record
                if index < tail_start and (
                    prefix_best is None
                    or ratio_gt(
                        ratio,
                        (
                            prefix_best["numerator"],
                            prefix_best["denominator"],
                        ),
                    )
                ):
                    prefix_best = record
                if closest is None or index - tail_start < (
                    closest["index"] - tail_start
                ):
                    closest = record
                if first_ascent is None and ratio[0] > ratio[1]:
                    first_ascent = index
            if ratio_lt(ratio, trough[:2]):
                trough = (*ratio, index)

    return {
        "degree": alpha,
        "tail_start": tail_start,
        "first_descent": first_descent,
        "first_post_descent_ascent": first_ascent,
        "unimodal": first_ascent is None,
        "prefix_rebound": prefix_best,
        "closest_rebound": closest,
        "best_rebound": any_best,
    }


def better(record: dict, incumbent: dict | None) -> bool:
    if incumbent is None:
        return True
    profile = record["profile"]
    old_profile = incumbent["profile"]
    candidate = profile["prefix_rebound"] or profile["closest_rebound"]
    old = old_profile["prefix_rebound"] or old_profile["closest_rebound"]
    if candidate is None:
        return False
    if old is None:
        return True
    candidate_prefix = candidate["index"] < profile["tail_start"]
    old_prefix = old["index"] < old_profile["tail_start"]
    if candidate_prefix != old_prefix:
        return candidate_prefix
    candidate_gap = candidate["index"] - profile["tail_start"]
    old_gap = old["index"] - old_profile["tail_start"]
    if candidate_gap != old_gap:
        return candidate_gap < old_gap
    return ratio_gt(
        (candidate["numerator"], candidate["denominator"]),
        (old["numerator"], old["denominator"]),
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--k-min", type=int, default=1)
    parser.add_argument("--k-max", type=int, default=5)
    parser.add_argument("--n-min", type=int, default=1)
    parser.add_argument("--n-max", type=int, default=12)
    parser.add_argument("--ell-min", type=int, default=0)
    parser.add_argument("--ell-max", type=int, default=15)
    parser.add_argument("--m-min", type=int, default=1)
    parser.add_argument("--m-max", type=int, default=100)
    parser.add_argument("--degree-max", type=int, default=10_000)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    tested = 0
    rebound_count = 0
    prefix_rebound_count = 0
    champion = None
    spider_ell = [spider(ell) for ell in range(args.ell_max + 1)]
    p2_ell = [P2**ell for ell in range(args.ell_max + 1)]

    for k in range(args.k_min, args.k_max + 1):
        for n in range(args.n_min, args.n_max + 1):
            s_n = spider(n)
            s_n_k = s_n**k
            t_kn = s_n_k + X * P2 ** (k * n)
            t_power = Poly([1])
            s_power = Poly([1])
            for m in range(1, args.m_max + 1):
                t_power *= t_kn
                s_power *= s_n_k
                if m < args.m_min:
                    continue
                for ell in range(args.ell_min, args.ell_max + 1):
                    degree = k * (n + 1) * m + ell + 1
                    if degree > args.degree_max:
                        continue
                    poly = (
                        spider_ell[ell] * t_power
                        + X * p2_ell[ell] * s_power
                    )
                    profile = rebound_profile(poly)
                    tested += 1
                    rebound_count += int(profile["best_rebound"] is not None)
                    prefix_rebound_count += int(
                        profile["prefix_rebound"] is not None
                    )
                    record = {
                        "parameters": {
                            "k": k,
                            "n": n,
                            "ell": ell,
                            "m": m,
                        },
                        "profile": profile,
                    }
                    if better(record, champion):
                        champion = record
                    if not profile["unimodal"]:
                        witness_indices = {
                            profile["first_descent"],
                            profile["first_descent"] + 1,
                            profile["first_post_descent_ascent"],
                            profile["first_post_descent_ascent"] + 1,
                        }
                        record["witness_coefficients"] = {
                            str(index): int(poly[index])
                            for index in sorted(witness_indices)
                        }
                        payload = {
                            "status": "counterexample",
                            "tested": tested,
                            "elapsed_seconds": time.time() - started,
                            "witness": record,
                        }
                        args.output.write_text(
                            json.dumps(payload, indent=2),
                            encoding="utf-8",
                        )
                        print(json.dumps(payload, indent=2), flush=True)
                        return 1

            current = None
            if champion is not None:
                current = (
                    champion["profile"]["prefix_rebound"]
                    or champion["profile"]["closest_rebound"]
                )
            gap = (
                None
                if current is None
                else current["index"] - champion["profile"]["tail_start"]
            )
            print(
                f"k={k} n={n} tested={tested:,} "
                f"rebounds={rebound_count:,} "
                f"prefix={prefix_rebound_count:,} champion_gap={gap}",
                flush=True,
            )
            checkpoint = {
                "status": "running",
                "exact_arithmetic": True,
                "tested": tested,
                "rebound_count": rebound_count,
                "prefix_rebound_count": prefix_rebound_count,
                "elapsed_seconds": time.time() - started,
                "completed_through": {"k": k, "n": n},
                "ranges": {
                    "k": [args.k_min, args.k_max],
                    "n": [args.n_min, args.n_max],
                    "ell": [args.ell_min, args.ell_max],
                    "m": [args.m_min, args.m_max],
                    "degree_max": args.degree_max,
                },
                "champion": champion,
            }
            args.output.write_text(
                json.dumps(checkpoint, indent=2),
                encoding="utf-8",
            )

    payload = {
        "status": "no_counterexample",
        "exact_arithmetic": True,
        "tested": tested,
        "rebound_count": rebound_count,
        "prefix_rebound_count": prefix_rebound_count,
        "elapsed_seconds": time.time() - started,
        "ranges": {
            "k": [args.k_min, args.k_max],
            "n": [args.n_min, args.n_max],
            "ell": [args.ell_min, args.ell_max],
            "m": [args.m_min, args.m_max],
            "degree_max": args.degree_max,
        },
        "champion": champion,
    }
    args.output.write_text(
        json.dumps(payload, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(payload, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
