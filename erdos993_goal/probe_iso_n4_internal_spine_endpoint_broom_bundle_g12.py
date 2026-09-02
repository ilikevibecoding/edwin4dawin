#!/usr/bin/env python3
"""Exact sign probe for the p=v internal-spine one-ended-broom geometry.

This is deliberately a probe.  The marked child endpoint u may support k
unmarked collision leaves.  Thus, with L=(1+x)^k,

    C_U and D_E no longer have the same child factor.  The exact factors are

    Yu=I(A-u), Ys=I(A-a1), Zu=I(A-{a1,u}), X=I(A),

where a1 is the child neighbour of the support.  This distinction is hidden
on the bare-path k=0 face.

The script derives g1/g2 from the raw configuration forms, splits the exact
high-motif block, and tests the same forest degree-excess cone used on the
bare-path face.  A theorem marker is not emitted here.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import factorial
from pathlib import Path

import sympy as sp

from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import (
    c2,
    i2,
    i3,
    i4,
    independent_raw_g2,
)
from derive_iso_n4_bundle_g1_deepest_configuration_agent import i5, raw_g1
from derive_iso_n4_bundle_internal_spine_path_configuration_agent import (
    at,
    convolve,
    path_row,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_internal_spine_endpoint_broom_probe_bundle_g12_20260829.json"


def choose_polynomial(variable, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.expand(sp.prod(variable - offset for offset in range(rank)) / factorial(rank))


def binomial_row(variable, maximum=5):
    return tuple(choose_polynomial(variable, rank) for rank in range(maximum + 1))


def add(*rows, maximum=5):
    return tuple(sp.expand(sum(at(row, rank) for row in rows)) for rank in range(maximum + 1))


def shift(row, amount=1, maximum=5):
    return tuple(at(row, rank - amount) for rank in range(maximum + 1))


def row_substitution(length, collisions):
    r0 = tuple(sp.Symbol(f"r0_{rank}") for rank in range(6))
    rv = tuple(sp.Symbol(f"rv_{rank}") for rank in range(6))
    leaves = binomial_row(collisions)
    yu = convolve(leaves, path_row(length - 1))
    zbase = path_row(length - 2)
    x = add(yu, shift(zbase))
    zu = convolve(leaves, zbase)
    numeric_length = int(length) if sp.sympify(length).is_Integer else None
    if numeric_length == 1:
        # Removing a1=u leaves the k collision leaves as isolates.
        ys = leaves
    else:
        ys = add(zu, shift(path_row(length - 3)))
    crows = (convolve(x, r0), convolve(yu, r0), convolve(x, rv), convolve(yu, rv))
    drows = (convolve(ys, rv), convolve(zu, rv), convolve(ys, rv), convolve(zu, rv))
    rules = {
        **{
            sp.Symbol(f"c{name}{rank}"): row[rank]
            for name, row in zip("EUVW", crows)
            for rank in range(6)
        },
        **{
            sp.Symbol(f"d{name}{rank}"): row[rank]
            for name, row in zip("EUVW", drows)
            for rank in range(6)
        },
    }
    return rules, (r0, rv), (x, yu, ys, zu)


def invariant_substitution(rows):
    r0, rv = rows
    m, edges, degree = sp.symbols("m F_edges F_degree_v", integer=True, nonnegative=True)
    excess, wedges = sp.symbols(
        "F_neighbor_excess_v F_wedges_E", integer=True, nonnegative=True
    )
    connected3, connected3_v = sp.symbols(
        "F_connected3_E F_connected3_V", integer=True, nonnegative=True
    )
    q35, connected4 = sp.symbols(
        "F_three_edge_five F_connected4_E", integer=True, nonnegative=True
    )
    edges_v = edges - degree
    wedges_v = wedges - c2(degree) - excess
    rules = {
        r0[0]: 1,
        r0[1]: m,
        r0[2]: i2(m, edges),
        r0[3]: i3(m, edges, wedges),
        r0[4]: i4(m, edges, wedges, connected3),
        r0[5]: i5(m, edges, wedges, connected3, q35, connected4),
        rv[0]: 1,
        rv[1]: m - 1,
        rv[2]: i2(m - 1, edges_v),
        rv[3]: i3(m - 1, edges_v, wedges_v),
        rv[4]: i4(m - 1, edges_v, wedges_v, connected3_v),
    }
    return rules, (connected3, connected3_v, q35, connected4)


def expression_summary(expression):
    polynomial = sp.Poly(sp.expand(expression), *sorted(expression.free_symbols, key=str))
    coefficients = polynomial.coeffs()
    return {
        "term_count": len(coefficients),
        "negative_scalar_coefficients": sum(value.is_negative is True for value in coefficients),
        "factor": str(sp.factor(expression)),
    }


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
                    multiplier *= sp.binomial(bernstein_index, power_index) / sp.binomial(degree, power_index)
                value += coefficient * multiplier
        yield degrees, index, sp.factor(value)


def newton_outer_coefficients(expression, variables):
    current = {(): sp.expand(expression)}
    profiles = []
    for variable in variables:
        next_current = {}
        degrees = {sp.Poly(value, variable).degree() for value in current.values()}
        profiles.append(sorted(degrees))
        for prefix, value in current.items():
            degree = max(0, sp.Poly(value, variable).degree())
            evaluations = [sp.expand(value.subs(variable, integer)) for integer in range(degree + 1)]
            coefficients = []
            while evaluations:
                coefficients.append(sp.factor(evaluations[0]))
                evaluations = [
                    sp.expand(evaluations[index + 1] - evaluations[index])
                    for index in range(len(evaluations) - 1)
                ]
            for index, coefficient in enumerate(coefficients):
                if coefficient != 0:
                    next_current[prefix + (index,)] = coefficient
        current = next_current
    return current, profiles


def cone_certificate(expression, tail):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    aa, bb = sp.symbols("a b", nonnegative=True)
    t, q, k = sp.symbols("t q k", integer=True, nonnegative=True)
    m_value = 2 + t
    ell_value = 6 + q if tail else None
    total = m_value - 2
    results = []
    for zv in (0, 1):
        y = total * aa
        r = total * (1 - aa) * bb
        degree = zv + y
        edges = 1 + y + r
        wedge_upper = c2(degree) + c2(r + 1)
        substitutions = {
            names["m"]: m_value,
            names["F_edges"]: edges,
            names["F_degree_v"]: degree,
            names["F_neighbor_excess_v"]: 0,
            names["F_wedges_E"]: wedge_upper,
            names["k"]: k,
        }
        if tail:
            substitutions[names["ell"]] = ell_value
        lower = sp.factor(expression.subs(substitutions))
        branch_entries = []
        for degrees, index, coefficient in tensor_bernstein(lower, (aa, bb)):
            outer = (t, q, k) if tail else (t, k)
            newton, profiles = newton_outer_coefficients(coefficient, outer)
            numeric = list(newton.values())
            unresolved = [value for value in numeric if value.free_symbols or value < 0]
            branch_entries.append({
                "degrees": list(degrees),
                "index": list(index),
                "outer_nonzero": len(numeric),
                "outer_minimum": str(min(numeric)) if numeric else "0",
                "unresolved_or_negative": len(unresolved),
                "outer_stream": [
                    {"index": list(multi), "coefficient": str(value)}
                    for multi, value in sorted(newton.items())
                ],
            })
        results.append({"zv": zv, "entries": branch_entries})
    return results


def main():
    ell, k = sp.symbols("ell k", integer=True, nonnegative=True)
    tail_rules, rows, child_rows = row_substitution(ell, k)
    invariants, motifs = invariant_substitution(rows)
    tail_g1 = sp.factor(raw_g1().subs(tail_rules).subs(invariants))
    tail_g2 = sp.factor(independent_raw_g2().subs(tail_rules).subs(invariants))
    tail_motif1 = sp.factor(sum(sp.diff(tail_g1, symbol) * symbol for symbol in motifs))
    tail_motif2 = sp.factor(sum(sp.diff(tail_g2, symbol) * symbol for symbol in motifs))
    tail_residual1 = sp.factor(tail_g1 - tail_motif1)
    tail_residual2 = sp.factor(tail_g2 - tail_motif2)

    small = {}
    for length in range(1, 6):
        rules, _, _ = row_substitution(sp.Integer(length), k)
        g1 = sp.factor(raw_g1().subs(rules).subs(invariants))
        g2 = sp.factor(independent_raw_g2().subs(rules).subs(invariants))
        motif1 = sp.factor(sum(sp.diff(g1, symbol) * symbol for symbol in motifs))
        motif2 = sp.factor(sum(sp.diff(g2, symbol) * symbol for symbol in motifs))
        residual1 = sp.factor(g1 - motif1)
        residual2 = sp.factor(g2 - motif2)
        small[str(length)] = {
            "g1": expression_summary(g1),
            "g2": expression_summary(g2),
            "motif_g1": str(motif1),
            "motif_g2": str(motif2),
            "residual_g1": str(residual1),
            "residual_g2": str(residual2),
            "cone_g1": cone_certificate(residual1, tail=False),
            "cone_g2": cone_certificate(residual2, tail=False),
        }

    report = {
        "marker": "PROBE_EXACT_ISO_N4_INTERNAL_SPINE_ENDPOINT_BROOM_BUNDLE_G12",
        "geometry": {
            "C": "(X R0,Yu R0,X Rv,Yu Rv)",
            "D": "(Ys Rv,Zu Rv,Ys Rv,Zu Rv)",
            "child": (
                "Yu=(1+x)^k P_(ell-1), X=Yu+xP_(ell-2), "
                "Zu=(1+x)^k P_(ell-2), Ys=Zu+xP_(ell-3) for ell>=2; "
                "ell=1 has Ys=Zu=(1+x)^k"
            ),
            "parameters": "ell>=1, k>=0",
        },
        "tail": {
            "range": "ell=6+q, q>=0",
            "g1": expression_summary(tail_g1),
            "g2": expression_summary(tail_g2),
            "motif_g1": str(tail_motif1),
            "motif_g2": str(tail_motif2),
            "residual_g1": str(tail_residual1),
            "residual_g2": str(tail_residual2),
            "cone_g1": cone_certificate(tail_residual1, tail=True),
            "cone_g2": cone_certificate(tail_residual2, tail=True),
        },
        "small": small,
        "scope_guard": "Probe only; monotonicity and exceptional small parent-side forests are not yet certified.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    compact = {}
    for label, block in [("tail", report["tail"]), *[(f"ell{length}", small[str(length)]) for length in range(1, 6)]]:
        compact[label] = {}
        for coefficient in ("g1", "g2"):
            entries = block[f"cone_{coefficient}"]
            flat = [item for branch in entries for item in branch["entries"]]
            compact[label][coefficient] = {
                "bernstein_cells": len(flat),
                "unresolved_or_negative": sum(item["unresolved_or_negative"] for item in flat),
                "minimum": min(item["outer_minimum"] for item in flat),
            }
    print(json.dumps({
        "marker": report["marker"],
        "tail_terms": {"g1": report["tail"]["g1"]["term_count"], "g2": report["tail"]["g2"]["term_count"]},
        "cones": compact,
        "report": OUTPUT.name,
    }, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
