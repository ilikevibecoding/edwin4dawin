#!/usr/bin/env python3
"""Exact diagnostic grid for the open Delta1 new-leaf endpoint mask 3."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

import probe_rank8_delta1_new_leaf_normalized_containment_box_root as base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_mask3_ratio_box_threshold_probe_root_20260825.json"


def main() -> None:
    X, Y, U4, U5, U6 = base.VARIABLES
    numerator, metadata = base.corners_once()[3]
    x_bounds = (
        sp.Rational(3, 8),
        sp.Rational(2, 5),
        sp.Rational(9, 20),
        sp.Rational(1, 2),
        sp.Rational(39, 74),
    )
    y_bounds = (
        sp.Rational(5, 18),
        sp.Rational(3, 10),
        sp.Rational(1, 3),
        sp.Rational(65, 186),
    )
    rows = []
    for x_bound in x_bounds:
        for y_bound in y_bounds:
            normalized = sp.expand(
                numerator.subs(
                    {
                        base.corner.leaf.d[6]: 1,
                        base.corner.leaf.d[5]: x_bound * X,
                        base.corner.leaf.d[4]: x_bound * y_bound * X * Y,
                        base.corner.leaf.f[6]: U6,
                        base.corner.leaf.f[5]: x_bound * X * U5,
                        base.corner.leaf.f[4]: x_bound * y_bound * X * Y * U4,
                    },
                    simultaneous=True,
                )
            )
            polynomial = sp.Poly(normalized, *base.VARIABLES, domain=sp.QQ)
            result = base.bernstein(polynomial)
            row = {
                "d5_over_d6_upper": str(x_bound),
                "d4_over_d5_upper": str(y_bound),
                "negative": result["negative"],
                "zero": result["zero"],
                "minimum": result["minimum"],
                "ordered_sha256": result["ordered_sha256"],
            }
            rows.append(row)
            print(
                "X", x_bound, "Y", y_bound,
                "NEG", result["negative"], "MIN", result["minimum"],
                flush=True,
            )
    passing = [row for row in rows if row["negative"] == 0]
    payload = {
        "schema": "rank8-delta1-mask3-ratio-box-threshold-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "endpoint_names": metadata["endpoint_names"],
        "rows": rows,
        "passing_boxes": passing,
        "warning": (
            "A passing row proves positivity only if both displayed ratio bounds "
            "are established independently for every relevant forest. This probe "
            "does not establish those bounds."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
