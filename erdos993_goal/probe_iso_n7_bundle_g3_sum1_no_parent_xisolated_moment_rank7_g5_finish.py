#!/usr/bin/env python3
"""Exact core-moment probe for common0/sum1 when its unique neighbour x is isolated in W."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g3_sum1_no_parent_nested_shadow_moment_rank7_g5_finish import reduced
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_XISOLATED_MOMENT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    m, W, R, exact, _sum0, _coefficients, _b, _c = reduced()
    q = sp.Symbol("q", positive=True)
    T = {0: sp.Integer(1), 1: q}
    T.update({rank: sp.Symbol(f"T{rank}", nonnegative=True) for rank in range(2, 9)})
    isolated_exact = sp.expand(exact.subs({
        m: q+1,
        **{W[rank]: T[rank]+T[rank-1] for rank in range(2, 9)},
        **{R[rank]: T[rank-1] for rank in range(2, 8)},
    }, simultaneous=True))
    edge_parameter, omega_parameter, tau_parameter = sp.symbols(
        "edge_parameter omega_parameter tau_parameter", nonnegative=True
    )
    extension_parameters = {
        rank: sp.Symbol(f"extension{rank}_parameter", nonnegative=True)
        for rank in range(5, 9)
    }
    edge = q/2+(q/2-1)*edge_parameter
    omega_low = 2*edge-q
    omega_high = edge**2/2
    omega_boundary = sp.cancel(
        (22*edge**2-11*edge*q-12*edge+6*q)/(8*edge)
    )
    if chart == "low_excess":
        omega = sp.cancel(omega_low+omega_parameter*(omega_boundary-omega_low))
    elif chart == "high_excess":
        omega = sp.cancel(omega_boundary+omega_parameter*(omega_high-omega_boundary))
    else:
        raise AssertionError(chart)
    degree_excess = omega-2*edge+q
    tau_old = omega*edge/2
    tau_new = 2*edge-q+sp.Rational(11, 6)*edge*degree_excess
    tau = sp.cancel(tau_parameter*(tau_new if chart == "low_excess" else tau_old))
    bad4 = edge*choose_poly(q-2, 2)-omega*(q-4)-edge*(edge-1)/2+tau
    rows = {
        2: choose_poly(q, 2)-edge,
        3: choose_poly(q, 3)-edge*(q-2)+omega,
        4: choose_poly(q, 4)-bad4,
    }
    for rank in range(5, 9):
        previous = rank-1
        low = ((q-previous)*rows[previous]-2*edge*choose_poly(q-2, previous-1))/rank
        high = (q-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(low+extension_parameters[rank]*(high-low))
    value = sp.cancel(isolated_exact.subs({
        T[rank]: rows[rank] for rank in range(2, 9)
    }, simultaneous=True))
    variables = (
        edge_parameter, omega_parameter, tau_parameter,
        *(extension_parameters[rank] for rank in range(5, 9)),
    )
    return q, variables, value, isolated_exact


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-n", type=int, default=11)
    args = parser.parse_args()
    assert args.threshold_n >= 11
    q, variables, value, isolated_exact = build_value(args.chart)
    tail = sp.Symbol("tail", nonnegative=True)
    shifted = sp.cancel(value.subs(q, tail+args.threshold_n-3))
    numerator, denominator = map(sp.expand, sp.fraction(shifted))
    assert all(coefficient > 0 for coefficient in sp.Poly(
        denominator, tail, variables[0]
    ).coeffs())
    summary = fast_summary(numerator, variables, tail)
    output = HERE / (
        "iso_n7_bundle_g3_sum1_no_parent_xisolated_"
        f"{args.chart}_n{args.threshold_n}_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart,
        "threshold_n": args.threshold_n,
        "isolated_x_expression_in_core_rows": str(isolated_exact),
        "positive_denominator": str(sp.factor(denominator)),
        "summary": summary,
        "scope": (
            "No-parent common0/sum1 G3 with unique marked neighbour x isolated "
            "in W and remaining core K isolate-free."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "chart": args.chart,
        "threshold_n": args.threshold_n,
        "degree_profile": summary["degree_profile"],
        "bernstein_controls": summary["bernstein_controls"],
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
