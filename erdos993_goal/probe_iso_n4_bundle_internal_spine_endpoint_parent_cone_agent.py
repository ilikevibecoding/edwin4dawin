#!/usr/bin/env python3
"""Probe endpoint-parent internal-spine residual cones."""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
CONFIG = HERE / "iso_n4_bundle_internal_spine_endpoint_parent_configuration_exact_agent_20260829.json"


def tensor_bernstein(expression, variables):
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


def test_cone(expression, ell_value, m_start, label):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q = sp.symbols("t q", nonnegative=True)
    a, b = sp.symbols("a b", nonnegative=True)
    box = (a, b)
    m = m_start + t
    ell = ell_value if isinstance(ell_value, int) else ell_value + q
    total = m - 2
    failures = []
    count = 0
    profiles = set()
    minimum = None
    witness = None
    for zv in (0, 1):
        y = total * a
        r = total * (1 - a) * b
        degree = zv + y
        edges = 1 + y + r
        wedge_upper = degree * (degree - 1) / 2 + r * (r + 1) / 2
        substitutions = {
            names["m"]: m,
            names["F_edges"]: edges,
            names["F_degree_v"]: degree,
            names["F_neighbor_excess_v"]: 0,
            names["F_wedges_E"]: wedge_upper,
        }
        if "ell" in names:
            substitutions[names["ell"]] = ell
        lower = sp.factor(expression.subs(substitutions))
        for degrees, index, coefficient in tensor_bernstein(lower, box):
            profiles.add(degrees)
            outer = (t, q) if not isinstance(ell_value, int) else (t,)
            coefficients = sp.Poly(sp.expand(coefficient), *outer).coeffs()
            if not all(value >= 0 for value in coefficients):
                failures.append({
                    "branch_zv": zv,
                    "degrees": list(degrees),
                    "index": list(index),
                    "coefficient": str(coefficient),
                    "outer_coefficients": list(map(str, coefficients)),
                })
            origin = sp.factor(coefficient.subs({t: 0, q: 0}))
            if minimum is None or origin < minimum:
                minimum = origin
                witness = {
                    "branch_zv": zv,
                    "degrees": list(degrees),
                    "index": list(index),
                    "coefficient": str(coefficient),
                }
            count += 1
    return {
        "label": label,
        "ell": f">={ell_value}" if not isinstance(ell_value, int) else ell_value,
        "m_start": m_start,
        "coefficients": count,
        "profiles": sorted(profiles),
        "minimum_at_origin": str(minimum),
        "minimum_witness": witness,
        "failure_count": len(failures),
        "first_failures": failures[:3],
    }


def edgeless(expression, ell_value, label):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q = sp.symbols("t q", nonnegative=True)
    substitutions = {
        names["m"]: t + 1,
        names["F_edges"]: 0,
        names["F_degree_v"]: 0,
        names["F_neighbor_excess_v"]: 0,
        names["F_wedges_E"]: 0,
    }
    if "ell" in names:
        substitutions[names["ell"]] = ell_value + q
    value = sp.factor(expression.subs(substitutions))
    outer = (t, q) if "ell" in names else (t,)
    coefficients = sp.Poly(sp.expand(value), *outer).coeffs()
    return {
        "label": label,
        "form": str(value),
        "coefficients": list(map(str, coefficients)),
        "all_nonnegative": all(coefficient >= 0 for coefficient in coefficients),
        "origin": str(value.subs({t: 0, q: 0})),
    }


def main():
    report = json.loads(CONFIG.read_text(encoding="utf-8"))
    assert report["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_ENDPOINT_PARENT_CONFIGURATION_AGENT"
    cases = [
        ("tail", sp.sympify(report["residuals_tail"]["g1"]), sp.sympify(report["residuals_tail"]["g2"]), sp.Integer(6), 2),
        *[
            (
                f"ell{ell}",
                sp.sympify(report["small_lengths"][str(ell)]["residual_g1"]),
                sp.sympify(report["small_lengths"][str(ell)]["residual_g2"]),
                ell,
                {1: 4, 2: 3, 3: 2}.get(ell, 2),
            )
            for ell in range(1, 6)
        ],
    ]
    for name, g1, g2, ell_value, m_start in cases:
        for coefficient, expression in (("g1", g1), ("g2", g2)):
            print(json.dumps(test_cone(expression, ell_value, m_start, f"{name}_{coefficient}"), sort_keys=True))
            print(json.dumps(edgeless(expression, ell_value, f"{name}_{coefficient}_edgeless"), sort_keys=True))


if __name__ == "__main__":
    main()
