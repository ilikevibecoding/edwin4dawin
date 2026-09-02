#!/usr/bin/env python3
"""Full degree-simplex joint rooted-floor probe for the 2+2 four-attachment cell."""

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
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_22_JOINT_FLOOR_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    assert sha256(REPORT) == REPORT_SHA
    general = json.loads(REPORT.read_text(encoding="utf-8"))
    m = sp.Symbol("m", positive=True)
    a, b = sp.symbols("a b", nonnegative=True, integer=True)
    W = {k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}
    locals_ = {"m": m, "a": a, "b": b, **{f"W{k}": W[k] for k in W}}
    base = sp.expand(sp.sympify(general["loss_zero_base"], locals=locals_).subs({a: 2, b: 2}))
    pd = {int(k): sp.expand(sp.sympify(value, locals=locals_).subs({a: 2, b: 2})) for k, value in general["P_linear_coefficients"].items()}
    qd = {int(k): sp.expand(sp.sympify(value, locals=locals_).subs({a: 2, b: 2})) for k, value in general["Q_linear_coefficients"].items()}
    assert pd == qd

    degree_p_parameter, degree_q_parameter = sp.symbols("degree_p_parameter degree_q_parameter", nonnegative=True)
    budget = m-8
    degree_p = 2+budget*degree_p_parameter
    degree_q = 2+budget*(1-degree_p_parameter)*degree_q_parameter
    p_lower, p_data = side_shadow(m, 2, degree_p, pd)
    q_lower, q_data = side_shadow(m, 2, degree_q, qd)
    p2, q2 = p_data["row2"], q_data["row2"]

    edge_parameter, omega_parameter, tau_parameter = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = m/2+(m/2-4)*edge_parameter
    # For two roots of total degree D, sum the exact single-root rank-three
    # counts, subtract the double-root intersection, and use Jensen on the
    # two individual degrees:
    # R3 >= 2*C(m-1-D/2,2)-2e+2D-m+2.
    p3_floor = sp.expand(2*choose_poly(m-1-degree_p/2, 2)-2*edge+2*degree_p-m+2)
    q3_floor = sp.expand(2*choose_poly(m-1-degree_q/2, 2)-2*edge+2*degree_q-m+2)
    lower = sp.expand(base+p_lower+q_lower+10*p2*q2+14*(p2*q3_floor+p3_floor*q2))

    p2_cap = 2*m-5
    q2_cap = 2*m-5
    p5_effective = sp.expand(pd[5]-10*q2_cap)
    q5_effective = sp.expand(qd[5]-10*p2_cap)
    w2_min = choose_poly(m, 2)-(m-4)
    p5_floor = sp.factor(p5_effective.subs(W[2], w2_min))
    q5_floor = sp.factor(q5_effective.subs(W[2], w2_min))

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
    value = sp.cancel(lower.subs({W[k]: rows[k] for k in W}))
    return {
        "m": m,
        "variables": (edge_parameter, omega_parameter, tau_parameter, degree_p_parameter, degree_q_parameter, *(extensions[k] for k in range(5, 9))),
        "value": value,
        "base": base,
        "coefficients": pd,
        "degree_p": degree_p,
        "degree_q": degree_q,
        "p_data": p_data,
        "q_data": q_data,
        "p3_floor": p3_floor,
        "q3_floor": q3_floor,
        "lower": lower,
        "p5_floor": p5_floor,
        "q5_floor": q5_floor,
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
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-m", type=int, default=9)
    args = parser.parse_args()
    values = build_value(args.chart)
    summary, denominator = summarize(values["value"], values["variables"], values["m"], args.threshold_m)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_22_joint_floor_{args.chart}_m{args.threshold_m}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart,
        "threshold_m": args.threshold_m,
        "threshold_n": args.threshold_m+2,
        "degree_simplex_parameterization": {
            "P_degree": str(values["degree_p"]),
            "Q_degree": str(values["degree_q"]),
            "domain": "2<=Dp, 2<=Dq, Dp+Dq<=m-4",
        },
        "P_shadow": {key: None if value is None else str(value) for key, value in values["p_data"].items()},
        "Q_shadow": {key: None if value is None else str(value) for key, value in values["q_data"].items()},
        "rank3_floors": {"P3": str(values["p3_floor"]), "Q3": str(values["q3_floor"]), "proof": "For each two-root family sum the single-root induced-pair lower bounds, subtract the exact double-root intersection, then apply Jensen to the two root degrees."},
        "retained_positive_bilinear": "10*P2*Q2+14*(P2*Q3_floor+P3_floor*Q2)",
        "rank5_absorption_floors": {"P5": str(values["p5_floor"]), "Q5": str(values["q5_floor"])},
        "safe_lower": str(values["lower"]),
        "summary": summary,
        "positive_denominator": denominator,
        "scope": "2+2 exactly four attachments, all roots nonisolated in distinct W-components, W isolate-free.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "chart": args.chart,
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
