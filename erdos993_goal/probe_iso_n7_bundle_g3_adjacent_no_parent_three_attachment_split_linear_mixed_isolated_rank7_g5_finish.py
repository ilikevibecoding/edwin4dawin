#!/usr/bin/env python3
"""Nested-shadow probes for linear 2+1 mixed-isolated patterns."""
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
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT_LINEAR_MIXED_ISOLATED_RANK7_G5_FINISH"
CONFIG = {
    "p1_q0": {"family": "U", "surviving_roots": 2, "threshold_h": 8, "isolated_roots": 1},
    "p1_q1": {"family": "U", "surviving_roots": 1, "threshold_h": 7, "isolated_roots": 2},
    "p0_q2": {"family": "R", "surviving_roots": 1, "threshold_h": 8, "isolated_roots": 2},
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(pattern: str, chart: str):
    assert sha256(REPORT) == REPORT_SHA
    config = CONFIG[pattern]
    branch = json.loads(REPORT.read_text(encoding="utf-8"))["split_mark_2plus1"][pattern]
    h = sp.Symbol("h", positive=True)
    A = {0: sp.Integer(1), 1: h, **{k: sp.Symbol(f"A{k}", nonnegative=True) for k in range(2, 9)}}
    F = {k: sp.Symbol(f"{config['family']}{k}", nonnegative=True) for k in range(2, 8)}
    exact = sp.expand(sp.sympify(branch["identity_in_H_rows"], locals={"h": h, **{f"A{k}": A[k] for k in range(2, 9)}, **{str(F[k]): F[k] for k in F}}))
    base = sp.expand(exact.subs({F[k]: 0 for k in F}))
    coefficients = {k: sp.factor(sp.diff(exact, F[k])) for k in F}
    assert sp.expand(exact-base-sum(coefficients[k]*F[k] for k in F)) == 0
    b = sp.factor(coefficients[3]+coefficients[4]*(h-4)/3)
    c = sp.factor(coefficients[2]+b*(h-3)/2)
    rank2_cap = (h-2) if config["surviving_roots"] == 1 else (2*h-5)
    lower = sp.expand(base+rank2_cap*c)

    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = h/2+(h/2-config["surviving_roots"])*ep
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
        lo = ((h-previous)*rows[previous]-2*edge*choose_poly(h-2, previous-1))/rank
        hi = (h-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(lo+extensions[rank]*(hi-lo))
    substitutions = {A[k]: rows[k] for k in range(2, 9)}
    return h, (ep, op, tp, *(extensions[k] for k in range(5, 9))), sp.cancel(lower.subs(substitutions)), sp.cancel(c.subs({A[k]: rows[k] for k in range(2, 7)})), exact, base, coefficients, b, c, lower, rank2_cap


def summarize(expression, variables, h, threshold):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(v > 0 for v in sp.Poly(denominator, tail, variables[0]).coeffs())
    return fast_summary(numerator, variables, tail), str(sp.factor(denominator))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pattern", choices=tuple(CONFIG), required=True)
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    args = parser.parse_args()
    config = CONFIG[args.pattern]
    h, variables, value, c_value, exact, base, coefficients, b, c, lower, rank2_cap = build_value(args.pattern, args.chart)
    threshold = config["threshold_h"]
    summary, denominator = summarize(value, variables, h, threshold)
    c_summary, c_denominator = summarize(-c_value, variables[:5], h, threshold)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_{args.pattern}_{args.chart}_h{threshold}_probe_rank7_g5_finish_20260831.json"
    report = {"marker": MARKER, "status": "exact diagnostic relaxation; no theorem asserted", "pattern": args.pattern, "chart": args.chart, "threshold_h": threshold, "threshold_n": threshold+config["isolated_roots"]+2, "exact_identity": str(exact), "root_zero_base": str(base), "root_coefficients": {str(k): str(v) for k, v in coefficients.items()}, "nested_shadow": {"b": str(b), "c": str(c), "rank2_cap": str(rank2_cap), "safe_lower": str(lower)}, "summary": summary, "positive_denominator": denominator, "negative_c_summary": c_summary, "positive_c_denominator": c_denominator, "scope": "Linear mixed-isolated 2+1 exactly-three adjacent no-parent attachment pattern with isolate-free H.", "source_sha256": sha256(Path(__file__))}
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "pattern": args.pattern, "chart": args.chart, "main_negatives": summary["negative_tail_scalar_coefficients"], "minus_c_negatives": c_summary["negative_tail_scalar_coefficients"], "minimum": summary["minimum_tail_scalar_coefficient"], "first_negative": summary["first_negative"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
