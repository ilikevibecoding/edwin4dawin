#!/usr/bin/env python3
"""Discovery probe for exact broom residual degree-excess cones.

Uses tensor Bernstein on the continuous stick-breaking variables and the
Newton/binomial basis on the unbounded integer variables m, ell, k.  This is
not a theorem artifact; it locates exact thresholds and failed branches.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
CONFIG = HERE / "iso_n4_bundle_internal_spine_broom_configuration_exact_agent_20260829.json"


def c2(value):
    return sp.expand(value * (value - 1) / 2)


def tensor_bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(max(0, polynomial.degree(variable)) for variable in variables)
    power = dict(polynomial.terms())
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = sp.Integer(0)
        for monomial, coefficient in power.items():
            if all(power_index <= bernstein_index for power_index, bernstein_index in zip(monomial, index)):
                multiplier = sp.Integer(1)
                for power_index, bernstein_index, degree in zip(monomial, index, degrees):
                    multiplier *= (
                        sp.binomial(bernstein_index, power_index)
                        / sp.binomial(degree, power_index)
                    )
                value += coefficient * multiplier
        yield degrees, index, sp.expand(value)


def newton_coefficients(expression, variables):
    current = {(): sp.expand(expression)}
    for variable in variables:
        following = {}
        for prefix, value in current.items():
            degree = max(0, sp.Poly(value, variable).degree())
            evaluations = [sp.expand(value.subs(variable, integer)) for integer in range(degree + 1)]
            coefficients = []
            while evaluations:
                coefficients.append(sp.expand(evaluations[0]))
                evaluations = [
                    sp.expand(evaluations[index + 1] - evaluations[index])
                    for index in range(len(evaluations) - 1)
                ]
            for index, coefficient in enumerate(coefficients):
                if coefficient != 0:
                    following[prefix + (index,)] = coefficient
        current = following
    return current


def outer_audit(coefficient, variables):
    newton = newton_coefficients(coefficient, variables)
    values = list(newton.values())
    bad = [value for value in values if value.free_symbols or value < 0]
    return newton, bad


def two_mark(expression, ell_value, m_start, label):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q, k = sp.symbols("t q k", integer=True, nonnegative=True)
    a, b, c = sp.symbols("a b c", nonnegative=True)
    m = m_start + t
    ell = ell_value + q if "ell" in names else ell_value
    total = m - 2
    failures = []
    minimum = None
    count = 0
    profiles = set()
    for adjacent, zp, zv in itertools.product((0, 1), repeat=3):
        if adjacent and not (zp and zv):
            continue
        x = total * a
        y = total * (1 - a) * b
        r = total * (1 - a) * (1 - b) * c
        dp, dv = zp + x, zv + y
        edges = 1 + x + y + r
        wedge_upper = c2(dp) + c2(dv) + c2(r + 1)
        substitutions = {
            names["m"]: m,
            names["F_edges"]: edges,
            names["F_degree_p"]: dp,
            names["F_degree_v"]: dv,
            names["F_adjacent"]: adjacent,
            names["F_common_neighbor"]: zp * zv,
            names["F_neighbor_excess_p"]: 0,
            names["F_neighbor_excess_v"]: 0,
            names["F_wedges_E"]: wedge_upper,
            names["k"]: k,
        }
        if "ell" in names:
            substitutions[names["ell"]] = ell
        lower = sp.expand(expression.subs(substitutions))
        outer = (t, q, k) if "ell" in names else (t, k)
        for degrees, index, coefficient in tensor_bernstein(lower, (a, b, c)):
            profiles.add(degrees)
            newton, bad = outer_audit(coefficient, outer)
            numeric = list(newton.values())
            local_minimum = min(numeric) if numeric else sp.Integer(0)
            if minimum is None or local_minimum < minimum:
                minimum = local_minimum
            if bad:
                failures.append({
                    "branch": [adjacent, zp, zv],
                    "degrees": list(degrees),
                    "index": list(index),
                    "coefficient": str(coefficient),
                    "bad": list(map(str, bad[:5])),
                })
            count += 1
    return {
        "label": label, "ell": f">={ell_value}" if "ell" in names else ell_value,
        "m_start": m_start, "coefficients": count, "profiles": sorted(profiles),
        "newton_minimum": str(minimum), "failure_count": len(failures),
        "first_failures": failures[:3],
    }


def endpoint(expression, ell_value, m_start, label):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q, k = sp.symbols("t q k", integer=True, nonnegative=True)
    a, b = sp.symbols("a b", nonnegative=True)
    m = m_start + t
    ell = ell_value + q if "ell" in names else ell_value
    total = m - 2
    failures = []
    minimum = None
    count = 0
    profiles = set()
    for zv in (0, 1):
        y = total * a
        r = total * (1 - a) * b
        degree = zv + y
        edges = 1 + y + r
        wedge_upper = c2(degree) + c2(r + 1)
        substitutions = {
            names["m"]: m,
            names["F_edges"]: edges,
            names["F_degree_v"]: degree,
            names["F_neighbor_excess_v"]: 0,
            names["F_wedges_E"]: wedge_upper,
            names["k"]: k,
        }
        if "ell" in names:
            substitutions[names["ell"]] = ell
        lower = sp.expand(expression.subs(substitutions))
        outer = (t, q, k) if "ell" in names else (t, k)
        for degrees, index, coefficient in tensor_bernstein(lower, (a, b)):
            profiles.add(degrees)
            newton, bad = outer_audit(coefficient, outer)
            numeric = list(newton.values())
            local_minimum = min(numeric) if numeric else sp.Integer(0)
            if minimum is None or local_minimum < minimum:
                minimum = local_minimum
            if bad:
                failures.append({
                    "zv": zv, "degrees": list(degrees), "index": list(index),
                    "coefficient": str(coefficient), "bad": list(map(str, bad[:5])),
                })
            count += 1
    return {
        "label": label, "ell": f">={ell_value}" if "ell" in names else ell_value,
        "m_start": m_start, "coefficients": count, "profiles": sorted(profiles),
        "newton_minimum": str(minimum), "failure_count": len(failures),
        "first_failures": failures[:3],
    }


def endpoint_edgeless(expression, ell_value, label):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q, k = sp.symbols("t q k", integer=True, nonnegative=True)
    substitutions = {
        names["m"]: 1 + t,
        names["F_edges"]: 0,
        names["F_degree_v"]: 0,
        names["F_neighbor_excess_v"]: 0,
        names["F_wedges_E"]: 0,
        names["k"]: k,
    }
    if "ell" in names:
        substitutions[names["ell"]] = ell_value + q
    value = sp.factor(expression.subs(substitutions))
    outer = (t, q, k) if "ell" in names else (t, k)
    newton, bad = outer_audit(value, outer)
    values = list(newton.values())
    return {
        "label": label, "terms": len(values),
        "minimum": str(min(values) if values else 0), "failure_count": len(bad),
        "first_failures": list(map(str, bad[:5])),
    }


def main():
    report = json.loads(CONFIG.read_text(encoding="utf-8"))
    assert report["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_CONFIGURATION_AGENT"
    for branch in ("p_distinct_v", "p_equals_v"):
        block = report[branch]
        cases = [("tail", block["tail"], 6, 2)] + [
            (f"ell{ell}", block["small"][str(ell)], ell, {1: 4, 2: 3}.get(ell, 2))
            for ell in range(1, 6)
        ]
        for name, case, ell_value, m_start in cases:
            for coefficient in ("g1", "g2"):
                expression = sp.sympify(case[f"residual_{coefficient}"])
                label = f"{branch}_{name}_{coefficient}"
                result = (
                    two_mark(expression, ell_value, m_start, label)
                    if branch == "p_distinct_v"
                    else endpoint(expression, ell_value, m_start, label)
                )
                print(json.dumps(result, sort_keys=True))
                if branch == "p_equals_v":
                    print(json.dumps(endpoint_edgeless(expression, ell_value, label + "_edgeless"), sort_keys=True))


if __name__ == "__main__":
    main()
