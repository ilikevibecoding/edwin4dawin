#!/usr/bin/env python3
"""Test a factorization of the bottom target through output multipliers.

If H_c is obtained from the actual target F by multiplying [X^p Y^q]
by (c)_p(c)_q, then F=(T_c tensor T_c)H_c, where
T_c(X^p)=X^p/(c)_p.  Since T_c preserves stability, stability of H_c for
one fixed c>0 would prove the bottom endpoint.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from explore_bottom_slice_hypergeometric import X, Y, bottom_target
from probe_umbral_repaired_core_stability import integer_values


OUT = Path("output_multiplier_bottom_stability_probe_20260802.json")
Z = sp.symbols("Z")


def output_multiplier(poly: sp.Poly, c: sp.Rational) -> sp.Poly:
    expression = sum(
        coefficient*sp.rf(c, p)*sp.rf(c, q)*X**p*Y**q
        for (p, q), coefficient in poly.terms()
    )
    return sp.Poly(sp.expand(expression), X, Y)


def line_polynomial(poly: sp.Poly, line: tuple[int, int, int, int]) -> sp.Poly:
    xb, xd, yb, yd = line
    return sp.Poly(sp.expand(poly.as_expr().subs({X: xb+xd*Z, Y: yb+yd*Z})), Z)


def nonreal(poly: sp.Poly) -> int:
    values = [sp.Rational(poly.nth(i)) for i in range(poly.degree()+1)]
    roots = fmpz_poly(integer_values(values)).complex_roots()
    return sum(multiplicity for root, multiplicity in roots if not root.imag.is_zero())


def main() -> None:
    ctx.prec = 128
    rng = random.Random(993_20260802 + 181)
    parameters = [sp.Rational(1, 2), sp.Integer(1), sp.Integer(2), sp.Integer(3), sp.Integer(4), sp.Integer(6), sp.Integer(10)]
    records = []
    first_failures = []
    for m in range(1, 13):
        target = bottom_target(m)
        lines = [
            (rng.randint(-60, 60), rng.randint(1, 30), rng.randint(-60, 60), rng.randint(1, 30))
            for _ in range(20)
        ]
        for c in parameters:
            transformed = output_multiplier(target, c)
            failures = 0
            for trial, line in enumerate(lines):
                count = nonreal(line_polynomial(transformed, line))
                failures += bool(count)
                if count and len(first_failures) < 50:
                    first_failures.append({"m": m, "c": str(c), "trial": trial, "line": line, "nonreal": count})
            record = {"m": m, "N": 3*m+3, "c": str(c), "trials": len(lines), "failures": failures}
            records.append(record)
            print(json.dumps(record), flush=True)
    totals = {
        str(c): sum(item["failures"] for item in records if item["c"] == str(c))
        for c in parameters
    }
    report = {
        "kind": "output_multiplier_bottom_stability_probe",
        "date": "2026-08-02",
        "status": "DONE_FINITE_EXACT_OUTPUT_MULTIPLIER_SCAN",
        "definition": "[X^pY^q]H_c=(c)_p(c)_q[X^pY^q]F; F=(T_c tensor T_c)H_c",
        "m_range": [1, 12],
        "parameters": [str(c) for c in parameters],
        "failure_totals": totals,
        "records": records,
        "first_failures": first_failures,
        "warning": "Finite exact affine-line tests only.",
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"failure_totals": totals, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
