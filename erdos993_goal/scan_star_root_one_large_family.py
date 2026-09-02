#!/usr/bin/env python3
"""Scan the candidate extremal star-root family (1^s, a).

The star-forest polynomial is

    K=(1+2x)^s ((1+x)^a+x).

The computation uses the closed coefficient formula and records the
smallest exact log-concavity/linear-debt reserve ratio.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import comb
from pathlib import Path


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def k_coeff(s: int, a: int, j: int) -> int:
    base = sum(
        (2 ** (j - t)) * choose(s, j - t) * choose(a, t)
        for t in range(max(0, j - s), min(a, j) + 1)
    )
    extra = (2 ** (j - 1)) * choose(s, j - 1) if j >= 1 else 0
    return base + extra


def l_coeff(m: int, j: int) -> int:
    return choose(m, j)


def b_coeff(s: int, a: int, j: int) -> int:
    m = s + a
    return (
        k_coeff(s, a, j)
        + k_coeff(s, a, j - 1)
        + l_coeff(m, j - 1)
        + l_coeff(m, j - 2)
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--s-max", type=int, default=300)
    parser.add_argument("--a-max", type=int, default=300)
    parser.add_argument("--k-min", type=int, default=5)
    parser.add_argument("--k-max", type=int, default=40)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = 0
    hard = 0
    prefix_hard = 0
    minimum = None
    first_failure = None
    minimum_by_k: dict[str, dict] = {}

    for s in range(1, args.s_max + 1):
        for a in range(2, args.a_max + 1):
            m = s + a
            upper = min(args.k_max, m - 1)
            for k in range(args.k_min, upper + 1):
                checks += 1
                km1 = k_coeff(s, a, k - 1)
                kk = k_coeff(s, a, k)
                kp1 = k_coeff(s, a, k + 1)
                lkm2 = l_coeff(m, k - 2)
                lkm1 = l_coeff(m, k - 1)
                lk = l_coeff(m, k)
                lc_gap = kk * kk - km1 * kp1
                lr = kk * (lk + lkm1) - kp1 * (lkm1 + lkm2)
                if lr >= 0:
                    continue
                hard += 1
                prefix = b_coeff(s, a, k + 1) >= b_coeff(s, a, k)
                if not prefix:
                    continue
                prefix_hard += 1
                ratio = Fraction(lc_gap, -lr)
                row = {
                    "singleton_branches_s": s,
                    "large_branch_a": a,
                    "total_leaves": m,
                    "rooted_tree_order": 2 * s + a + 2,
                    "k": k,
                    "rank_r": k + 1,
                    "lc_gap": lc_gap,
                    "negative_linear_gap": -lr,
                    "delta": lc_gap + lr,
                    "reserve_ratio_numerator": ratio.numerator,
                    "reserve_ratio_denominator": ratio.denominator,
                    "reserve_ratio_decimal": float(ratio),
                }
                if lc_gap + lr < 0 and first_failure is None:
                    first_failure = row
                if minimum is None or ratio < Fraction(
                    minimum["reserve_ratio_numerator"],
                    minimum["reserve_ratio_denominator"],
                ):
                    minimum = row
                old_k = minimum_by_k.get(str(k))
                if old_k is None or ratio < Fraction(
                    old_k["reserve_ratio_numerator"],
                    old_k["reserve_ratio_denominator"],
                ):
                    minimum_by_k[str(k)] = row
        if s % 25 == 0:
            print(
                f"s={s}: checks={checks:,}; hard={hard:,}; "
                f"prefix-hard={prefix_hard:,}",
                flush=True,
            )

    report = {
        "status": "FAILURE_FOUND" if first_failure else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "hard_cases": hard,
        "prefix_hard_cases": prefix_hard,
        "first_failure": first_failure,
        "minimum_prefix_reserve": minimum,
        "minimum_by_k": minimum_by_k,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if first_failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
