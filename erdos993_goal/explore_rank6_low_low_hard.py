#!/usr/bin/env python3
"""Classify the negative face of the rank-six low/low convolution cone."""

from __future__ import annotations

import gzip
import json

import sympy as sp

from explore_rank6_three_halves_convolution import low_low
from verify_rank4_three_halves_forest_certificate import polynomial_statistics


def main() -> int:
    margin, context = low_low()
    names = [str(value) for value in context.gens()]
    negatives = [
        (tuple(int(value) for value in monomial), int(coefficient))
        for monomial, coefficient in margin.terms()
        if coefficient < 0
    ]
    support = {}
    for index, name in enumerate(names):
        values = [monomial[index] for monomial, _ in negatives]
        support[name] = {
            "min": min(values),
            "max": max(values),
            "nonzero": sum(value > 0 for value in values),
        }
    print(json.dumps({"stats": polynomial_statistics(margin), "negative_support": support}, indent=2))

    kept = tuple(index for index, name in enumerate(names) if support[name]["nonzero"])
    hard_map = {
        tuple(int(monomial[index]) for index in kept): int(coefficient)
        for monomial, coefficient in margin.terms()
        if all(
            exponent == 0
            for index, exponent in enumerate(monomial)
            if index not in kept
        )
    }
    variables = sp.symbols(" ".join(names[index] for index in kept), nonnegative=True)
    hard = sp.Poly.from_dict(hard_map, variables, domain=sp.ZZ)
    with gzip.open("rank6_low_low_hard_coefficients.json.gz", "wt", encoding="utf-8") as handle:
        json.dump(
            [[[int(value) for value in monomial], int(coefficient)] for monomial, coefficient in hard.terms()],
            handle,
            separators=(",", ":"),
        )
    hard_values = [int(value) for value in hard.coeffs()]
    print("kept", tuple(names[index] for index in kept))
    print("hard", {
        "terms": len(hard.terms()),
        "negative": sum(value < 0 for value in hard_values),
        "minimum": min(hard_values),
        "maximum": max(hard_values),
    })
    factors = sp.factor_list(hard.as_expr())[1]
    print("factor_count", len(factors))
    for factor, exponent in factors:
        polynomial = sp.Poly(factor, *variables, domain=sp.ZZ)
        values = [int(value) for value in polynomial.coeffs()]
        print("factor", exponent, len(values), sum(value < 0 for value in values), min(values), max(values))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
