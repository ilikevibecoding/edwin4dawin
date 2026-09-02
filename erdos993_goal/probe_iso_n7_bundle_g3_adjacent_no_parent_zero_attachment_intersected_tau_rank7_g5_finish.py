#!/usr/bin/env python3
"""Intersected tau probe for the zero-attachment adjacent no-parent G3 branch."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_moment_rank7_g5_finish import build_value as coarse_build
from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ZERO_ATTACHMENT_INTERSECTED_TAU_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    m, _variables, _value, reduced = coarse_build()
    W = {k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}
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
    value = sp.cancel(reduced.subs({W[k]: rows[k] for k in range(2, 9)}))
    return m, (ep, op, tp, *(extensions[k] for k in range(5, 9))), value, reduced


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-n", type=int, default=11)
    args = parser.parse_args()
    m, variables, value, reduced = build_value(args.chart)
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(m, tail+args.threshold_n-2))))
    assert all(v > 0 for v in sp.Poly(denominator, tail, variables[0]).coeffs())
    summary = fast_summary(numerator, variables, tail)
    output = HERE / (
        "iso_n7_bundle_g3_adjacent_no_parent_zero_attachment_intersected_tau_" + args.chart
        + f"_n{args.threshold_n}_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER, "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart, "threshold_n": args.threshold_n,
        "reduced_expression": str(reduced), "positive_denominator": str(sp.factor(denominator)),
        "summary": summary, "scope": "Adjacent no-parent X=Y=empty, W isolate-free.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "chart": args.chart, "threshold_n": args.threshold_n,
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "bernstein_controls": summary["bernstein_controls"], "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
