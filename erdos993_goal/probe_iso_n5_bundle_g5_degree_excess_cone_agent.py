#!/usr/bin/env python3
"""Probe a forest-specific degree-excess cone for rank-five bundle g5."""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
CONFIG = HERE / "iso_n5_bundle_g5_forest_invariant_exact_agent_20260829.json"


def tensor_bernstein(expression: sp.Expr, variables: tuple[sp.Symbol, ...]):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(max(0, polynomial.degree(variable)) for variable in variables)
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


def certificate(expression: sp.Expr, threshold: int):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    n = names["n"]
    t = sp.symbols("t", nonnegative=True)
    a, b, c = sp.symbols("a b c", nonnegative=True)
    box = (a, b, c)
    total = threshold - 2 + t
    records = []
    failures = []
    minimum = None
    profiles = set()
    for eu, ev, zu, zv in itertools.product((0, 1), repeat=4):
        x = total * a if zu else 0
        remaining = total * (1 - a) if zu else total
        y = remaining * b if zv else 0
        remaining = remaining * (1 - b) if zv else remaining
        r = remaining * c
        edge_count = 1 + x + y + r
        degree_u = zu + x
        degree_v = zv + y
        wedge_upper = (
            degree_u * (degree_u - 1) / 2
            + degree_v * (degree_v - 1) / 2
            + r * (r + 1) / 2
        )
        survival = eu + ev
        substitutions = {
            n: threshold + t,
            names["q"]: threshold + t - 2 + survival,
            names["epsilon_u"]: eu,
            names["epsilon_v"]: ev,
            names["C_edges"]: edge_count,
            names["C_degree_u"]: degree_u,
            names["C_degree_v"]: degree_v,
            names["C_adjacent"]: 0,
            names["C_wedges"]: wedge_upper,
            names["C_neighbor_excess_u"]: 0,
            names["C_neighbor_excess_v"]: 0,
            names["C_common_neighbor"]: zu * zv,
            names["D_edges"]: 0,
            names["D_degree_u"]: 0,
            names["D_degree_v"]: 0,
            names["D_adjacent"]: 0,
        }
        lower = sp.factor(expression.subs(substitutions))
        branch = [eu, ev, zu, zv]
        for degrees, index, coefficient in tensor_bernstein(lower, box):
            profiles.add(degrees)
            qpoly = sp.Poly(sp.expand(coefficient), t)
            qcoefficients = qpoly.all_coeffs()
            okay = all(value >= 0 for value in qcoefficients)
            if not okay:
                failures.append({
                    "branch": branch,
                    "degrees": list(degrees),
                    "index": list(index),
                    "coefficient": str(coefficient),
                    "t_coefficients": list(map(str, qcoefficients)),
                })
            at_zero = sp.factor(coefficient.subs(t, 0))
            minimum = at_zero if minimum is None else min(minimum, at_zero)
            records.append((branch, degrees, index, coefficient))
    return {
        "threshold": threshold,
        "branches": 16,
        "coefficients": len(records),
        "profiles": sorted(profiles),
        "minimum_at_threshold": minimum,
        "failures": failures,
    }


def main() -> None:
    report = json.loads(CONFIG.read_text(encoding="utf-8"))
    assert report["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G5_FOREST_INVARIANT_REDUCTION_AGENT"
    expression = sp.sympify(report["forest_invariant_form"])
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    dblock = (
        2 * names["D_edges"]
        + 4 * names["D_degree_u"]
        + 4 * names["D_degree_v"]
        - 10 * names["D_adjacent"]
    )
    assert not (expression - dblock).has(
        names["D_edges"], names["D_degree_u"], names["D_degree_v"], names["D_adjacent"]
    )
    for threshold in range(2, 21):
        result = certificate(expression, threshold)
        print(json.dumps({
            "threshold": threshold,
            "coefficients": result["coefficients"],
            "profiles": result["profiles"],
            "minimum_at_threshold": str(result["minimum_at_threshold"]),
            "failure_count": len(result["failures"]),
            "first_failure": result["failures"][:1],
        }, sort_keys=True))
        if not result["failures"] and result["minimum_at_threshold"] >= 0:
            break


if __name__ == "__main__":
    main()
