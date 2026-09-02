#!/usr/bin/env python3
"""Exact Rayleigh obstruction to stability before diagonal specialization.

At the first bottom endpoint N=6,d=5 the aligned seed has two zero weights
and four positive weights with total W=N=6.  Give the four positive-weight
leaves a common activity on each side.  Then the target and its derivatives
in the two zero-weight left coordinates depend only on W, so the following
integer calculation applies to the actual (algebraic) weights exactly.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUT = Path("multiaffine_bottom_rayleigh_obstruction_certificate_20260802.json")


def main() -> None:
    u = sp.symbols("u")
    z0, z1, t, W = sp.symbols("z0 z1 t W")
    N = 6
    d = 5
    q = N - 2

    # Common-translation generating functions for one weighted star.
    # The two zero-weight leaves have activities z0,z1; the q positive-
    # weight leaves have common activity t and total edge-square weight W.
    G = (z0 + u) * (z1 + u) * (t + u) ** (q - 1) * (t + u - W)
    H = W * (z0 + u) * (z1 + u) * (t + u) ** (q - 1)

    left = {z0: 20, z1: -19, t: 14, W: 6, u: 0}
    right = {z0: -25, z1: -13, t: 2, W: 6, u: 0}

    def derivative_value(poly: sp.Expr, order: int, values: dict) -> sp.Integer:
        return sp.expand(sp.diff(poly, u, order)).subs(values)

    def convolution(left_poly: sp.Expr, right_poly: sp.Expr, order: int) -> sp.Integer:
        return sp.expand(sum(
            sp.binomial(order, k)
            * derivative_value(left_poly, k, left)
            * derivative_value(right_poly, order-k, right)
            for k in range(order+1)
        ))

    def target(left_g: sp.Expr, left_h: sp.Expr) -> sp.Integer:
        return convolution(left_g, G, d) - convolution(left_h, H, d-2)

    p = target(G, H)
    p0 = target(sp.diff(G, z0), sp.diff(H, z0))
    p1 = target(sp.diff(G, z1), sp.diff(H, z1))
    p01 = target(sp.diff(G, z0, z1), sp.diff(H, z0, z1))
    delta = sp.expand(p0*p1-p*p01)

    expected = {
        "p": sp.Integer(23005693440),
        "p_z0": sp.Integer(1182960000),
        "p_z1": sp.Integer(-1517976576),
        "p_z0z1": sp.Integer(-69254784),
        "rayleigh_difference": sp.Integer(-202451240387543040),
    }
    actual = {
        "p": p,
        "p_z0": p0,
        "p_z1": p1,
        "p_z0z1": p01,
        "rayleigh_difference": delta,
    }
    assert actual == expected
    assert delta < 0

    report = {
        "kind": "multiaffine_bottom_rayleigh_obstruction",
        "date": "2026-08-02",
        "status": "PASS_EXACT_NEGATIVE_RAYLEIGH_DIFFERENCE",
        "endpoint": {"m": 1, "N": N, "d": d, "L": 2*N-3},
        "weight_data": (
            "The aligned actual seed has two zero weights and N-2 positive "
            "weights whose sum is W=N.  Under common positive-leaf activities, "
            "G and H depend on the weights only through W."
        ),
        "left_activities": {"zero_weight_leaves": [20, -19], "positive_weight_leaves": 14},
        "right_activities": {"zero_weight_leaves": [-25, -13], "positive_weight_leaves": 2},
        "rayleigh_pair": "the two zero-weight leaves on the left",
        "exact_values": {key: str(value) for key, value in actual.items()},
        "criterion": "A real multiaffine stable polynomial must satisfy p_i p_j-p p_ij >= 0 on every real assignment.",
        "conclusion": (
            "The fully polarized leaf target is not stable before the "
            "specializations x_i=X+r_i and y_i=Y+r_i.  Therefore a direct "
            "application of a multivariate matching or relaxed-hypergraph "
            "stability theorem to the raw target is impossible."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "delta": str(delta), "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
