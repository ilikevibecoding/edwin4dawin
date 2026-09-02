#!/usr/bin/env python3
"""Three-root union-shadow probe for split 2+1 adjacent attachments."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_distributions_exact_rank7_g5_finish_20260831.json"
REPORT_SHA = "D0E4E00568DA8C9AC448D80F005DF18019ED718AF3C1F9B670BEE7D51B5A9B00"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT21_UNIONCAP_RANK7_G5_FINISH"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str, degree_vertex: str):
    assert sha(REPORT) == REPORT_SHA
    reduction = json.loads(REPORT.read_text(encoding="utf-8"))["split_mark_2plus1"]
    m = sp.Symbol("m", positive=True)
    W = {k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}
    locals_ = {"m": m, **{f"W{k}": W[k] for k in W}}
    base = sp.expand(sp.sympify(reduction["loss_zero_base"], locals=locals_))
    pd = {int(k): sp.expand(sp.sympify(v, locals=locals_)) for k, v in reduction["P_coefficients"].items()}
    qd = {int(k): sp.expand(sp.sympify(v, locals=locals_)) for k, v in reduction["Q_coefficients"].items()}
    bilinear = reduction["bilinear_coefficients"]
    assert {name: value for name, value in bilinear.items() if sp.Integer(value) < 0} == {"P2_Q5": "-10", "P5_Q2": "-10"}

    # Preserve the exact total degree of all three roots.  Put r=deg(y) on
    # the single-root P side and D=deg(x1)+deg(x2) on the two-root Q side.
    # Distinct nonisolated components give r>=1, D>=2, r+D<=m-3; the two
    # cube parameters below cover that simplex exactly.
    degree_vertices = {
        "minimum": (sp.Integer(1), sp.Integer(2)),
        "P_min_Q_max": (sp.Integer(1), m-4),
        "P_max_Q_min": (m-5, sp.Integer(2)),
    }
    degree_p, degree_q = degree_vertices[degree_vertex]
    degree_total = degree_p+degree_q

    # P is a single rooted family.  Its exact rank-two row and rooted
    # extension bounds are P2=m-1-r,
    # 2P3<=(m-2-r)P2, 3P4<=(m-3-r)P3.
    p2 = m-1-degree_p
    bp_degree = sp.factor(pd[3]+pd[4]*(m-3-degree_p)/3)
    p3_upper = sp.expand((m-2-degree_p)*p2/2)
    p_lower = sp.expand(pd[2]*p2+bp_degree*p3_upper)

    # For Q meeting two roots, inclusion-exclusion gives Q2=2m-3-D.
    # The double-root rank-three family has m-2-D sets, and the weighted
    # extension count gives
    #   2Q3<=(m-3)Q2-m+1+D,
    #   3Q4<=(m-4)Q3-(m-2-D).
    q2 = 2*m-3-degree_q
    q3_upper = sp.expand(((m-3)*q2-m+1+degree_q)/2)
    bq = sp.factor(qd[3]+qd[4]*(m-4)/3)
    q_lower = sp.expand(qd[2]*q2+bq*q3_upper-qd[4]*(m-2-degree_q)/3)
    lower = sp.expand(base+p_lower+q_lower)
    wmin = choose_poly(m, 2)-(m-1)
    p5_floor = sp.factor((pd[5]-20*(m-1)).subs(W[2], wmin))
    q5_floor = sp.factor((qd[5]-10*(m-1)).subs(W[2], wmin))
    assert p5_floor == 13*m**2-23*m-4
    assert q5_floor == 13*m**2-13*m+11

    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    ex = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    # The three attachment roots lie in distinct W-components, so e<=m-3.
    edge = m/2+(m/2-3)*ep
    omega_low, omega_high = 2*edge-m, edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*m-12*edge+6*m)/(8*edge))
    omega = sp.cancel(omega_low+op*(boundary-omega_low)) if chart == "low_excess" else sp.cancel(boundary+op*(omega_high-boundary))
    excess = omega-2*edge+m
    tau_upper = 2*edge-m+sp.Rational(11, 6)*edge*excess if chart == "low_excess" else omega*edge/2
    tau = sp.cancel(tp*tau_upper)
    bad4 = edge*choose_poly(m-2, 2)-omega*(m-4)-edge*(edge-1)/2+tau
    rows = {2: choose_poly(m, 2)-edge, 3: choose_poly(m, 3)-edge*(m-2)+omega, 4: choose_poly(m, 4)-bad4}
    for rank in range(5, 9):
        previous = rank-1
        lo = ((m-previous)*rows[previous]-2*edge*choose_poly(m-2, previous-1))/rank
        hi = (m-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(lo+ex[rank]*(hi-lo))
    substitutions = {W[k]: rows[k] for k in W}
    degree_data = {
        "degree_total": degree_total,
        "degree_p": degree_p,
        "degree_q": degree_q,
        "p2": p2,
        "bp_degree": bp_degree,
        "p3_upper": p3_upper,
        "p_lower": p_lower,
        "q2": q2,
        "bq": bq,
        "q3_upper": q3_upper,
        "q_lower": q_lower,
    }
    return m, (ep, op, tp, *(ex[k] for k in range(5, 9))), sp.cancel(lower.subs(substitutions)), base, pd, qd, lower, p5_floor, q5_floor, degree_data


def summarize(expression, variables, m, threshold):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(value > 0 for value in sp.Poly(denominator, tail, variables[0]).coeffs())
    return fast_summary(numerator, variables, tail), str(sp.factor(denominator))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--degree-vertex", choices=("minimum", "P_min_Q_max", "P_max_Q_min"), required=True)
    parser.add_argument("--threshold-m", type=int, default=9)
    args = parser.parse_args()
    m, variables, value, base, pd, qd, lower, p5_floor, q5_floor, degree_data = build_value(args.chart, args.degree_vertex)
    summary, denominator = summarize(value, variables, m, args.threshold_m)
    output = HERE / ("iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_unioncap_" + args.degree_vertex + "_" + args.chart + f"_n{args.threshold_m+2}_probe_rank7_g5_finish_20260831.json")
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart,
        "degree_vertex": args.degree_vertex,
        "threshold_m": args.threshold_m,
        "threshold_n": args.threshold_m+2,
        "loss_zero_base": str(base),
        "P_coefficients": {str(k): str(v) for k, v in pd.items()},
        "Q_coefficients": {str(k): str(v) for k, v in qd.items()},
        "rank5_absorption_floors": {"P5": str(p5_floor), "Q5": str(q5_floor)},
        "degree_coupled_shadow": {key: str(value) for key, value in degree_data.items()} | {"safe_lower": str(lower)},
        "summary": summary,
        "positive_denominator": denominator,
        "scope": "2+1 attachments, all roots nonisolated in distinct W-components, W isolate-free.",
        "source_sha256": sha(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "chart": args.chart, "degree_vertex": args.degree_vertex, "main_negatives": summary["negative_tail_scalar_coefficients"], "minimum": summary["minimum_tail_scalar_coefficient"], "first_negative": summary["first_negative"]}, indent=2))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
