#!/usr/bin/env python3
"""Exact two-tail reduction for the remaining rank-eight low/low cone.

This is a reduction only.  Assuming the low/high edge theorem, it shows that
the low/low interior is reduced to four new Bernstein auxiliaries: the middle
and far endpoint of two explicit quadratics.  It deliberately makes no sign
claim for those four auxiliaries.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_double_tail_reduction_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expression_sha256(expression: sp.Expr) -> str:
    canonical = sp.sstr(sp.expand(expression), order="lex")
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest().upper()


def main() -> None:
    h, C, D, x, y = sp.symbols("h C D x y", positive=True)
    pieces = {
        rank: sp.symbols(
            f"hh{rank} lh{rank} rh{rank} tt{rank}", nonnegative=True
        )
        for rank in (7, 8, 9)
    }

    # hh/lh/rh/tt denote head-head, left-tail/head, head/right-tail, and
    # tail-tail contributions.  At x=y=0 both factors are their high bases;
    # the two low factors are obtained by tail multipliers 1+x and 1+y.
    rows = {}
    for rank, (hh, lh, rh, tt) in pieces.items():
        rows[rank] = sp.expand(
            hh + (1 + x) * lh + (1 + y) * rh + (1 + x) * (1 + y) * tt
        )

    margin = sp.expand(
        8 * rows[8] ** 2 - 9 * rows[7] * rows[9] - h * rows[7] * rows[8]
    )
    assert sp.Poly(margin, x, y).degree(x) == 2
    assert sp.Poly(margin, x, y).degree(y) == 2

    x_poly = sp.Poly(margin, x)
    base_edge = sp.expand(x_poly.coeff_monomial(1))
    derivative = sp.expand(x_poly.coeff_monomial(x))
    curvature = sp.expand(x_poly.coeff_monomial(x**2))
    assert sp.expand(margin - (base_edge + x * derivative + x**2 * curvature)) == 0
    assert sp.expand(base_edge - margin.subs(x, 0)) == 0

    # If the right factor is already low, the same one-variable tail argument
    # used for low/high needs curvature>=0 and C*base+h*derivative>=0.
    strong = sp.expand(C * base_edge + h * derivative)
    auxiliaries = {"tail_curvature": curvature, "strong_payment": strong}
    interval = sp.cancel(h / D)
    rows_out = []
    for label, polynomial in auxiliaries.items():
        poly = sp.Poly(polynomial, y)
        assert poly.degree() == 2
        p0 = sp.expand(poly.coeff_monomial(1))
        p1 = sp.expand(poly.coeff_monomial(y))
        p2 = sp.expand(poly.coeff_monomial(y**2))
        bernstein = [
            p0,
            sp.expand(p0 + interval * p1 / 2),
            sp.expand(p0 + interval * p1 + interval**2 * p2),
        ]
        assert sp.cancel(
            polynomial
            - (
                bernstein[0] * (1 - y / interval) ** 2
                + 2 * bernstein[1] * (y / interval) * (1 - y / interval)
                + bernstein[2] * (y / interval) ** 2
            )
        ) == 0
        rows_out.append(
            {
                "auxiliary": label,
                "degree_in_right_tail_boost": 2,
                "power_coefficient_sha256": [
                    expression_sha256(value) for value in (p0, p1, p2)
                ],
                "bernstein_coefficient_sha256": [
                    expression_sha256(value) for value in bernstein
                ],
                "already_paid_coefficient": 0,
                "new_coefficients": [1, 2],
            }
        )

    # Recheck the one-variable sufficiency algebra with abstract signs.  For
    # d<0 and 0<=x<=h/C, convexity gives F>=M0+(h/C)d=strong/C.
    M0, d, q = sp.symbols("M0 d q")
    assert sp.expand(M0 + (h / C) * d - (C * M0 + h * d) / C) == 0

    payload = {
        "schema": "rank8-low-low-double-tail-reduction-v1",
        "status": "PASS_EXACT_LOW_LOW_REDUCTION_NOT_CONE_THEOREM",
        "normalized_margin": "8*s8^2-9*s7*s9-h*s7*s8",
        "tail_coordinates": {
            "left": "lambda=1+x with 0<=x<=h/C and C>=6h",
            "right": "mu=1+y with 0<=y<=h/D and D>=6h",
            "row_decomposition": "s_r=hh_r+(1+x)lh_r+(1+y)rh_r+(1+x)(1+y)tt_r",
        },
        "exact_x_identity": "M(x,y)=M(0,y)+x*d_x(y)+x^2*q_x(y)",
        "sufficiency": (
            "Assuming the low/high edge M(0,y)>=0, it is sufficient to prove "
            "q_x(y)>=0 and C*M(0,y)+h*d_x(y)>=0 on 0<=y<=h/D. "
            "Each is exactly quadratic in y."
        ),
        "bernstein_reduction": rows_out,
        "already_closed_inputs_needed": [
            "low/high edge M(0,y)>=0",
            "high/high tail curvature q_x(0)>=0",
            "high/high strong payment C*M(0,0)+h*d_x(0)>=0",
        ],
        "new_exact_targets": [
            "middle Bernstein coefficient of q_x(y)",
            "far-end Bernstein coefficient q_x(h/D)",
            "middle Bernstein coefficient of C*M(0,y)+h*d_x(y)",
            "far-end Bernstein coefficient at y=h/D",
        ],
        "identity_checks": {
            "bidegree": [2, 2],
            "x_quadratic_remainder": "0",
            "two_bernstein_remainders": ["0", "0"],
            "strong_endpoint_remainder": "0",
        },
        "scope_warning": (
            "This report proves only a no-gap algebraic reduction.  The four "
            "new Bernstein auxiliaries are unsigned, so it does not prove the "
            "low/low cone, forest Q8, PGC, or Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("NEW_TARGETS", len(payload["new_exact_targets"]))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
