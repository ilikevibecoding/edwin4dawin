#!/usr/bin/env python3
"""Reduce the rank-four internal-spine coefficients by bare-path length.

This consumes the exact factor-row reduction and substitutes the stable path
coefficients for Y=I(P_(ell-1)) and Z=I(P_(ell-2)).  With ell=11+h it records
the exact binomial-basis coefficients in h.  Positivity of those remaining
parent-side forms is a separate obligation.
"""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_internal_spine_factor_root_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_internal_spine_path_length_root_20260829.json"


def choose_polynomial(variable: sp.Expr, rank: int) -> sp.Expr:
    return sp.expand(sp.prod(variable - j for j in range(rank)) / factorial(rank))


def binomial_basis(expression: sp.Expr, variable: sp.Symbol) -> list[sp.Expr]:
    degree = sp.Poly(sp.expand(expression), variable).degree()
    values = [sp.expand(expression.subs(variable, i)) for i in range(degree + 1)]
    out = []
    while values:
        out.append(sp.factor(values[0]))
        values = [sp.expand(values[i + 1] - values[i]) for i in range(len(values) - 1)]
    reconstruction = sp.expand(
        sum(value * choose_polynomial(variable, j) for j, value in enumerate(out))
    )
    assert sp.expand(reconstruction - expression) == 0
    return out


def coefficient_summary(value: sp.Expr) -> dict[str, object]:
    symbols = sorted(value.free_symbols, key=str)
    polynomial = sp.Poly(sp.expand(value), *symbols) if symbols else sp.Poly(value)
    coefficients = polynomial.coeffs()
    return {
        "monomials": len(coefficients),
        "negative_scalar_coefficients": sum(c.is_negative is True for c in coefficients),
        "positive_scalar_coefficients": sum(c.is_positive is True for c in coefficients),
        "factor": str(sp.factor(value)),
    }


def main() -> None:
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_FACTOR_ROOT"
    h = sp.symbols("h", integer=True, nonnegative=True)
    # The largest required path coefficient has rank five in Z=P_(ell-2).
    # For ell>=6 every upper binomial argument is a nonnegative integer, so
    # the falling-factorial polynomial equals the exact combinatorial value;
    # ell=1..5 are the finite structural boundary.
    ell = 6 + h
    substitutions = {}
    for rank in range(6):
        substitutions[sp.symbols(f"y{rank}")] = choose_polynomial(ell - rank, rank)
        substitutions[sp.symbols(f"z{rank}")] = choose_polynomial(ell - rank - 1, rank)

    report = {
        "marker": "DERIVED_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_PATH_LENGTH_ROOT",
        "stable_shift": "ell=6+h, h>=0",
        "dependency": {
            "file": DEPENDENCY.name,
            "sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        },
        "coefficients": {},
        "scope": "Exact reduction only; signs of the parent-side coefficient forms remain to be proved.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    for name in ("g1_normalized", "g2_normalized"):
        expression = sp.sympify(dependency[name]["factor"])
        specialized = sp.expand(expression.subs(substitutions))
        coefficients = binomial_basis(specialized, h)
        report["coefficients"][name] = {
            "degree_h": len(coefficients) - 1,
            "binomial_coefficients": [coefficient_summary(value) for value in coefficients],
        }

    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "degrees": {
            key: value["degree_h"] for key, value in report["coefficients"].items()
        },
        "summaries": {
            key: [
                {
                    "j": j,
                    "monomials": item["monomials"],
                    "negative": item["negative_scalar_coefficients"],
                }
                for j, item in enumerate(value["binomial_coefficients"])
            ]
            for key, value in report["coefficients"].items()
        },
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
