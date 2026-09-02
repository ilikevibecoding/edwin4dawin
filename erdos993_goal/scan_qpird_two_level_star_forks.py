#!/usr/bin/env python3
"""Exact QPIRD scan for a two-level fork-of-stars rooted family.

The root q has ``a`` direct leaves and one inward neighbour r.
The vertex r has ``t`` child centres, each with ``m`` leaves.
The order-14 exhaustive QPIRD extremizer is (m,t,a)=(4,2,2).
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from pathlib import Path

from flint import fmpz_poly

from verify_rooted_forest_two_ratio_dominance import (
    ONE_PLUS_X,
    X,
    coeff,
    stable_float,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-leaves", type=int, default=60)
    parser.add_argument("--max-forks", type=int, default=20)
    parser.add_argument("--max-root-leaves", type=int, default=8)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("qpird_two_level_star_forks_20260729.json"),
    )
    args = parser.parse_args()

    best = None
    checks = 0
    parameter_points = 0
    half_unit_failure = None
    qpird_failure = None

    powers = [fmpz_poly([1])]
    for _ in range(args.max_leaves * args.max_forks):
        powers.append(powers[-1] * ONE_PLUS_X)

    for m in range(1, args.max_leaves + 1):
        branch = powers[m] + X
        inward_excluded = fmpz_poly([1])
        for t in range(1, args.max_forks + 1):
            inward_excluded *= branch
            inward = inward_excluded + X * powers[m * t]
            root_factor = fmpz_poly([1])
            for a in range(args.max_root_leaves + 1):
                if a:
                    root_factor *= ONE_PLUS_X
                c_poly = root_factor * inward
                d_poly = inward_excluded
                h_poly = c_poly + ONE_PLUS_X * d_poly
                b_poly = ONE_PLUS_X * (c_poly + X * d_poly)
                parameter_points += 1

                for k in range(1, c_poly.degree() + 1):
                    c = coeff(c_poly, k)
                    cp = coeff(c_poly, k + 1)
                    hm = coeff(h_poly, k - 1)
                    h = coeff(h_poly, k)
                    bk = coeff(b_poly, k)
                    bkp = coeff(b_poly, k + 1)
                    if c <= 0 or hm <= 0 or bkp < bk:
                        continue
                    checks += 1
                    numerator = (
                        (k + 1) * c * h
                        - ((k + 1) * cp + c) * hm
                    )
                    denominator = c * hm
                    margin = Fraction(numerator, denominator)
                    item = {
                        "m": m,
                        "t": t,
                        "a": a,
                        "order": 2 + a + t * (m + 1),
                        "k": k,
                        "margin": str(margin),
                        "decimal": stable_float(margin),
                        "numerator": numerator,
                        "denominator": denominator,
                        "B_k": bk,
                        "B_k_plus_1": bkp,
                        "rise_slack": bkp - bk,
                    }
                    if best is None or margin < best[0]:
                        best = (margin, item)
                        print(
                            f"best={margin} "
                            f"({stable_float(margin):.12g}), "
                            f"(m,t,a,k)=({m},{t},{a},{k})",
                            flush=True,
                        )
                    if (
                        margin < Fraction(1, 2)
                        and half_unit_failure is None
                    ):
                        half_unit_failure = item
                    if margin < 0:
                        qpird_failure = item
                        break
                if qpird_failure is not None:
                    break
            if qpird_failure is not None:
                break
        if qpird_failure is not None:
            break

    report = {
        "status": (
            "QPIRD_COUNTEREXAMPLE"
            if qpird_failure is not None
            else (
                "HALF_UNIT_COUNTEREXAMPLE"
                if half_unit_failure is not None
                else "PASS_NOT_PROOF"
            )
        ),
        "max_leaves_per_child_star": args.max_leaves,
        "max_child_stars": args.max_forks,
        "max_direct_root_leaves": args.max_root_leaves,
        "parameter_points": parameter_points,
        "operative_checks": checks,
        "minimum_margin": best[1] if best else None,
        "first_below_half_unit": half_unit_failure,
        "first_below_zero": qpird_failure,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
