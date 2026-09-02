#!/usr/bin/env python3
"""Rooted isolate-padding safe-cap probe for endpoint_v common0/sum1 G3."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g3_sum1_endpoint_intersected_tau_moment_rank7_g5_finish import reduced
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_V_ISOLATE_PADDING_SAFE_CAP_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def padding_coefficients():
    m, W, R, exact, _base, _coefficients, _b, _c = reduced("endpoint_v")
    h, isolates = sp.symbols("h isolates", nonnegative=True, integer=True)
    I = {0: sp.Integer(1), 1: h}
    I.update({rank: sp.Symbol(f"I{rank}", nonnegative=True) for rank in range(2, 9)})
    J = {0: sp.Integer(0)}
    J.update({rank: sp.Symbol(f"J{rank}", nonnegative=True) for rank in range(1, 8)})
    padded_w = {
        rank: sp.expand(sum(choose_poly(isolates, rank-j)*I[j] for j in range(rank+1)))
        for rank in range(2, 9)
    }
    padded_r = {
        rank: sp.expand(sum(choose_poly(isolates, rank-j)*J[j] for j in range(rank+1)))
        for rank in range(2, 8)
    }
    padded = sp.expand(exact.subs({
        m: h+isolates,
        **{W[rank]: padded_w[rank] for rank in range(2, 9)},
        **{R[rank]: padded_r[rank] for rank in range(2, 8)},
    }, simultaneous=True))
    coefficients = {
        index: sp.expand(sum(
            (-1)**(index-j)*sp.binomial(index, j)*padded.subs(isolates, j)
            for j in range(index+1)
        ))
        for index in range(9)
    }
    assert sp.expand(padded-sum(coefficients[index]*choose_poly(isolates, index) for index in range(9))) == 0
    return h, I, J, coefficients


def safe_lower(index, h, I, J, coefficient):
    jvars = [J[rank] for rank in range(1, 8) if J[rank] in coefficient.free_symbols]
    assert all(sp.diff(coefficient, symbol, 2) == 0 for symbol in jvars)
    derivatives = {int(str(symbol)[1:]): sp.expand(sp.diff(coefficient, symbol)) for symbol in jvars}
    lower = sp.expand(coefficient.subs({symbol: 0 for symbol in jvars}))
    if 1 in derivatives:
        lower += derivatives[1]
    variables = (h, *(I[rank] for rank in range(2, 9)))
    audit = {}
    for rank in range(2, 8):
        derivative = derivatives.get(rank, sp.Integer(0))
        negative = sp.Integer(0)
        for powers, scalar in sp.Poly(derivative, *variables).terms():
            if scalar < 0:
                monomial = scalar
                for variable, power in zip(variables, powers):
                    monomial *= variable**power
                negative += monomial
        negative = sp.expand(negative)
        assert all(value >= 0 for value in sp.Poly(sp.expand(derivative-negative), *variables).coeffs())
        assert all(value <= 0 for value in sp.Poly(negative, *variables).coeffs())
        cap = choose_poly(h-1, rank-1)
        lower += negative*cap
        audit[f"J{rank}"] = {
            "exact_derivative": str(derivative), "negative_monomial_lower": str(negative), "cap": str(cap),
        }
    return sp.expand(lower), audit


def extension_value(index):
    h, I, J, coefficients = padding_coefficients()
    lower, audit = safe_lower(index, h, I, J, coefficients[index])
    edge_parameter, omega_parameter = sp.symbols("edge_parameter omega_parameter", nonnegative=True)
    extension_parameters = {
        rank: sp.Symbol(f"extension{rank}_parameter", nonnegative=True) for rank in range(4, 9)
    }
    edge = (h-1)*edge_parameter
    omega_lower = 2*edge**2/h-edge
    omega_upper = edge**2/2
    omega = omega_lower+omega_parameter*(omega_upper-omega_lower)
    rows = {
        2: choose_poly(h, 2)-edge,
        3: choose_poly(h, 3)-edge*(h-2)+omega,
    }
    for rank in range(4, 9):
        previous = rank-1
        low = ((h-previous)*rows[previous]-2*edge*choose_poly(h-2, previous-1))/rank
        high = (h-previous)*rows[previous]/rank
        rows[rank] = sp.expand(low+extension_parameters[rank]*(high-low))
    value = sp.cancel(lower.subs({I[rank]: rows[rank] for rank in range(2, 9)}))
    variables = (edge_parameter, omega_parameter, *(extension_parameters[rank] for rank in range(4, 9)))
    return h, variables, value, coefficients[index], lower, audit


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=int, required=True, choices=range(1, 9))
    parser.add_argument("--threshold-h", type=int, default=2)
    args = parser.parse_args()
    h, variables, value, exact_coefficient, lower, audit = extension_value(args.index)
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(sp.cancel(value.subs(h, tail+args.threshold_h)), variables, tail)
    output = HERE / (
        "iso_n7_bundle_g3_sum1_endpoint_v_isolate_padding_H" + str(args.index)
        + f"_safe_cap_h{args.threshold_h}_probe_rank7_g5_finish_20260831.json"
    )
    report = {
        "marker": MARKER, "status": "exact diagnostic lower; no theorem asserted",
        "newton_index": args.index, "threshold_h": args.threshold_h,
        "exact_newton_coefficient": str(exact_coefficient), "safe_lower": str(lower),
        "root_cap_audit": audit, "summary": summary,
        "scope": "endpoint_v common0/sum1 rank-seven G3 isolate padding only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "newton_index": args.index, "threshold_h": args.threshold_h,
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
