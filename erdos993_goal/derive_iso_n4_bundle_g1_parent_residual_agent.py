#!/usr/bin/env python3
"""Reduce the deepest-ordinary g1 residual to parent-rooted invariants.

After paying the exact high-motif block, write p for the unique parent of
the deepest support.  The support-deleted forest is G and D=G-p.  This file
substitutes the exact deletion identities for edges, wedges, marked degrees,
and marked neighbor-excess sums.  It also exposes the exact coefficient of
the rank-four component-surplus-style matching statistic.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_g1_deepest_configuration_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_parent_residual_exact_agent_20260829.json"


def choose2(x):
    return sp.expand(x * (x - 1) / sp.Integer(2))


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_DEEPEST_CONFIGURATION_REDUCTION_AGENT"
    residual = sp.sympify(dependency["residual_without_high_motifs"])
    symbols = {str(symbol): symbol for symbol in residual.free_symbols}
    e = symbols["edge_count"]
    wedges = symbols["C_wedges_E"]
    du, dv = symbols["degree_u"], symbols["degree_v"]
    xu, xv = symbols["C_neighbor_excess_u"], symbols["C_neighbor_excess_v"]
    de = symbols["D_edges"]
    d_wedges = symbols["D_wedges_E"]
    ddu, ddv = symbols["D_degree_u"], symbols["D_degree_v"]
    dxu = symbols["D_neighbor_excess_u"]
    dxv = symbols["D_neighbor_excess_v"]

    parent_degree, parent_excess = sp.symbols(
        "parent_degree parent_neighbor_excess", integer=True, nonnegative=True
    )
    hit_u, hit_v = sp.symbols(
        "parent_adjacent_u parent_adjacent_v", integer=True, nonnegative=True
    )
    common_pu, common_pv = sp.symbols(
        "parent_common_neighbor_u parent_common_neighbor_v",
        integer=True,
        nonnegative=True,
    )
    substitution = {
        de: e - parent_degree,
        d_wedges: wedges - choose2(parent_degree) - parent_excess,
        ddu: du - hit_u,
        ddv: dv - hit_v,
        dxu: xu - hit_u * (parent_degree - 1) - common_pu,
        dxv: xv - hit_v * (parent_degree - 1) - common_pv,
    }
    parent_form = sp.expand(residual.subs(substitution))
    for boolean in (hit_u, hit_v, symbols["adjacent"]):
        parent_form = sp.rem(
            sp.Poly(parent_form, boolean),
            sp.Poly(boolean**2 - boolean, boolean),
        ).as_expr()
    parent_form = sp.factor(parent_form)

    # The two-edge-matching statistic of G is m2=C(e,2)-wedges.  Replacing
    # wedges by C(e,2)-m2 records its exact coefficient; whether the proved
    # rank-four component-surplus inequality pays the remaining terms is a
    # separate question tested in the companion probe.
    matching2 = sp.symbols("G_two_edge_matchings", integer=True, nonnegative=True)
    matching_form = sp.factor(parent_form.subs(wedges, choose2(e) - matching2))
    matching_coefficient = sp.factor(sp.diff(matching_form, matching2))
    assert sp.diff(matching_form, matching2, 2) == 0

    poly = sp.Poly(parent_form, *sorted(parent_form.free_symbols, key=str))
    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL_REDUCTION_AGENT",
        "parent_rooted_form": str(parent_form),
        "parent_rooted_term_count": len(poly.terms()),
        "parent_deletion_identities": {
            "D_edges": "edge_count-parent_degree",
            "D_wedges_E": "C_wedges_E-C(parent_degree,2)-parent_neighbor_excess",
            "D_degree_mark": "degree_mark-parent_adjacent_mark",
            "D_neighbor_excess_mark": (
                "C_neighbor_excess_mark-parent_adjacent_mark*(parent_degree-1)-"
                "parent_common_neighbor_mark"
            ),
        },
        "matching_reparameterization": {
            "identity": "C_wedges_E=C(edge_count,2)-G_two_edge_matchings",
            "form": str(matching_form),
            "coefficient_of_G_two_edge_matchings": str(matching_coefficient),
        },
        "scope": (
            "Exact parent-rooted reduction after the proved high-motif payment. "
            "No sign or component-surplus implication is asserted here."
        ),
        "dependency": {
            "report": DEPENDENCY.name,
            "report_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
