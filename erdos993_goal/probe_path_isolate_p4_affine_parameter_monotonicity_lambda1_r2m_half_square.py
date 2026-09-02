#!/usr/bin/env python3
"""Probe the half-reserve inequality on the full r=2m square."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from analyze_path_isolate_p4_affine_parameter_monotonicity_lambda1_r2m_edges import (
    audit,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m", type=int)
    parser.add_argument("--x", type=int)
    args = parser.parse_args()
    records = []
    parameter_points = (
        [(args.m, args.x if args.x is not None else 2 * args.m)]
        if args.m is not None else [(m_value, 2 * m_value) for m_value in (12, 24, 48)]
    )
    for m_value, x_value in parameter_points:
        records.extend(
            [
                audit("group", 0, "m", 1, m_value, x_value),
                audit("bottom", 1, "x", 0, m_value, x_value),
            ]
        )
    for record in records:
        print(
            record["package"], "m", record["m"],
            "negative_count", record["half_reserve_square_negative_count"],
            "minimum", record["minimum_half_reserve_square_value"], flush=True,
        )
    report = {
        "status": "PASS_FINITE_R2M_HALF_RESERVE_SQUARE"
        if all(not record["half_reserve_square_negative_count"] for record in records)
        else "FAIL",
        "records": records,
        "warning": "Two finite exact squares only.",
    }
    suffix = f"_m{args.m}_x{parameter_points[0][1]}" if args.m is not None else ""
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_lambda1_"
        f"r2m_half_square{suffix}_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
