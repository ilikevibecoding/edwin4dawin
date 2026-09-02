#!/usr/bin/env python3
"""Intersected tau-upper charts for no-parent common0/sum1 G3."""

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
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_INTERSECTED_TAU_MOMENT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(chart: str):
    m, W, R, exact, sum0, coefficients, b, c = reduced()
    lower = sp.expand(sum0+(m-2)*c)
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
    omega_boundary = sp.cancel(
        (22*edge**2-11*edge*m-12*edge+6*m)/(8*edge)
    )
    if chart == "low_excess":
        omega = sp.cancel(
            omega_low+omega_parameter*(omega_boundary-omega_low)
        )
    elif chart == "high_excess":
        omega = sp.cancel(
            omega_boundary+omega_parameter*(omega_high-omega_boundary)
        )
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
        # Every nonempty independent set in an isolate-free graph blocks at
        # least one outside vertex, so the extension upper loses one full
        # extension per set.
        high = (m-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(low+extension_parameters[rank]*(high-low))
    value = sp.cancel(lower.subs({W[rank]: rows[rank] for rank in range(2, 9)}))
    c_value = sp.cancel(c.subs({W[rank]: rows[rank] for rank in range(2, 7)}))
    variables = (
        edge_parameter, omega_parameter, tau_parameter,
        *(extension_parameters[rank] for rank in range(5, 9)),
    )
    return (
        m, variables, value, c_value, exact, sum0, coefficients, b, c,
        lower, edge, omega_low, omega_boundary, omega_high, tau_old, tau_new,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-n", type=int, default=11)
    args = parser.parse_args()
    assert args.threshold_n >= 11
    (
        m, variables, value, c_value, exact, sum0, coefficients, b, c,
        lower, edge, omega_low, omega_boundary, omega_high, tau_old, tau_new,
    ) = build_value(args.chart)
    tail = sp.Symbol("tail", nonnegative=True)
    threshold_m = args.threshold_n-2
    # The endpoint ordering and equality of the two tau uppers at the middle
    # boundary are promoted with explicit polynomial audits in the producer.
    shifted = sp.cancel(value.subs(m, tail+threshold_m))
    numerator, denominator = map(sp.expand, sp.fraction(shifted))
    assert all(coefficient > 0 for coefficient in sp.Poly(
        denominator, tail, variables[0]
    ).coeffs())
    summary = fast_summary(numerator, variables, tail)
    shifted_c = sp.cancel(-c_value.subs(m, tail+threshold_m))
    c_numerator, c_denominator = map(sp.expand, sp.fraction(shifted_c))
    assert all(coefficient > 0 for coefficient in sp.Poly(
        c_denominator, tail, variables[0]
    ).coeffs())
    c_summary = fast_summary(c_numerator, variables[:5], tail)
    output = HERE / (
        "iso_n7_bundle_g3_sum1_no_parent_intersected_tau_"
        f"{args.chart}_n{args.threshold_n}_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "chart": args.chart,
        "threshold_n": args.threshold_n,
        "exact_expression": str(exact),
        "sum0_base_expression": str(sum0),
        "R_coefficients": {str(rank): str(value) for rank, value in coefficients.items()},
        "nested_shadow_b": str(b),
        "endpoint_c": str(c),
        "safe_lower": str(lower),
        "omega_interval": [str(omega_low), str(omega_boundary), str(omega_high)],
        "tau_uppers": {"old": str(tau_old), "degree_excess": str(tau_new)},
        "positive_denominator": str(sp.factor(denominator)),
        "positive_c_denominator": str(sp.factor(c_denominator)),
        "negative_c_certificate_summary": c_summary,
        "summary": summary,
        "scope": "No-parent nonadjacent/common0/sum1 rank-seven G3, isolate-free W.",
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
        "minus_c_negative_count": c_summary["negative_tail_scalar_coefficients"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
