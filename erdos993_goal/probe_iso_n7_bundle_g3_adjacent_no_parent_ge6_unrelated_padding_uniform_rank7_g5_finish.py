#!/usr/bin/env python3
"""Uniform >=6-root probe for the one-unrelated-isolate G3 increment."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_same_mark_ge5_uniform_axiswise_rank7_g5_finish import axiswise_summary
from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_unrelated_isolate_increment_general_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "1E7F6DB20048AD8CDF0C0BA9C8D9FD9DBADC5991B12AA7024B3A9C1232691E12"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_unrelated_padding_uniform_h6_probe_rank7_g5_finish_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_UNRELATED_PADDING_UNIFORM_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def exact_and_safe_lower():
    assert sha256(INPUT) == INPUT_SHA
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    h, a, b = sp.symbols("h a b", nonnegative=True)
    I = {k: sp.Symbol(f"I{k}", nonnegative=True) for k in range(2, 9)}
    R = {k: sp.Symbol(f"R{k}", nonnegative=True) for k in range(2, 8)}
    S = {k: sp.Symbol(f"S{k}", nonnegative=True) for k in range(2, 8)}
    exact = sp.expand(sp.sympify(upstream["increment"], locals={
        "h": h, "a": a, "b": b,
        **{f"I{k}": I[k] for k in I},
        **{f"R{k}": R[k] for k in R},
        **{f"S{k}": S[k] for k in S},
    }))
    assert sp.expand(exact - exact.xreplace({a: b, b: a, **{R[k]: S[k] for k in R}, **{S[k]: R[k] for k in S}})) == 0
    base_variables = (h, a, b, *(I[k] for k in range(2, 9)))
    root_variables = tuple(R[k] for k in range(2, 8)) + tuple(S[k] for k in range(2, 8))
    variables = base_variables + root_variables
    lower = sp.Integer(0)
    audit = {"dropped_nonnegative_rooted_monomials": 0, "paid_negative_rooted_monomials": 0, "root_caps": {}}
    for powers, scalar in sp.Poly(exact, *variables).terms():
        assert scalar.q == 1
        base_powers = powers[:len(base_variables)]
        root_powers = powers[len(base_variables):]
        assert all(power in (0, 1) for power in root_powers)
        base_monomial = sp.Integer(scalar)
        for variable, power in zip(base_variables, base_powers):
            base_monomial *= variable ** power
        if not any(root_powers):
            lower += base_monomial
            continue
        if scalar > 0:
            audit["dropped_nonnegative_rooted_monomials"] += 1
            continue
        assert scalar < 0
        paid = base_monomial
        for variable, power in zip(root_variables, root_powers):
            if not power:
                continue
            label = str(variable)
            rank = int(label[1:])
            roots = b if label.startswith("R") else a
            cap = sp.expand(choose_poly(h, rank) - choose_poly(h - roots, rank))
            paid *= cap
            audit["root_caps"][label] = str(cap)
        lower += paid
        audit["paid_negative_rooted_monomials"] += 1
    return h, a, b, I, exact, sp.expand(lower), audit


def build_value():
    h, a, b, I, exact, lower, audit = exact_and_safe_lower()
    root_parameter, split_parameter, edge_parameter, omega_parameter = sp.symbols(
        "root_parameter split_parameter edge_parameter omega_parameter", nonnegative=True
    )
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(4, 9)}
    roots = 6 + (h - 6) * root_parameter
    b_value = roots * split_parameter / 2
    a_value = roots - b_value
    edge = (h - roots) * edge_parameter
    omega_low, omega_high = 2 * edge**2 / h - edge, edge**2 / 2
    omega = sp.cancel(omega_low + omega_parameter * (omega_high - omega_low))
    rows = {
        2: choose_poly(h, 2) - edge,
        3: choose_poly(h, 3) - edge * (h - 2) + omega,
    }
    for rank in range(4, 9):
        previous = rank - 1
        low = ((h - previous) * rows[previous] - 2 * edge * choose_poly(h - 2, previous - 1)) / rank
        high = (h - previous) * rows[previous] / rank
        rows[rank] = sp.expand(low + extensions[rank] * (high - low))
    value = sp.cancel(lower.subs({a: a_value, b: b_value, **{I[k]: rows[k] for k in I}}, simultaneous=True))
    variables = (root_parameter, split_parameter, edge_parameter, omega_parameter, *(extensions[k] for k in range(4, 9)))
    return h, variables, value, roots, a_value, b_value, edge, exact, lower, audit


def main() -> None:
    h, variables, value, roots, a_value, b_value, edge, exact, lower, audit = build_value()
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(value.subs(h, tail + 6))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(coefficient >= 0 for coefficient in sp.Poly(denominator, tail, *variables).coeffs())
    summary = axiswise_summary(numerator, variables, tail)
    report = {
        "marker": MARKER,
        "status": "exact diagnostic lower; no theorem asserted",
        "threshold_h": 6,
        "root_count_parameterization": str(roots),
        "split_parameterization": {"a": str(a_value), "b": str(b_value), "symmetry": "a>=b"},
        "edge_parameterization": str(edge),
        "forest_domain": "a+b=r>=6 roots in distinct components imply e<=h-r; all root-isolation patterns included",
        "exact_increment": str(exact),
        "safe_lower": str(lower),
        "root_cap_audit": audit,
        "summary": summary,
        "positive_denominator": str(sp.factor(denominator)),
        "input_sha256": INPUT_SHA,
        "scope": "One-unrelated-isolate increment for arbitrary a+b>=6 adjacent/no-parent G3 configurations; diagnostic continuous moment relaxation.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "degree_profile": summary["degree_profile"],
        "controls": summary["bernstein_controls"],
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
