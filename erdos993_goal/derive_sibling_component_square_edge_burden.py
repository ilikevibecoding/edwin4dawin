#!/usr/bin/env python3
"""Expose the exact surviving-edge burden in the component-square block.

For a forest G and an independent r-set K, write h(K) for the number
of residual vertices, c(K) for residual components, and e(K) for
residual edges.  Since every residual graph is a forest,

    c(K)=h(K)-e(K),
    sum h(K)^2=sum h(K)+(r+1)(r+2)i_(r+2)(G)+2 sum e(K).

Substituting these identities into the recursive ``psi+chi`` block
splits it into an edge-free count reserve minus six explicit
surviving-edge burdens.  This script proves that split symbolically.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from derive_sibling_theta_core_recursive_gap import (
    symbolic_phase_split,
    symbolic_recursive_gap,
)


def main() -> None:
    gap, z = symbolic_recursive_gap()
    delta = symbolic_phase_split(gap, z)
    component_square = sp.expand(delta["psi"] + delta["chi"])
    q = z["q"]

    # Counts two ranks above the six moment rows.
    bqp2, lqp1, jqp1 = sp.symbols("bqp2 lqp1 jqp1")

    # Total surviving residual edges in the six rows.
    ebq, elm1, ejm1, ejm2, ekm2, ekm3 = sp.symbols(
        "ebq elm1 ejm1 ejm2 ekm2 ekm3"
    )

    forest_moments = {
        # B at rank q.
        z["C"]: z["S1"] - ebq,
        z["H"]: (
            z["S1"]
            + (q + 1) * (q + 2) * bqp2
            + 2 * ebq
        ),
        # L=B-s at rank q-1.
        z["c"]: z["s1"] - elm1,
        z["h"]: (
            z["s1"] + q * (q + 1) * lqp1 + 2 * elm1
        ),
        # J=B-v at ranks q-1 and q-2.
        z["D"]: z["T"] - ejm1,
        z["J2"]: (
            z["T"] + q * (q + 1) * jqp1 + 2 * ejm1
        ),
        z["E"]: z["U"] - ejm2,
        z["K2"]: (
            z["U"] + q * (q - 1) * z["X"] + 2 * ejm2
        ),
        # K=B-{v,s} at ranks q-2 and q-3.  Here AX=i_q(K)
        # and A1=i_(q-1)(K).
        z["e"]: z["u"] - ekm2,
        z["k2"]: (
            z["u"] + q * (q - 1) * z["AX"] + 2 * ekm2
        ),
        z["F"]: z["V"] - ekm3,
        z["L2"]: (
            z["V"]
            + (q - 1) * (q - 2) * z["A1"]
            + 2 * ekm3
        ),
    }
    reduced = sp.expand(component_square.subs(forest_moments))
    edge_symbols = (ebq, elm1, ejm1, ejm2, ekm2, ekm3)
    edge_coefficients = {
        edge: sp.expand(reduced.coeff(edge)) for edge in edge_symbols
    }
    expected = {
        ebq: -6 * z["p"],
        elm1: -6 * z["P"],
        ejm1: -6 * z["p"],
        ejm2: -6 * (z["m"] + z["n"]),
        ekm2: -6 * z["P"],
        ekm3: -6 * (z["N"] + z["M"]),
    }
    assert edge_coefficients == expected
    assert all(
        sp.diff(reduced, edge, 2) == 0 for edge in edge_symbols
    )

    count_reserve = sp.expand(
        reduced.subs({edge: 0 for edge in edge_symbols})
    )
    burden = sp.expand(
        6
        * (
            z["p"] * ebq
            + z["P"] * elm1
            + z["p"] * ejm1
            + (z["m"] + z["n"]) * ejm2
            + z["P"] * ekm2
            + (z["N"] + z["M"]) * ekm3
        )
    )
    assert sp.expand(reduced - count_reserve + burden) == 0

    # Apply the elementary coefficient/indicator relations that are
    # already present in the recursive phase notation.
    count_relations = {
        z["s1"]: q * z["A"],
        lqp1: (z["HA"] - z["A"] + z["Bc"]) / (q + 1),
        z["T"]: q * z["X"],
        jqp1: (z["HX"] - z["X"] + z["Y"]) / (q + 1),
        z["U"]: (q - 1) * z["M"],
        z["u"]: (q - 1) * z["A1"],
        z["V"]: (q - 2) * z["m"],
        z["A2"]: z["m"],
        z["A1"]: z["x"],
    }
    count_reserve_reduced = sp.factor(
        sp.cancel(count_reserve.subs(count_relations))
    )
    # All divisions cancel: the reserve is an integer polynomial.
    assert sp.denom(count_reserve_reduced) == 1
    count_reserve_reduced = sp.expand(count_reserve_reduced)

    report = {
        "status": "PASS_COMPONENT_SQUARE_EDGE_BURDEN_IDENTITY",
        "symbolic_identity": True,
        "valid_ranks": "q>=4",
        "component_square_expanded_term_count": len(
            sp.Add.make_args(component_square)
        ),
        "edge_free_count_reserve_term_count": len(
            sp.Add.make_args(count_reserve_reduced)
        ),
        "edge_coefficients": {
            str(edge): str(edge_coefficients[edge])
            for edge in edge_symbols
        },
        "exact_split": (
            "component_square = count_reserve - "
            "6[p*ebq + P*elm1 + p*ejm1 + (m+n)*ejm2 "
            "+ P*ekm2 + (N+M)*ekm3]"
        ),
        "edge_free_count_reserve": str(
            sp.factor(count_reserve_reduced)
        ),
        "warning": (
            "The identity is proved algebraically.  Domination of "
            "the six surviving-edge burdens by the count reserve "
            "remains a proof obligation."
        ),
    }
    output = Path(
        "sibling_component_square_edge_burden_"
        "identity_certificate_20260729.json"
    )
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
