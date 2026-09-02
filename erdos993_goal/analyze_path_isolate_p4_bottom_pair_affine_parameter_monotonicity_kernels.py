#!/usr/bin/env python3
"""Audit exact finite kernels for bottom-pair affine monotonicity."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_affine_direct_integration_kernel import summarize
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A,
    T,
    V,
    load_bottom,
    m,
    q,
    w,
    x,
    z,
)


M = sp.symbols("M")


def main() -> None:
    records = []
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        reserve = sp.expand(slope * A)
        increments = {
            "x": sp.expand((A - 1) * reserve),
            "m": sp.expand(
                A * T**2 * reserve.subs(m, m + 1) - q * reserve
            ),
        }
        for coordinate, increment_reserve in increments.items():
            reserve_summary = summarize(
                sp.expand(increment_reserve.subs(m, M + 3)),
                (z, w, M, x),
            )
            record = {
                "parity": parity,
                "coordinate": coordinate,
                "reserve": reserve_summary,
                "reserve_coefficientwise_nonnegative": (
                    reserve_summary["negative_term_count"] == 0
                ),
            }
            records.append(record)
            print(
                parity,
                coordinate,
                reserve_summary["negative_term_count"],
                flush=True,
            )
    report = {
        "status": (
            "PASS_RESERVE_KERNELS"
            if all(
                record["reserve_coefficientwise_nonnegative"]
                for record in records
            )
            else "FAIL"
        ),
        "parameter_shift": "m=M+3",
        "records": records,
    }
    Path(
        "path_isolate_p4_bottom_pair_affine_parameter_monotonicity_"
        "kernels_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
