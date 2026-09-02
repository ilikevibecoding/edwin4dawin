#!/usr/bin/env python3
"""Exact nested-shadow probe for no-parent common0/sum1 rank-seven G3."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_NESTED_SHADOW_MOMENT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def reduced():
    assert sha256(INPUT) == INPUT_SHA256
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    symbols["n"] = sp.Symbol("n", positive=True)
    raw = sp.sympify(report["modes"]["no_parent"]["expression"], locals=symbols)
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({rank: symbols[f"W{rank}"] for rank in range(2, 9)})
    R = {0: sp.Integer(0), 1: sp.Integer(1)}
    R.update({rank: sp.Symbol(f"R{rank}", nonnegative=True) for rank in range(2, 8)})
    substitutions = {symbols["n"]: m+2}
    substitutions.update({symbols[f"A{rank}"]: W[rank-1] for rank in range(2, 9)})
    substitutions.update({
        symbols[f"B{rank}"]: W[rank-1]-R[rank-1] for rank in range(2, 9)
    })
    substitutions.update({
        symbols[f"Z{rank}"]: W[rank-2]-R[rank-2] for rank in range(2, 9)
    })
    exact = sp.expand(raw.subs(substitutions, simultaneous=True))
    sum0 = sp.expand(exact.subs({R[rank]: 0 for rank in range(2, 8)}))
    coefficients = {
        rank: sp.factor(sp.diff(exact, R[rank])) for rank in range(2, 8)
    }
    assert sp.expand(exact-sum0-sum(
        coefficients[rank]*R[rank] for rank in range(2, 8)
    )) == 0
    expected = {
        2: -2*(12*W[2]+22*W[3]+14*W[4]-18*W[5]-9*W[6]+2*m),
        3: -2*(22*W[2]+25*W[3]+21*W[4]+6*m),
        4: 2*(-14*W[2]-21*W[3]-10*W[4]+6*m),
        5: 36*W[2]+61*m,
        6: 6*(3*W[2]+7*m),
        7: 8*m,
    }
    assert all(
        sp.expand(coefficients[rank]-expected[rank]) == 0 for rank in range(2, 8)
    )
    b = sp.factor(coefficients[3]+coefficients[4]*(m-4)/3)
    c = sp.factor(coefficients[2]+b*(m-3)/2)
    return m, W, R, exact, sum0, coefficients, b, c


def build_value():
    m, W, R, exact, sum0, coefficients, b, c = reduced()
    edge_parameter, omega_parameter, tau_parameter = sp.symbols(
        "edge_parameter omega_parameter tau_parameter", nonnegative=True
    )
    extension5_parameter, extension6_parameter = sp.symbols(
        "extension5_parameter extension6_parameter", nonnegative=True
    )
    edge = m/2+(m/2-1)*edge_parameter
    omega_lower = 2*edge**2/m-edge
    omega_upper = edge**2/2
    omega = omega_lower+omega_parameter*(omega_upper-omega_lower)
    tau_lower = 2*omega*(omega-edge)/(3*edge)
    tau_upper = omega*edge/2
    tau = sp.cancel(tau_lower+tau_parameter*(tau_upper-tau_lower))
    bad4 = edge*choose_poly(m-2, 2)-omega*(m-4)-edge*(edge-1)/2+tau
    rows = {
        2: choose_poly(m, 2)-edge,
        3: choose_poly(m, 3)-edge*(m-2)+omega,
        4: choose_poly(m, 4)-bad4,
    }
    low5 = ((m-4)*rows[4]-2*edge*choose_poly(m-2, 3))/5
    high5 = (m-4)*rows[4]/5
    rows[5] = sp.expand(low5+extension5_parameter*(high5-low5))
    low6 = ((m-5)*rows[5]-2*edge*choose_poly(m-2, 4))/6
    high6 = (m-5)*rows[5]/6
    rows[6] = sp.expand(low6+extension6_parameter*(high6-low6))
    value = sp.cancel(c.subs({W[rank]: rows[rank] for rank in range(2, 7)}))
    variables = (
        edge_parameter, omega_parameter, tau_parameter,
        extension5_parameter, extension6_parameter,
    )
    return m, variables, value, exact, sum0, coefficients, b, c


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold-n", type=int, default=11)
    args = parser.parse_args()
    assert args.threshold_n >= 11
    m, variables, value, exact, sum0, coefficients, b, c = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    threshold_m = args.threshold_n-2
    lower_w2 = choose_poly(m, 2)-(m-1)
    d4_upper = sp.expand(coefficients[4].subs({
        sp.Symbol("W2", nonnegative=True): lower_w2,
        sp.Symbol("W3", nonnegative=True): 0,
        sp.Symbol("W4", nonnegative=True): 0,
    }))
    b_upper = sp.expand(b.subs({
        sp.Symbol("W2", nonnegative=True): lower_w2,
        sp.Symbol("W3", nonnegative=True): 0,
        sp.Symbol("W4", nonnegative=True): 0,
    }))
    for bound in (d4_upper, b_upper):
        assert all(coefficient < 0 for coefficient in sp.Poly(
            bound.subs(m, tail+threshold_m), tail
        ).all_coeffs())
    summary = fast_summary(
        sp.cancel(value.subs(m, tail+threshold_m)), variables, tail
    )
    output = HERE / (
        "iso_n7_bundle_g3_sum1_no_parent_nested_shadow_moment_n"
        f"{args.threshold_n}_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "threshold_n": args.threshold_n,
        "exact_expression": str(exact),
        "sum0_base_expression": str(sum0),
        "R_coefficients": {str(rank): str(value) for rank, value in coefficients.items()},
        "nested_shadow_b": str(b),
        "endpoint_c": str(c),
        "d4_negative_ceiling": str(d4_upper),
        "b_negative_ceiling": str(b_upper),
        "summary": summary,
        "scope": "No-parent nonadjacent/common0/sum1 rank-seven G3, isolate-free W.",
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
