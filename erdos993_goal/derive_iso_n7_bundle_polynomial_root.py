#!/usr/bin/env python3
"""Derive the exact rank-seven whole-sibling-bundle payment polynomial.

Expand

  Gamma_M = N7((1+x)^M C+xD) - N7(C+xD)
            - sum_{t=0}^{M-1} N6((1+x)^t C)

in the binomial basis ``binom(M,j)``.  This is an algebraic frontier only;
it records the exact coefficient formulas without asserting their signs.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_polynomial_root import (
    add_xd,
    binomial_basis,
    isolate_multiply,
    nested_rank,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_whole_bundle_binomial_symbolic_root_20260830.json"


def main() -> None:
    rank = 7
    maximum = rank + 1
    m, t = sp.symbols("M t", integer=True, nonnegative=True)
    names = "EUVW"
    crows = tuple(tuple(sp.symbols(f"c{name}0:{maximum + 1}")) for name in names)
    drows = tuple(tuple(sp.symbols(f"d{name}0:{maximum + 1}")) for name in names)

    bundled = add_xd(isolate_multiply(crows, m, maximum), drows)
    base = add_xd(crows, drows)
    isolated_c = isolate_multiply(crows, t, rank)
    lower = nested_rank(isolated_c, rank - 1)
    lower_polynomial = sp.Poly(lower, t)
    lower_sum = sp.expand(
        sum(
            coefficient
            * (sp.bernoulli(power + 1, m) - sp.bernoulli(power + 1, 0))
            / (power + 1)
            for (power,), coefficient in lower_polynomial.terms()
        )
    )
    gamma = sp.expand(
        nested_rank(bundled, rank) - nested_rank(base, rank) - lower_sum
    )
    assert sp.expand(gamma.subs(m, 0)) == 0
    coefficients = binomial_basis(gamma, m)

    n, q, epsilon_u, epsilon_v = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    structural = {}
    for name in names:
        structural[sp.Symbol(f"c{name}0")] = 1
        structural[sp.Symbol(f"d{name}0")] = 1
    structural.update(
        {
            sp.Symbol("cE1"): n,
            sp.Symbol("cU1"): n - 1,
            sp.Symbol("cV1"): n - 1,
            sp.Symbol("cW1"): n - 2,
            sp.Symbol("dE1"): q,
            sp.Symbol("dU1"): q - epsilon_u,
            sp.Symbol("dV1"): q - epsilon_v,
            sp.Symbol("dW1"): q - epsilon_u - epsilon_v,
        }
    )

    summaries = []
    for index, coefficient in enumerate(coefficients):
        factored = sp.factor(coefficient)
        structural_form = sp.factor(coefficient.subs(structural))
        polynomial = (
            sp.Poly(coefficient, *sorted(coefficient.free_symbols, key=str))
            if coefficient
            else None
        )
        summaries.append(
            {
                "binomial_rank": index,
                "monomials": len(polynomial.terms()) if polynomial is not None else 0,
                "negative_scalar_coefficients": (
                    sum(1 for value in polynomial.coeffs() if value.is_negative is True)
                    if polynomial is not None
                    else 0
                ),
                "factor": str(factored),
                "first_order_structural_factor": str(structural_form),
            }
        )

    report = {
        "marker": "DERIVED_EXACT_ISO_N7_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT",
        "identity": (
            "Gamma_M=N7((1+x)^M C+xD)-N7(C+xD)-"
            "sum_(t=0)^(M-1)N6((1+x)^t C)"
        ),
        "rank": rank,
        "degree_in_M": sp.Poly(gamma, m).degree(),
        "binomial_coefficients": summaries,
        "structural_substitution": (
            "constant and first coefficients of every C/D row, with C order n, "
            "D order q, and mark-survival indicators epsilon_u,epsilon_v"
        ),
        "scope": (
            "Exact rank-seven algebraic reduction only. No coefficient sign, "
            "rank-seven Bundle Payment Lemma, all-N7 theorem, or resolution of "
            "Erdos Problem 993 is asserted."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": report["marker"],
                "degree_in_M": report["degree_in_M"],
                "summary": [
                    {
                        "binomial_rank": row["binomial_rank"],
                        "monomials": row["monomials"],
                        "negative_scalar_coefficients": row[
                            "negative_scalar_coefficients"
                        ],
                    }
                    for row in summaries
                ],
            },
            indent=2,
            sort_keys=True,
        )
    )
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
