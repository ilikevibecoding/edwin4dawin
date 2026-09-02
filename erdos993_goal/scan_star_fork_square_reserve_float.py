#!/usr/bin/env python3
"""Stress the pointed full-square reserve in the star-fork family.

This is a high-precision locator, not a proof certificate.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import mpmath as mp

from scan_star_fork_terminal_downward_float import scan_point


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--minimum-m", type=int, default=20)
    parser.add_argument("--maximum-m", type=int, default=200)
    parser.add_argument("--m-step", type=int, default=1)
    parser.add_argument("--lambda-start", type=int, default=50)
    parser.add_argument("--lambda-stop", type=int, default=300)
    parser.add_argument("--lambda-step", type=int, default=5)
    parser.add_argument("--lambda-denominator", type=int, default=100)
    parser.add_argument("--radius", type=int, default=8)
    parser.add_argument("--dps", type=int, default=100)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("star_fork_square_reserve_float_20260729.json"),
    )
    args = parser.parse_args()
    mp.mp.dps = args.dps

    scanned_points = negative_cross_ranks = live_negative_ranks = 0
    minimum_ratio = None
    minimum_item = None
    minimum_live_ratio = None
    minimum_live_item = None
    first_failure = None
    first_live_linear_failure = None

    for m in range(
        args.minimum_m, args.maximum_m + 1, args.m_step
    ):
        for numerator in range(
            args.lambda_start,
            args.lambda_stop + 1,
            args.lambda_step,
        ):
            family = scan_point(
                m,
                numerator,
                args.lambda_denominator,
                args.radius,
            )
            scanned_points += 1
            for point in family["points"]:
                zeta = mp.mpf(point["zeta"])
                if zeta <= 0:
                    continue
                negative_cross_ranks += 1
                reserve_t = mp.mpf(point["ISO_reserve_T"])
                full_margin = mp.mpf(
                    point["full_square_reserve_R_T_minus_zeta2"]
                )
                ratio = reserve_t / (zeta * zeta)
                item = {
                    "m": m,
                    "lambda": [
                        numerator,
                        args.lambda_denominator,
                    ],
                    "t": family["t"],
                    "N": family["N"],
                    **point,
                    "R_T_over_zeta2": mp.nstr(ratio, 40),
                }
                if minimum_ratio is None or ratio < minimum_ratio:
                    minimum_ratio = ratio
                    minimum_item = item
                if full_margin < 0 and first_failure is None:
                    first_failure = item

                live = mp.mpf(point["k_minus_v"]) < 0
                if live:
                    live_negative_ranks += 1
                    if (
                        minimum_live_ratio is None
                        or ratio < minimum_live_ratio
                    ):
                        minimum_live_ratio = ratio
                        minimum_live_item = item
                    if (
                        mp.mpf(
                            point[
                                "square_paid_linear_cascade_margin"
                            ]
                        )
                        < 0
                        and first_live_linear_failure is None
                    ):
                        first_live_linear_failure = item
        print(
            f"m={m}, families={scanned_points:,}, "
            f"negative_cross={negative_cross_ranks:,}, "
            f"live={live_negative_ranks:,}, "
            f"min_ratio="
            f"{mp.nstr(minimum_ratio, 12) if minimum_ratio else None}",
            flush=True,
        )

    report = {
        "status": (
            "FLOAT_LOCATOR_FOUND_FULL_SQUARE_FAILURE"
            if first_failure is not None
            else "NO_FULL_SQUARE_FAILURE_IN_FLOAT_GRID_NOT_PROOF"
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "families_scanned": scanned_points,
        "negative_cross_ranks": negative_cross_ranks,
        "live_negative_cross_ranks": live_negative_ranks,
        "minimum_R_T_over_zeta2": minimum_item,
        "minimum_live_R_T_over_zeta2": minimum_live_item,
        "first_full_square_failure": first_failure,
        "first_live_square_paid_linear_failure": (
            first_live_linear_failure
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
