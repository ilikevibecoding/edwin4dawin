#!/usr/bin/env python3
"""Exact coordinate-specialization screen for the fixed m=14 group endpoint.

This is a long-running finite replay (roughly several minutes), not a proof
of bivariate real stability.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_group_bottom_transfer import group_direct, x, y


OUT = Path("group_m14_coordinate_sturm_screen_20260803.json")


def main() -> None:
    m = 14
    N, d = 3 * m + 4, 2 * m + 5
    values = list(range(-50, 51, 5))
    values += [-100, -200, -500, -1000, 100, 200, 500, 1000]
    values += [
        -2723,
        -1630,
        -3467,
        2689,
        -3632,
        -1195,
        2299,
        949,
        702,
        2831,
        -3953,
        1049,
        -4948,
        -3035,
        4158,
        -727,
        -4429,
        -4860,
        1133,
        -25,
    ]

    polynomial = group_direct(N, d)
    records = []
    for value in values:
        specialization = sp.Poly(polynomial.subs(y, value), x)
        real_roots = specialization.count_roots(-sp.oo, sp.oo)
        assert specialization.degree() == 46
        assert real_roots == 46
        records.append(
            {
                "Y": value,
                "degree_in_X": int(specialization.degree()),
                "exact_real_root_count": int(real_roots),
            }
        )

    report = {
        "status": "PASS_EXACT_M14_COORDINATE_STURM_SCREEN",
        "m": m,
        "N": N,
        "d": d,
        "specializations": len(records),
        "records": records,
        "scope": (
            "All counts are exact.  This finite coordinate screen does not "
            "prove bivariate real stability."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
