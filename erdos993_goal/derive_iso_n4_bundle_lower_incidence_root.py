#!/usr/bin/env python3
"""Rewrite the lower N4 bundle coefficients in exact mark-incidence layers.

For a marked independence complex, let P,A,B,C count faces containing
neither mark, u only, v only, and both marks after removing the marks.  Then
the four minor rows are (P+xA+xB+x^2C, P+xB, P+xA, P).  The same split is
applied to the support-neighbourhood deletion D.  This is an algebraic
diagnostic for binomial coefficients g1 and g2.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_g3_invariants_root import raw_coefficient_three
from derive_iso_n4_bundle_polynomial_root import (
    add_xd,
    binomial_basis,
    isolate_multiply,
    nested_rank,
)


def coefficient_rows() -> list[sp.Expr]:
    m, t = sp.symbols("M t", integer=True, nonnegative=True)
    names = "EUVW"
    crows = tuple(tuple(sp.symbols(f"c{name}0:6") for _ in [0])[0] for name in names)
    drows = tuple(tuple(sp.symbols(f"d{name}0:6") for _ in [0])[0] for name in names)
    tm = add_xd(isolate_multiply(crows, m, 5), drows)
    t0 = add_xd(crows, drows)
    ct = isolate_multiply(crows, t, 4)
    lower = nested_rank(ct, 3)
    lower_polynomial = sp.Poly(lower, t)
    lower_sum = sp.expand(
        sum(
            coefficient
            * (sp.bernoulli(power + 1, m) - sp.bernoulli(power + 1, 0))
            / (power + 1)
            for (power,), coefficient in lower_polynomial.terms()
        )
    )
    gamma = sp.expand(nested_rank(tm, 4) - nested_rank(t0, 4) - lower_sum)
    return binomial_basis(gamma, m)


def incidence_substitution(prefix: str, maximum: int = 5) -> dict[sp.Symbol, sp.Expr]:
    # Lower-case layer names p,a,b,c; four-row names E,U,V,W.
    layers = {
        name: tuple(sp.symbols(f"{prefix}{name}0:{maximum + 1}"))
        for name in "pabc"
    }
    substitution: dict[sp.Symbol, sp.Expr] = {}
    for k in range(maximum + 1):
        p = layers["p"][k]
        a = layers["a"][k - 1] if k >= 1 else 0
        b = layers["b"][k - 1] if k >= 1 else 0
        c = layers["c"][k - 2] if k >= 2 else 0
        substitution[sp.symbols(f"{prefix[0]}E{k}")] = p + a + b + c
        substitution[sp.symbols(f"{prefix[0]}U{k}")] = p + b
        substitution[sp.symbols(f"{prefix[0]}V{k}")] = p + a
        substitution[sp.symbols(f"{prefix[0]}W{k}")] = p
    return substitution


def main() -> None:
    coefficients = coefficient_rows()
    # Prefix strings begin with the actual row prefix c/d and then use a
    # descriptive separator so the layer symbols cannot collide.
    c_layers = {
        name: tuple(sp.symbols(f"C{name}0:6")) for name in "pabc"
    }
    d_layers = {
        name: tuple(sp.symbols(f"D{name}0:6")) for name in "pabc"
    }
    substitution: dict[sp.Symbol, sp.Expr] = {}
    for row_prefix, layers in (("c", c_layers), ("d", d_layers)):
        for k in range(6):
            p = layers["p"][k]
            a = layers["a"][k - 1] if k >= 1 else 0
            b = layers["b"][k - 1] if k >= 1 else 0
            both = layers["c"][k - 2] if k >= 2 else 0
            substitution[sp.symbols(f"{row_prefix}E{k}")] = p + a + b + both
            substitution[sp.symbols(f"{row_prefix}U{k}")] = p + b
            substitution[sp.symbols(f"{row_prefix}V{k}")] = p + a
            substitution[sp.symbols(f"{row_prefix}W{k}")] = p

    results = {}
    for rank in (1, 2, 3):
        expression = sp.factor(coefficients[rank].subs(substitution))
        polynomial = sp.Poly(expression, *sorted(expression.free_symbols, key=str))
        results[f"g{rank}"] = {
            "factor": str(expression),
            "monomials": len(polynomial.terms()),
            "negative_scalar_coefficients": sum(
                1 for _, value in polynomial.terms() if value < 0
            ),
        }
    assert sp.expand(coefficients[3] - raw_coefficient_three()) == 0

    report = {
        "marker": "DERIVED_EXACT_ISO_N4_BUNDLE_LOWER_INCIDENCE_LAYERS",
        "reconstruction": {
            "E": "P+xA+xB+x^2C",
            "U": "P+xB",
            "V": "P+xA",
            "W": "P",
        },
        "coefficients": results,
        "scope": "Exact algebraic diagnostic only; no sign theorem is asserted.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    Path("iso_n4_bundle_lower_incidence_layers_root_20260829.json").write_text(
        raw, encoding="utf-8"
    )
    print(raw, end="")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
