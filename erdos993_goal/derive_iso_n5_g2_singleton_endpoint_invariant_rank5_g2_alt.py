#!/usr/bin/env python3
"""Exact forest-invariant form of singleton-endpoint rank-five g2.

This is a reduction only.  It specializes the canonical endpoint placement
``p=u`` (the ``p=v`` placement follows by exchanging the marks), substitutes
the forest inclusion--exclusion rows through rank six, and records the exact
high-motif coefficients.  No sign is asserted here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_g1_deepest_configuration_agent import i4, i5
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    forest_independent_row,
    raw_coefficients,
)
from derive_iso_n5_bundle_g1_singleton_ordinary_payment_g1_bernstein import (
    forest_configuration,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_singleton_endpoint_invariant_exact_rank5_g2_alt_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G2_SINGLETON_ENDPOINT_INVARIANT_RANK5_G2_ALT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def derive_endpoint(expand_e6: bool = True):
    crows, drows, _, raw = raw_coefficients()
    endpoint_rules = {
        drows[0][rank]: crows[1][rank] for rank in range(7)
    } | {
        drows[1][rank]: crows[1][rank] for rank in range(7)
    } | {
        drows[2][rank]: crows[3][rank] for rank in range(7)
    } | {
        drows[3][rank]: crows[3][rank] for rank in range(7)
    }
    endpoint = sp.expand(raw.subs(endpoint_rules))
    qrows = tuple(tuple(sp.symbols(f"unused{name}0:7")) for name in "EUVW")
    invariant, symbols = forest_configuration(endpoint, crows, qrows)

    n = symbols["n"]
    e = symbols["edge_count"]
    du = symbols["degree_u"]
    dv = symbols["degree_v"]
    adj = symbols["adjacent"]
    wedges = symbols["C_wedges_E"]
    xu = symbols["C_neighbor_excess_u"]
    xv = symbols["C_neighbor_excess_v"]
    common = symbols["C_common_neighbor"]
    re = symbols["C_connected3_E"]
    ru = symbols["C_connected3_U"]
    rv = symbols["C_connected3_V"]
    q35e = symbols["C_three_edge_five"]
    r4e = symbols["C_connected4_E"]

    cuw = wedges - choose(du, 2) - xu
    cvw = wedges - choose(dv, 2) - xv
    cww = (
        wedges - choose(du, 2) - choose(dv, 2) - xu - xv
        + adj * (du + dv - 2) + common
    )
    rw, q35u, r4u, q35v, r4v = sp.symbols(
        "C_connected3_W C_three_edge_five_U C_connected4_U "
        "C_three_edge_five_V C_connected4_V",
        integer=True,
        nonnegative=True,
    )
    q46e, r5e = sp.symbols(
        "C_four_edge_six C_connected5_E", integer=True, nonnegative=True
    )
    canonical, names = forest_independent_row("ENDPOINT_CE6_PIN_", n)
    ce6 = canonical[6].subs({
        names["edges"]: e,
        names["wedges"]: wedges,
        names["connected_3_edges"]: re,
        names["three_edges_two_components_five_vertices"]: q35e,
        names["connected_4_edges"]: r4e,
        names["four_edges_two_components_six_vertices"]: q46e,
        names["connected_5_edges"]: r5e,
    })
    completion_rules = {
        crows[1][5]: i5(n - 1, e - du, cuw, ru, q35u, r4u),
        crows[2][5]: i5(n - 1, e - dv, cvw, rv, q35v, r4v),
        crows[3][4]: i4(n - 2, e - du - dv + adj, cww, rw),
    }
    if expand_e6:
        completion_rules[crows[0][6]] = ce6
    invariant = sp.expand(invariant.subs(completion_rules))
    invariant = sp.rem(
        sp.Poly(invariant, adj), sp.Poly(adj**2 - adj, adj)
    ).as_expr()
    invariant = sp.expand(invariant)

    generic_c_symbols = {symbol for row in crows for symbol in row}
    expected_leftover = set() if expand_e6 else {crows[0][6]}
    assert invariant.free_symbols & generic_c_symbols == expected_leftover, sorted(
        map(str, invariant.free_symbols & generic_c_symbols)
    )
    extras = {
        "C_connected3_W": rw,
        "C_three_edge_five_U": q35u,
        "C_connected4_U": r4u,
        "C_three_edge_five_V": q35v,
        "C_connected4_V": r4v,
        "C_four_edge_six": q46e,
        "C_connected5_E": r5e,
        "C_E_i6": crows[0][6],
    }
    return invariant, symbols, extras


def main():
    invariant, symbols, extras = derive_endpoint()
    motif_variables = {
        "C_connected3_E": symbols["C_connected3_E"],
        "C_connected3_U": symbols["C_connected3_U"],
        "C_connected3_V": symbols["C_connected3_V"],
        "C_connected3_W": extras["C_connected3_W"],
        "C_three_edge_five_E": symbols["C_three_edge_five"],
        "C_connected4_E": symbols["C_connected4_E"],
        "C_three_edge_five_U": extras["C_three_edge_five_U"],
        "C_connected4_U": extras["C_connected4_U"],
        "C_three_edge_five_V": extras["C_three_edge_five_V"],
        "C_connected4_V": extras["C_connected4_V"],
        "C_four_edge_six": extras["C_four_edge_six"],
        "C_connected5_E": extras["C_connected5_E"],
    }
    derivatives = {
        name: str(sp.factor(sp.diff(invariant, variable)))
        for name, variable in motif_variables.items()
    }
    variables = sorted(invariant.free_symbols, key=str)
    report = {
        "marker": MARKER,
        "identity": "raw g2(C,D) with D=(C_U,C_U,C_W,C_W) for p=u",
        "forest_invariant": str(sp.factor(invariant)),
        "expanded_terms": len(sp.Poly(invariant, *variables).terms()),
        "high_motif_coefficients": derivatives,
        "scope": (
            "Exact algebraic reduction for singleton_endpoint_p_equals_u only; "
            "p=v follows by exchanging u and v. No sign theorem is asserted."
        ),
        "dependencies_sha256": {
            name: sha256(HERE / name)
            for name in (
                "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py",
                "derive_iso_n5_bundle_g1_singleton_ordinary_payment_g1_bernstein.py",
                "derive_iso_n4_bundle_g1_deepest_configuration_agent.py",
            )
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "expanded_terms": report["expanded_terms"],
        "high_motif_coefficients": derivatives,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
