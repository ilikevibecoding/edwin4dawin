#!/usr/bin/env python3
"""Three-root union-shadow probe for same-mark 3+0 adjacent attachments."""
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
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SAME_MARK_UNIONCAP_RANK7_G5_FINISH"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    assert sha(REPORT) == REPORT_SHA
    reduction = json.loads(REPORT.read_text(encoding="utf-8"))["same_mark_3plus0"]
    m = sp.Symbol("m", positive=True)
    W = {k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}
    locals_ = {"m": m, **{f"W{k}": W[k] for k in W}}
    base = sp.expand(sp.sympify(reduction["loss_zero_base"], locals=locals_))
    d = {int(k): sp.expand(sp.sympify(v, locals=locals_)) for k, v in reduction["Q_coefficients"].items()}

    # Q_k counts independent k-sets meeting the three roots.  Every Q_3 set
    # has at least one forbidden root-neighbour outside it, so
    # 3 Q_4 <= (m-4) Q_3; similarly 2 Q_3 <= (m-3) Q_2.
    # Inclusion-exclusion gives Q_2=3m-6-sum_i deg(x_i), hence all three
    # roots nonisolated imply the exact safe cap Q_2<=3(m-3).  A weighted
    # extension count retains the overlap rebates: writing E_k for total
    # root-multiplicity minus Q_k and H_k for sets containing at least two
    # roots gives
    #   k Q_{k+1}+H_{k+1} <= (m-k-1)Q_k-E_k.
    # Let D be the sum of the three root degrees.  Inclusion-exclusion gives
    # Q_2=3m-6-D, H_3=3m-8-2D, and E_3=3m-7-2D.  The triple-root family at
    # rank four has m-3-D members, so H_4>=m-3-D.  Consequently
    #   2Q_3 <= (m-3)Q_2-3-H_3,
    #   3Q_4 <= (m-4)Q_3-4m+10+3D.
    # Distinct nonisolated root components give 3<=D<=m-3.
    b = sp.factor(d[3] + d[4]*(m-4)/3)
    c = sp.factor(d[2] + b*(m-3)/2)
    degree_parameter = sp.Symbol("root_degree_parameter", nonnegative=True)
    degree_sum = 3+(m-6)*degree_parameter
    q2 = 3*m-6-degree_sum
    h3 = 3*m-8-2*degree_sum
    q3_upper = sp.expand(((m-3)*q2-3-h3)/2)
    q4_extra = -4*m+10+3*degree_sum
    lower = sp.expand(base+d[2]*q2+b*q3_upper+d[4]*q4_extra/3)

    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    ex = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    # Three roots in distinct W-components force at least three components,
    # hence e(W)=m-c(W)<=m-3 (in addition to isolate-free e>=m/2).
    edge = m/2 + (m/2-3)*ep
    omega_low, omega_high = 2*edge-m, edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*m-12*edge+6*m)/(8*edge))
    omega = sp.cancel(omega_low+op*(boundary-omega_low)) if chart == "low_excess" else sp.cancel(boundary+op*(omega_high-boundary))
    excess = omega-2*edge+m
    tau_upper = 2*edge-m+sp.Rational(11, 6)*edge*excess if chart == "low_excess" else omega*edge/2
    tau = sp.cancel(tp*tau_upper)
    bad4 = edge*choose_poly(m-2, 2)-omega*(m-4)-edge*(edge-1)/2+tau
    rows = {
        2: choose_poly(m, 2)-edge,
        3: choose_poly(m, 3)-edge*(m-2)+omega,
        4: choose_poly(m, 4)-bad4,
    }
    for rank in range(5, 9):
        previous = rank-1
        lo = ((m-previous)*rows[previous]-2*edge*choose_poly(m-2, previous-1))/rank
        hi = (m-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(lo+ex[rank]*(hi-lo))
    substitutions = {W[k]: rows[k] for k in W}
    return (
        m,
        (ep, op, tp, degree_parameter, *(ex[k] for k in range(5, 9))),
        sp.cancel(lower.subs(substitutions)),
        sp.cancel(c.subs({W[k]: rows[k] for k in range(2, 7)})),
        base,
        d,
        b,
        c,
        lower,
        degree_sum,
        q2,
        q3_upper,
        q4_extra,
    )


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
    parser.add_argument("--threshold-m", type=int, default=9)
    args = parser.parse_args()
    m, variables, value, c_value, base, d, b, c, lower, degree_sum, q2, q3_upper, q4_extra = build_value(args.chart)
    summary, denominator = summarize(value, variables, m, args.threshold_m)
    sign_variables = (variables[0], variables[1], variables[2], variables[4], variables[5])
    c_summary, c_denominator = summarize(-c_value, sign_variables, m, args.threshold_m)
    output = HERE / ("iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_unioncap_" + args.chart + f"_n{args.threshold_m+2}_probe_rank7_g5_finish_20260831.json")
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart,
        "threshold_m": args.threshold_m,
        "threshold_n": args.threshold_m+2,
        "loss_zero_base": str(base),
        "loss_coefficients": {str(k): str(v) for k, v in d.items()},
        "union_shadow": {"b": str(b), "c": str(c), "degree_sum": str(degree_sum), "Q2_exact": str(q2), "Q3_upper": str(q3_upper), "Q4_extra": str(q4_extra), "safe_lower": str(lower)},
        "summary": summary,
        "positive_denominator": denominator,
        "negative_c_summary": c_summary,
        "positive_c_denominator": c_denominator,
        "scope": "3+0 attachments, all roots nonisolated in distinct W-components, W isolate-free.",
        "source_sha256": sha(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "chart": args.chart, "main_negatives": summary["negative_tail_scalar_coefficients"], "minus_c_negatives": c_summary["negative_tail_scalar_coefficients"], "minimum": summary["minimum_tail_scalar_coefficient"], "first_negative": summary["first_negative"]}, indent=2))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
