#!/usr/bin/env python3
"""Exact terminal Q-cascade scan on Galvin's T_(m,t) family."""

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


def coeff(poly: Poly, rank: int):
    return poly[rank] if 0 <= rank <= poly.degree() else 0


def q_reserve(poly: Poly, rank: int):
    return (
        2 * rank * coeff(poly, rank) ** 2
        - coeff(poly, rank - 1) * coeff(poly, rank)
        - 2
        * (rank + 1)
        * coeff(poly, rank - 1)
        * coeff(poly, rank + 1)
    )


def stable_ratio(numerator: int, denominator: int) -> float:
    shift = max(
        0, max(numerator.bit_length(), denominator.bit_length()) - 52
    )
    return (numerator >> shift) / (denominator >> shift)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--t-min", type=int, default=2)
    parser.add_argument("--t-max", type=int, default=20)
    parser.add_argument("--m-min", type=int, default=1)
    parser.add_argument("--m-max", type=int, default=200)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    cases = 0
    checks = 0
    failure = None
    closest_pair = None
    closest = None
    largest_compensation_pair = None
    largest_compensation = None
    first_four_fifths_failure = None
    first_negative_same_rank_payment = None
    for t in range(args.t_min, args.t_max + 1):
        e = (ONE + 2 * X) ** t
        e_previous = (ONE + 2 * X) ** (t - 1)
        a = e + X * (ONE + X) ** t
        a_previous = e_previous + X * (ONE + X) ** (t - 1)
        e_power = ONE
        a_power = ONE
        t_checks = 0
        for m in range(1, args.m_max + 1):
            old_e_power = e_power
            old_a_power = a_power
            e_power *= e
            a_power *= a
            if m < args.m_min:
                continue
            tree = a_power + X * e_power
            deletion = (
                old_a_power * a_previous
                + X * old_e_power * e_previous
            )
            alpha = m * (t + 1)
            cutoff = (2 * alpha + 1) // 3
            cases += 1
            for rank in range(4, cutoff):
                left = int(
                    rank
                    * coeff(deletion, rank - 2)
                    * q_reserve(tree, rank)
                )
                right = int(
                    (rank - 1)
                    * coeff(tree, rank - 1)
                    * q_reserve(deletion, rank - 1)
                )
                difference = left - right
                checks += 1
                t_checks += 1
                if difference < 0:
                    failure = {
                        "t": t,
                        "m": m,
                        "order": 1 + m * (1 + 2 * t),
                        "alpha": alpha,
                        "rank": rank,
                        "cutoff": cutoff,
                        "left": left,
                        "right": right,
                        "difference": difference,
                    }
                    break
                if left > 0 and right >= 0:
                    pair = (right, left)
                    if (
                        closest_pair is None
                        or pair[0] * closest_pair[1]
                        > closest_pair[0] * pair[1]
                    ):
                        closest_pair = pair
                        closest = {
                            "t": t,
                            "m": m,
                            "order": 1 + m * (1 + 2 * t),
                            "alpha": alpha,
                            "rank": rank,
                            "cutoff": cutoff,
                            "right_over_left": stable_ratio(right, left),
                            "difference": difference,
                        }
                r = rank - 1
                t_poly = tree - X * deletion
                a_here = int(coeff(t_poly, r))
                a_plus = int(coeff(t_poly, r + 1))
                b_minus = int(coeff(deletion, r - 1))
                b_here = int(coeff(deletion, r))
                b_plus = int(coeff(deletion, r + 1))
                lam = (
                    a_here * b_here
                    + b_here**2
                    + 2
                    * rank
                    * (a_plus * b_here - a_here * b_plus)
                )
                mean_gap = (
                    b_minus * (rank * a_plus + b_here)
                    - (rank - 1) * b_here * a_here
                )
                local_payment = (
                    2
                    * (
                        b_minus
                        * (a_here + b_minus)
                        * lam
                        - mean_gap**2
                    )
                    - 3
                    * a_here
                    * b_minus
                    * (a_here + b_minus)
                    * b_here
                )
                same_rank_payment = int(
                    rank
                    * b_minus
                    * (a_here + b_minus)
                    * q_reserve(t_poly, rank)
                )
                assert (
                    a_here * difference
                    == local_payment + same_rank_payment
                )
                if (
                    same_rank_payment < 0
                    and first_negative_same_rank_payment is None
                ):
                    first_negative_same_rank_payment = {
                        "t": t,
                        "m": m,
                        "rank": rank,
                        "local_q_payment": local_payment,
                        "same_rank_q_payment": same_rank_payment,
                    }
                four_fifths_gap = (
                    5 * local_payment + 4 * same_rank_payment
                )
                if (
                    four_fifths_gap < 0
                    and first_four_fifths_failure is None
                ):
                    first_four_fifths_failure = {
                        "t": t,
                        "m": m,
                        "rank": rank,
                        "local_q_payment": local_payment,
                        "same_rank_q_payment": same_rank_payment,
                        "five_local_plus_four_same": four_fifths_gap,
                    }
                if local_payment < 0 and same_rank_payment > 0:
                    pair = (-local_payment, same_rank_payment)
                    if (
                        largest_compensation_pair is None
                        or pair[0] * largest_compensation_pair[1]
                        > largest_compensation_pair[0] * pair[1]
                    ):
                        largest_compensation_pair = pair
                        largest_compensation = {
                            "t": t,
                            "m": m,
                            "rank": rank,
                            "alpha": alpha,
                            "cutoff": cutoff,
                            "negative_local_over_same_rank": (
                                stable_ratio(*pair)
                            ),
                            "local_q_payment": local_payment,
                            "same_rank_q_payment": same_rank_payment,
                        }
            if failure:
                break
        print(
            f"t={t}: checks={t_checks:,}, "
            f"closest={None if closest is None else closest['right_over_left']:.12g}",
            flush=True,
        )
        if failure:
            break

    report = {
        "claim": (
            "k f_(k-2) Q_k(T_m,t) >= "
            "(k-1) g_(k-1) Q_(k-1)(deletion)"
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "cases": cases,
        "checks": checks,
        "closest": closest,
        "largest_compensation_ratio": largest_compensation,
        "first_four_fifths_failure": first_four_fifths_failure,
        "first_negative_same_rank_payment":
            first_negative_same_rank_payment,
        "failure": failure,
        "status": "FAIL" if failure else "PASS_NOT_PROOF",
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
