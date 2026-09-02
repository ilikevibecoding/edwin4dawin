#!/usr/bin/env python3
"""Uniform same-mark >=5 attachment diagnostic for adjacent no-parent rank-seven G3."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
REPORT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_SAME_MARK_GE5_UNIFORM_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    assert sha256(REPORT) == REPORT_SHA
    reduction = json.loads(REPORT.read_text(encoding="utf-8"))
    m = sp.Symbol("m", positive=True)
    a, b = sp.symbols("a b", nonnegative=True, integer=True)
    W = {k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}
    locals_ = {"m": m, "a": a, "b": b, **{f"W{k}": W[k] for k in W}}

    root_parameter = sp.Symbol("root_count_parameter", nonnegative=True)
    roots = 5+(m/sp.Integer(2)-5)*root_parameter
    base = sp.expand(sp.sympify(reduction["loss_zero_base"], locals=locals_).subs({a: roots, b: 0}))
    coefficients = {
        int(k): sp.expand(sp.sympify(value, locals=locals_).subs({a: roots, b: 0}))
        for k, value in reduction["Q_linear_coefficients"].items()
    }

    # Let X be the roots.  They are mutually nonadjacent and lie in distinct
    # nontrivial components.  If D is their degree sum, then
    # roots <= D <= m-roots.  Inclusion-exclusion and extension counting give
    # exact Q2 and safe Q3/Q4 upper shadows in terms of D.
    degree_parameter = sp.Symbol("root_degree_parameter", nonnegative=True)
    degree_sum = roots+(m-2*roots)*degree_parameter
    q2 = sp.expand(roots*m-choose_poly(roots+1, 2)-degree_sum)
    pair_row = sp.expand(choose_poly(roots, 2)*(m-2)-(roots-1)*degree_sum-2*choose_poly(roots, 3))
    q3_upper = sp.expand(((m-3)*q2-choose_poly(roots, 2)-pair_row)/2)
    extension3 = sp.expand(choose_poly(roots, 2)*(m-2)-(roots-1)*degree_sum-choose_poly(roots, 3))
    triple_row = sp.expand(choose_poly(roots, 3)*(m-3)-choose_poly(roots-1, 2)*degree_sum-3*choose_poly(roots, 4))
    q4_extra = sp.expand(-extension3-triple_row)

    nested_b = sp.factor(coefficients[3]+coefficients[4]*(m-4)/3)
    nested_c = sp.factor(coefficients[2]+nested_b*(m-3)/2)
    lower = sp.expand(base+coefficients[2]*q2+nested_b*q3_upper+coefficients[4]*q4_extra/3)

    edge_parameter, omega_parameter, tau_parameter = sp.symbols(
        "edge_parameter omega_parameter tau_parameter", nonnegative=True
    )
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = m/2+(m/2-roots)*edge_parameter
    omega_low, omega_high = 2*edge-m, edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*m-12*edge+6*m)/(8*edge))
    omega = (
        sp.cancel(omega_low+omega_parameter*(boundary-omega_low))
        if chart == "low_excess"
        else sp.cancel(boundary+omega_parameter*(omega_high-boundary))
    )
    excess = omega-2*edge+m
    tau_upper = (
        2*edge-m+sp.Rational(11, 6)*edge*excess
        if chart == "low_excess"
        else omega*edge/2
    )
    tau = sp.cancel(tau_parameter*tau_upper)
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
    substitutions = {W[k]: rows[k] for k in W}
    variables = (
        root_parameter,
        edge_parameter,
        omega_parameter,
        tau_parameter,
        degree_parameter,
        *(extensions[k] for k in range(5, 9)),
    )
    sign_variables = (root_parameter, edge_parameter, omega_parameter, tau_parameter)
    return {
        "m": m,
        "variables": variables,
        "sign_variables": sign_variables,
        "value": sp.cancel(lower.subs(substitutions)),
        "minus_d4": sp.cancel(-coefficients[4].subs(substitutions)),
        "minus_nested_b": sp.cancel(-nested_b.subs(substitutions)),
        "minus_nested_c": sp.cancel(-nested_c.subs(substitutions)),
        "roots": roots,
        "degree_sum": degree_sum,
        "q2": q2,
        "pair_row": pair_row,
        "q3_upper": q3_upper,
        "extension3": extension3,
        "triple_row": triple_row,
        "q4_extra": q4_extra,
        "coefficients": coefficients,
        "nested_b": nested_b,
        "nested_c": nested_c,
        "lower": lower,
    }


def summarize(expression, variables, m, threshold=10):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    # The moment chart introduces only powers of 2e in the denominator.  On
    # this parameterization 2e=10+tail*(1+edge*(1-root))>=10.  Recognize that
    # factor exactly instead of demanding positive monomial coefficients (the
    # expanded factor has the harmless negative edge*root monomial).
    twice_edge = 10+tail*(1+variables[1]*(1-variables[0]))
    denominator_power = None
    for power in range(5):
        quotient = sp.cancel(denominator/twice_edge**power)
        if not quotient.free_symbols and quotient > 0:
            denominator_power = power
            break
    assert denominator_power is not None
    return fast_summary(numerator, variables, tail), str(sp.factor(denominator))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    args = parser.parse_args()
    values = build_value(args.chart)
    main_summary, denominator = summarize(values["value"], values["variables"], values["m"])
    sign_summaries = {}
    sign_denominators = {}
    for label in ("minus_d4", "minus_nested_b", "minus_nested_c"):
        sign_summaries[label], sign_denominators[label] = summarize(
            values[label], values["sign_variables"], values["m"]
        )
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_same_mark_ge5_uniform_{args.chart}_m10_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart,
        "threshold_m": 10,
        "threshold_n": 12,
        "root_count_parameterization": str(values["roots"]),
        "root_count_domain": "5<=r<=m/2, continuously over-approximated",
        "root_degree_parameterization": str(values["degree_sum"]),
        "union_shadow": {
            "Q2_exact": str(values["q2"]),
            "pair_row_exact": str(values["pair_row"]),
            "Q3_upper": str(values["q3_upper"]),
            "extension3_exact": str(values["extension3"]),
            "triple_row_lower": str(values["triple_row"]),
            "Q4_extra": str(values["q4_extra"]),
            "nested_b": str(values["nested_b"]),
            "nested_c": str(values["nested_c"]),
            "safe_lower": str(values["lower"]),
        },
        "summary": main_summary,
        "positive_denominator": denominator,
        "sign_summaries": sign_summaries,
        "sign_positive_denominators": sign_denominators,
        "scope": "Same-mark r>=5 attachments at nonisolated roots in distinct components of isolate-free W; adjacent no-parent G3.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "chart": args.chart,
        "main_negatives": main_summary["negative_tail_scalar_coefficients"],
        "minimum": main_summary["minimum_tail_scalar_coefficient"],
        "first_negative": main_summary["first_negative"],
        "sign_negatives": {label: item["negative_tail_scalar_coefficients"] for label, item in sign_summaries.items()},
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
