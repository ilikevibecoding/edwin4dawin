#!/usr/bin/env python3
"""Two independent rooted-loss probe for same-mark adjacent G3 attachments."""

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
TWO_REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_exact_rank7_g5_finish_20260831.json"
TWO_REPORT_SHA256 = "46B51E942EB3E86CB2B1F39A6E90BE0B5E67E5E40EF9989337825E65B59B1C6D"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SAME_MARK_INTERSECTED_TAU_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    assert sha256(TWO_REPORT) == TWO_REPORT_SHA256
    two = json.loads(TWO_REPORT.read_text(encoding="utf-8"))
    m, W, _R, _exact, _one_base, coefficients = reduced()
    locals_ = {"m": m, **{f"W{k}": W[k] for k in range(2, 9)}}
    same_base = sp.expand(sp.sympify(two["same_mark"]["Q_zero_base"], locals=locals_))

    # Each root lies in its own W-component.  For each rooted family separately,
    # d4<0, b=d3+d4(m-4)/3<0, and c=d2+b(m-3)/2<0 permit the exact nested
    # root-shadow payment.  Positive ranks 5..7 and all double-root rebates are dropped.
    b = sp.factor(coefficients[3] + coefficients[4]*(m-4)/3)
    c = sp.factor(coefficients[2] + b*(m-3)/2)
    lower = sp.expand(same_base + 2*(m-2)*c)

    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = m/2 + (m/2-1)*ep
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
        low = ((m-previous)*rows[previous]-2*edge*choose_poly(m-2, previous-1))/rank
        high = (m-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    substitutions = {W[k]: rows[k] for k in range(2, 9)}
    value = sp.cancel(lower.subs(substitutions))
    return m, (ep, op, tp, *(extensions[k] for k in range(5, 9))), value, same_base, coefficients, b, c, lower


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-m", type=int, default=10)
    args = parser.parse_args()
    m, variables, value, same_base, coefficients, b, c, lower = build_value(args.chart)
    tail = sp.Symbol("tail", nonnegative=True)
    assert args.threshold_m >= 9
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(m, tail+args.threshold_m))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(v > 0 for v in sp.Poly(denominator, tail, variables[0]).coeffs())
    summary = fast_summary(numerator, variables, tail)
    threshold_n = args.threshold_m + 2
    output = HERE / ("iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_intersected_tau_" + args.chart + f"_n{threshold_n}_probe_rank7_g5_finish_20260831.json")
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart,
        "threshold_n": threshold_n,
        "threshold_m": args.threshold_m,
        "same_mark_Q_zero_base": str(same_base),
        "root_loss_coefficients": {str(k): str(v) for k, v in coefficients.items()},
        "nested_shadow_b": str(b),
        "endpoint_c": str(c),
        "safe_lower": str(lower),
        "summary": summary,
        "positive_denominator": str(sp.factor(denominator)),
        "scope": "Same-mark exactly two attachments, both roots nonisolated, W isolate-free.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "chart": args.chart,
        "negatives": summary["negative_tail_scalar_coefficients"],
        "minimum": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
