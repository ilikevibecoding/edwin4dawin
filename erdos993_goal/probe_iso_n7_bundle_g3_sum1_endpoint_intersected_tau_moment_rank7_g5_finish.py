#!/usr/bin/env python3
"""Intersected tau-upper charts for endpoint common0/sum1 rank-seven G3."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_sum1_endpoint_identities_probe_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "1C5F2259404A99790240FE9E5AC29AB353A3AA3639072A578ED9FCB95567668C"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_INTERSECTED_TAU_MOMENT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def reduced(mode: str):
    assert sha256(INPUT) == INPUT_SHA256
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    assert report["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_IDENTITIES_RANK7_G5_FINISH"
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({rank: sp.Symbol(f"W{rank}", nonnegative=True) for rank in range(2, 9)})
    R = {0: sp.Integer(0), 1: sp.Integer(1)}
    R.update({rank: sp.Symbol(f"R{rank}", nonnegative=True) for rank in range(2, 8)})
    locals_ = {"m": m, **{f"W{k}": W[k] for k in range(2, 9)}, **{f"R{k}": R[k] for k in range(2, 8)}}
    exact = sp.expand(sp.sympify(report["modes"][mode]["exact"], locals=locals_))
    base = sp.expand(exact.subs({R[rank]: 0 for rank in range(2, 8)}))
    coefficients = {rank: sp.factor(sp.diff(exact, R[rank])) for rank in range(2, 8)}
    assert sp.expand(exact-base-sum(coefficients[rank]*R[rank] for rank in range(2, 8))) == 0
    b = sp.factor(coefficients[3]+coefficients[4]*(m-4)/3)
    c = sp.factor(coefficients[2]+b*(m-3)/2)
    return m, W, R, exact, base, coefficients, b, c


def build_value(mode: str, chart: str):
    m, W, R, exact, base, coefficients, b, c = reduced(mode)
    lower = sp.expand(base+(m-2)*c)
    edge_parameter, omega_parameter, tau_parameter = sp.symbols(
        "edge_parameter omega_parameter tau_parameter", nonnegative=True
    )
    extension_parameters = {
        rank: sp.Symbol(f"extension{rank}_parameter", nonnegative=True)
        for rank in range(5, 9)
    }
    edge = m/2+(m/2-1)*edge_parameter
    omega_low = 2*edge-m
    omega_high = edge**2/2
    omega_boundary = sp.cancel((22*edge**2-11*edge*m-12*edge+6*m)/(8*edge))
    if chart == "low_excess":
        omega = sp.cancel(omega_low+omega_parameter*(omega_boundary-omega_low))
    elif chart == "high_excess":
        omega = sp.cancel(omega_boundary+omega_parameter*(omega_high-omega_boundary))
    else:
        raise AssertionError(chart)
    degree_excess = omega-2*edge+m
    tau_old = omega*edge/2
    tau_new = 2*edge-m+sp.Rational(11, 6)*edge*degree_excess
    tau_upper = tau_new if chart == "low_excess" else tau_old
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
        rows[rank] = sp.expand(low+extension_parameters[rank]*(high-low))
    value = sp.cancel(lower.subs({W[rank]: rows[rank] for rank in range(2, 9)}))
    c_value = sp.cancel(c.subs({W[rank]: rows[rank] for rank in range(2, 7)}))
    variables = (
        edge_parameter, omega_parameter, tau_parameter,
        *(extension_parameters[rank] for rank in range(5, 9)),
    )
    return m, variables, value, c_value, exact, base, coefficients, b, c, lower


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("endpoint_u", "endpoint_v"), required=True)
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-n", type=int, default=11)
    args = parser.parse_args()
    assert args.threshold_n >= 11
    m, variables, value, c_value, exact, base, coefficients, b, c, lower = build_value(args.mode, args.chart)
    W = {rank: sp.Symbol(f"W{rank}", nonnegative=True) for rank in range(2, 9)}
    tail = sp.Symbol("tail", nonnegative=True)
    threshold_m = args.threshold_n-2
    # Sign guards used by the nested-shadow reduction.
    lower_w2 = choose_poly(m, 2)-(m-1)
    for expression in (coefficients[4], b):
        ceiling = sp.expand(expression.subs({W[2]: lower_w2, W[3]: 0, W[4]: 0}))
        assert all(value < 0 for value in sp.Poly(ceiling.subs(m, tail+threshold_m), tail).all_coeffs())
    assert all(coefficient >= 0 for rank in (5, 6, 7) for coefficient in sp.Poly(
        coefficients[rank], *sorted(coefficients[rank].free_symbols, key=str)
    ).coeffs())

    shifted = sp.cancel(value.subs(m, tail+threshold_m))
    numerator, denominator = map(sp.expand, sp.fraction(shifted))
    assert all(coefficient > 0 for coefficient in sp.Poly(denominator, tail, variables[0]).coeffs())
    summary = fast_summary(numerator, variables, tail)
    shifted_c = sp.cancel(-c_value.subs(m, tail+threshold_m))
    c_numerator, c_denominator = map(sp.expand, sp.fraction(shifted_c))
    assert all(coefficient > 0 for coefficient in sp.Poly(c_denominator, tail, variables[0]).coeffs())
    c_summary = fast_summary(c_numerator, variables[:5], tail)
    output = HERE / (
        "iso_n7_bundle_g3_sum1_" + args.mode + "_intersected_tau_" + args.chart
        + f"_n{args.threshold_n}_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "mode": args.mode,
        "chart": args.chart,
        "threshold_n": args.threshold_n,
        "exact_expression": str(exact),
        "R_zero_base_expression": str(base),
        "R_coefficients": {str(rank): str(value) for rank, value in coefficients.items()},
        "nested_shadow_b": str(b),
        "endpoint_c": str(c),
        "safe_lower": str(lower),
        "positive_denominator": str(sp.factor(denominator)),
        "positive_c_denominator": str(sp.factor(c_denominator)),
        "negative_c_certificate_summary": c_summary,
        "summary": summary,
        "scope": f"{args.mode} common0/sum1 rank-seven G3, isolate-free W.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "mode": args.mode,
        "chart": args.chart,
        "threshold_n": args.threshold_n,
        "bernstein_controls": summary["bernstein_controls"],
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minus_c_negative_count": c_summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
