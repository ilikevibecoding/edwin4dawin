#!/usr/bin/env python3
"""Derive the exact parent-rooted residual of deepest-ordinary bundle g1.

The high-motif payment in
``prove_iso_n4_bundle_g1_high_motif_payment_agent.py`` is nonnegative.  This
script subtracts that block and then eliminates every statistic of D=G-p
that only uses edges, degrees, wedges, and marked-neighbour excess.  The
result is an exact lower target in statistics of G and the deleted parent p.

This is an algebraic reduction, not a sign theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_g1_deepest_configuration_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_parent_residual_root_20260829.json"


def c2(value: sp.Expr) -> sp.Expr:
    return sp.expand(value * (value - 1) / 2)


def main() -> None:
    source = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert source["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_DEEPEST_CONFIGURATION_REDUCTION_AGENT"
    full = sp.sympify(source["form"])
    motif = sp.sympify(source["motif_part"])
    residual = sp.expand(full - motif)

    names = {str(symbol): symbol for symbol in residual.free_symbols}
    n = names["n"]
    e = names["edge_count"]
    du, dv = names["degree_u"], names["degree_v"]
    xu = names["C_neighbor_excess_u"]
    xv = names["C_neighbor_excess_v"]
    wedges = names["C_wedges_E"]
    ddu, ddv = names["D_degree_u"], names["D_degree_v"]
    de = names["D_edges"]
    dxu = names["D_neighbor_excess_u"]
    dxv = names["D_neighbor_excess_v"]
    d_wedges = names["D_wedges_E"]

    dp, xp = sp.symbols("degree_p neighbor_excess_p", integer=True, nonnegative=True)
    apu, apv = sp.symbols("adjacent_pu adjacent_pv", integer=True, nonnegative=True)
    cpu, cpv = sp.symbols(
        "common_neighbor_pu common_neighbor_pv", integer=True, nonnegative=True
    )

    parent_rules = {
        de: e - dp,
        ddu: du - apu,
        ddv: dv - apv,
        d_wedges: wedges - c2(dp) - xp,
        dxu: xu - apu * (dp - 1) - cpu,
        dxv: xv - apv * (dp - 1) - cpv,
    }
    substituted = sp.expand(residual.subs(parent_rules))
    rooted = substituted
    for boolean in (names["adjacent"], apu, apv):
        rooted = sp.rem(
            sp.Poly(rooted, boolean), sp.Poly(boolean**2 - boolean, boolean)
        ).as_expr()
    rooted = sp.factor(rooted)
    reduced_check = substituted
    for boolean in (names["adjacent"], apu, apv):
        reduced_check = sp.rem(
            sp.Poly(reduced_check, boolean),
            sp.Poly(boolean**2 - boolean, boolean),
        ).as_expr()
    assert sp.expand(rooted - reduced_check) == 0

    # Record the exact coefficients of the remaining configuration variables;
    # these signs guide the next coupled moment/incidence payment.
    configuration_variables = (
        wedges,
        xu,
        xv,
        xp,
        names["C_common_neighbor"],
        cpu,
        cpv,
    )
    derivatives = {
        str(variable): str(sp.factor(sp.diff(rooted, variable)))
        for variable in configuration_variables
    }
    polynomial = sp.Poly(sp.expand(24 * rooted), *sorted(rooted.free_symbols, key=str))
    assert all(coefficient.q == 1 for coefficient in polynomial.coeffs())

    report = {
        "marker": "DERIVED_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL",
        "identity": "g1 = high_motif_payment + parent_rooted_residual",
        "high_motif_dependency": (
            "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT"
        ),
        "parent_deletion_rules": {
            "D_edges": "e-degree_p",
            "D_degree_u": "degree_u-adjacent_pu",
            "D_degree_v": "degree_v-adjacent_pv",
            "D_wedges_E": "C_wedges_E-C(degree_p,2)-neighbor_excess_p",
            "D_neighbor_excess_u": (
                "C_neighbor_excess_u-adjacent_pu*(degree_p-1)-common_neighbor_pu"
            ),
            "D_neighbor_excess_v": (
                "C_neighbor_excess_v-adjacent_pv*(degree_p-1)-common_neighbor_pv"
            ),
        },
        "rooted_residual": str(rooted),
        "configuration_derivatives": derivatives,
        "term_count_24_times_residual": len(polynomial.terms()),
        "dependency": {
            "file": DEPENDENCY.name,
            "sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        },
        "scope": (
            "Exact lower-target reduction for the deepest ordinary singleton-parent "
            "case. Positivity of the residual is not asserted."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
