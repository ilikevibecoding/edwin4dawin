#!/usr/bin/env python3
"""Simple rooted-cap moment probe for adjacent no-parent exactly four attachments."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
GENERAL_REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
GENERAL_REPORT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SIMPLECAP_MOMENT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(a: int, b: int, chart: str):
    assert a + b == 4 and a >= b >= 0
    assert sha256(GENERAL_REPORT) == GENERAL_REPORT_SHA
    general = json.loads(GENERAL_REPORT.read_text(encoding="utf-8"))
    m = sp.Symbol("m", positive=True)
    W = {k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}
    P = {k: sp.Symbol(f"P{k}", nonnegative=True) for k in range(2, 8)}
    Q = {k: sp.Symbol(f"Q{k}", nonnegative=True) for k in range(2, 8)}
    exact = sp.expand(sp.sympify(general["identity"], locals={
        "m": m,
        "a": sp.Integer(a),
        "b": sp.Integer(b),
        **{f"W{k}": W[k] for k in W},
        **{f"P{k}": P[k] for k in P},
        **{f"Q{k}": Q[k] for k in Q},
    }))
    exact = sp.expand(exact.subs({**({P[k]: 0 for k in P} if b == 0 else {}), **({Q[k]: 0 for k in Q} if a == 0 else {})}))

    base_variables = (m, *(W[k] for k in range(2, 9)))
    root_variables = tuple(([P[k] for k in range(2, 8)] if b else []) + ([Q[k] for k in range(2, 8)] if a else []))
    variables = base_variables + root_variables
    caps = {
        **({P[k]: choose_poly(m, k) - choose_poly(m-b, k) for k in range(2, 8)} if b else {}),
        **({Q[k]: choose_poly(m, k) - choose_poly(m-a, k) for k in range(2, 8)} if a else {}),
    }
    lower = sp.Integer(0)
    base_terms = negative_terms = positive_terms = 0
    for powers, scalar in sp.Poly(exact, *variables).terms():
        monomial = scalar
        has_root = any(powers[len(base_variables):])
        if not has_root:
            for variable, power in zip(base_variables, powers[:len(base_variables)]):
                monomial *= variable**power
            lower += monomial
            base_terms += 1
        elif scalar < 0:
            for variable, power in zip(base_variables, powers[:len(base_variables)]):
                monomial *= variable**power
            for variable, power in zip(root_variables, powers[len(base_variables):]):
                monomial *= caps[variable]**power
            lower += monomial
            negative_terms += 1
        else:
            positive_terms += 1
    lower = sp.expand(lower)

    edge_parameter, omega_parameter, tau_parameter = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = m/2 + (m/2-4)*edge_parameter
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
    audit = {
        "base_terms_kept_exact": base_terms,
        "negative_root_monomials_paid_at_union_caps": negative_terms,
        "nonnegative_root_monomials_dropped": positive_terms,
        "caps": {str(variable): str(caps[variable]) for variable in root_variables},
        "edge_bound": "e<=m-4 because the four attachment roots lie in four distinct W-components",
    }
    return m, (edge_parameter, omega_parameter, tau_parameter, *(extensions[k] for k in range(5, 9))), value, exact, lower, audit


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--distribution", choices=("4+0", "3+1", "2+2"), required=True)
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    parser.add_argument("--threshold-m", type=int, default=9)
    args = parser.parse_args()
    a, b = map(int, args.distribution.split("+"))
    m, variables, value, exact, lower, audit = build_value(a, b, args.chart)
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(m, tail+args.threshold_m))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(coefficient > 0 for coefficient in sp.Poly(denominator, tail, variables[0]).coeffs())
    summary = fast_summary(numerator, variables, tail)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_simplecap_moment_{a}{b}_{args.chart}_m{args.threshold_m}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "distribution": args.distribution,
        "chart": args.chart,
        "threshold_m": args.threshold_m,
        "exact_identity": str(exact),
        "safe_lower": str(lower),
        "audit": audit,
        "summary": summary,
        "positive_denominator": str(sp.factor(denominator)),
        "scope": "Exactly four attachment roots, all nonisolated in distinct components of isolate-free W.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "distribution": args.distribution,
        "chart": args.chart,
        "threshold_m": args.threshold_m,
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
