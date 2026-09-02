#!/usr/bin/env python3
"""Exact Bernstein discovery probe for the pure no-parent rank-four g1 mode.

The deepest unmarked support has no non-bundle neighbour, and neither mark is
a protected leaf at that support.  If C is the support-deleted four-minor
tuple, then D=C.  This script derives the exact g1 residual after the universal
high-motif payment and tests the standard two-mark degree-excess relaxation.
It is deliberately labelled a probe until the finite complement and every
inequality used by the relaxation are frozen in a theorem script.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_g1_deepest_configuration_agent import raw_g1
from derive_iso_n4_bundle_g12_endpoint_parent_agent import invariant_substitution


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_g1_no_parent_k0_bernstein_probe_root_20260829.json"


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
    row_rules = {
        sp.Symbol(f"d{name}{rank}"): sp.Symbol(f"c{name}{rank}")
        for name in "EUVW"
        for rank in range(6)
    }
    invariant_rules, motif_symbols = invariant_substitution()
    g1 = sp.factor(raw_g1().subs(row_rules).subs(invariant_rules))
    motif = sp.factor(sum(sp.diff(g1, symbol) * symbol for symbol in motif_symbols))
    residual = sp.factor(g1 - motif)
    names = {str(symbol): symbol for symbol in residual.free_symbols}

    n = names["n"]
    e = names["edge_count"]
    du = names["degree_u"]
    dv = names["degree_v"]
    adjacent = names["adjacent"]
    xu = names["C_neighbor_excess_u"]
    xv = names["C_neighbor_excess_v"]
    common = names["C_common_neighbor"]
    wedges = names["C_wedges_E"]

    # Record the exact sign directions that a theorem-grade proof must use.
    derivatives = {
        key: str(sp.factor(sp.diff(residual, names[key])))
        for key in (
            "C_neighbor_excess_u",
            "C_neighbor_excess_v",
            "C_common_neighbor",
            "C_wedges_E",
        )
    }

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
        for auv, zu, zv in itertools.product((0, 1), repeat=3):
            if auv and not (zu and zv):
                continue
            d_u, d_v = zu + x, zv + y
            edge_count = 1 + x + y + r
            wedge_upper = (
                d_u * (d_u - 1) / 2
                + d_v * (d_v - 1) / 2
                + r * (r + 1) / 2
            )
            lower = sp.cancel(
                residual.subs(
                    {
                        n: total + 2,
                        e: edge_count,
                        du: d_u,
                        dv: d_v,
                        adjacent: auv,
                        xu: 0,
                        xv: 0,
                        common: 1,
                        wedges: wedge_upper,
                    }
                )
            )
            branches += 1
            for degrees, index, coefficient in tensor_bernstein(lower, box):
                profiles.add(degrees)
                coefficients += 1
                q_coefficients = sp.Poly(sp.expand(coefficient), q).all_coeffs()
                if not all(value >= 0 for value in q_coefficients):
                    bad += 1
                    if first_bad is None:
                        first_bad = {
                            "branch_adj_zu_zv": [auv, zu, zv],
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
        "marker": "PROBE_EXACT_ISO_N4_BUNDLE_G1_NO_PARENT_K0_BERNSTEIN_ROOT",
        "row_identity": "D=C",
        "g1_high_motif_part": str(motif),
        "g1_residual_without_high_motifs": str(residual),
        "monotonicity_derivatives": derivatives,
        "rows": rows,
        "passing_threshold": next(
            (row["minimum_n"] for row in rows if row["bad"] == 0), None
        ),
        "scope": (
            "Exact discovery probe for the pure no-parent/no-protected-marked-"
            "leaf mode. It is not by itself an all-order sign theorem."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
