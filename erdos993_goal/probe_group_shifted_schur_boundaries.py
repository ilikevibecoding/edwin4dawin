#!/usr/bin/env python3
"""Exact reconnaissance for shifted Schur boundaries of the Q^2 group matrix."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from probe_group_catalan_square_core import matrix, schur_tail


OUT = Path("group_shifted_schur_boundaries_probe_20260803.json")


def signs(values):
    return [int(sp.sign(value)) for value in values]


def main() -> None:
    records = []
    for m in range(3, 17):
        d, ambient = 2 * m + 5, 3 * m + 5
        full = matrix(d, power=2, limit=ambient)
        shifts = []
        for shift in range(min(5, m)):
            tail = schur_tail(full, d + shift)[:, ::-1]
            _, upper, _ = tail.LUdecomposition()
            pivots = [sp.factor(upper[i, i]) for i in range(tail.rows)]
            shifts.append(
                {
                    "shift": shift,
                    "size": tail.rows,
                    "entry_sign_set": sorted(
                        {int(sp.sign(value)) for value in tail}
                    ),
                    "leading_pivot_signs": signs(pivots),
                    "determinant_sign": int(sp.sign(sp.prod(pivots))),
                }
            )
        records.append({"m": m, "shifts": shifts})

    report = {
        "status": "PASS_EXACT_SHIFTED_SCHUR_BOUNDARY_PROBE",
        "records": records,
        "scope": "Exact finite reconnaissance; no all-order sign theorem is claimed.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
