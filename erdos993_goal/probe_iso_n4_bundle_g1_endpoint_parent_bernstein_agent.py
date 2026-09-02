#!/usr/bin/env python3
"""Exact Bernstein discovery probe for endpoint-parent g1 residual."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_g12_endpoint_parent_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_endpoint_parent_bernstein_probe_agent_20260829.json"


def tensor_bernstein(expression, variables):
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
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_CONFIGURATION_AGENT"
    residual = sp.sympify(dependency["g1_residual_without_high_motifs"])
    names = {str(symbol): symbol for symbol in residual.free_symbols}
    q = sp.symbols("q", nonnegative=True)
    box = sp.symbols("a b c", nonnegative=True)
    a, b, c = box
    rows = []
    for minimum_n in range(5, 13):
        total = sp.Integer(minimum_n - 2) + q
        x = total * a
        y = total * (1 - a) * b
        r = total * (1 - a) * (1 - b) * c
        branches = 0
        coefficients = 0
        bad = 0
        first_bad = None
        minimum_q0 = None
        profiles = set()
        for adjacent, zu, zv in itertools.product((0, 1), repeat=3):
            if adjacent and not (zu and zv):
                continue
            du, dv = zu + x, zv + y
            edge_count = 1 + x + y + r
            wedge_upper = du * (du - 1) / 2 + dv * (dv - 1) / 2 + r * (r + 1) / 2
            lower = sp.cancel(
                residual.subs(
                    {
                        names["n"]: total + 2,
                        names["edge_count"]: edge_count,
                        names["degree_u"]: du,
                        names["degree_v"]: dv,
                        names["adjacent"]: adjacent,
                        names["C_neighbor_excess_u"]: 0,
                        names["C_neighbor_excess_v"]: 0,
                        names["C_common_neighbor"]: 1,
                        names["C_wedges_E"]: wedge_upper,
                    }
                )
            )
            branches += 1
            for degrees, index, coefficient in tensor_bernstein(lower, box):
                profiles.add(degrees)
                coefficients += 1
                qcoeffs = sp.Poly(sp.expand(coefficient), q).all_coeffs()
                if not all(value >= 0 for value in qcoeffs):
                    bad += 1
                    if first_bad is None:
                        first_bad = {
                            "branch_adj_zu_zv": [adjacent, zu, zv],
                            "index": list(index),
                            "coefficient": str(coefficient),
                        }
                at_zero = sp.factor(coefficient.subs(q, 0))
                if minimum_q0 is None or at_zero < minimum_q0:
                    minimum_q0 = at_zero
        row = {
            "minimum_n": minimum_n,
            "branches": branches,
            "coefficients": coefficients,
            "degree_profiles": [list(profile) for profile in sorted(profiles)],
            "bad": bad,
            "first_bad": first_bad,
            "minimum_q0": str(minimum_q0),
        }
        rows.append(row)
        print(json.dumps(row, sort_keys=True), flush=True)
        if bad == 0:
            break

    report = {
        "marker": "PROBE_EXACT_ISO_N4_BUNDLE_G1_ENDPOINT_PARENT_BERNSTEIN_AGENT",
        "rows": rows,
        "passing_threshold": next((row["minimum_n"] for row in rows if row["bad"] == 0), None),
        "scope": "Exact discovery probe of a sufficient continuous relaxation; not by itself a theorem.",
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
