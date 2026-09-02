#!/usr/bin/env python3
"""Exact terminal-PGC scan for a Galvin bouquet plus a terminal star.

The center has ``a`` Galvin branches with rooted states

    A_t=(1+2x)^t+x(1+x)^t,  E_t=(1+2x)^t,

and one support child with ``m`` leaf children.  At one leaf of the latter,

    Q=A_t^a((1+x)^m+x)+x E_t^a(1+x)^m,
    B=(1+x)^(m-1)(A_t^a+xE_t^a).

This combines the known hard two-phase construction with the terminal
cascade geometry.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from flint import fmpz_poly as Poly


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])
ONE = Poly([1])


def coeff(poly: Poly, k: int):
    return poly[k] if 0 <= k <= poly.degree() else 0


def reserve(poly: Poly, k: int):
    return (
        k * coeff(poly, k) ** 2
        + coeff(poly, k - 1) * coeff(poly, k)
        - (k + 1) * coeff(poly, k - 1) * coeff(poly, k + 1)
    )


def stable_ratio(numerator: int, denominator: int) -> float:
    shift = max(0, max(numerator.bit_length(), denominator.bit_length()) - 52)
    return (numerator >> shift) / (denominator >> shift)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--a-max", type=int, default=100)
    parser.add_argument("--t-max", type=int, default=20)
    parser.add_argument("--m-max", type=int, default=15)
    parser.add_argument("--order-max", type=int, default=5000)
    parser.add_argument("--boundary-only", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    cases = 0
    rank_checks = 0
    failure = None
    closest_pair = None
    closest = None
    binomials = [(ONE + X) ** m for m in range(args.m_max + 1)]

    for t in range(1, args.t_max + 1):
        excluded = (ONE + 2 * X) ** t
        total = excluded + X * (ONE + X) ** t
        total_power = ONE
        excluded_power = ONE
        for branches in range(1, args.a_max + 1):
            total_power *= total
            excluded_power *= excluded
            base_order = 1 + branches * (1 + 2 * t)
            for terminal_leaves in range(1, args.m_max + 1):
                order = base_order + 1 + terminal_leaves
                if order > args.order_max:
                    break
                kernel = binomials[terminal_leaves]
                full = (
                    total_power * (kernel + X)
                    + X * excluded_power * kernel
                )
                deletion = (
                    binomials[terminal_leaves - 1]
                    * (total_power + X * excluded_power)
                )
                assert full.degree() == deletion.degree() + 1
                cutoff = (2 * full.degree() + 1) // 3
                cases += 1
                ranks = (
                    [cutoff - 1]
                    if args.boundary_only and cutoff >= 3
                    else range(2, cutoff)
                )
                for k in ranks:
                    left = int(
                        k
                        * coeff(deletion, k - 2)
                        * reserve(full, k)
                    )
                    right = int(
                        (k - 1)
                        * coeff(full, k - 1)
                        * reserve(deletion, k - 1)
                    )
                    difference = left - right
                    rank_checks += 1
                    item = {
                        "parameters": {
                            "branches": branches,
                            "galvin_t": t,
                            "terminal_leaves": terminal_leaves,
                        },
                        "order": order,
                        "alpha": full.degree(),
                        "rank": k,
                        "cutoff": cutoff,
                    }
                    if difference < 0:
                        failure = item | {
                            "left": left,
                            "right": right,
                            "difference": difference,
                        }
                        break
                    if left > 0 and right >= 0:
                        pair = (right, left)
                        if (
                            closest_pair is None
                            or right * closest_pair[1]
                            > closest_pair[0] * left
                        ):
                            closest_pair = pair
                            closest = item | {
                                "right_over_left": stable_ratio(right, left),
                                "margin_digits": len(str(difference)),
                                "left_digits": len(str(left)),
                            }
                if failure:
                    break
            if failure:
                break
        print(
            f"t={t}: cases={cases:,}, checks={rank_checks:,}, "
            f"closest={closest['right_over_left']:.12g}",
            flush=True,
        )
        if failure:
            break

    report = {
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"output": str(args.output)},
        "cases": cases,
        "rank_checks": rank_checks,
        "closest": closest,
        "failure": failure,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2), flush=True)
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
