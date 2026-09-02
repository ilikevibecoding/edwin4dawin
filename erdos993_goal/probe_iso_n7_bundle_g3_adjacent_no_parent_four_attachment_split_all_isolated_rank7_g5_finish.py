#!/usr/bin/env python3
"""Moment probes for split four attachments whose roots are all isolated."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_isolated_patterns_exact_rank7_g5_finish_20260831.json"
REPORT_SHA = "51FFA1836D05390B7A2065D1D1EADE5E23DF97800461E084080B0135FB865318"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT_ALL_ISOLATED_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(distribution: str, chart: str):
    assert sha256(REPORT) == REPORT_SHA
    data = json.loads(REPORT.read_text(encoding="utf-8"))
    branch = data["split_mark_3plus1"]["p1_q3"] if distribution == "3+1" else data["split_mark_2plus2"]["p2_q2"]
    h = sp.Symbol("h", positive=True)
    A = {0: sp.Integer(1), 1: h, **{k: sp.Symbol(f"A{k}", nonnegative=True) for k in range(2, 9)}}
    exact = sp.expand(sp.sympify(branch["identity_in_H_rows"], locals={"h": h, **{f"A{k}": A[k] for k in range(2, 9)}}))

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
    value = sp.cancel(exact.subs({A[k]: rows[k] for k in range(2, 9)}))
    return h, (ep, op, tp, *(extensions[k] for k in range(5, 9))), value, exact


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--distribution", choices=("3+1", "2+2"), required=True)
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-h", type=int, default=5)
    args = parser.parse_args()
    h, variables, value, exact = build_value(args.distribution, args.chart)
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail+args.threshold_h))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(value > 0 for value in sp.Poly(denominator, tail, variables[0]).coeffs())
    summary = fast_summary(numerator, variables, tail)
    short = args.distribution.replace("+", "")
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_all_isolated_{short}_{args.chart}_h{args.threshold_h}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "distribution": args.distribution,
        "chart": args.chart,
        "threshold_h": args.threshold_h,
        "threshold_n": args.threshold_h+6,
        "exact_expression_in_H_rows": str(exact),
        "summary": summary,
        "positive_denominator": str(sp.factor(denominator)),
        "scope": "Exactly four adjacent no-parent split attachments, all roots isolated; H isolate-free and nonempty.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "distribution": args.distribution, "chart": args.chart, "negatives": summary["negative_tail_scalar_coefficients"], "minimum": summary["minimum_tail_scalar_coefficient"], "first_negative": summary["first_negative"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
