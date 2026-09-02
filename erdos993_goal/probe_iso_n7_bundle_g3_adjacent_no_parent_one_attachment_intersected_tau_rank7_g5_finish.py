#!/usr/bin/env python3
"""Nested-shadow moment probe for adjacent no-parent one attachment."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_root_rank7_g5_finish import reduced
from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_INTERSECTED_TAU_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    m, W, R, exact, base, coefficients = reduced()
    b = sp.factor(coefficients[3]+coefficients[4]*(m-4)/3)
    c = sp.factor(coefficients[2]+b*(m-3)/2)
    lower = sp.expand(base+(m-2)*c)
    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = m/2+(m/2-1)*ep
    omega_low, omega_high = 2*edge-m, edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*m-12*edge+6*m)/(8*edge))
    omega = sp.cancel(omega_low+op*(boundary-omega_low)) if chart == "low_excess" else sp.cancel(boundary+op*(omega_high-boundary))
    Q = omega-2*edge+m
    tau_upper = 2*edge-m+sp.Rational(11, 6)*edge*Q if chart == "low_excess" else omega*edge/2
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
    return m, (ep, op, tp, *(extensions[k] for k in range(5, 9))), value, c_value, exact, base, coefficients, b, c, lower


def summary(expression, variables, m, threshold):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(v > 0 for v in sp.Poly(denominator, tail, variables[0]).coeffs())
    return fast_summary(numerator, variables, tail), sp.factor(denominator)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    args = parser.parse_args()
    m, variables, value, c_value, exact, base, coefficients, b, c, lower = build_value(args.chart)
    main_summary, denominator = summary(value, variables, m, 9)
    c_summary, c_denominator = summary(-c_value, variables[:5], m, 9)
    tail = sp.Symbol("tail", nonnegative=True)
    W2 = choose_poly(m, 2)-(m-1)
    for expression in (coefficients[4], b):
        ceiling = sp.expand(expression.subs({sp.Symbol("W2", nonnegative=True): W2, sp.Symbol("W3", nonnegative=True): 0, sp.Symbol("W4", nonnegative=True): 0}))
        assert all(v < 0 for v in sp.Poly(ceiling.subs(m, tail+9), tail).all_coeffs())
    output = HERE / ("iso_n7_bundle_g3_adjacent_no_parent_one_attachment_intersected_tau_" + args.chart + "_n11_probe_rank7_g5_finish_20260831.json")
    report = {
        "marker": MARKER, "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart, "threshold_n": 11, "exact_expression": str(exact),
        "R_zero_base": str(base), "R_coefficients": {str(k): str(v) for k, v in coefficients.items()},
        "nested_shadow_b": str(b), "endpoint_c": str(c), "safe_lower": str(lower),
        "summary": main_summary, "positive_denominator": str(denominator),
        "negative_c_certificate_summary": c_summary, "positive_c_denominator": str(c_denominator),
        "scope": "Adjacent no-parent exactly one attachment, W isolate-free.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "chart": args.chart,
        "main_negatives": main_summary["negative_tail_scalar_coefficients"],
        "minus_c_negatives": c_summary["negative_tail_scalar_coefficients"],
        "minimum": main_summary["minimum_tail_scalar_coefficient"],
        "first_negative": main_summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
