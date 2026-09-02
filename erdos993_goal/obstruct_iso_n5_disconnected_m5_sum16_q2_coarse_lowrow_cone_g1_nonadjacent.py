#!/usr/bin/env python3
"""Exact method obstruction for the coarse q=2 sum16 low-row cone.

The relaxation retains the q=2 orders and edge counts, the pinned high
forest-ratio inequalities for P0, and edge-union/binomial bounds for H, but
it forgets that P0 and H arise from the same two component factors.  R0 is
negative at an exact corner in both q=2 modes.  These are synthetic rational
coefficient rows, not independence polynomials and not graph counterexamples.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent import (
    generic_newton_rows,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum16_q2_coarse_lowrow_cone_obstruction_g1_nonadjacent_20260830.json"
MARKER = "OBSTRUCTED_EXACT_ISO_N5_DISCONNECTED_M5_SUM16_Q2_COARSE_LOWROW_CONE_G1_NONADJACENT"
DEPENDENCY = {
    "probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent.py":
        "B938A7416091632E8725B34A029FA3F9260163CDD57CD6334C71D91A11435F59",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def corner(mode, x, h, row0):
    e = sp.Integer(13)
    order = e + (2 if mode == "distinct" else 1)
    rho1 = sp.factor(4 * (sp.binomial(order, 2) - e) / order)
    rhos = (rho1, sp.Integer(3), sp.Integer(2), sp.Integer(1), sp.Integer(0))
    product = 1
    x_values = [sp.Integer(1), order]
    for rank, rho in zip(range(2, 7), rhos):
        product *= rho
        x_values.append(sp.factor(
            order * product / (2 ** (rank - 1) * sp.factorial(rank))
        ))
    h_values = [
        sp.Integer(1),
        e,
        sp.binomial(e, 2) - (e - 2),
        sp.binomial(e, 3) - (e - 2) * (e - 2),
        sp.binomial(e, 4),
        sp.binomial(e, 5),
    ]
    value = sp.factor(row0.subs({
        **{x[index]: x_values[index] for index in range(7)},
        **{h[index]: h_values[index] for index in range(6)},
    }))
    expected = {
        "distinct": -sp.Rational(3112097, 20),
        "shared": -sp.Rational(719193, 5),
    }[mode]
    assert value == expected

    # Every explicitly retained ratio and endpoint condition is satisfied.
    assert x_values[2] == sp.binomial(order, 2) - e
    assert rho1 - rhos[1] >= 1
    assert rhos[1] - rhos[2] >= 1
    assert rhos[2] - rhos[3] >= 1
    assert rhos[3] - rhos[4] >= 1
    assert 0 <= rhos[4] <= 2 * (order - 5)
    for rank in range(3, 6):
        floor = sp.binomial(e, rank) - (e - 2) * sp.binomial(e - 2, rank - 2)
        assert floor <= h_values[rank] <= sp.binomial(e, rank)
    return {
        "mode": mode,
        "e_H": str(e),
        "P0_order": str(order),
        "P0_edges": str(e),
        "H_edges": str(e - 2),
        "rho1_through_rho5": [str(value) for value in rhos],
        "P0_coefficients_x0_through_x6": [str(value) for value in x_values],
        "H_coefficients_h0_through_h5": [str(value) for value in h_values],
        "R0_value": str(value),
    }


def main():
    for name, expected in DEPENDENCY.items():
        assert sha256(HERE / name) == expected, name
    x, h, rows = generic_newton_rows()
    corners = [corner(mode, x, h, rows[0]) for mode in ("distinct", "shared")]
    report = {
        "marker": MARKER,
        "obstructed_route": (
            "For q=2 R0, replace H3 by its edge-union floor and H4,H5 by "
            "binomial ceilings, then treat P0 only through its high forest-ratio cone."
        ),
        "satisfied_hypotheses": [
            "P0 has the exact q=2 mode order and i2=C(order,2)-e",
            "rho1-rho2>=1, rho2-rho3>=1, rho3-rho4>=1, rho4-rho5>=1",
            "0<=rho5<=2(order-5)",
            "H has e vertices, e-2 edges, and each retained edge-union/binomial endpoint bound",
        ],
        "exact_negative_corners": corners,
        "strict_warning": (
            "Neither corner is an independence polynomial: fractional P0 coefficients "
            "already show the missing realizability.  This disproves only the coarse "
            "relaxation, not q=2 sum16 and not any graph-theoretic statement."
        ),
        "consequence": (
            "Any proof of the remaining q=2 rows must retain the common component "
            "relations P0=(A1+xG1)(A2+xG2) or P0=A1A2+xG1G2 with H=A1A2."
        ),
        "scope": "Exact method obstruction only; no graph counterexample.",
        "pinned_dependencies": DEPENDENCY,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(raw, encoding="utf-8", newline="\n")
    os.replace(temporary, OUTPUT)
    print(json.dumps({
        "marker": MARKER,
        "corner_values": [item["R0_value"] for item in corners],
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
