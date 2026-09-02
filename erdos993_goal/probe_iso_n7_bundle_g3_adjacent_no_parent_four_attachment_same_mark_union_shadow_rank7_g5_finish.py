#!/usr/bin/env python3
"""Weighted union-shadow probe for same-mark 4+0 adjacent attachments."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
REPORT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SAME_MARK_UNION_SHADOW_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    assert sha256(REPORT) == REPORT_SHA
    reduction = json.loads(REPORT.read_text(encoding="utf-8"))
    m = sp.Symbol("m", positive=True)
    a, b_count = sp.symbols("a b", nonnegative=True, integer=True)
    W = {k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}
    Q = {k: sp.Symbol(f"Q{k}", nonnegative=True) for k in range(2, 8)}
    locals_ = {"m": m, "a": a, "b": b_count, **{f"W{k}": W[k] for k in W}}
    base = sp.expand(sp.sympify(reduction["loss_zero_base"], locals=locals_).subs({a: 4, b_count: 0}))
    d = {int(k): sp.expand(sp.sympify(value, locals=locals_).subs({a: 4, b_count: 0})) for k, value in reduction["Q_linear_coefficients"].items()}

    # For r=4 mutually nonadjacent roots in distinct nontrivial components,
    # D=sum deg(root) satisfies 4<=D<=m-4 and Q2=4m-10-D.
    # Weighted extension counting gives
    #   2Q3 <= (m-3)Q2-C(4,2)-H3,
    #   H3=6(m-2)-3D-2C(4,3)=6m-20-3D.
    # At rank four, E3=6(m-2)-3D-C(4,3)=6m-16-3D,
    # while the independent sets containing at least three roots give
    # H4>=4(m-3)-3D-3=4m-15-3D.  Hence
    #   3Q4 <= (m-4)Q3-10m+31+6D.
    nested_b = sp.factor(d[3]+d[4]*(m-4)/3)
    nested_c = sp.factor(d[2]+nested_b*(m-3)/2)
    degree_parameter = sp.Symbol("root_degree_parameter", nonnegative=True)
    degree_sum = 4+(m-8)*degree_parameter
    q2 = 4*m-10-degree_sum
    h3 = 6*m-20-3*degree_sum
    q3_upper = sp.expand(((m-3)*q2-6-h3)/2)
    e3 = 6*m-16-3*degree_sum
    h4_lower = 4*m-15-3*degree_sum
    q4_extra = sp.expand(-e3-h4_lower)
    assert sp.expand(q4_extra-(-10*m+31+6*degree_sum)) == 0
    lower = sp.expand(base+d[2]*q2+nested_b*q3_upper+d[4]*q4_extra/3)

    edge_parameter, omega_parameter, tau_parameter = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = m/2+(m/2-4)*edge_parameter
    omega_low, omega_high = 2*edge-m, edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*m-12*edge+6*m)/(8*edge))
    omega = sp.cancel(omega_low+omega_parameter*(boundary-omega_low)) if chart == "low_excess" else sp.cancel(boundary+omega_parameter*(omega_high-boundary))
    excess = omega-2*edge+m
    tau_upper = 2*edge-m+sp.Rational(11, 6)*edge*excess if chart == "low_excess" else omega*edge/2
    tau = sp.cancel(tau_parameter*tau_upper)
    bad4 = edge*choose_poly(m-2, 2)-omega*(m-4)-edge*(edge-1)/2+tau
    rows = {
        2: choose_poly(m, 2)-edge,
        3: choose_poly(m, 3)-edge*(m-2)+omega,
        4: choose_poly(m, 4)-bad4,
    }
    for rank in range(5, 9):
        previous = rank-1
        low = ((m-previous)*rows[previous]-2*edge*choose_poly(m-2, previous-1))/rank
        high = (m-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    substitutions = {W[k]: rows[k] for k in W}
    return (
        m,
        (edge_parameter, omega_parameter, tau_parameter, degree_parameter, *(extensions[k] for k in range(5, 9))),
        sp.cancel(lower.subs(substitutions)),
        sp.cancel(nested_b.subs({W[k]: rows[k] for k in range(2, 5)})),
        sp.cancel(nested_c.subs({W[k]: rows[k] for k in range(2, 7)})),
        base,
        d,
        nested_b,
        nested_c,
        lower,
        degree_sum,
        q2,
        h3,
        q3_upper,
        e3,
        h4_lower,
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
    values = build_value(args.chart)
    m, variables, value, b_value, c_value = values[:5]
    summary, denominator = summarize(value, variables, m, args.threshold_m)
    sign_variables = (variables[0], variables[1], variables[2], variables[4], variables[5])
    b_summary, b_denominator = summarize(-b_value, sign_variables[:4], m, args.threshold_m)
    c_summary, c_denominator = summarize(-c_value, sign_variables, m, args.threshold_m)
    base, d, nested_b, nested_c, lower, degree_sum, q2, h3, q3_upper, e3, h4_lower, q4_extra = values[5:]
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_union_shadow_{args.chart}_n{args.threshold_m+2}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart,
        "threshold_m": args.threshold_m,
        "threshold_n": args.threshold_m+2,
        "loss_zero_base": str(base),
        "loss_coefficients": {str(k): str(value) for k, value in d.items()},
        "union_shadow": {
            "nested_b": str(nested_b),
            "nested_c": str(nested_c),
            "degree_sum": str(degree_sum),
            "Q2_exact": str(q2),
            "H3_exact": str(h3),
            "Q3_upper": str(q3_upper),
            "E3_exact": str(e3),
            "H4_lower": str(h4_lower),
            "Q4_extra": str(q4_extra),
            "safe_lower": str(lower),
        },
        "summary": summary,
        "positive_denominator": denominator,
        "negative_b_summary": b_summary,
        "positive_b_denominator": b_denominator,
        "negative_c_summary": c_summary,
        "positive_c_denominator": c_denominator,
        "scope": "4+0 attachments, all roots nonisolated in distinct W-components, W isolate-free.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "chart": args.chart,
        "main_negatives": summary["negative_tail_scalar_coefficients"],
        "minus_b_negatives": b_summary["negative_tail_scalar_coefficients"],
        "minus_c_negatives": c_summary["negative_tail_scalar_coefficients"],
        "minimum": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
