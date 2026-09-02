#!/usr/bin/env python3
"""Derive a sharper two-block split for the actual rank-three gap.

Finite audits support the two quantities

    chi_increment
    4(root + phi + psi + mass) + chi

being separately nonnegative.  The unweighted complementary block is
false, as is the older ``component_square = psi + chi`` block.
This script derives their exact forest-reduced polynomials.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from derive_sibling_theta_core_recursive_gap import (
    symbolic_recursive_gap,
)
from stress_sibling_theta_core_recursive_phase_split import (
    core_blocks_from_moments,
)


def actual_increment_blocks():
    _, z = symbolic_recursive_gap()
    q = z["q"]
    old_a = tuple(
        z[name] for name in ("N", "S1", "H", "C", "X", "Y", "HX")
    )
    old_m = tuple(z[name] for name in ("M", "T", "J2", "D"))
    old_p = tuple(z[name] for name in ("P", "U", "K2", "E"))
    new_a = (
        z["N"] + z["n"],
        z["S1"] + z["A"] + z["s1"],
        z["H"] + 2 * z["HA"] + z["A"] + z["h"],
        z["C"] + z["Bc"] + z["c"],
        z["X"] + z["x"],
        z["Y"] + z["y"],
        z["HX"] + z["AX"] + z["hx"],
    )
    new_m = (
        z["M"] + z["m"],
        z["T"] + z["A1"] + z["u"],
        z["J2"] + 2 * z["HA1"] + z["A1"] + z["k2"],
        z["D"] + z["B1"] + z["e"],
    )
    new_p = (
        z["P"] + z["p"],
        z["U"] + z["A2"] + z["V"],
        z["K2"] + 2 * z["HA2"] + z["A2"] + z["L2"],
        z["E"] + z["B2"] + z["F"],
    )
    old = core_blocks_from_moments(q, old_a, old_m, old_p)
    new = core_blocks_from_moments(q, new_a, new_m, new_p)
    return z, {
        name: sp.expand((new[name] - old[name]).subs(q, 3))
        for name in old
    }


def forest_reduction(z):
    b5 = sp.symbols("b5")
    edge_symbols = sp.symbols("eb3 el2 ej2 ej1 ek1 ek0")
    eb3, el2, ej2, ej1, ek1, ek0 = edge_symbols
    relations = {
        z["C"]: z["S1"] - eb3,
        z["H"]: z["S1"] + 20 * b5 + 2 * eb3,
        z["s1"]: 3 * z["A"],
        z["c"]: 3 * z["A"] - el2,
        z["h"]: 3 * z["HA"] + 3 * z["Bc"] + 2 * el2,
        z["T"]: 3 * z["X"],
        z["D"]: 3 * z["X"] - ej2,
        z["J2"]: 3 * z["HX"] + 3 * z["Y"] + 2 * ej2,
        z["U"]: 2 * z["M"],
        z["E"]: 2 * z["M"] - ej1,
        z["K2"]: 2 * z["M"] + 6 * z["X"] + 2 * ej1,
        z["A2"]: z["m"],
        z["u"]: 2 * z["A1"],
        z["e"]: 2 * z["A1"] - ek1,
        z["k2"]: 2 * z["A1"] + 6 * z["AX"] + 2 * ek1,
        z["p"]: 1,
        z["V"]: z["m"],
        z["F"]: z["m"] - ek0,
        z["L2"]: z["m"] + 2 * z["A1"] + 2 * ek0,
        z["HA1"]: 3 * z["AX"] + z["A1"] - z["B1"],
        z["HA2"]: 2 * z["A1"] + z["m"] - z["B2"],
        z["x"]: z["A1"],
        z["hx"]: 3 * z["AX"] + z["A1"] - z["y"],
    }
    return relations, b5, edge_symbols


def main() -> None:
    z, blocks = actual_increment_blocks()
    relations, b5, edge_symbols = forest_reduction(z)
    candidates = {
        "chi": blocks["chi"],
        "four_root_phi_psi_mass_plus_chi": (
            4
            * sum(
                blocks[name]
                for name in ("root", "phi", "psi", "mass")
            )
            + blocks["chi"]
        ),
    }
    reduced = {
        name: sp.expand(expression.subs(relations))
        for name, expression in candidates.items()
    }
    edge_coefficients = {
        name: {
            str(edge): str(sp.factor(expression.coeff(edge)))
            for edge in edge_symbols
            if expression.coeff(edge) != 0
        }
        for name, expression in reduced.items()
    }
    edge_free = {
        name: sp.expand(
            expression.subs({edge: 0 for edge in edge_symbols})
        )
        for name, expression in reduced.items()
    }
    assert sp.expand(
        sum(blocks.values())
        - (
            candidates["four_root_phi_psi_mass_plus_chi"] / 4
            + 3 * candidates["chi"] / 4
        )
    ) == 0
    report = {
        "status": "PASS_RANK3_PHASE_SPLIT_IDENTITIES",
        "symbolic_identity": True,
        "candidate_split": [
            "chi_increment >= 0",
            "4(root + phi + psi + mass) + chi >= 0",
        ],
        "raw_term_counts": {
            name: len(sp.Add.make_args(expression))
            for name, expression in candidates.items()
        },
        "forest_reduced_term_counts": {
            name: len(sp.Add.make_args(expression))
            for name, expression in reduced.items()
        },
        "surviving_edge_coefficients": edge_coefficients,
        "forest_reduced_expressions": {
            name: str(sp.factor(expression))
            for name, expression in reduced.items()
        },
        "edge_free_expressions": {
            name: str(sp.factor(expression))
            for name, expression in edge_free.items()
        },
        "b5_symbol": str(b5),
        "warning": (
            "The split identity is proved. Nonnegativity of its two "
            "displayed candidates remains a proof obligation."
        ),
    }
    Path(
        "rank3_phase_positive_split_identity_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
