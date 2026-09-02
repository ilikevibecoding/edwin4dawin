#!/usr/bin/env python3
"""Probe a rigorous coarse forest-cone lower bound for rank-five g4.

The script drops positive motif terms, bounds the D-induced-forest block by
elementary forest inequalities, and applies the standard marked-degree/wedge
simplex to C.  Integer enumeration is discovery evidence for whether this
coarse relaxation is strong enough; it is not an all-order proof.
"""

from __future__ import annotations

import hashlib
import json
from itertools import product
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n5_bundle_g4_forest_invariant_root_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g4_coarse_cone_probe_root_20260829.json"


def main() -> None:
    data = json.loads(INPUT.read_text(encoding="utf-8"))
    form = sp.sympify(data["forest_invariant_form"])
    symbols = {str(symbol): symbol for symbol in form.free_symbols}

    n, h, x, y, r = sp.symbols("n h x y r", integer=True, nonnegative=True)
    q = symbols["q"]
    d_symbols = [symbol for symbol in form.free_symbols if str(symbol).startswith("D_")]
    expanded = sp.expand(form)
    d_block = sp.Add(*[
        term for term in expanded.as_ordered_terms()
        if any(symbol in term.free_symbols for symbol in d_symbols)
    ])
    c_block = sp.expand(form - d_block)

    # For a q-vertex forest D:
    #   d_u+d_v<=q, d_u^2+d_v^2<=q^2,
    #   -6 a_D(d_u+d_v)+6a_D q>=0,
    #   epsilon_u+epsilon_v<=2, common_D<=1, e_D<=q-1,
    #   8 W_D-4 X_u(D)-4 X_v(D)>=0.
    # The remaining edge coefficient is at least -6q+2.
    d_lower = -8 * q**2 + 8 * q - 10 * symbols["n"] - 24

    common_coefficient = sp.diff(c_block, symbols["C_common_neighbor"])
    xu_coefficient = sp.diff(c_block, symbols["C_neighbor_excess_u"])
    xv_coefficient = sp.diff(c_block, symbols["C_neighbor_excess_v"])
    wedge_coefficient = sp.diff(c_block, symbols["C_wedges"])
    assert sp.expand(common_coefficient - (-20 * symbols["n"] + 13)) == 0
    assert sp.expand(xu_coefficient - (36 * symbols["n"] - 61)) == 0
    assert sp.expand(xv_coefficient - (36 * symbols["n"] - 61)) == 0
    assert sp.expand(wedge_coefficient - (-42 * symbols["n"] + 113)) == 0

    positive_motifs = [
        "C_connected3_E", "C_connected3_U", "C_connected3_V", "C_connected3_W",
        "C_neighbor_excess_u", "C_neighbor_excess_v",
    ]
    relaxed = c_block.subs({symbols[name]: 0 for name in positive_motifs}) + d_lower
    relaxed = relaxed.subs(symbols["C_common_neighbor"], 1)

    branch_records = []
    global_minimum = None
    negative_cells = 0
    maximum_n = 35
    for adjacent, zu, zv in ((0, 0, 0), (0, 0, 1), (0, 1, 0), (0, 1, 1), (1, 1, 1)):
        for epsilon_u, epsilon_v in product((0, 1), repeat=2):
            substitutions = {
                symbols["C_adjacent"]: adjacent,
                symbols["C_degree_u"]: x + zu,
                symbols["C_degree_v"]: y + zv,
                symbols["C_edges"]: x + y + r + 1,
                symbols["C_wedges"]: (
                    (x + zu) * (x + zu - 1) / 2
                    + (y + zv) * (y + zv - 1) / 2
                    + r * (r + 1) / 2
                ),
                symbols["epsilon_u"]: epsilon_u,
                symbols["epsilon_v"]: epsilon_v,
                symbols["n"]: n,
                q: n - h,
            }
            polynomial = sp.factor(relaxed.subs(substitutions))
            function = sp.lambdify((n, h, x, y, r), polynomial, "math")
            branch_minimum = None
            branch_witness = None
            branch_negatives = 0
            for n_value in range(2, maximum_n + 1):
                for h_value in range(n_value + 1):
                    for x_value in range(n_value - 1):
                        for y_value in range(n_value - 1 - x_value):
                            for r_value in range(n_value - 1 - x_value - y_value):
                                value = function(n_value, h_value, x_value, y_value, r_value)
                                if branch_minimum is None or value < branch_minimum:
                                    branch_minimum = value
                                    branch_witness = [n_value, h_value, x_value, y_value, r_value]
                                if value < 0:
                                    branch_negatives += 1
            negative_cells += branch_negatives
            if global_minimum is None or branch_minimum < global_minimum[0]:
                global_minimum = (branch_minimum, [adjacent, zu, zv, epsilon_u, epsilon_v], branch_witness)
            branch_records.append({
                "branch": [adjacent, zu, zv, epsilon_u, epsilon_v],
                "minimum": branch_minimum,
                "witness_n_h_x_y_r": branch_witness,
                "negative_cells": branch_negatives,
                "polynomial": str(polynomial),
            })

    report = {
        "marker": "PROBE_EXACT_ISO_N5_BUNDLE_G4_COARSE_CONE_ROOT",
        "D_block": str(sp.factor(d_block)),
        "D_lower_bound": str(d_lower),
        "C_wedge_coefficient": str(wedge_coefficient),
        "integer_probe_maximum_n": maximum_n,
        "branches": branch_records,
        "negative_cells": negative_cells,
        "global_minimum": global_minimum,
        "scope_guard": (
            "Discovery probe only. A nonnegative grid would still require an exact simplex/Bernstein "
            "certificate; a negative relaxed cell would show only that this coarse relaxation is insufficient."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "negative_cells": negative_cells,
        "global_minimum": global_minimum,
        "branch_minima": [row["minimum"] for row in branch_records],
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
