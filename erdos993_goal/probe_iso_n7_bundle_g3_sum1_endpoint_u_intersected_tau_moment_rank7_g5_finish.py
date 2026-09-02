#!/usr/bin/env python3
"""Exact inactive-endpoint common0/sum1 G3 moment probe with sign audits."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g3_sum1_endpoint_intersected_tau_moment_rank7_g5_finish import (
    build_value,
    reduced,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_U_INTERSECTED_TAU_MOMENT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def moment_rows(chart: str):
    m, W, _R, _exact, _base, coefficients, b, _c = reduced("endpoint_u")
    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    edge = m/2+(m/2-1)*ep
    low = 2*edge-m
    high = edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*m-12*edge+6*m)/(8*edge))
    omega = sp.cancel(low+op*(boundary-low)) if chart == "low_excess" else sp.cancel(boundary+op*(high-boundary))
    Q = omega-2*edge+m
    tau_upper = 2*edge-m+sp.Rational(11, 6)*edge*Q if chart == "low_excess" else omega*edge/2
    tau = sp.cancel(tp*tau_upper)
    bad4 = edge*choose_poly(m-2, 2)-omega*(m-4)-edge*(edge-1)/2+tau
    rows = {
        2: choose_poly(m, 2)-edge,
        3: choose_poly(m, 3)-edge*(m-2)+omega,
        4: choose_poly(m, 4)-bad4,
    }
    return m, (ep, op, tp), rows, coefficients[4], b


def summarize(expression, variables, m, threshold_m):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail+threshold_m))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(value > 0 for value in sp.Poly(denominator, tail, variables[0]).coeffs())
    return fast_summary(numerator, variables, tail), sp.factor(denominator)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-n", type=int, default=11)
    args = parser.parse_args()
    threshold_m = args.threshold_n-2
    m, variables, value, c_value, exact, base, coefficients, b, c, lower = build_value("endpoint_u", args.chart)
    summary, denominator = summarize(value, variables, m, threshold_m)
    c_summary, c_denominator = summarize(-c_value, variables[:5], m, threshold_m)

    sign_m, sign_variables, rows, d4, sign_b = moment_rows(args.chart)
    assert sign_m == m and sp.expand(sign_b-b) == 0 and sp.expand(d4-coefficients[4]) == 0
    d4_value = sp.cancel(-d4.subs({sp.Symbol(f"W{k}", nonnegative=True): rows[k] for k in range(2, 5)}))
    b_value = sp.cancel(-b.subs({sp.Symbol(f"W{k}", nonnegative=True): rows[k] for k in range(2, 5)}))
    d4_summary, d4_denominator = summarize(d4_value, sign_variables, m, threshold_m)
    b_summary, b_denominator = summarize(b_value, sign_variables, m, threshold_m)
    output = HERE / (
        "iso_n7_bundle_g3_sum1_endpoint_u_intersected_tau_" + args.chart
        + f"_n{args.threshold_n}_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER, "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart, "threshold_n": args.threshold_n,
        "exact_expression": str(exact), "R_zero_base_expression": str(base),
        "R_coefficients": {str(rank): str(value) for rank, value in coefficients.items()},
        "nested_shadow_b": str(b), "endpoint_c": str(c), "safe_lower": str(lower),
        "positive_denominator": str(denominator), "summary": summary,
        "negative_c_certificate_summary": c_summary, "positive_c_denominator": str(c_denominator),
        "negative_d4_certificate_summary": d4_summary, "positive_d4_denominator": str(d4_denominator),
        "negative_b_certificate_summary": b_summary, "positive_b_denominator": str(b_denominator),
        "scope": "endpoint_u with B active (inactive endpoint), isolate-free W, common0/sum1 G3.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "chart": args.chart,
        "main_negatives": summary["negative_tail_scalar_coefficients"],
        "minus_c_negatives": c_summary["negative_tail_scalar_coefficients"],
        "minus_d4_negatives": d4_summary["negative_tail_scalar_coefficients"],
        "minus_b_negatives": b_summary["negative_tail_scalar_coefficients"],
        "main_minimum": summary["minimum_tail_scalar_coefficient"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
