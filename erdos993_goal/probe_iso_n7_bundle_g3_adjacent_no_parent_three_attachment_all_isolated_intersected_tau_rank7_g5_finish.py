#!/usr/bin/env python3
"""Moment probes for exactly-three attachments whose roots are all isolated."""
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
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_ALL_ISOLATED_INTERSECTED_TAU_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(distribution: str, chart: str):
    assert sha256(REPORT) == REPORT_SHA
    data = json.loads(REPORT.read_text(encoding="utf-8"))
    branch = data["same_mark_3plus0"]["3"] if distribution == "same_mark" else data["split_mark_2plus1"]["p1_q2"]
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
    parser.add_argument("--distribution", choices=("same_mark", "split_mark"), required=True)
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-h", type=int, default=6)
    args = parser.parse_args()
    h, variables, value, exact = build_value(args.distribution, args.chart)
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail+args.threshold_h))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(v > 0 for v in sp.Poly(denominator, tail, variables[0]).coeffs())
    summary = fast_summary(numerator, variables, tail)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_three_attachment_all_isolated_{args.distribution}_{args.chart}_n{args.threshold_h+5}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "distribution": args.distribution,
        "chart": args.chart,
        "threshold_h": args.threshold_h,
        "threshold_n": args.threshold_h+5,
        "exact_expression_in_H_rows": str(exact),
        "summary": summary,
        "positive_denominator": str(sp.factor(denominator)),
        "scope": "Exactly three adjacent no-parent attachments, all roots isolated; H isolate-free and nonempty.",
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
