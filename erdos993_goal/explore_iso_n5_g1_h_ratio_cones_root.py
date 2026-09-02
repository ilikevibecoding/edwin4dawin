#!/usr/bin/env python3
"""Test the H(A) block on the proved rank-five factorial-drop cones.

For q_k=2^k k! i_k and rho_j=q_(j+1)/q_j, every term of H contains
q_1^2.  This script removes that positive scale, substitutes the certified
high/low drop cones through delta_4, and audits exact scalar coefficients.
It is a discovery artifact until any remaining negative coefficients are
paid and the finite exceptional scope is replayed.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_h_ratio_cones_probe_root_20260829.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_H_FACTORIAL_DROP_CONES_ROOT"


def summary(expression: sp.Expr, variables: tuple[sp.Symbol, ...]) -> dict:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    negative = [
        {"powers": list(powers), "coefficient": str(coefficient)}
        for powers, coefficient in polynomial.terms()
        if coefficient.is_negative is True
    ]
    return {
        "terms": len(polynomial.terms()),
        "negative_coefficients": len(negative),
        "minimum_coefficient": str(min(polynomial.coeffs())),
        "negative_terms": negative,
    }


def main() -> None:
    rho = sp.symbols("rho1:6", nonnegative=True)
    q = [sp.Integer(1), sp.Integer(1)]
    for value in rho:
        q.append(sp.expand(q[-1] * value))
    a = [q[k] / (sp.Integer(2) ** k * sp.factorial(k)) for k in range(7)]
    h = sp.expand(
        2 * a[1] * a[4] - 5 * a[1] * a[5] - 6 * a[1] * a[6]
        + 6 * a[2] * a[3] - 8 * a[2] * a[5]
        + 5 * a[3] ** 2 + 6 * a[3] * a[4]
    )
    denominator = sp.ilcm(*[term.q for term in sp.Poly(h, *rho).coeffs()])
    normalized = sp.expand(denominator * h)

    t, d1, d2, d3, d4 = sp.symbols("t d1 d2 d3 d4", nonnegative=True)
    high_rules = {
        rho[4]: t,
        rho[3]: t + 1 + d4,
        rho[2]: t + 2 + d4 + d3,
        rho[1]: t + 3 + d4 + d3 + d2,
        rho[0]: t + 4 + d4 + d3 + d2 + d1,
    }
    high = sp.expand(normalized.subs(high_rules))
    high_variables = (t, d1, d2, d3, d4)

    r = sp.Symbol("r", nonnegative=True)
    low_rules = {
        rho[4]: t,
        rho[3]: t + 1 + d4,
        rho[2]: t + 2 + d4 + d3,
        rho[1]: t + 4 - r + d4 + d3 + d2,
        rho[0]: t + 4 + d4 + d3 + d2,
    }
    low = sp.expand(normalized.subs(low_rules))
    low_variables = (t, r, d2, d3, d4)

    # Convert the bounded coordinate 0<=r<=1 to its exact Bernstein basis.
    degree_r = sp.degree(low, r)
    power_coefficients = [sp.expand(low).coeff(r, j) for j in range(degree_r + 1)]
    bernstein_coefficients = []
    for k in range(degree_r + 1):
        bernstein_coefficients.append(sp.expand(sum(
            sp.Rational(sp.binomial(k, j), sp.binomial(degree_r, j)) * power_coefficients[j]
            for j in range(k + 1)
        )))
    low_bernstein = [summary(value, (t, d2, d3, d4)) for value in bernstein_coefficients]

    report = {
        "marker": MARKER,
        "scale": f"normalized={denominator}*H/q1^2",
        "normalized_rho_expression": str(sp.factor(normalized)),
        "high_cone": {
            "drops": "delta1=1+d1, delta2=1+d2, delta3=1+d3, delta4=1+d4",
            "summary": summary(high, high_variables),
            "expression": str(sp.factor(high)),
        },
        "low_cone": {
            "drops": "delta1=r in [0,1], delta2=2-r+d2, delta3=1+d3, delta4=1+d4",
            "power_summary": summary(low, low_variables),
            "degree_in_r": int(degree_r),
            "bernstein_summaries": low_bernstein,
            "bernstein_coefficients": [str(sp.factor(value)) for value in bernstein_coefficients],
        },
        "scope": "Exact cone substitution only; no all-forest H sign is asserted here.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
