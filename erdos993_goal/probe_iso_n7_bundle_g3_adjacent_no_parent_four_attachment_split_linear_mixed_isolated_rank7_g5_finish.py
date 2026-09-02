#!/usr/bin/env python3
"""Shared nested-shadow probes for linear mixed-isolated four-attachment splits."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_isolated_patterns_exact_rank7_g5_finish_20260831.json"
REPORT_SHA = "51FFA1836D05390B7A2065D1D1EADE5E23DF97800461E084080B0135FB865318"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT_LINEAR_MIXED_ISOLATED_RANK7_G5_FINISH"
CONFIG = {
    "31_p1_q0": {"branch": "split_mark_3plus1", "pattern": "p1_q0", "family": "U", "surviving_roots": 3, "threshold_h": 8, "isolated_roots": 1},
    "31_p1_q1": {"branch": "split_mark_3plus1", "pattern": "p1_q1", "family": "U", "surviving_roots": 2, "threshold_h": 7, "isolated_roots": 2},
    "31_p1_q2": {"branch": "split_mark_3plus1", "pattern": "p1_q2", "family": "U", "surviving_roots": 1, "threshold_h": 6, "isolated_roots": 3},
    "31_p0_q3": {"branch": "split_mark_3plus1", "pattern": "p0_q3", "family": "R", "surviving_roots": 1, "threshold_h": 6, "isolated_roots": 3},
    "22_p0_q2": {"branch": "split_mark_2plus2", "pattern": "p0_q2", "family": "R", "surviving_roots": 2, "threshold_h": 7, "isolated_roots": 2},
    "22_p1_q2": {"branch": "split_mark_2plus2", "pattern": "p1_q2", "family": "R", "surviving_roots": 1, "threshold_h": 6, "isolated_roots": 3},
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_value(config_key: str, chart: str):
    assert sha256(REPORT) == REPORT_SHA
    config = CONFIG[config_key]
    branch = json.loads(REPORT.read_text(encoding="utf-8"))[config["branch"]][config["pattern"]]
    h = sp.Symbol("h", positive=True)
    A = {0: sp.Integer(1), 1: h, **{k: sp.Symbol(f"A{k}", nonnegative=True) for k in range(2, 9)}}
    F = {k: sp.Symbol(f"{config['family']}{k}", nonnegative=True) for k in range(2, 8)}
    exact = sp.expand(sp.sympify(branch["identity_in_H_rows"], locals={
        "h": h,
        **{f"A{k}": A[k] for k in range(2, 9)},
        **{str(F[k]): F[k] for k in F},
    }))
    other_prefix = "R" if config["family"] == "U" else "U"
    assert not any(str(symbol).startswith(other_prefix) for symbol in exact.free_symbols)
    base = sp.expand(exact.subs({F[k]: 0 for k in F}))
    coefficients = {k: sp.factor(sp.diff(exact, F[k])) for k in F}
    assert sp.expand(exact-base-sum(coefficients[k]*F[k] for k in F)) == 0
    # The exact rank-four coefficient is not uniformly nonpositive in every
    # mixed-isolation pattern.  Replace it by its negative-monomial part,
    # which is coefficientwise no larger and is manifestly nonpositive on
    # the nonnegative row domain.  This avoids an unjustified shadow use on
    # the small-h sign-changing face.
    d4_variables = (h, *(A[k] for k in range(2, 9)))
    d4_lower = sp.Integer(0)
    for powers, scalar in sp.Poly(coefficients[4], *d4_variables).terms():
        if scalar < 0:
            monomial = scalar
            for variable, power in zip(d4_variables, powers):
                monomial *= variable**power
            d4_lower += monomial
    d4_lower = sp.expand(d4_lower)
    assert all(value >= 0 for value in sp.Poly(sp.expand(coefficients[4]-d4_lower), *d4_variables).coeffs())
    assert all(value <= 0 for value in sp.Poly(d4_lower, *d4_variables).coeffs())
    effective_coefficients = dict(coefficients)
    effective_coefficients[4] = d4_lower
    nested_b = sp.factor(effective_coefficients[3]+effective_coefficients[4]*(h-4)/3)
    nested_c = sp.factor(coefficients[2]+nested_b*(h-3)/2)
    roots = config["surviving_roots"]
    rank2_cap = sp.expand(roots*h-sp.binomial(roots+1, 2)-roots)
    lower = sp.expand(base+rank2_cap*nested_c)

    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    edge = h/2+(h/2-roots)*ep
    omega_low, omega_high = 2*edge-h, edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*h-12*edge+6*h)/(8*edge))
    omega = sp.cancel(omega_low+op*(boundary-omega_low)) if chart == "low_excess" else sp.cancel(boundary+op*(omega_high-boundary))
    excess = omega-2*edge+h
    tau_upper = 2*edge-h+sp.Rational(11, 6)*edge*excess if chart == "low_excess" else omega*edge/2
    tau = sp.cancel(tp*tau_upper)
    bad4 = edge*choose_poly(h-2, 2)-omega*(h-4)-edge*(edge-1)/2+tau
    rows = {2: choose_poly(h, 2)-edge, 3: choose_poly(h, 3)-edge*(h-2)+omega, 4: choose_poly(h, 4)-bad4}
    for rank in range(5, 9):
        previous = rank-1
        low = ((h-previous)*rows[previous]-2*edge*choose_poly(h-2, previous-1))/rank
        high = (h-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    substitutions = {A[k]: rows[k] for k in range(2, 9)}
    sign_substitutions = {A[k]: rows[k] for k in range(2, 7)}
    return {
        "h": h,
        "variables": (ep, op, tp, *(extensions[k] for k in range(5, 9))),
        "value": sp.cancel(lower.subs(substitutions)),
        "c_value": sp.cancel(nested_c.subs(sign_substitutions)),
        "exact": exact,
        "base": base,
        "coefficients": coefficients,
        "effective_coefficients": effective_coefficients,
        "rank4_negative_monomial_lower": d4_lower,
        "nested_b": nested_b,
        "nested_c": nested_c,
        "lower": lower,
        "rank2_cap": rank2_cap,
    }


def summarize(expression, variables, h, threshold):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(value > 0 for value in sp.Poly(denominator, tail, variables[0]).coeffs())
    return fast_summary(numerator, variables, tail), str(sp.factor(denominator))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", choices=tuple(CONFIG), required=True)
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    args = parser.parse_args()
    config = CONFIG[args.config]
    values = build_value(args.config, args.chart)
    threshold = config["threshold_h"]
    summary, denominator = summarize(values["value"], values["variables"], values["h"], threshold)
    c_summary, c_denominator = summarize(-values["c_value"], values["variables"][:5], values["h"], threshold)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_linear_{args.config}_{args.chart}_h{threshold}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "config": args.config,
        "distribution": args.config[:2],
        "pattern": config["pattern"],
        "chart": args.chart,
        "threshold_h": threshold,
        "threshold_n": threshold+config["isolated_roots"]+2,
        "surviving_roots": config["surviving_roots"],
        "exact_identity": str(values["exact"]),
        "root_zero_base": str(values["base"]),
        "root_coefficients": {str(k): str(value) for k, value in values["coefficients"].items()},
        "nested_shadow": {"rank4_negative_monomial_lower": str(values["rank4_negative_monomial_lower"]), "b": str(values["nested_b"]), "c": str(values["nested_c"]), "rank2_cap": str(values["rank2_cap"]), "safe_lower": str(values["lower"])},
        "summary": summary,
        "positive_denominator": denominator,
        "negative_c_summary": c_summary,
        "positive_c_denominator": c_denominator,
        "scope": "Linear mixed-isolated split exactly-four adjacent no-parent attachment pattern with isolate-free H.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "config": args.config,
        "chart": args.chart,
        "main_negatives": summary["negative_tail_scalar_coefficients"],
        "minus_c_negatives": c_summary["negative_tail_scalar_coefficients"],
        "minimum": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
