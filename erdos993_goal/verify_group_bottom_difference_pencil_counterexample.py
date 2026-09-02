#!/usr/bin/env python3
"""Exact counterexample to the stronger contiguous bottom-difference pencil.

The fixed specialization u=1 is the group preimage still needed in the main
proof.  This script only rules out the stronger claim that the polynomial is
real stable when u is promoted to an additional variable.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from probe_group_as_bottom_difference import bottom, x, y


OUT = Path("group_bottom_difference_pencil_counterexample_20260803.json")
u = sp.symbols("u")


def main() -> None:
    m = 1
    N, d = 3 * m + 4, 2 * m + 5
    pencil = sp.expand(bottom(N + 1, d) - u * bottom(N, d - 2))
    specialization = sp.Poly(pencil.subs({y: 0, u: 3}), x)
    primitive = sp.Poly(sp.primitive(specialization.as_expr(), x)[1], x)

    expected_coefficients = [
        3,
        770,
        74200,
        3360504,
        75678960,
        838965120,
        4294200960,
        8808156000,
        5164992000,
    ]
    assert primitive.all_coeffs() == expected_coefficients
    real_roots = primitive.count_roots(-sp.oo, sp.oo)
    assert primitive.degree() == 8
    assert real_roots == 6

    # The equivalent proper-position obstruction: the Wronskian changes sign.
    f = bottom(N + 1, d)
    g = bottom(N, d - 2)
    wronskian = sp.expand(g * sp.diff(f, x) - f * sp.diff(g, x))
    w0 = sp.factor(wronskian.subs({x: 0, y: 0}))
    w100 = sp.factor(wronskian.subs({x: 100, y: 0}))
    assert w0 < 0 < w100

    report = {
        "status": "PASS_EXACT_COUNTEREXAMPLE_TO_STRONGER_PENCIL",
        "claim_ruled_out": "F_(N+1,d)-u F_(N,d-2) is real stable in (X,Y,u)",
        "m": m,
        "N": N,
        "d": d,
        "specialization": {"Y": 0, "u": 3},
        "primitive_coefficients_descending": expected_coefficients,
        "degree": int(primitive.degree()),
        "exact_real_root_count": int(real_roots),
        "nonreal_roots": int(primitive.degree() - real_roots),
        "wronskian_values": {"X=0,Y=0": str(w0), "X=100,Y=0": str(w100)},
        "does_not_rule_out": "the required fixed specialization u=1",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
