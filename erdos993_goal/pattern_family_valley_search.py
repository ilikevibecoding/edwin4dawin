#!/usr/bin/env python3
"""Exact valley search in the Bautista-Ramos--Guillen-Galvan--Gomez-Salgado
pattern-tree family.

For nonnegative integers k,n,l,m, Theorem 5 of

  C. Bautista-Ramos, C. Guillen-Galvan, and P. Gomez-Salgado,
  "Linear Recurrences for Non-Log-Concave Independence Polynomials of
  Trees", Graphs and Combinatorics 42 (2026), article 59

gives the following independence polynomial for the tree
(T_{1,l}:S_{2,n})_k^(m):

  U(k,n,l,m)
    = S_l T_{k,n}^m + x (1+2x)^l S_n^(km),

where

  S_t       = (1+2x)^t + x(1+x)^t,
  T_{k,n}   = S_n^k + x(1+2x)^(kn).

The paper uses members of this family with up to five consecutive failures
of log concavity.  This program asks the stronger, directly relevant
question: does any tested member have a coefficient descent followed by a
later ascent?

All polynomial arithmetic and all comparisons are exact.  python-flint is
used so that examples of degree several thousand are inexpensive.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from flint import fmpz_poly as Poly


X = Poly([0, 1])
P1 = Poly([1, 1])
P2 = Poly([1, 2])


def spider(t: int) -> Poly:
    """Return S_{2,t}."""
    return P2**t + X * P1**t


def pattern_poly(k: int, n: int, ell: int, m: int) -> Poly:
    """Return U(k,n,ell,m), exactly."""
    s_n = spider(n)
    t_kn = s_n**k + X * P2 ** (k * n)
    return spider(ell) * t_kn**m + X * P2**ell * s_n ** (k * m)


def profile(poly: Poly, track_lc: bool = False) -> dict:
    """Return exact unimodality and closest post-descent rebound data."""
    a = list(poly)
    first_descent = next(
        (j for j in range(len(a) - 1) if a[j + 1] < a[j]),
        None,
    )
    if first_descent is None:
        return {
            "degree": len(a) - 1,
            "first_descent": None,
            "unimodal": True,
            "best_post_descent_ratio": None,
            "log_concavity_failure_count": 0,
            "log_concavity_failures": [],
        }

    best_num = 0
    best_den = 1
    best_index = None
    first_reascent = None
    # The ratio at ``first_descent`` is below one by definition and can be
    # arbitrarily close to one merely because a smooth mode lies between two
    # lattice points.  A counterexample requires a later ratio to exceed one,
    # so rank candidates only after that first downward step.
    for j in range(first_descent + 1, len(a) - 1):
        num, den = a[j + 1], a[j]
        if num * best_den > best_num * den:
            best_num, best_den, best_index = num, den, j
        if first_reascent is None and num > den:
            first_reascent = j

    lc_failures = (
        [
            j
            for j in range(1, len(a) - 1)
            if a[j] * a[j] < a[j - 1] * a[j + 1]
        ]
        if track_lc
        else []
    )
    return {
        "degree": len(a) - 1,
        "first_descent": first_descent,
        "first_reascent": first_reascent,
        "unimodal": first_reascent is None,
        "best_post_descent_ratio": {
            "index": best_index,
            "numerator": int(best_num),
            "denominator": int(best_den),
            "difference": int(best_num - best_den),
            "decimal": int(best_num) / int(best_den),
        },
        "log_concavity_failure_count": len(lc_failures),
        "log_concavity_failures": lc_failures,
    }


def better(candidate: dict, incumbent: dict | None) -> bool:
    if incumbent is None:
        return True
    c = candidate["best_post_descent_ratio"]
    b = incumbent["profile"]["best_post_descent_ratio"]
    if c is None:
        return False
    if b is None:
        return True
    return c["numerator"] * b["denominator"] > b["numerator"] * c[
        "denominator"
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--k-min", type=int, default=1)
    parser.add_argument("--k-max", type=int, default=5)
    parser.add_argument("--n-min", type=int, default=1)
    parser.add_argument("--n-max", type=int, default=16)
    parser.add_argument("--ell-min", type=int, default=0)
    parser.add_argument("--ell-max", type=int, default=20)
    parser.add_argument("--m-min", type=int, default=1)
    parser.add_argument("--m-max", type=int, default=250)
    parser.add_argument("--degree-max", type=int, default=20_000)
    parser.add_argument(
        "--track-lc",
        action="store_true",
        help="Also locate every log-concavity failure (slower).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("pattern_family_valley_search.json"),
    )
    args = parser.parse_args()

    started = time.time()
    tested = 0
    champion = None
    max_lc_breaks = None

    spider_ell = [spider(ell) for ell in range(args.ell_max + 1)]
    p2_ell = [P2**ell for ell in range(args.ell_max + 1)]

    for k in range(args.k_min, args.k_max + 1):
        for n in range(args.n_min, args.n_max + 1):
            s_n = spider(n)
            t_kn = s_n**k + X * P2 ** (k * n)
            t_power = Poly([1])
            s_power = Poly([1])
            for m in range(1, args.m_max + 1):
                t_power *= t_kn
                s_power *= s_n**k
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
                    result = profile(poly, args.track_lc)
                    tested += 1
                    record = {
                        "parameters": {
                            "k": k,
                            "n": n,
                            "ell": ell,
                            "m": m,
                        },
                        "profile": result,
                    }
                    if better(result, champion):
                        champion = record
                    if (
                        max_lc_breaks is None
                        or result["log_concavity_failure_count"]
                        > max_lc_breaks["profile"][
                            "log_concavity_failure_count"
                        ]
                    ):
                        max_lc_breaks = record
                    if not result["unimodal"]:
                        record["polynomial"] = [int(c) for c in poly]
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

            print(
                f"k={k} n={n} tested={tested} "
                f"champion={champion['profile']['best_post_descent_ratio']['decimal']:.12f}",
                flush=True,
            )

    payload = {
        "status": "no_counterexample",
        "tested": tested,
        "elapsed_seconds": time.time() - started,
        "ranges": {
            "k": [args.k_min, args.k_max],
            "n": [args.n_min, args.n_max],
            "ell": [args.ell_min, args.ell_max],
            "m": [args.m_min, args.m_max],
            "degree_max": args.degree_max,
        },
        "champion": champion,
        "maximum_log_concavity_break_count": max_lc_breaks,
    }
    args.output.write_text(
        json.dumps(payload, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(payload, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
