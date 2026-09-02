#!/usr/bin/env python3
"""Moment probes for mixed-isolated same-mark 4+0 adjacent attachments."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_isolated_patterns_exact_rank7_g5_finish_20260831.json"
REPORT_SHA = "E7849A23C45A9A182A32F831DB628FDD4AFFD978843612F7D50A0C1EEF850F1C"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SAME_MARK_MIXED_ISOLATED_UNION_SHADOW_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(isolated: int, chart: str):
    assert isolated in (1, 2, 3, 4)
    assert sha256(REPORT) == REPORT_SHA
    branch = json.loads(REPORT.read_text(encoding="utf-8"))["same_mark_4plus0"][str(isolated)]
    h = sp.Symbol("h", positive=True)
    A = {k: sp.Symbol(f"A{k}", nonnegative=True) for k in range(2, 9)}
    U = {k: sp.Symbol(f"U{k}", nonnegative=True) for k in range(2, 8)}
    exact = sp.expand(sp.sympify(branch["identity_in_H_rows"], locals={
        "h": h,
        **{f"A{k}": A[k] for k in A},
        **{f"U{k}": U[k] for k in U},
    }))
    remaining = 4-isolated
    base = sp.expand(exact.subs({U[k]: 0 for k in U}))
    d = {k: sp.expand(sp.diff(exact, U[k])) for k in U} if remaining else {}
    assert sp.expand(exact-base-sum(d[k]*U[k] for k in d)) == 0

    degree_parameter = None
    degree_sum = q2 = h3 = q3_upper = e3 = h4_lower = q4_extra = nested_b = nested_c = None
    if remaining:
        nested_b = sp.factor(d[3]+d[4]*(h-4)/3)
        nested_c = sp.factor(d[2]+nested_b*(h-3)/2)
        degree_parameter = sp.Symbol("root_degree_parameter", nonnegative=True)
        degree_sum = remaining+(h-2*remaining)*degree_parameter
        q2 = remaining*h-sp.binomial(remaining+1, 2)-degree_sum
        h3 = sp.binomial(remaining, 2)*(h-2)-(remaining-1)*degree_sum-2*sp.binomial(remaining, 3)
        q3_upper = sp.expand(((h-3)*q2-sp.binomial(remaining, 2)-h3)/2)
        e3 = sp.binomial(remaining, 2)*(h-2)-(remaining-1)*degree_sum-sp.binomial(remaining, 3)
        if remaining <= 2:
            h4_lower = sp.Integer(0)
        elif remaining == 3:
            h4_lower = h-3-degree_sum
        else:
            raise AssertionError
        q4_extra = sp.expand(-e3-h4_lower)
        lower = sp.expand(base+d[2]*q2+nested_b*q3_upper+d[4]*q4_extra/3)
    else:
        lower = base

    edge_parameter, omega_parameter, tau_parameter = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    component_floor = max(remaining, 1)
    edge = h/2+(h/2-component_floor)*edge_parameter
    omega_low, omega_high = 2*edge-h, edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*h-12*edge+6*h)/(8*edge))
    omega = sp.cancel(omega_low+omega_parameter*(boundary-omega_low)) if chart == "low_excess" else sp.cancel(boundary+omega_parameter*(omega_high-boundary))
    excess = omega-2*edge+h
    tau_upper = 2*edge-h+sp.Rational(11, 6)*edge*excess if chart == "low_excess" else omega*edge/2
    tau = sp.cancel(tau_parameter*tau_upper)
    bad4 = edge*choose_poly(h-2, 2)-omega*(h-4)-edge*(edge-1)/2+tau
    rows = {
        2: choose_poly(h, 2)-edge,
        3: choose_poly(h, 3)-edge*(h-2)+omega,
        4: choose_poly(h, 4)-bad4,
    }
    for rank in range(5, 9):
        previous = rank-1
        low = ((h-previous)*rows[previous]-2*edge*choose_poly(h-2, previous-1))/rank
        high = (h-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    substitutions = {A[k]: rows[k] for k in A}
    variables = (edge_parameter, omega_parameter, tau_parameter)
    if degree_parameter is not None:
        variables += (degree_parameter,)
    variables += tuple(extensions[k] for k in range(5, 9))
    return {
        "h": h,
        "variables": variables,
        "value": sp.cancel(lower.subs(substitutions)),
        "b_value": None if nested_b is None else sp.cancel(nested_b.subs({A[k]: rows[k] for k in range(2, 5)})),
        "c_value": None if nested_c is None else sp.cancel(nested_c.subs({A[k]: rows[k] for k in range(2, 7)})),
        "exact": exact,
        "base": base,
        "coefficients": d,
        "nested_b": nested_b,
        "nested_c": nested_c,
        "lower": lower,
        "remaining": remaining,
        "degree_sum": degree_sum,
        "q2": q2,
        "h3": h3,
        "q3_upper": q3_upper,
        "e3": e3,
        "h4_lower": h4_lower,
        "q4_extra": q4_extra,
    }


def summarize(expression, variables, h, threshold):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(value > 0 for value in sp.Poly(denominator, tail, variables[0]).coeffs())
    return fast_summary(numerator, variables, tail), str(sp.factor(denominator))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--isolated", type=int, choices=(1, 2, 3, 4), required=True)
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-h", type=int, required=True)
    args = parser.parse_args()
    values = build_value(args.isolated, args.chart)
    h, variables = values["h"], values["variables"]
    summary, denominator = summarize(values["value"], variables, h, args.threshold_h)
    b_summary = b_denominator = c_summary = c_denominator = None
    if values["remaining"]:
        sign_variables = (variables[0], variables[1], variables[2], *variables[-4:-2])
        b_summary, b_denominator = summarize(-values["b_value"], sign_variables[:4], h, args.threshold_h)
        c_summary, c_denominator = summarize(-values["c_value"], sign_variables, h, args.threshold_h)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_isolated{args.isolated}_{args.chart}_h{args.threshold_h}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "isolated_roots": args.isolated,
        "remaining_nonisolated_roots": values["remaining"],
        "chart": args.chart,
        "threshold_h": args.threshold_h,
        "threshold_n": args.threshold_h+args.isolated+2,
        "exact_identity": str(values["exact"]),
        "root_zero_base": str(values["base"]),
        "root_coefficients": {str(k): str(value) for k, value in values["coefficients"].items()},
        "union_shadow": {
            "nested_b": None if values["nested_b"] is None else str(values["nested_b"]),
            "nested_c": None if values["nested_c"] is None else str(values["nested_c"]),
            "degree_sum": None if values["degree_sum"] is None else str(values["degree_sum"]),
            "Q2_exact": None if values["q2"] is None else str(values["q2"]),
            "H3_exact": None if values["h3"] is None else str(values["h3"]),
            "Q3_upper": None if values["q3_upper"] is None else str(values["q3_upper"]),
            "E3_exact": None if values["e3"] is None else str(values["e3"]),
            "H4_lower": None if values["h4_lower"] is None else str(values["h4_lower"]),
            "Q4_extra": None if values["q4_extra"] is None else str(values["q4_extra"]),
            "safe_lower": str(values["lower"]),
        },
        "summary": summary,
        "positive_denominator": denominator,
        "negative_b_summary": b_summary,
        "positive_b_denominator": b_denominator,
        "negative_c_summary": c_summary,
        "positive_c_denominator": c_denominator,
        "scope": "Same-mark 4+0 attachments with the stated number of isolated roots, isolate-free nonempty H, and all surviving roots nonisolated in distinct components.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "isolated_roots": args.isolated,
        "chart": args.chart,
        "main_negatives": summary["negative_tail_scalar_coefficients"],
        "minus_b_negatives": None if b_summary is None else b_summary["negative_tail_scalar_coefficients"],
        "minus_c_negatives": None if c_summary is None else c_summary["negative_tail_scalar_coefficients"],
        "minimum": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
