#!/usr/bin/env python3
"""Root-shadow moment probe for same-mark attachments with one isolated root."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
DERIVE_REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_isolated_roots_exact_rank7_g5_finish_20260831.json"
DERIVE_REPORT_SHA256 = "6D65C7B29BC34F91907D627A8C99DB5BED9594C276966002851A90E1BA58A456"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SAME_MARK_ONE_ISOLATED_INTERSECTED_TAU_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    assert sha256(DERIVE_REPORT) == DERIVE_REPORT_SHA256
    report = json.loads(DERIVE_REPORT.read_text(encoding="utf-8"))["exactly_one_root_isolated"]
    h = sp.Symbol("h", positive=True)
    A = {0: sp.Integer(1), 1: h}
    A.update({k: sp.Symbol(f"A{k}", nonnegative=True) for k in range(2, 9)})
    locals_ = {"h": h, **{f"A{k}": A[k] for k in range(2, 9)}}
    base = sp.expand(sp.sympify(report["R_zero_base"], locals=locals_))
    coefficients = {int(k): sp.expand(sp.sympify(v, locals=locals_)) for k, v in report["R_coefficients"].items()}
    b = sp.factor(coefficients[3]+coefficients[4]*(h-4)/3)
    c = sp.factor(coefficients[2]+b*(h-3)/2)
    lower = sp.expand(base+(h-2)*c)

    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = h/2+(h/2-1)*ep
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
        low = ((h-previous)*rows[previous]-2*edge*choose_poly(h-2, previous-1))/rank
        high = (h-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    substitutions = {A[k]: rows[k] for k in range(2, 9)}
    value = sp.cancel(lower.subs(substitutions))
    c_value = sp.cancel(c.subs({A[k]: rows[k] for k in range(2, 7)}))
    return h, (ep, op, tp, *(extensions[k] for k in range(5, 9))), value, c_value, base, coefficients, b, c, lower


def fast(expression, variables, h, threshold):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(v > 0 for v in sp.Poly(denominator, tail, variables[0]).coeffs())
    return fast_summary(numerator, variables, tail), str(sp.factor(denominator))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-h", type=int, default=8)
    args = parser.parse_args()
    h, variables, value, c_value, base, coefficients, b, c, lower = build_value(args.chart)
    summary, denominator = fast(value, variables, h, args.threshold_h)
    c_summary, c_denominator = fast(-c_value, variables[:5], h, args.threshold_h)
    output = HERE / ("iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_one_isolated_intersected_tau_" + args.chart + f"_n{args.threshold_h+3}_probe_rank7_g5_finish_20260831.json")
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart,
        "threshold_h": args.threshold_h,
        "threshold_n": args.threshold_h+3,
        "R_zero_base": str(base),
        "R_coefficients": {str(k): str(v) for k, v in coefficients.items()},
        "nested_shadow_b": str(b),
        "endpoint_c": str(c),
        "safe_lower": str(lower),
        "summary": summary,
        "positive_denominator": denominator,
        "negative_c_summary": c_summary,
        "positive_c_denominator": c_denominator,
        "scope": "Same-mark exactly two attachments, exactly one root isolated; H isolate-free and the other root nonisolated.",
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
