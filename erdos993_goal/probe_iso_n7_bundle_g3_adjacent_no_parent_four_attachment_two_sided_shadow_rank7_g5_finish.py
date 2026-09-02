#!/usr/bin/env python3
"""Shared two-sided rooted-shadow probe for 3+1 and 2+2 four attachments."""

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
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_TWO_SIDED_SHADOW_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def side_shadow(m, root_count, degree_sum, coefficients):
    row2 = root_count*m-sp.binomial(root_count+1, 2)-degree_sum
    if root_count == 1:
        row3_upper = sp.expand((m-2-degree_sum)*row2/2)
        nested = sp.factor(coefficients[3]+coefficients[4]*(m-3-degree_sum)/3)
        lower = sp.expand(coefficients[2]*row2+nested*row3_upper)
        return lower, {
            "row2": row2,
            "row3_upper": row3_upper,
            "nested": nested,
            "H3": None,
            "E3": None,
            "H4_lower": None,
            "row4_extra": None,
        }
    h3 = sp.binomial(root_count, 2)*(m-2)-(root_count-1)*degree_sum-2*sp.binomial(root_count, 3)
    row3_upper = sp.expand(((m-3)*row2-sp.binomial(root_count, 2)-h3)/2)
    e3 = sp.binomial(root_count, 2)*(m-2)-(root_count-1)*degree_sum-sp.binomial(root_count, 3)
    h4_lower = sp.Integer(0) if root_count == 2 else m-3-degree_sum
    row4_extra = sp.expand(-e3-h4_lower)
    nested = sp.factor(coefficients[3]+coefficients[4]*(m-4)/3)
    lower = sp.expand(coefficients[2]*row2+nested*row3_upper+coefficients[4]*row4_extra/3)
    return lower, {
        "row2": row2,
        "row3_upper": row3_upper,
        "nested": nested,
        "H3": h3,
        "E3": e3,
        "H4_lower": h4_lower,
        "row4_extra": row4_extra,
    }


def build_value(distribution: str, chart: str, degree_vertex: str):
    assert distribution in ("3+1", "2+2")
    assert sha256(REPORT) == REPORT_SHA
    a, b = map(int, distribution.split("+"))
    general = json.loads(REPORT.read_text(encoding="utf-8"))
    m = sp.Symbol("m", positive=True)
    avar, bvar = sp.symbols("a b", nonnegative=True, integer=True)
    W = {k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}
    locals_ = {"m": m, "a": avar, "b": bvar, **{f"W{k}": W[k] for k in W}}
    base = sp.expand(sp.sympify(general["loss_zero_base"], locals=locals_).subs({avar: a, bvar: b}))
    pd = {int(k): sp.expand(sp.sympify(value, locals=locals_).subs({avar: a, bvar: b})) for k, value in general["P_linear_coefficients"].items()}
    qd = {int(k): sp.expand(sp.sympify(value, locals=locals_).subs({avar: a, bvar: b})) for k, value in general["Q_linear_coefficients"].items()}
    assert {name: value for name, value in general["bilinear_coefficients"].items() if sp.Integer(value) < 0} == {"P2_Q5": "-10", "P5_Q2": "-10"}

    # P meets the b roots on one mark side; Q meets the a roots on the other.
    # All roots are nonisolated in distinct components, so Dp>=b, Dq>=a,
    # and Dp+Dq<=m-4.  The displayed vertices exhaust this degree simplex.
    if distribution == "3+1":
        degree_vertices = {
            "minimum": (sp.Integer(1), sp.Integer(3)),
            "P_min_Q_max": (sp.Integer(1), m-5),
            "P_max_Q_min": (m-7, sp.Integer(3)),
        }
    else:
        degree_vertices = {
            "minimum": (sp.Integer(2), sp.Integer(2)),
            "P_min_Q_max": (sp.Integer(2), m-6),
            "P_max_Q_min": (m-6, sp.Integer(2)),
        }
    degree_p, degree_q = degree_vertices[degree_vertex]
    p_lower, p_data = side_shadow(m, b, degree_p, pd)
    q_lower, q_data = side_shadow(m, a, degree_q, qd)
    # Retain the exact positive P2*Q2 coupling.  All other nonnegative
    # bilinear terms may still be dropped, while the two negative rank-five
    # terms are absorbed below.
    lower = sp.expand(base+p_lower+q_lower+10*p_data["row2"]*q_data["row2"])

    # The only negative bilinear terms are absorbed by positive rank-five
    # coefficients.  Exact nonisolated rank-two caps are used here.
    p2_cap = b*m-sp.binomial(b+1, 2)-b
    q2_cap = a*m-sp.binomial(a+1, 2)-a
    p5_effective = sp.expand(pd[5]-10*q2_cap)
    q5_effective = sp.expand(qd[5]-10*p2_cap)
    w2_min = choose_poly(m, 2)-(m-4)
    p5_floor = sp.factor(p5_effective.subs(W[2], w2_min))
    q5_floor = sp.factor(q5_effective.subs(W[2], w2_min))

    edge_parameter, omega_parameter, tau_parameter = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = m/2+(m/2-4)*edge_parameter
    omega_low, omega_high = 2*edge-m, edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*m-12*edge+6*m)/(8*edge))
    omega = sp.cancel(omega_low+omega_parameter*(boundary-omega_low)) if chart == "low_excess" else sp.cancel(boundary+omega_parameter*(omega_high-boundary))
    excess = omega-2*edge+m
    tau_upper = 2*edge-m+sp.Rational(11, 6)*edge*excess if chart == "low_excess" else omega*edge/2
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
    value = sp.cancel(lower.subs(substitutions))
    return {
        "m": m,
        "variables": (edge_parameter, omega_parameter, tau_parameter, *(extensions[k] for k in range(5, 9))),
        "value": value,
        "base": base,
        "pd": pd,
        "qd": qd,
        "lower": lower,
        "degree_p": degree_p,
        "degree_q": degree_q,
        "p_data": p_data,
        "q_data": q_data,
        "p5_effective": p5_effective,
        "q5_effective": q5_effective,
        "p5_floor": p5_floor,
        "q5_floor": q5_floor,
        "degree_vertices": degree_vertices,
    }


