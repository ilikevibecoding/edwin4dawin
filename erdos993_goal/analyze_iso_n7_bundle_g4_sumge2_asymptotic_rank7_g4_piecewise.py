#!/usr/bin/env python3
"""Symbolically inspect the q=1 (m=infinity) face of sum>=2 floor bounds."""

from __future__ import annotations

import json

import sympy as sp

from explore_iso_n7_bundle_g4_sumge2_floor_or_bernstein_rank7_g4_piecewise import (
    build_polynomials,
)


def main():
    selected = ("triple134",)
    polynomials = build_polynomials(
        endpoint_pairs=((0, 0),), floor_labels=selected
    )
    report = {}
    for floor in selected:
        polynomial = polynomials[(0, 0, floor)]
        variables = polynomial.gens
        r = variables[0]
        leading = sp.Poly(polynomial.as_expr(), r).coeff_monomial(r**11)
        leading_poly = sp.Poly(sp.expand(leading), *variables[1:])
        factored = sp.factor(leading)
        report[floor] = {
            "terms": len(leading_poly.terms()),
            "degrees": list(leading_poly.degree_list()),
            "expression": str(leading),
            "factorization": str(factored),
        }
        print("LEADING", floor, "terms", len(leading_poly.terms()),
              "degrees", leading_poly.degree_list(), flush=True)
        print("FACTOR", floor, factored, flush=True)
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
