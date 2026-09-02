#!/usr/bin/env python3
"""Exact Bernstein discovery probe for endpoint-parent g2."""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp


DEPENDENCY = Path("iso_n4_bundle_g12_endpoint_parent_exact_agent_20260829.json")


def bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    power = dict(polynomial.terms())
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for monomial, coefficient in power.items():
            if all(j <= k for j, k in zip(monomial, index)):
                multiplier = 1
                for j, k, degree in zip(monomial, index, degrees):
                    multiplier *= sp.binomial(k, j) / sp.binomial(degree, j)
                value += coefficient * multiplier
        yield degrees, index, sp.factor(value)


def main():
    report = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    expression = sp.sympify(report["forest_invariant_forms"]["g2"])
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    q = sp.symbols("q", nonnegative=True)
    box = sp.symbols("a b c", nonnegative=True)
    a, b, c = box
    for threshold in range(3, 13):
        total = threshold - 2 + q
        x = total * a
        y = total * (1 - a) * b
        r = total * (1 - a) * (1 - b) * c
        bad = []
        count = 0
        minimum = None
        profiles = set()
        for adjacent, zu, zv in itertools.product((0, 1), repeat=3):
            if adjacent and not (zu and zv):
                continue
            du, dv = zu + x, zv + y
            edges = 1 + x + y + r
            wedges = du * (du - 1) / 2 + dv * (dv - 1) / 2 + r * (r + 1) / 2
            lower = sp.cancel(expression.subs({
                names["n"]: total + 2,
                names["edge_count"]: edges,
                names["degree_u"]: du,
                names["degree_v"]: dv,
                names["adjacent"]: adjacent,
                names["C_common_neighbor"]: 1,
                names["C_connected3_E"]: 0,
                names["C_connected3_U"]: 0,
                names["C_connected3_V"]: 0,
                names["C_neighbor_excess_u"]: 0,
                names["C_neighbor_excess_v"]: 0,
                names["C_wedges_E"]: wedges,
            }))
            for degrees, index, coefficient in bernstein(lower, box):
                profiles.add(degrees)
                coefficients = sp.Poly(sp.expand(coefficient), q).all_coeffs()
                if not all(value >= 0 for value in coefficients):
                    bad.append(([adjacent, zu, zv], list(index), str(coefficient)))
                at_zero = sp.factor(coefficient.subs(q, 0))
                minimum = at_zero if minimum is None else min(minimum, at_zero)
                count += 1
        row = {"threshold": threshold, "bad": len(bad), "first_bad": bad[:1], "count": count, "profiles": sorted(profiles), "minimum": str(minimum)}
        print(json.dumps(row, sort_keys=True), flush=True)
        if not bad:
            break


if __name__ == "__main__":
    main()
