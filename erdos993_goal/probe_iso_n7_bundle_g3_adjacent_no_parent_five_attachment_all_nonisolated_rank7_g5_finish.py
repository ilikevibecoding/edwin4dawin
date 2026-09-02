#!/usr/bin/env python3
"""Shared all-nonisolated diagnostic for all five-attachment distributions."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_two_sided_shadow_rank7_g5_finish import side_shadow
from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
REPORT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_ALL_NONISOLATED_RANK7_G5_FINISH"
DISTRIBUTIONS = {"5+0": (5, 0), "4+1": (4, 1), "3+2": (3, 2)}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def negative_rank4_lower(coefficient, m, W):
    variables = (m, *(W[k] for k in range(2, 9)))
    lower = sp.Integer(0)
    for powers, scalar in sp.Poly(coefficient, *variables).terms():
        if scalar < 0:
            monomial = scalar
            for variable, power in zip(variables, powers):
                monomial *= variable**power
            lower += monomial
    lower = sp.expand(lower)
    assert all(value >= 0 for value in sp.Poly(sp.expand(coefficient-lower), *variables).coeffs())
    assert all(value <= 0 for value in sp.Poly(lower, *variables).coeffs())
    return lower


def rank3_floor(m, roots, degree_sum, edge):
    if roots == 0:
        return sp.Integer(0)
    return sp.expand(
        roots*choose_poly(m-1-degree_sum/sp.Integer(roots), 2)
        - roots*edge + roots*degree_sum
        - sp.binomial(roots, 2)*(m-2) + sp.binomial(roots, 3)
    )


def build_value(distribution: str, chart: str):
    assert distribution in DISTRIBUTIONS
    assert sha256(REPORT) == REPORT_SHA
    a_value, b_value = DISTRIBUTIONS[distribution]
    general = json.loads(REPORT.read_text(encoding="utf-8"))
    m = sp.Symbol("m", positive=True)
    a, b = sp.symbols("a b", nonnegative=True, integer=True)
    W = {k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}
    locals_ = {"m": m, "a": a, "b": b, **{f"W{k}": W[k] for k in W}}
    base = sp.expand(sp.sympify(general["loss_zero_base"], locals=locals_).subs({a: a_value, b: b_value}))
    pd = {int(k): sp.expand(sp.sympify(value, locals=locals_).subs({a: a_value, b: b_value})) for k, value in general["P_linear_coefficients"].items()}
    qd = {int(k): sp.expand(sp.sympify(value, locals=locals_).subs({a: a_value, b: b_value})) for k, value in general["Q_linear_coefficients"].items()}
    safe_pd, safe_qd = dict(pd), dict(qd)
    safe_pd[4] = negative_rank4_lower(pd[4], m, W)
    safe_qd[4] = negative_rank4_lower(qd[4], m, W)

    xp, xq = sp.symbols("degree_p_parameter degree_q_parameter", nonnegative=True)
    slack = m-10
    if b_value:
        degree_p = b_value+slack*xp
        degree_q = a_value+slack*(1-xp)*xq
        p_lower, p_data = side_shadow(m, b_value, degree_p, safe_pd)
    else:
        degree_p = sp.Integer(0)
        degree_q = a_value+slack*xq
        p_lower = sp.Integer(0)
        p_data = {"row2": sp.Integer(0), "nested": None}
    q_lower, q_data = side_shadow(m, a_value, degree_q, safe_qd)

    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = m/2+(m/2-5)*ep
    p3_floor = rank3_floor(m, b_value, degree_p, edge)
    q3_floor = rank3_floor(m, a_value, degree_q, edge)
    lower = sp.expand(base+p_lower+q_lower)
    if b_value:
        lower += sp.expand(10*p_data["row2"]*q_data["row2"]+14*(p_data["row2"]*q3_floor+p3_floor*q_data["row2"]))

    p2_cap = b_value*m-sp.binomial(b_value+1, 2)-b_value if b_value else sp.Integer(0)
    q2_cap = a_value*m-sp.binomial(a_value+1, 2)-a_value
    p5_effective = sp.expand(pd[5]-10*q2_cap) if b_value else sp.Integer(0)
    q5_effective = sp.expand(qd[5]-10*p2_cap)
    W2_min = choose_poly(m, 2)-(m-5)
    p5_floor = sp.factor(p5_effective.subs(W[2], W2_min)) if b_value else sp.Integer(0)
    q5_floor = sp.factor(q5_effective.subs(W[2], W2_min))

    omega_low, omega_high = 2*edge-m, edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*m-12*edge+6*m)/(8*edge))
    omega = sp.cancel(omega_low+op*(boundary-omega_low)) if chart == "low_excess" else sp.cancel(boundary+op*(omega_high-boundary))
    excess = omega-2*edge+m
    tau_upper = 2*edge-m+sp.Rational(11, 6)*edge*excess if chart == "low_excess" else omega*edge/2
    tau = sp.cancel(tp*tau_upper)
    bad4 = edge*choose_poly(m-2, 2)-omega*(m-4)-edge*(edge-1)/2+tau
    rows = {2: choose_poly(m, 2)-edge, 3: choose_poly(m, 3)-edge*(m-2)+omega, 4: choose_poly(m, 4)-bad4}
    for rank in range(5, 9):
        previous = rank-1
        low = ((m-previous)*rows[previous]-2*edge*choose_poly(m-2, previous-1))/rank
        high = (m-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    substitutions = {W[k]: rows[k] for k in W}
    variables = (ep, op, tp, *((xp, xq) if b_value else (xq,)), *(extensions[k] for k in range(5, 9)))
    sign_variables = (ep, op, tp, *((xp, xq) if b_value else (xq,)))
    nested_values = {}
    if b_value:
        nested_values["P"] = sp.cancel(p_data["nested"].subs({W[k]: rows[k] for k in range(2, 5)}))
    nested_values["Q"] = sp.cancel(q_data["nested"].subs({W[k]: rows[k] for k in range(2, 5)}))
    return {
        "m": m,
        "variables": variables,
        "sign_variables": sign_variables,
        "value": sp.cancel(lower.subs(substitutions)),
        "base": base,
        "pd": pd,
        "qd": qd,
        "safe_pd": safe_pd,
        "safe_qd": safe_qd,
        "degree_p": degree_p,
        "degree_q": degree_q,
        "p_data": p_data,
        "q_data": q_data,
        "p3_floor": p3_floor,
        "q3_floor": q3_floor,
        "lower": lower,
        "p5_floor": p5_floor,
        "q5_floor": q5_floor,
        "nested_values": nested_values,
    }


def summarize(expression, variables, m, threshold=10):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(value > 0 for value in sp.Poly(denominator, tail, variables[0]).coeffs())
    return fast_summary(numerator, variables, tail), str(sp.factor(denominator))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--distribution", choices=tuple(DISTRIBUTIONS), required=True)
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    args = parser.parse_args()
    values = build_value(args.distribution, args.chart)
    summary, denominator = summarize(values["value"], values["variables"], values["m"])
    nested_summaries = {}
    for label, expression in values["nested_values"].items():
        nested_summaries[label], _ = summarize(-expression, values["sign_variables"], values["m"])
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_five_attachment_all_nonisolated_{args.distribution.replace('+','')}_{args.chart}_m10_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "distribution": args.distribution,
        "chart": args.chart,
        "threshold_m": 10,
        "threshold_n": 12,
        "degree_parameterization": {"P": str(values["degree_p"]), "Q": str(values["degree_q"]), "domain": "nonisolated roots in five distinct components; Dp+Dq<=m-5"},
        "rank3_floors": {"P": str(values["p3_floor"]), "Q": str(values["q3_floor"]), "proof": "Root-union inclusion-exclusion through triples plus Jensen over individual root degrees."},
        "rank4_negative_monomial_lowers": {"P": str(values["safe_pd"][4]), "Q": str(values["safe_qd"][4])},
        "rank5_absorption_floors": {"P": str(values["p5_floor"]), "Q": str(values["q5_floor"])},
        "safe_lower": str(values["lower"]),
        "summary": summary,
        "nested_negative_summaries": nested_summaries,
        "positive_denominator": denominator,
        "scope": "Exactly five attachments in the stated distribution, all roots nonisolated in distinct W-components, W isolate-free.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "distribution": args.distribution, "chart": args.chart, "main_negatives": summary["negative_tail_scalar_coefficients"], "nested_negatives": {label: item["negative_tail_scalar_coefficients"] for label, item in nested_summaries.items()}, "minimum": summary["minimum_tail_scalar_coefficient"], "first_negative": summary["first_negative"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
