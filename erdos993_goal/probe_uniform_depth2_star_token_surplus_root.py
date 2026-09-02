#!/usr/bin/env python3
"""Exact structured probe for token-surplus bounds on uniform depth-2 stars.

The tree T(d,m) has a center, d arm roots, and m leaves at every arm root.
Closed coefficient formulas allow much larger parameters than generic tree
DP.  The probe tests both the live averaged component-surplus inequality and
the stronger initial-level domination q_r <= q_2.  A PASS is finite evidence.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if 0 <= k <= n else 0


def independent_coefficient(d: int, m: int, rank: int) -> int:
    # Center absent: choose j arm roots, then arbitrary leaves on unchosen arms.
    center_absent = sum(
        choose(d, roots) * choose(m * (d - roots), rank - roots)
        for roots in range(min(d, rank) + 1)
    )
    # Center present: every arm root is forbidden and all dm leaves are free.
    center_present = choose(d * m, rank - 1)
    return center_absent + center_present


def one_edge_coefficient(d: int, m: int, size: int) -> int:
    residual_rank = size - 2
    if residual_rank < 0:
        return 0
    # Unique center-arm edge.
    center_arm = d * choose(m * (d - 1), residual_rank)
    # Unique arm-root/leaf edge.
    other_arm_independent = sum(
        choose(d - 1, roots)
        * choose(m * (d - 1 - roots), residual_rank - roots)
        for roots in range(min(d - 1, residual_rank) + 1)
    )
    arm_leaf = d * m * other_arm_independent
    return center_arm + arm_leaf


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--maximum-arms", type=int, default=60)
    parser.add_argument("--maximum-leaves-per-arm", type=int, default=60)
    parser.add_argument("--rank-cap", type=int, default=140)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "uniform_depth2_star_token_surplus_probe_root_20260828.json",
    )
    args = parser.parse_args()

    cases = 0
    ranks = 0
    actual_failures = []
    initial_domination_failures = []
    tightest_actual = None
    tightest_actual_ratio = Fraction(-1)
    tightest_initial = None
    tightest_initial_ratio = Fraction(-1)

    for d in range(2, args.maximum_arms + 1):
        for m in range(1, args.maximum_leaves_per_arm + 1):
            cases += 1
            order = 1 + d + d * m
            alpha = d * m + 1
            w = math.comb(order - 2, 2)
            branching = math.comb(d - 1, 2) + d * math.comb(m, 2)
            matching_two = w - branching
            assert matching_two > 0
            i2 = independent_coefficient(d, m, 2)
            assert i2 == math.comb(order, 2) - (order - 1)
            maximum_rank = min(alpha, args.rank_cap)
            for rank in range(2, maximum_rank + 1):
                count = independent_coefficient(d, m, rank)
                if not count:
                    continue
                one_edge = one_edge_coefficient(d, m, rank + 1)
                ranks += 1
                actual_margin = rank * matching_two * count - w * one_edge
                initial_margin = rank * matching_two * count - i2 * one_edge
                row = {
                    "arms": d,
                    "leaves_per_arm": m,
                    "order": order,
                    "rank": rank,
                    "i_rank": count,
                    "one_edge_sets": one_edge,
                    "W": w,
                    "m2": matching_two,
                    "actual_margin": actual_margin,
                    "initial_level_domination_margin": initial_margin,
                }
                if actual_margin < 0 and len(actual_failures) < 25:
                    actual_failures.append(row)
                if initial_margin < 0 and len(initial_domination_failures) < 25:
                    initial_domination_failures.append(row)
                if rank >= 3 and one_edge:
                    actual_ratio = Fraction(w * one_edge, rank * matching_two * count)
                    initial_ratio = Fraction(i2 * one_edge, rank * matching_two * count)
                    if actual_ratio > tightest_actual_ratio:
                        tightest_actual_ratio = actual_ratio
                        tightest_actual = {**row, "lhs_over_rhs": str(actual_ratio)}
                    if initial_ratio > tightest_initial_ratio:
                        tightest_initial_ratio = initial_ratio
                        tightest_initial = {**row, "lhs_over_rhs": str(initial_ratio)}

    report = {
        "schema": "uniform-depth2-star-token-surplus-probe-root-v1",
        "status": (
            "COUNTEREXAMPLE_EXACT_UNIFORM_TOKEN_SURPLUS_DEPTH2_STAR"
            if actual_failures
            else (
                "COUNTEREXAMPLE_EXACT_INITIAL_RATIO_DOMINATION_DEPTH2_STAR"
                if initial_domination_failures
                else "PASS_EXACT_FINITE_UNIFORM_DEPTH2_STAR_TOKEN_SURPLUS"
            )
        ),
        "family": (
            "T(d,m): one center, d arm roots, and m pendant leaves on every arm root"
        ),
        "closed_forms": {
            "independence": "((1+x)^m+x)^d+x(1+x)^(dm)",
            "one_induced_edge": (
                "d*x^2*((1+x)^(m(d-1))+m*((1+x)^m+x)^(d-1))"
            ),
        },
        "parameters": {
            "maximum_arms": args.maximum_arms,
            "maximum_leaves_per_arm": args.maximum_leaves_per_arm,
            "rank_cap": args.rank_cap,
        },
        "cases": cases,
        "rank_checks": ranks,
        "actual_failures": actual_failures,
        "initial_level_domination_failures": initial_domination_failures,
        "tightest_actual_rank_at_least_3": tightest_actual,
        "tightest_initial_domination_rank_at_least_3": tightest_initial,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "A finite structured-family PASS is evidence only and does not prove "
            "either inequality for all trees."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("CASES", cases, "RANKS", ranks)
    print("TIGHTEST_ACTUAL", tightest_actual)
    print("TIGHTEST_INITIAL", tightest_initial)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(args.output))


if __name__ == "__main__":
    main()
