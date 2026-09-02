#!/usr/bin/env python3
"""Bounded exact Delta3 k=1 junction representative at n=28.

The path w-endpoint is split off using its exact tree characterization.  The
remaining nonpath box uses t=1/n, y=n*w, and the exact r=x/w coupling.  Only
one corner is tested; a negative result is an enclosure obstruction.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_rank8_delta3_source_curvatures import build


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    here = Path(__file__).resolve().parent
    value, (n, w, x, U, V, Z) = build(1, "l0")
    junction = sp.cancel(value.subs(Z, 1))

    order = sp.Integer(28)
    t_value = sp.Rational(1, order)
    w_low = sp.Rational(3, order - 3)
    w_path = sp.Rational(3 * (order - 1), (order - 3) * (order - 4))
    w_nonpath_high = sp.factor(
        sp.binomial(order - 1, 2) / (sp.binomial(order - 2, 3) + 1)
    )
    assert w_low == sp.Rational(3, 25)
    assert w_path == sp.Rational(27, 200)
    assert w_nonpath_high == sp.Rational(39, 289)
    assert sp.factor(w_path - w_nonpath_high) == sp.Rational(3, 57800)

    # Exact coupled box, stronger than an independent r rectangle.
    W, A = sp.symbols("W A", nonnegative=True)
    w_map = w_low + (w_nonpath_high - w_low) * W
    r_low_map = 8 / (6 - w_map)
    r_high_map = 4 / (3 * (1 - w_map))
    r_map = r_low_map + (r_high_map - r_low_map) * A
    x_map = sp.factor(w_map * r_map)
    y_map = sp.factor(order * w_map)

    # Test the most exposed retained corner after removing the path endpoint.
    corner_substitution = {
        n: order,
        w: w_map.subs(W, 1),
        x: x_map.subs({W: 1, A: 1}),
        U: 0,
        V: 1,
    }
    corner_value = sp.factor(junction.subs(corner_substitution))
    expected_corner = sp.Rational(
        -6190950495769831907647267484375,
        55058003448820694585536,
    )
    assert corner_value == expected_corner
    assert corner_value < 0
    assert corner_substitution[w] == sp.Rational(39, 289)
    assert corner_substitution[x] == sp.Rational(26, 125)
    corner_y = sp.factor(y_map.subs(W, 1))
    corner_r = sp.factor(r_map.subs({W: 1, A: 1}))
    assert corner_y == sp.Rational(1092, 289)
    assert corner_r == sp.Rational(578, 375)

    # Retain the exact path endpoint exclusion.  w=w_path forces P28, hence
    # x=52/253, and every deletion P28-q has H7>=116280 rather than h7=0.
    path_x = sp.Rational(52, 253)
    path_r = sp.factor(path_x / w_path)
    assert path_r == sp.Rational(10400, 6831)

    # Tighten one step further.  e=1 forces a subdivided claw.  If s is the
    # number of unit arms, tau=3-s lies in {1,2,3}; these are the only possible
    # i4 values.  Even all three motif-compatible x values remain negative at
    # this scalar U,V corner, so c3/c4 realizability alone does not repair it.
    motif_rows = []
    for tau in (1, 2, 3):
        motif_x = sp.Rational(2601, 12674 - tau)
        motif_value = sp.factor(
            junction.subs(
                {
                    n: order,
                    w: w_nonpath_high,
                    x: motif_x,
                    U: 0,
                    V: 1,
                }
            )
        )
        assert motif_value < 0
        motif_rows.append(
            {
                "tau": tau,
                "x": str(motif_x),
                "r": str(sp.factor(motif_x / w_nonpath_high)),
                "Delta3": str(motif_value),
            }
        )

    reduction = here / "rank8_q8_terminal_delta3_bounded_reduction_exact_20260820.json"
    coupling = here / "rank8_delta3_n28_fake_junction_tree_coupling_exact_20260820.json"
    assert sha256(reduction) == "EBEF5AF8A1AF594C6C701C5A340F1F56595616F7A5EF0A53197CBE6D0DA9CC26"
    assert sha256(coupling) == "A7167DF73845D3D7B05A9610D79A46EBDAF049E6E09EE06219021D2DE6DAB93F"

    payload = {
        "status": "EXACT_ENCLOSURE_OBSTRUCTION_AFTER_PATH_ENDPOINT_EXCLUSION_N28_REPRESENTATIVE",
        "scope": (
            "one fixed n=28,k=1,lower-junction representative only; not a full "
            "Bernstein cell and not a negative tree value"
        ),
        "coordinates": {
            "t": str(t_value),
            "y": "n*w",
            "r": "x/w",
            "nonpath_w_interval": [str(w_low), str(w_nonpath_high)],
            "w_map": str(w_map),
            "y_map": str(y_map),
            "r_lower_map": str(r_low_map),
            "r_upper_map": str(r_high_map),
            "r_map": str(r_map),
        },
        "path_split": {
            "path_w": str(w_path),
            "nonpath_gap": str(w_path - w_nonpath_high),
            "forced_core": "P28",
            "path_x": str(path_x),
            "path_r": str(path_r),
            "root_exclusion": "min i7(P28-q)=116280, so the h7=0 junction is not literal",
        },
        "tested_corner": {
            "W_A_U_V": [1, 1, 0, 1],
            "w": str(corner_substitution[w]),
            "x": str(corner_substitution[x]),
            "y": str(corner_y),
            "r": str(corner_r),
            "Delta3": str(corner_value),
        },
        "e1_motif_tightening": {
            "structure": "one degree-3 vertex, hence a subdivided claw",
            "identity": "i4=C(25,4)+24-tau with tau in {1,2,3}",
            "rows": motif_rows,
            "consequence": (
                "the c3/c4 motif lattice removes the rectangular corner but all "
                "three motif-compatible scalar U=0,V=1 points are still negative"
            ),
        },
        "classification": (
            "enclosure obstruction: the next repair must couple c5/c6/c7 and rooted "
            "deletion motifs, not merely delete the path w endpoint"
        ),
        "dependencies": {
            reduction.name: sha256(reduction),
            coupling.name: sha256(coupling),
        },
        "warning": "No tree counterexample or Delta3 sign theorem is asserted.",
    }
    output = here / "rank8_delta3_k1_junction_n28_tightened_representative_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SCRIPT", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
