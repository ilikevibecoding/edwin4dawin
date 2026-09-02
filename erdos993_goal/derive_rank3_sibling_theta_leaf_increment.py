#!/usr/bin/env python3
"""Derive the actual rank-three sibling Theta leaf increment.

At q=3 the pruning boundary is ``d_3(B+z)-d_3(B)``; the formal
rank-two lower core is not subtracted.  This script gives the exact
cross-phase polynomial for that boundary.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from derive_sibling_theta_core_recursive_gap import (
    symbolic_recursive_gap,
    theta_core_polynomial,
)


def main() -> None:
    recursive_gap, z = symbolic_recursive_gap()
    lower_formal = theta_core_polynomial(
        z["q"] - 1,
        z["n"],
        z["s1"],
        z["h"],
        z["c"],
        z["x"],
        z["y"],
        z["hx"],
        z["m"],
        z["u"],
        z["k2"],
        z["e"],
        z["p"],
        z["V"],
        z["L2"],
        z["F"],
    )
    increment = sp.expand(
        (recursive_gap + lower_formal).subs(z["q"], 3)
    )

    b5 = sp.symbols("b5")
    eb3, el2, ej2, ej1, ek1, ek0 = sp.symbols(
        "eb3 el2 ej2 ej1 ek1 ek0"
    )
    forest_relations = {
        # B at rank 3.
        z["C"]: z["S1"] - eb3,
        z["H"]: z["S1"] + 20 * b5 + 2 * eb3,
        # L=B-s at rank 2.  The rank-four coefficient is eliminated
        # through the support-absent mixed moment HA.
        z["s1"]: 3 * z["A"],
        z["c"]: 3 * z["A"] - el2,
        z["h"]: 3 * z["HA"] + 3 * z["Bc"] + 2 * el2,
        # J=B-v at ranks 2 and 1.
        z["T"]: 3 * z["X"],
        z["D"]: 3 * z["X"] - ej2,
        z["J2"]: 3 * z["HX"] + 3 * z["Y"] + 2 * ej2,
        z["U"]: 2 * z["M"],
        z["E"]: 2 * z["M"] - ej1,
        z["K2"]: 2 * z["M"] + 6 * z["X"] + 2 * ej1,
        # K=B-{v,s} at ranks 1 and 0.
        z["A2"]: z["m"],
        z["u"]: 2 * z["A1"],
        z["e"]: 2 * z["A1"] - ek1,
        z["k2"]: 2 * z["A1"] + 6 * z["AX"] + 2 * ek1,
        z["p"]: 1,
        z["V"]: z["m"],
        z["F"]: z["m"] - ek0,
        z["L2"]: z["m"] + 2 * z["A1"] + 2 * ek0,
        # Mixed absent-vertex moments on J and L.
        z["HA1"]: 3 * z["AX"] + z["A1"] - z["B1"],
        z["HA2"]: 2 * z["A1"] + z["m"] - z["B2"],
        z["x"]: z["A1"],
        z["hx"]: 3 * z["AX"] + z["A1"] - z["y"],
    }
    reduced = sp.expand(increment.subs(forest_relations))
    edge_symbols = (eb3, el2, ej2, ej1, ek1, ek0)
    edge_coefficients = {
        edge: sp.factor(reduced.coeff(edge))
        for edge in edge_symbols
    }
    assert all(sp.diff(reduced, edge, 2) == 0 for edge in edge_symbols)
    edge_free = sp.expand(
        reduced.subs({edge: 0 for edge in edge_symbols})
    )
    reconstructed = edge_free + sum(
        edge_coefficients[edge] * edge for edge in edge_symbols
    )
    assert sp.expand(reduced - reconstructed) == 0

    report = {
        "status": "PASS_RANK3_PLAIN_LEAF_INCREMENT_IDENTITY",
        "symbolic_identity": True,
        "expanded_term_count": len(sp.Add.make_args(increment)),
        "factored_increment": str(sp.factor(increment)),
        "forest_reduced_term_count": len(sp.Add.make_args(reduced)),
        "edge_free_term_count": len(sp.Add.make_args(edge_free)),
        "surviving_edge_coefficients": {
            str(edge): str(edge_coefficients[edge])
            for edge in edge_symbols
        },
        "edge_free_reserve": str(sp.factor(edge_free)),
        "warning": (
            "The rank-three increment identity is proved "
            "algebraically; its nonnegativity remains unproved."
        ),
    }
    Path(
        "rank3_sibling_theta_plain_leaf_increment_"
        "identity_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
