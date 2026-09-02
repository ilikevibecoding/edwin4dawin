#!/usr/bin/env python3
"""Exact all-order 256-sector g1 theorem when the unmarked W forest is edgeless."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g1_marked_cone_g1_nonadjacent import doubly_partitioned_g1
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import marked_geometry_branches


MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_EDGELESS_W_SECTOR_G1_NONADJACENT"


def bernstein_rows(expression, variables, degrees):
    # With no bounded geometry variables, t=n-8 must remain a symbolic tail
    # coefficient.  Calling Poly(expression) here would silently infer t as a
    # Bernstein generator and sum its power coefficients, which is not the
    # claimed certificate.
    if not variables:
        assert not degrees
        return {(): sp.expand(expression)}
    polynomial = sp.Poly(sp.cancel(expression), *variables)
    power = dict(polynomial.terms())
    answer = {}
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for monomial, coefficient in power.items():
            if all(left <= right for left, right in zip(monomial, index)):
                multiplier = 1
                for exponent, location, degree in zip(monomial, index, degrees):
                    multiplier *= sp.binomial(location, exponent) / sp.binomial(degree, exponent)
                value += coefficient * multiplier
        answer[index] = sp.factor(value)
    recovered = {}
    for monomial in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for index in itertools.product(*(range(power + 1) for power in monomial)):
            multiplier = 1
            for degree, exponent, location in zip(degrees, monomial, index):
                multiplier *= (
                    sp.binomial(degree, exponent)
                    * (-1) ** (exponent - location)
                    * sp.binomial(exponent, location)
                )
            value += multiplier * answer[index]
        recovered[monomial] = sp.expand(value)
    assert all(
        sp.expand(recovered[index] - power.get(index, 0)) == 0
        for index in recovered
    )
    return answer


def main():
    nonadjacent_probe = os.environ.get("G1_ONLY_NONADJACENT") == "1"
    _, partitioned, _, _ = doubly_partitioned_g1()
    names = {str(symbol): symbol for symbol in partitioned.free_symbols}
    for family in "WABZ":
        for rank in range(2, 8):
            names.setdefault(
                f"C{family}{rank}",
                sp.Symbol(f"C{family}{rank}", nonnegative=True),
            )
    dvars = tuple(sorted(
        (symbol for symbol in partitioned.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))
    fixed_positive = {"DA4", "DB4", "DZ5"}
    fixed_negative = {"DA6", "DB6", "DW5", "DW6", "DZ6"}
    mixed = ("DA3", "DA5", "DB3", "DB5", "DW2", "DW3", "DW4", "DZ4")
    assert set(map(str, dvars)) == fixed_positive | fixed_negative | set(mixed)
    cvars = tuple(sorted(
        (symbol for symbol in partitioned.free_symbols if str(symbol).startswith("C")),
        key=str,
    ))
    for name in fixed_negative:
        derivative = sp.Poly(-sp.diff(partitioned, names[name]), *cvars)
        assert all(value >= 0 for value in derivative.coeffs())
    for name in fixed_positive:
        derivative = sp.Poly(sp.diff(partitioned, names[name]), *cvars)
        assert all(value >= 0 for value in derivative.coeffs())
    base_expression = sp.expand(partitioned.subs({symbol: 0 for symbol in dvars}))
    for dvar in dvars:
        if str(dvar) in fixed_negative:
            base_expression += sp.diff(partitioned, dvar) * names["C" + str(dvar)[1:]]
    base_expression = sp.expand(base_expression)
    expressions = [base_expression]
    for name in mixed:
        dvar = names[name]
        expressions.append(sp.expand(
            sp.diff(partitioned, dvar) * names["C" + name[1:]]
        ))

    n, t = sp.symbols("n t", integer=True, nonnegative=True)
    a, b, c, d = sp.symbols("a b c d", nonnegative=True)
    branch_reports = []
    total_rows = total_scalars = 0
    minimum = None
    stream = hashlib.sha256()
    for branch in marked_geometry_branches(t + 6, a, b, c, d):
        label, variables, x, y, edges, z2, z3 = branch
        if nonadjacent_probe and label == "adjacent":
            continue
        assert sp.expand(edges.subs(c, 0)) == 0
        substitutions = {n: t + 8}
        m = t + 6
        for rank in range(2, 8):
            substitutions[names[f"CW{rank}"]] = sp.binomial(m, rank)
            substitutions[names[f"CA{rank}"]] = sp.binomial(m - x, rank - 1)
            substitutions[names[f"CB{rank}"]] = sp.binomial(m - y, rank - 1)
            substitutions[names[f"CZ{rank}"]] = sp.Integer(z2) if rank == 2 else sp.binomial(z3, rank - 2)
        values = [
            sp.expand_func(expression.subs(substitutions).subs({c: 0, d: 0}))
            for expression in expressions
        ]
        bounded = tuple(variable for variable in variables if variable not in (c, d) and any(variable in value.free_symbols for value in values))
        degrees = tuple(max(sp.Poly(sp.cancel(value), *bounded).degree(variable) for value in values) for variable in bounded)
        component_rows = [bernstein_rows(value, bounded, degrees) for value in values]
        branch_minimum = None
        branch_scalars = 0
        for index in sorted(component_rows[0]):
            components = [rows[index] for rows in component_rows]
            for mask in range(256):
                row = sp.expand(components[0] + sum(components[bit + 1] for bit in range(8) if mask & (1 << bit)))
                powers = sp.Poly(row, t).all_coeffs()
                assert all(value >= 0 for value in powers), (label, index, mask, row, powers)
                local = min(powers)
                minimum = local if minimum is None else min(minimum, local)
                branch_minimum = local if branch_minimum is None else min(branch_minimum, local)
                branch_scalars += len(powers)
                stream.update(f"{label}|{degrees}|{index}|{mask}|{sp.srepr(row)};".encode())
        row_count = len(component_rows[0]) * 256
        total_rows += row_count
        total_scalars += branch_scalars
        branch_reports.append({
            "geometry": label,
            "variables": list(map(str, bounded)),
            "degree_profile": list(degrees),
            "sector_bernstein_rows": row_count,
            "tail_power_coefficients": branch_scalars,
            "minimum_tail_power_coefficient": str(branch_minimum),
        })
        print(
            "BRANCH", label,
            "ROWS", row_count,
            "SCALARS", branch_scalars,
            "MIN", branch_minimum,
            flush=True,
        )

    if nonadjacent_probe:
        print(
            "PROBE_EXACT_ISO_N6_BUNDLE_G1_NONADJACENT_EDGELESS_W_SECTOR_G1_NONADJACENT",
            "ROWS", total_rows,
            "SCALARS", total_scalars,
            "MIN", minimum,
        )
        return

    report = {
        "marker": MARKER,
        "scope": "all marked forests C of order n>=8 whose unmarked induced forest W=C-{u,v} is edgeless, and every induced marked minor D subset C",
        "claim": "rank-six bundle g1 is nonnegative",
        "sector_count": 256,
        "marked_geometry_count": 5,
        "branch_reports": branch_reports,
        "sector_bernstein_rows": total_rows,
        "tail_power_coefficients": total_scalars,
        "minimum_tail_power_coefficient": str(minimum),
        "exact_power_inversion": True,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "proof": (
            "The W/A/B/Z partition gives categorywise 0<=D_category<=C_category. "
            "Five D derivatives are coefficientwise nonpositive, three are coefficientwise nonnegative, and eight are mixed, so the minimum lies among 256 vertices. "
            "When W is edgeless, CW_r=C(m,r), CA_r=C(m-x,r-1), CB_r=C(m-y,r-1), and CZ_r=C(z,r-2). "
            "The five forest marked-neighbour geometries are exhaustive. Exact tensor Bernstein conversion, its exact inverse, and nonnegative t=n-8 power coefficients prove every vertex."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output = Path("iso_n6_bundle_g1_edgeless_w_sector_exact_g1_nonadjacent_20260831.json")
    output.write_bytes(raw.encode("utf-8"))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(output.read_bytes()).hexdigest().upper())
    print("ROWS", total_rows, "SCALARS", total_scalars, "MIN", minimum)
    print(MARKER)


if __name__ == "__main__":
    main()