def summarize(expression, variables, m, threshold):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(m, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(value > 0 for value in sp.Poly(denominator, tail, variables[0]).coeffs())
    return fast_summary(numerator, variables, tail), str(sp.factor(denominator))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--distribution", choices=("3+1", "2+2"), required=True)
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--degree-vertex", choices=("minimum", "P_min_Q_max", "P_max_Q_min"), required=True)
    parser.add_argument("--threshold-m", type=int, default=9)
    args = parser.parse_args()
    values = build_value(args.distribution, args.chart, args.degree_vertex)
    summary, denominator = summarize(values["value"], values["variables"], values["m"], args.threshold_m)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_two_sided_shadow_{args.distribution.replace('+','')}_{args.degree_vertex}_{args.chart}_m{args.threshold_m}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "distribution": args.distribution,
        "chart": args.chart,
        "degree_vertex": args.degree_vertex,
        "threshold_m": args.threshold_m,
        "threshold_n": args.threshold_m+2,
        "loss_zero_base": str(values["base"]),
        "P_coefficients": {str(k): str(value) for k, value in values["pd"].items()},
        "Q_coefficients": {str(k): str(value) for k, value in values["qd"].items()},
        "degree_simplex": {
            "vertices": {name: [str(x), str(y)] for name, (x, y) in values["degree_vertices"].items()},
            "degree_p": str(values["degree_p"]),
            "degree_q": str(values["degree_q"]),
            "P_shadow": {key: None if value is None else str(value) for key, value in values["p_data"].items()},
            "Q_shadow": {key: None if value is None else str(value) for key, value in values["q_data"].items()},
            "safe_lower": str(values["lower"]),
            "retained_positive_bilinear": "10*P2*Q2",
        },
        "rank5_bilinear_absorption": {
            "P5_effective": str(values["p5_effective"]),
            "Q5_effective": str(values["q5_effective"]),
            "P5_floor_at_W2_min": str(values["p5_floor"]),
            "Q5_floor_at_W2_min": str(values["q5_floor"]),
        },
        "summary": summary,
        "positive_denominator": denominator,
        "scope": "Exactly four attachments in the stated split, all roots nonisolated in distinct W-components, W isolate-free.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "distribution": args.distribution,
        "chart": args.chart,
        "degree_vertex": args.degree_vertex,
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
        "P5_floor": str(values["p5_floor"]),
        "Q5_floor": str(values["q5_floor"]),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
