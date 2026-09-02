#!/usr/bin/env python3
"""All-order terminal-coupling certificate at quartic reserve thirteen.

The cubic theorem was originally certified at its sharp reserve nine and
then propagated by Euler multipliers.  The explicit common-interlacer route
for the quartic theorem needs the concrete two-vertex Jacobi matrix for the
cubic row on the boundary p-alpha=13.  This script replays the same exact
Bernstein terminal-coupling calculation directly on that boundary.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from prove_two_outlier_one_negative_factor import (
    boundary_data,
    verify_terminal_coupling_identity,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "cubic_jacobi_tail_reserve13_theorem_20260805.json"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    verify_terminal_coupling_identity()
    parities = [boundary_data(parity, 13) for parity in ("even", "odd")]
    report = {
        "status": "ALL_ORDER_CUBIC_JACOBI_TAIL_AT_RESERVE_13",
        "statement": (
            "For Gamma=(1-u*t)(1-v*t)(t+c), 0<=u,v<=1 and c>0, "
            "the Jacobi transform of S_(p,alpha)[Gamma] on p-alpha=13 "
            "is the characteristic polynomial of the explicit symmetric "
            "two-vertex Jacobi-tail matrix used by the cubic theorem."
        ),
        "proof": [
            "The top-four Jacobi-coordinate identity is exact in both parities.",
            "The unchanged Jacobi subdiagonals have coefficientwise-positive rational certificates.",
            "The modified terminal squared coupling has tensor Bernstein degree (2,2) in u,v and degree two in c.",
            "All 54 Bernstein/c-power coefficient functions are coefficientwise positive rational functions of r>=0.",
        ],
        "parities": parities,
        "logical_scope": (
            "This proves existence of the explicit cubic Jacobi matrix on "
            "the full sharp quartic boundary.  The remaining quartic step "
            "is alternation of its trailing principal minor with the "
            "adjacent cubic row."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "parities": [
                    {
                        "parity": value["parity"],
                        "p": value["p"],
                        "alpha": value["alpha"],
                        "n": value["n"],
                        "bernstein_coefficients": value["bernstein_coefficient_count"],
                    }
                    for value in parities
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
