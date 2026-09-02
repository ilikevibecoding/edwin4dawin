#!/usr/bin/env python3
"""Two-root bilinear shadow probe for the split p0_q1 pattern."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_exact_rank7_g5_finish_20260831.json"
REPORT_SHA = "9BCB510FBD8C450A50B6905962E2464CF7B805887D0E3F0225A686EDF729E52F"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT_P0Q1_MIXED_ISOLATED_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    assert sha256(REPORT) == REPORT_SHA
    branch = json.loads(REPORT.read_text(encoding="utf-8"))["split_mark_2plus1"]["p0_q1"]
    h = sp.Symbol("h", positive=True)
    A = {0: sp.Integer(1), 1: h, **{k: sp.Symbol(f"A{k}", nonnegative=True) for k in range(2, 9)}}
    R = {k: sp.Symbol(f"R{k}", nonnegative=True) for k in range(2, 8)}
    U = {k: sp.Symbol(f"U{k}", nonnegative=True) for k in range(2, 8)}
    locals_ = {"h": h, **{f"A{k}": A[k] for k in range(2, 9)}, **{f"R{k}": R[k] for k in R}, **{f"U{k}": U[k] for k in U}}
    exact = sp.expand(sp.sympify(branch["identity_in_H_rows"], locals=locals_))
    zero = {**{R[k]: 0 for k in R}, **{U[k]: 0 for k in U}}
    base = sp.expand(exact.subs(zero))
    rd = {k: sp.factor(sp.diff(exact, R[k]).subs({U[j]: 0 for j in U})) for k in R}
    ud = {k: sp.factor(sp.diff(exact, U[k]).subs({R[j]: 0 for j in R})) for k in U}
    bilinear = {(i, j): sp.factor(sp.diff(exact, R[i], U[j])) for i in R for j in U if sp.diff(exact, R[i], U[j]) != 0}
    assert {(i, j): value for (i, j), value in bilinear.items() if value < 0} == {(2, 5): -10, (5, 2): -10}
    reconstructed = base+sum(rd[k]*R[k]+ud[k]*U[k] for k in R)+sum(value*R[i]*U[j] for (i, j), value in bilinear.items())
    assert sp.expand(exact-reconstructed) == 0

    br = sp.factor(rd[3]+rd[4]*(h-4)/3)
    cr = sp.factor(rd[2]+br*(h-3)/2)
    bu = sp.factor(ud[3]+ud[4]*(h-4)/3)
    cu = sp.factor(ud[2]+bu*(h-3)/2)
    lower = sp.expand(base+(h-2)*(cr+cu))
    Amin = choose_poly(h, 2)-(h-1)
    r5_floor = sp.factor((rd[5]-10*(h-2)).subs(A[2], Amin))
    u5_floor = sp.factor((ud[5]-10*(h-2)).subs(A[2], Amin))
    assert sp.expand(r5_floor-2*(11*h**2+14*h+34)) == 0
    assert sp.expand(u5_floor-(13*h**2+13*h+47)) == 0

    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = h/2+(h/2-2)*ep
    omega_low, omega_high = 2*edge-h, edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*h-12*edge+6*h)/(8*edge))
    omega = sp.cancel(omega_low+op*(boundary-omega_low)) if chart == "low_excess" else sp.cancel(boundary+op*(omega_high-boundary))
    excess = omega-2*edge+h
    tau_upper = 2*edge-h+sp.Rational(11, 6)*edge*excess if chart == "low_excess" else omega*edge/2
    tau = sp.cancel(tp*tau_upper)
    bad4 = edge*choose_poly(h-2, 2)-omega*(h-4)-edge*(edge-1)/2+tau
    rows = {2: choose_poly(h, 2)-edge, 3: choose_poly(h, 3)-edge*(h-2)+omega, 4: choose_poly(h, 4)-bad4}
    for rank in range(5, 9):
        previous = rank-1
        lo = ((h-previous)*rows[previous]-2*edge*choose_poly(h-2, previous-1))/rank
        hi = (h-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(lo+extensions[rank]*(hi-lo))
    substitutions = {A[k]: rows[k] for k in range(2, 9)}
    sign_substitutions = {A[k]: rows[k] for k in range(2, 7)}
    return h, (ep, op, tp, *(extensions[k] for k in range(5, 9))), sp.cancel(lower.subs(substitutions)), sp.cancel(cr.subs(sign_substitutions)), sp.cancel(cu.subs(sign_substitutions)), exact, base, rd, ud, bilinear, br, cr, bu, cu, lower, r5_floor, u5_floor


def summarize(expression, variables, h, threshold):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(v > 0 for v in sp.Poly(denominator, tail, variables[0]).coeffs())
    return fast_summary(numerator, variables, tail), str(sp.factor(denominator))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    args = parser.parse_args()
    values = build_value(args.chart)
    h, variables, value, cr_value, cu_value = values[:5]
    summary, denominator = summarize(value, variables, h, 8)
    cr_summary, cr_denominator = summarize(-cr_value, variables[:5], h, 8)
    cu_summary, cu_denominator = summarize(-cu_value, variables[:5], h, 8)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q1_{args.chart}_h8_probe_rank7_g5_finish_20260831.json"
    report = {"marker": MARKER, "status": "exact diagnostic relaxation; no theorem asserted", "pattern": "p0_q1", "chart": args.chart, "threshold_h": 8, "threshold_n": 11, "summary": summary, "positive_denominator": denominator, "negative_cR_summary": cr_summary, "positive_cR_denominator": cr_denominator, "negative_cU_summary": cu_summary, "positive_cU_denominator": cu_denominator, "safe_lower": str(values[14]), "rank5_absorption_floors": {"R5": str(values[15]), "U5": str(values[16])}, "scope": "Split p0_q1 exactly-three adjacent no-parent attachments; isolated Q root deleted, H isolate-free, surviving P/Q roots nonisolated in distinct components.", "source_sha256": sha256(Path(__file__))}
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "chart": args.chart, "main_negatives": summary["negative_tail_scalar_coefficients"], "minus_cR": cr_summary["negative_tail_scalar_coefficients"], "minus_cU": cu_summary["negative_tail_scalar_coefficients"], "minimum": summary["minimum_tail_scalar_coefficient"], "first_negative": summary["first_negative"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
