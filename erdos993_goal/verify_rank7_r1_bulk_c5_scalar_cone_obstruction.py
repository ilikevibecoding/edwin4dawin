#!/usr/bin/env python3
"""Exact Delta0 obstruction after the full r=1 weighted-core c5 table.

This is deliberately an enclosure obstruction, not a tree counterexample:
the exact core table couples (B2,x,c4) to c5, but the V6/V7 ratios still
relax c6 and c7 independently of that weighted core.
"""
from __future__ import annotations

import json
from math import comb
from pathlib import Path

import sympy as sp

from verify_rank7_terminal_broom_reduction import (
    c,
    h,
    exact_decomposition,
    newton_coefficients,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_r1_bulk_c5_scalar_cone_obstruction_exact_20260817.json"


def main() -> int:
    n, r, m, beta, neighbor_x = 23, 1, 21, 35, 4
    c2 = sp.Integer(comb(n - 1, 2))
    c3 = sp.Integer(comb(n - 2, 3) + beta)
    c4 = sp.Integer(5331)
    c5 = sp.Integer(14568)

    bulk = json.loads(
        (HERE / "rank7_r1_high_correlation_bulk_b30plus_exact_20260817.json")
        .read_text(encoding="utf-8")
    )
    row = bulk["profiles"]["B2=35,x=4"]["c4_rows"]["5331"]
    assert row["c5_min"] == int(c5)
    assert row["partition"] == [8, 4, 2, 1, 1, 1, 1, 1, 1, 1]

    # U=V=A=0 and Z=1 in the retained scalar domain.
    c6 = sp.factor((25 * c5**2 - 4 * c4 * c5) / (39 * c4))
    c7 = sp.factor((12 * c6**2 - c5 * c6) / (14 * c5))
    edge_e = m - neighbor_x
    edge_scale = comb(m - 2, 2)
    a = sp.Integer(comb(m, 4) - edge_e * edge_scale)
    single = sp.Integer(comb(m - neighbor_x - 3, 4))
    b = min(sp.Rational(m - 4, 5) * a, c5 - a - single, c6)
    assert (edge_e, a, single, b) == (17, 3078, 1001, sp.Rational(52326, 5))

    # Check every scalar interval used by the numerical cone.
    x = c3 / c4
    c5_upper = (1 - (2 + x) / 10) * c4**2 / c3
    c6_upper = (1 - (2 + c4 / c5) / 12) * c5**2 / c4
    c7_lower = (72 * c6**2 - 9 * c5 * c6) / (105 * c5)
    assert c5 <= c5_upper and c6 <= c6_upper and c7_lower <= c7
    bad4 = comb(m, 4) - a
    rho = sp.Rational((m - 7) * (m - 8), 5 * (m - 3))
    lower_b = max(
        rho * a,
        comb(m, 5) - sp.Rational(m - 4, 3) * bad4,
        c6 - sp.Rational(n - 6, 6) * (c5 - a),
        sp.Integer(0),
    )
    assert lower_b <= b

    raw = newton_coefficients(exact_decomposition())[0]
    delta0 = sp.factor(
        raw.subs(
            {
                c[0]: 1,
                c[1]: n,
                c[2]: c2,
                c[3]: c3,
                c[4]: c4,
                c[5]: c5,
                c[6]: c6,
                c[7]: c7,
                h[5]: c5 - a,
                h[6]: c6 - b,
            },
            simultaneous=True,
        )
    )
    assert delta0 < 0
    report = {
        "status": "PASS_EXACT_SCALAR_CONE_OBSTRUCTION_NOT_A_TREE",
        "warning": "Exact failure of the c5-coupled scalar enclosure, not a tree counterexample.",
        "parameters": {"n": n, "r": r, "B2": beta, "neighbor_x": neighbor_x},
        "bulk_row": row,
        "coefficients": {
            "c2": str(c2),
            "c3": str(c3),
            "c4": str(c4),
            "c5": str(c5),
            "c6": str(c6),
            "c7": str(c7),
            "a": str(a),
            "b": str(b),
        },
        "delta0_R1": str(delta0),
        "delta0_decimal": float(delta0),
        "next_missing_coupling": "Use exact c6,c7,H data from the same weighted core rather than independent V6/V7 scalar endpoints.",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
