#!/usr/bin/env python3
"""Exact prefix-PGC scan for terminal pendant edges in Galvin trees.

For

    E_t=(1+2x)^t,
    A_t=E_t+x(1+x)^t,
    I(T_{m,t})=A_t^m+xE_t^m,

delete one terminal leaf together with its degree-two support vertex.  The
remaining forest has polynomial

    B_{m,t}=A_t^(m-1) A_(t-1) + x E_t^(m-1) E_(t-1).

The script checks the denominator-free pendant cascade at every rank below
floor((2 alpha+1)/3), using exact FLINT integers.
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


def ratio_float(numerator: int, denominator: int) -> float:
    """Stable approximate ratio for positive arbitrary-size integers."""
    if numerator == 0:
        return 0.0
    shift = max(0, max(numerator.bit_length(), denominator.bit_length()) - 52)
    return (numerator >> shift) / (denominator >> shift)


def better_ratio(
    numerator: int,
    denominator: int,
    incumbent: tuple[int, int] | None,
) -> bool:
    if denominator <= 0 or numerator < 0:
        return False
    if incumbent is None:
        return True
    old_numerator, old_denominator = incumbent
    return numerator * old_denominator > old_numerator * denominator


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--t-min", type=int, default=2)
    parser.add_argument("--t-max", type=int, default=20)
    parser.add_argument("--m-min", type=int, default=1)
    parser.add_argument("--m-max", type=int, default=200)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    cases = 0
    rank_checks = 0
    failure = None
    closest_pair = None
    closest = None
    per_t = []

    for t in range(args.t_min, args.t_max + 1):
        e = (ONE + 2 * X) ** t
        e_prev = (ONE + 2 * X) ** (t - 1)
        a = e + X * (ONE + X) ** t
        a_prev = e_prev + X * (ONE + X) ** (t - 1)

        e_power = ONE
        a_power = ONE
        t_checks = 0
        t_cases = 0
        for m in range(1, args.m_max + 1):
            previous_e_power = e_power
            previous_a_power = a_power
            e_power *= e
            a_power *= a
            if m < args.m_min:
                continue

            tree = a_power + X * e_power
            deletion = (
                previous_a_power * a_prev
                + X * previous_e_power * e_prev
            )
            alpha = m * (t + 1)
            assert tree.degree() == alpha
            cutoff = (2 * alpha + 1) // 3
            cases += 1
            t_cases += 1

            for k in range(2, cutoff):
                left = int(
                    k * coeff(deletion, k - 2) * reserve(tree, k)
                )
                right = int(
                    (k - 1)
                    * coeff(tree, k - 1)
                    * reserve(deletion, k - 1)
                )
                difference = left - right
                rank_checks += 1
                t_checks += 1
                if difference < 0:
                    failure = {
                        "t": t,
                        "m": m,
                        "order": 1 + m * (1 + 2 * t),
                        "alpha": alpha,
                        "rank": k,
                        "cutoff": cutoff,
                        "left": left,
                        "right": right,
                        "difference": difference,
                    }
                    break

                if left > 0 and right >= 0 and better_ratio(
                    right, left, closest_pair
                ):
                    closest_pair = (right, left)
                    closest = {
                        "t": t,
                        "m": m,
                        "order": 1 + m * (1 + 2 * t),
                        "alpha": alpha,
                        "rank": k,
                        "cutoff": cutoff,
                        "right_over_left": ratio_float(right, left),
                        "margin_fraction": {
                            "numerator": difference,
                            "denominator": left,
                        },
                        "difference_digits": len(str(abs(difference))),
                    }
            if failure:
                break

        per_t.append(
            {
                "t": t,
                "cases": t_cases,
                "rank_checks": t_checks,
            }
        )
        print(
            f"t={t}: cases={t_cases:,}, checks={t_checks:,}, "
            f"closest={None if closest is None else closest['right_over_left']:.12g}",
            flush=True,
        )
        if failure:
            break

    report = {
        "claim_tested": (
            "Prefix pendant GSB cascade at a terminal degree-two support "
            "vertex in Galvin T_{m,t}."
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "exact_integer_arithmetic": True,
        "cases": cases,
        "rank_checks": rank_checks,
        "closest": closest,
        "failure": failure,
        "per_t": per_t,
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "cases": cases,
                "rank_checks": rank_checks,
                "closest": closest,
                "failure": failure,
                "elapsed_seconds": report["elapsed_seconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
