#!/usr/bin/env python3
"""Sparse high-precision scan of star-fork trees with leaf bundles.

This is a numerical locator only.  Any apparent failure must be replayed
with exact arithmetic before it can be used as a certificate.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import mpmath as mp

from scan_star_fork_terminal_downward_float import scan_point


def integer_list(value: str) -> list[int]:
    return [int(item) for item in value.split(",") if item]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m-values", default="20,30,40,60,80,100")
    parser.add_argument(
        "--lambda-values", default="100,125,142,160,200"
    )
    parser.add_argument("--lambda-denominator", type=int, default=100)
    parser.add_argument(
        "--leaf-values", default="0,1,2,4,8,16,32,64"
    )
    parser.add_argument("--radius", type=int, default=5)
    parser.add_argument("--dps", type=int, default=150)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("star_fork_leafbundle_grid_20260729.json"),
    )
    args = parser.parse_args()
    mp.mp.dps = args.dps

    best_drop: tuple[mp.mpf, dict] | None = None
    best_pfsr: tuple[mp.mpf, dict, dict] | None = None
    failure: tuple[dict, dict] | None = None
    scanned = 0

    for leaves in integer_list(args.leaf_values):
        for m in integer_list(args.m_values):
            for numerator in integer_list(args.lambda_values):
                point = scan_point(
                    m,
                    numerator,
                    args.lambda_denominator,
                    args.radius,
                    leaves,
                )
                scanned += 1
                candidate = point["closest"]
                if candidate is not None:
                    drop = mp.mpf(candidate["k_minus_v"])
                    if best_drop is None or drop < best_drop[0]:
                        best_drop = (drop, point)
                for item in point["points"]:
                    if mp.mpf(item["r_minus_u"]) <= 0:
                        continue
                    reserve = mp.mpf(
                        item[
                            "full_square_reserve_R_T_minus_zeta2"
                        ]
                    )
                    if best_pfsr is None or reserve < best_pfsr[0]:
                        best_pfsr = (reserve, point, item)
                if point["failure"] is not None:
                    failure = (point, point["failure"])
                    break
            print(
                f"leaves={leaves} m={m} scanned={scanned} "
                f"best_drop={mp.nstr(best_drop[0], 12) if best_drop else None} "
                f"best_pfsr={mp.nstr(best_pfsr[0], 12) if best_pfsr else None}",
                flush=True,
            )
            if failure is not None:
                break
        if failure is not None:
            break

    report = {
        "status": (
            "FLOAT_LOCATOR_FOUND_DP_FAILURE"
            if failure is not None
            else "NO_FAILURE_IN_FLOAT_GRID_NOT_PROOF"
        ),
        "precision_decimal_digits": args.dps,
        "points_scanned": scanned,
        "failure": failure[0] if failure else None,
        "closest_downward_case": best_drop[1] if best_drop else None,
        "smallest_live_full_square_reserve": (
            {
                "point": best_pfsr[1],
                "rank_data": best_pfsr[2],
            }
            if best_pfsr
            else None
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "status": report["status"],
                "points_scanned": scanned,
                "failure": failure[0] if failure else None,
                "best_drop": (
                    mp.nstr(best_drop[0], 30) if best_drop else None
                ),
                "best_pfsr": (
                    mp.nstr(best_pfsr[0], 30) if best_pfsr else None
                ),
            },
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
