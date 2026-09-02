#!/usr/bin/env python3
"""Fast exact boundary scan for outer-rooted Galvin trees.

Unlike the full four-root, all-rank audit, this script checks only a
short rank window below the required terminal cutoff.  That is where
the factor-four failure and the largest payment ratios occur, so the
specialized scan can push the Galvin parameters much farther.
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


def coefficient(poly: Poly, rank: int) -> int:
    return int(poly[rank]) if 0 <= rank <= poly.degree() else 0


def stable_ratio(numerator: int, denominator: int) -> float:
    shift = max(
        0,
        max(abs(numerator).bit_length(), denominator.bit_length()) - 52,
    )
    return (numerator >> shift) / (denominator >> shift)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--t-min", type=int, default=2)
    ap.add_argument("--t-max", type=int, default=30)
    ap.add_argument("--m-min", type=int, default=1)
    ap.add_argument("--m-max", type=int, default=500)
    ap.add_argument("--window", type=int, default=4)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    started = time.time()
    checked_cases = 0
    checked_ranks = 0
    failures = {
        "local_payment": None,
        "factor_three_payment": None,
        "x_below_one_third": None,
        "x_above_three_halves": None,
        "low_envelope": None,
        "high_tangent_envelope": None,
    }
    maximum_pair = None
    maximum = None

    for t in range(args.t_min, args.t_max + 1):
        e = (1 + 2 * X) ** t
        a = e + X * (1 + X) ** t
        e_power = ONE
        a_power = ONE
        t_maximum = None
        t_maximum_pair = None

        for m_parameter in range(1, args.m_max + 1):
            e_power *= e
            a_power *= a
            if m_parameter < args.m_min:
                continue
            rooted_tree = a_power + X * e_power
            root_deleted = a_power
            alpha_q = m_parameter * (t + 1) + 1
            cutoff = (2 * alpha_q + 1) // 3
            checked_cases += 1

            for offset in range(2, 2 + args.window):
                r = cutoff - offset
                if r < 1:
                    continue
                bm = coefficient(rooted_tree, r - 1)
                b = coefficient(rooted_tree, r)
                bp = coefficient(rooted_tree, r + 1)
                cm = coefficient(root_deleted, r - 1)
                c = coefficient(root_deleted, r)
                cross = b * c - bp * cm
                gsb = (
                    r * b * b
                    + bm * b
                    - (r + 1) * bm * bp
                )
                a_clear = 2 * b * b + b * cm + (r + 1) * cross
                lambda_clear = (
                    2 * b * b + b * cm + 2 * (r + 1) * cross
                )
                x_num = (b + cm) * gsb
                x_den = bm * a_clear
                s_num = bm * a_clear * a_clear
                s_den = (
                    b
                    * b
                    * (b + cm + bm)
                    * lambda_clear
                )
                mean_clear = bm * a_clear - (b + cm) * gsb
                payment_num = mean_clear * mean_clear
                payment_den = (
                    b
                    * b
                    * bm
                    * (b + cm + bm)
                    * lambda_clear
                )
                checked_ranks += 1

                item = {
                    "t": t,
                    "m": m_parameter,
                    "order": 1 + m_parameter * (1 + 2 * t),
                    "alpha_terminal": alpha_q,
                    "rank_r": r,
                    "rank_offset_from_cutoff": offset,
                    "cutoff": cutoff,
                    "x": stable_ratio(x_num, x_den),
                    "s": stable_ratio(s_num, s_den),
                    "payment_ratio": stable_ratio(
                        payment_num, payment_den
                    ),
                }
                checks = (
                    ("local_payment", payment_num > payment_den),
                    (
                        "factor_three_payment",
                        3 * payment_num > payment_den,
                    ),
                    ("x_below_one_third", 3 * x_num < x_den),
                    ("x_above_three_halves", 2 * x_num > 3 * x_den),
                    (
                        "low_envelope",
                        x_num <= x_den
                        and s_num * x_den
                        > s_den * (4 * x_num - x_den),
                    ),
                    (
                        "high_tangent_envelope",
                        x_num >= x_den
                        and x_num * (3 * s_num + 20 * s_den)
                        > 36 * x_den * s_den,
                    ),
                )
                for name, failed in checks:
                    if failed and failures[name] is None:
                        failures[name] = item

                if (
                    maximum_pair is None
                    or payment_num * maximum_pair[1]
                    > maximum_pair[0] * payment_den
                ):
                    maximum_pair = (payment_num, payment_den)
                    maximum = item
                if (
                    t_maximum_pair is None
                    or payment_num * t_maximum_pair[1]
                    > t_maximum_pair[0] * payment_den
                ):
                    t_maximum_pair = (payment_num, payment_den)
                    t_maximum = item

        print(
            f"t={t}: max payment={t_maximum['payment_ratio']:.12g} "
            f"at m={t_maximum['m']}, r={t_maximum['rank_r']}",
            flush=True,
        )

    report = {
        "claim_tested": (
            "Outer-rooted Galvin terminal payment and factor-three "
            "tangent split in a fixed window below the prefix cutoff."
        ),
        "parameters": vars(args) | {"out": str(args.out)},
        "exact_integer_arithmetic": True,
        "checked_cases": checked_cases,
        "checked_ranks": checked_ranks,
        "failures": failures,
        "maximum_payment_ratio": maximum,
        "status": (
            "FAIL"
            if any(value is not None for value in failures.values())
            else "PASS_NOT_PROOF"
        ),
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "checked_cases": checked_cases,
                "checked_ranks": checked_ranks,
                "failures": failures,
                "maximum_payment_ratio": maximum,
                "elapsed_seconds": report["elapsed_seconds"],
            },
            indent=2,
        )
    )
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
