#!/usr/bin/env python3
"""Split-mark two-root shadow probe for adjacent no-parent G3."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
DERIVE_REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_exact_rank7_g5_finish_20260831.json"
DERIVE_REPORT_SHA256 = "46B51E942EB3E86CB2B1F39A6E90BE0B5E67E5E40EF9989337825E65B59B1C6D"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_BOTH_NONISOLATED_INTERSECTED_TAU_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    assert sha256(DERIVE_REPORT) == DERIVE_REPORT_SHA256
    split = json.loads(DERIVE_REPORT.read_text(encoding="utf-8"))["split_mark"]
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)})
    locals_ = {"m": m, **{f"W{k}": W[k] for k in range(2, 9)}}
    base = sp.expand(sp.sympify(split["root_zero_base"], locals=locals_))
    coefficients = {int(k): sp.expand(sp.sympify(v, locals=locals_)) for k, v in split["Rx_linear_coefficients"].items()}
    assert split["Rx_linear_coefficients"] == split["Ry_linear_coefficients"]
    bilinear = split["bilinear_coefficients"]
    assert {name: value for name, value in bilinear.items() if sp.Integer(value) < 0} == {"Rx2_Ry5": "-10", "Rx5_Ry2": "-10"}

    # The negative bilinear terms are absorbed rather than relaxed separately:
    # R5x*(d5-10 R2y)>=0 and symmetrically.  Indeed R2y<=m-1,
    # W2>=C(m,2)-(m-1), so d5-10R2y>=13m^2-13m+11>0.
    rank5_absorption_floor = sp.expand(coefficients[5]-10*(m-1)).subs(W[2], choose_poly(m, 2)-(m-1))
    assert sp.factor(rank5_absorption_floor) == 13*m**2-13*m+11
    b = sp.factor(coefficients[3]+coefficients[4]*(m-4)/3)
    c = sp.factor(coefficients[2]+b*(m-3)/2)
    lower = sp.expand(base+2*(m-2)*c)

    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = m/2+(m/2-1)*ep
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
        low = ((m-previous)*rows[previous]-2*edge*choose_poly(m-2, previous-1))/rank
        high = (m-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    substitutions = {W[k]: rows[k] for k in range(2, 9)}
    value = sp.cancel(lower.subs(substitutions))
    c_value = sp.cancel(c.subs({W[k]: rows[k] for k in range(2, 7)}))
    return m, (ep, op, tp, *(extensions[k] for k in range(5, 9))), value, c_value, base, coefficients, b, c, lower, rank5_absorption_floor


def fast(expression, variables, m, threshold):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(v > 0 for v in sp.Poly(denominator, tail, variables[0]).coeffs())
    return fast_summary(numerator, variables, tail), str(sp.factor(denominator))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-m", type=int, default=9)
    args = parser.parse_args()
    m, variables, value, c_value, base, coefficients, b, c, lower, rank5_floor = build_value(args.chart)
    summary, denominator = fast(value, variables, m, args.threshold_m)
    c_summary, c_denominator = fast(-c_value, variables[:5], m, args.threshold_m)
    output = HERE / ("iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_nonisolated_intersected_tau_" + args.chart + f"_n{args.threshold_m+2}_probe_rank7_g5_finish_20260831.json")
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart,
        "threshold_m": args.threshold_m,
        "threshold_n": args.threshold_m+2,
        "root_zero_base": str(base),
        "root_linear_coefficients": {str(k): str(v) for k, v in coefficients.items()},
        "rank5_bilinear_absorption_floor": str(rank5_floor),
        "nested_shadow_b": str(b),
        "endpoint_c": str(c),
        "safe_lower": str(lower),
        "summary": summary,
        "positive_denominator": denominator,
        "negative_c_summary": c_summary,
        "positive_c_denominator": c_denominator,
        "scope": "Split-mark exactly two attachments, both roots nonisolated, W isolate-free.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "chart": args.chart, "main_negatives": summary["negative_tail_scalar_coefficients"], "minus_c_negatives": c_summary["negative_tail_scalar_coefficients"], "minimum": summary["minimum_tail_scalar_coefficient"], "first_negative": summary["first_negative"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
