#!/usr/bin/env python3
"""Eliminate the minor order q from the retained-isolate coarse lower.

On a branch with e retained marked vertices write q=e+t, where
0<=t<=n-e.  The coarse containment lower is affine in q.  Split its q-slope
coefficientwise into P_+ + P_-, with P_+>=0 and P_-<=0 on nonnegative full
occupation rows.  Then

  L(C,e+t) >= L(C,e) + (n-e) P_-(C).

The result depends only on the full marked forest and n.  Positivity of this
new lower is a separate theorem target.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_COARSE_Q_LOWER_ROOT"
EXPECTED_INPUT_SHA256 = "148997F5D5ED3A798B18B4FEEF6FF13166366247ACA4D445495AB6655095E12A"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def signed_parts(expression: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
    expression = sp.expand(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    positive = sp.Integer(0)
    negative = sp.Integer(0)
    if not variables:
        if expression.is_negative is True:
            return positive, expression
        return expression, negative
    for powers, coefficient in sp.Poly(expression, *variables).terms():
        term = sp.Integer(coefficient)
        for variable, power in zip(variables, powers):
            term *= variable**power
        if coefficient < 0:
            negative += term
        else:
            positive += term
    return sp.expand(positive), sp.expand(negative)


def summary(expression: sp.Expr) -> dict[str, object]:
    expression = sp.expand(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    if variables:
        polynomial = sp.Poly(expression, *variables)
        coefficients = polynomial.coeffs()
        terms = polynomial.terms()
    elif expression == 0:
        coefficients, terms = [], []
    else:
        coefficients, terms = [expression], [((), expression)]
    return {
        "terms": len(terms),
        "negative_scalar_coefficients": sum(c.is_negative is True for c in coefficients),
        "minimum_scalar_coefficient": str(min(coefficients, default=0)),
        "polynomial_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def main() -> None:
    input_hash = sha256(INPUT)
    if input_hash != EXPECTED_INPUT_SHA256:
        raise RuntimeError(f"input report hash mismatch: {input_hash}")
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    q = sp.Symbol("q")
    n = sp.Symbol("n")
    branches = {}
    for label, row in source["branches"].items():
        expression = sp.sympify(row["expression"])
        slope = sp.expand(sp.diff(expression, q))
        if sp.diff(slope, q) != 0:
            raise RuntimeError(f"q nonlinearity in {label}")
        positive, negative = signed_parts(slope)
        parts = label.split("_")
        retained_marks = int(parts[1][1:]) + int(parts[2][1:])
        lower = sp.expand(
            expression.subs(q, retained_marks) + (n - retained_marks) * negative
        )
        branches[label] = {
            "retained_mark_count": retained_marks,
            "q_slope_expression": str(sp.factor(slope)),
            "q_slope_positive_part": str(sp.factor(positive)),
            "q_slope_negative_part": str(sp.factor(negative)),
            "lower_expression": str(lower),
            "lower_summary": summary(lower),
        }
    report = {
        "marker": MARKER,
        "input": INPUT.name,
        "input_sha256": input_hash,
        "q_interval": "retained_mark_count <= q <= n",
        "lower_rule": "L(C,q)>=L(C,e)+(n-e)*P_-(C), coefficientwise in nonnegative C rows",
        "branches": branches,
        "status": "exact q-free lower derived; universal nonnegativity remains open",
        "scope_guard": (
            "The q elimination is a valid lower reduction. Negative coefficients do not "
            "constitute forest counterexamples, and positivity is not asserted here."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "branches": {label: row["lower_summary"] for label, row in branches.items()},
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
