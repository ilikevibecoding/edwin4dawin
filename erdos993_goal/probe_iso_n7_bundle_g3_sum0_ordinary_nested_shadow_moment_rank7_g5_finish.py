#!/usr/bin/env python3
"""Exact nested-shadow moment probe for nonisolated ordinary-parent G3."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import (
    build_value as no_parent_build,
    choose_poly,
)
from probe_iso_n7_bundle_g3_sum0_ordinary_safe_cap_moment_rank7_g5_finish import (
    ordinary_reduced,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM0_ORDINARY_NESTED_SHADOW_MOMENT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value():
    m, W, _R, exact, coefficients, _old_lower, _c3_floor, c5_ceiling = ordinary_reduced()
    no_parent = no_parent_build()[3]
    a3 = sp.factor(coefficients[4] + coefficients[5]*(m-5)/4)
    a2 = sp.factor(coefficients[3] + a3*(m-4)/3)
    lower = sp.expand(no_parent + a2*choose_poly(m-2, 2))

    edge_parameter, omega_parameter, tau_parameter = sp.symbols(
        "edge_parameter omega_parameter tau_parameter", nonnegative=True
    )
    extension_parameters = {
        rank: sp.Symbol(f"extension{rank}_parameter", nonnegative=True)
        for rank in range(5, 9)
    }
    edge = m/2 + (m/2-1)*edge_parameter
    omega_lower = 2*edge**2/m-edge
    omega_upper = edge**2/2
    omega = omega_lower + omega_parameter*(omega_upper-omega_lower)
    tau_lower = 2*omega*(omega-edge)/(3*edge)
    tau_upper = omega*edge/2
    tau = sp.cancel(tau_lower + tau_parameter*(tau_upper-tau_lower))
    bad4 = edge*choose_poly(m-2, 2)-omega*(m-4)-edge*(edge-1)/2+tau
    rows = {
        2: choose_poly(m, 2)-edge,
        3: choose_poly(m, 3)-edge*(m-2)+omega,
        4: choose_poly(m, 4)-bad4,
    }
    for rank in range(5, 9):
        previous = rank-1
        low = ((m-previous)*rows[previous]-2*edge*choose_poly(m-2, previous-1))/rank
        high = (m-previous)*rows[previous]/rank
        rows[rank] = sp.expand(low+extension_parameters[rank]*(high-low))
    value = sp.cancel(lower.subs({W[rank]: rows[rank] for rank in range(2, 9)}))
    variables = (
        edge_parameter, omega_parameter, tau_parameter,
        *(extension_parameters[rank] for rank in range(5, 9)),
    )
    return m, variables, value, exact, coefficients, lower, a3, a2, c5_ceiling


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold-n", type=int, default=15)
    args = parser.parse_args()
    assert args.threshold_n >= 15
    m, variables, value, exact, coefficients, lower, a3, a2, c5_ceiling = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    threshold_m = args.threshold_n-2

    lower_w2 = choose_poly(m, 2)-(m-1)
    lower_w3 = choose_poly(m, 3)-(m-1)*(m-2)
    a3_upper = sp.expand(a3.subs({
        sp.Symbol("W2", nonnegative=True): lower_w2,
        sp.Symbol("W3", nonnegative=True): lower_w3,
        sp.Symbol("W4", nonnegative=True): choose_poly(m, 4),
    }))
    a2_upper = sp.expand(a2.subs({
        sp.Symbol("W2", nonnegative=True): lower_w2,
        sp.Symbol("W3", nonnegative=True): lower_w3,
        sp.Symbol("W4", nonnegative=True): choose_poly(m, 4),
        sp.Symbol("W5", nonnegative=True): choose_poly(m, 5),
    }))
    for bound in (c5_ceiling, a3_upper, a2_upper):
        assert all(coefficient < 0 for coefficient in sp.Poly(
            bound.subs(m, tail+threshold_m), tail
        ).all_coeffs())

    summary = fast_summary(
        sp.cancel(value.subs(m, tail+threshold_m)), variables, tail
    )
    output = HERE / (
        "iso_n7_bundle_g3_sum0_ordinary_nested_shadow_moment_n"
        f"{args.threshold_n}_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "threshold_n": args.threshold_n,
        "exact_expression": str(exact),
        "R_coefficients": {str(rank): str(value) for rank, value in coefficients.items()},
        "nested_R4_R5_coefficient_a3": str(a3),
        "nested_R3_R4_R5_coefficient_a2": str(a2),
        "c5_negative_ceiling": str(c5_ceiling),
        "a3_negative_ceiling": str(a3_upper),
        "a2_negative_ceiling": str(a2_upper),
        "safe_lower": str(lower),
        "summary": summary,
        "scope": (
            "Nonisolated ordinary-parent p_u0_v0 nonadjacent/common0/sum0 rank-seven G3."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
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
