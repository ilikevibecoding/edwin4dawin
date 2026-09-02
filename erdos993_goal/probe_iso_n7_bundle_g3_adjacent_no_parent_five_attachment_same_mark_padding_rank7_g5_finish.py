#!/usr/bin/env python3
"""Isolate-padding safe-cap probe for same-mark exactly-five attachments."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
DERIVE_REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
DERIVE_REPORT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SAME_MARK_PADDING_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def padding_coefficients():
    assert sha256(DERIVE_REPORT) == DERIVE_REPORT_SHA
    branch = json.loads(DERIVE_REPORT.read_text(encoding="utf-8"))
    m = sp.Symbol("m", positive=True)
    a, b = sp.symbols("a b", nonnegative=True, integer=True)
    W = {0: sp.Integer(1), 1: m, **{k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}}
    P = {0: sp.Integer(0), 1: b, **{k: sp.Symbol(f"P{k}", nonnegative=True) for k in range(2, 8)}}
    Q = {0: sp.Integer(0), 1: a, **{k: sp.Symbol(f"Q{k}", nonnegative=True) for k in range(2, 8)}}
    exact = sp.expand(sp.sympify(branch["identity"], locals={
        "m": m,
        "a": a,
        "b": b,
        **{f"W{k}": W[k] for k in range(2, 9)},
        **{f"P{k}": P[k] for k in range(2, 8)},
        **{f"Q{k}": Q[k] for k in range(2, 8)},
    }).subs({a: 5, b: 0, **{P[k]: 0 for k in range(2, 8)}}))
    h, isolates = sp.symbols("h isolates", nonnegative=True, integer=True)
    I = {0: sp.Integer(1), 1: h, **{k: sp.Symbol(f"I{k}", nonnegative=True) for k in range(2, 9)}}
    J = {0: sp.Integer(0), 1: sp.Integer(5), **{k: sp.Symbol(f"J{k}", nonnegative=True) for k in range(2, 8)}}
    padded_w = {k: sp.expand(sum(choose_poly(isolates, k-j)*I[j] for j in range(k+1))) for k in range(2, 9)}
    padded_q = {k: sp.expand(sum(choose_poly(isolates, k-j)*J[j] for j in range(k+1))) for k in range(2, 8)}
    padded = sp.expand(exact.subs({
        m: h+isolates,
        **{W[k]: padded_w[k] for k in range(2, 9)},
        **{Q[k]: padded_q[k] for k in range(2, 8)},
    }, simultaneous=True))
    coefficients = {
        index: sp.expand(sum((-1)**(index-j)*sp.binomial(index, j)*padded.subs(isolates, j) for j in range(index+1)))
        for index in range(9)
    }
    assert sp.expand(padded-sum(coefficients[index]*choose_poly(isolates, index) for index in range(9))) == 0
    return h, I, J, coefficients


def union_safe_lower(h, I, J, coefficient):
    jvars = [J[rank] for rank in range(2, 8) if J[rank] in coefficient.free_symbols]
    assert all(sp.diff(coefficient, symbol, 2) == 0 for symbol in jvars)
    derivatives = {int(str(symbol)[1:]): sp.expand(sp.diff(coefficient, symbol)) for symbol in jvars}
    lower = sp.expand(coefficient.subs({symbol: 0 for symbol in jvars}))
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
        cap = choose_poly(h, rank)-choose_poly(h-5, rank)
        lower += negative*cap
        audit[f"J{rank}"] = {
            "exact_derivative": str(derivative),
            "negative_monomial_lower": str(negative),
            "cap": str(cap),
            "cap_proof": "J_rank<=C(h,rank)-C(h-5,rank), since the five attachment roots are mutually nonadjacent.",
        }
    return sp.expand(lower), audit


def extension_value(index: int):
    h, I, J, coefficients = padding_coefficients()
    lower, audit = union_safe_lower(h, I, J, coefficients[index])
    edge_parameter, omega_parameter = sp.symbols("edge_parameter omega_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(4, 9)}
    edge = (h-5)*edge_parameter
    omega_low, omega_high = 2*edge**2/h-edge, edge**2/2
    omega = omega_low+omega_parameter*(omega_high-omega_low)
    rows = {2: choose_poly(h, 2)-edge, 3: choose_poly(h, 3)-edge*(h-2)+omega}
    for rank in range(4, 9):
        previous = rank-1
        low = ((h-previous)*rows[previous]-2*edge*choose_poly(h-2, previous-1))/rank
        high = (h-previous)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    value = sp.cancel(lower.subs({I[k]: rows[k] for k in range(2, 9)}))
    return h, (edge_parameter, omega_parameter, *(extensions[k] for k in range(4, 9))), value, coefficients[index], lower, audit


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=int, required=True, choices=range(1, 9))
    parser.add_argument("--threshold-h", type=int, default=5)
    args = parser.parse_args()
    h, variables, value, exact, lower, audit = extension_value(args.index)
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(sp.cancel(value.subs(h, tail+args.threshold_h)), variables, tail)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_padding_H{args.index}_h{args.threshold_h}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic lower; no theorem asserted",
        "newton_index": args.index,
        "threshold_h": args.threshold_h,
        "exact_newton_coefficient": str(exact),
        "safe_lower": str(lower),
        "union_root_cap_audit": audit,
        "forest_edge_ceiling": "e<=h-5 because the five attachment roots lie in distinct components",
        "summary": summary,
        "scope": "Same-mark exactly-five-attachment isolate padding.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "newton_index": args.index,
        "threshold_h": args.threshold_h,
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
