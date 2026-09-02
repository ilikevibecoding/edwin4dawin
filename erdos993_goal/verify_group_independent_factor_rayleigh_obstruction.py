#!/usr/bin/env python3
"""Exact obstruction to independently parameterizing both group Q factors.

The required anchored pencil keeps one Q factor fixed.  A tempting stronger
claim gives the two factors independent variables u and v.  This script
checks an exact negative Rayleigh difference, proving that strengthening is
not real stable already at m=1.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("group_independent_factor_rayleigh_obstruction_20260803.json")
x, y, u, v = sp.symbols("x y u v")


def directional_sum(poly: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(
        sum(
            sp.binomial(order, j) * sp.diff(poly, x, j, y, order - j)
            for j in range(order + 1)
        )
    )


def main() -> None:
    m = 1
    N, d = 3 * m + 5, 2 * m + 5
    seeds = [hypergeometric_form(N - j, 3) for j in range(3)]
    blocks = []
    for j, seed in enumerate(seeds):
        product = seed.subs(X, x) * seed.subs(X, y)
        blocks.append(directional_sum(product, d - 2 * j))
    A, B, C = blocks

    polynomial = sp.expand(A - (u + v) * B + u * v * C)
    rayleigh = sp.expand(
        sp.diff(polynomial, u) * sp.diff(polynomial, v)
        - polynomial * sp.diff(polynomial, u, v)
    )
    assert sp.expand(rayleigh - (B**2 - A * C)) == 0
    witness = sp.factor(rayleigh.subs({x: -1, y: -1}))
    expected = -sp.Rational(1900968388905337, 1828915200)
    assert witness == expected
    assert witness < 0

    report = {
        "status": "PASS_EXACT_RAYLEIGH_OBSTRUCTION",
        "claim_ruled_out": (
            "A-(u+v)B+uvC is real stable with u and v independent"
        ),
        "m": m,
        "N": N,
        "d": d,
        "rayleigh_identity": "Delta_(u,v)=B^2-A*C",
        "real_assignment": {"x": -1, "y": -1},
        "rayleigh_value": str(witness),
        "does_not_rule_out": "the anchored pencil A-(1+u)B+uC",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
