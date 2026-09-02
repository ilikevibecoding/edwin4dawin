#!/usr/bin/env python3
"""Moment probe for adjacent no-parent one attachment with x isolated in W."""

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
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_XISOLATED_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    m, W, R, exact, _base, _coefficients = reduced()
    q = sp.Symbol("q", positive=True)
    T = {0: sp.Integer(1), 1: q}
    T.update({k: sp.Symbol(f"T{k}", nonnegative=True) for k in range(2, 9)})
    isolated = sp.expand(exact.subs({
        m: q+1, **{W[k]: T[k]+T[k-1] for k in range(2, 9)},
        **{R[k]: T[k-1] for k in range(2, 8)},
    }, simultaneous=True))
    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = q/2+(q/2-1)*ep
    lo, hi = 2*edge-q, edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*q-12*edge+6*q)/(8*edge))
    omega = sp.cancel(lo+op*(boundary-lo)) if chart == "low_excess" else sp.cancel(boundary+op*(hi-boundary))
    Q = omega-2*edge+q
    tau_upper = 2*edge-q+sp.Rational(11, 6)*edge*Q if chart == "low_excess" else omega*edge/2
    tau = sp.cancel(tp*tau_upper)
    bad4 = edge*choose_poly(q-2, 2)-omega*(q-4)-edge*(edge-1)/2+tau
    rows = {2: choose_poly(q, 2)-edge, 3: choose_poly(q, 3)-edge*(q-2)+omega, 4: choose_poly(q, 4)-bad4}
    for rank in range(5, 9):
        previous = rank-1
        low = ((q-previous)*rows[previous]-2*edge*choose_poly(q-2, previous-1))/rank
        high = (q-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    value = sp.cancel(isolated.subs({T[k]: rows[k] for k in range(2, 9)}, simultaneous=True))
    return q, (ep, op, tp, *(extensions[k] for k in range(5, 9))), value, isolated


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    args = parser.parse_args()
    q, variables, value, isolated = build_value(args.chart)
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(q, tail+8))))
    assert all(v > 0 for v in sp.Poly(denominator, tail, variables[0]).coeffs())
    summary = fast_summary(numerator, variables, tail)
    output = HERE / ("iso_n7_bundle_g3_adjacent_no_parent_one_attachment_xisolated_" + args.chart + "_n11_probe_rank7_g5_finish_20260831.json")
    report = {
        "marker": MARKER, "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart, "threshold_n": 11, "isolated_x_expression": str(isolated),
        "positive_denominator": str(sp.factor(denominator)), "summary": summary,
        "scope": "Adjacent no-parent exactly one attachment, x isolated, K isolate-free.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "chart": args.chart,
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "bernstein_controls": summary["bernstein_controls"], "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
