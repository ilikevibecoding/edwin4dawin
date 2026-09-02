#!/usr/bin/env python3
"""Diagnostic: test the prospective quantitative Q5 floor on old fake Delta2 points."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_source_curvatures import build


ROOT = Path(__file__).resolve().parent


def q5_floor(order: int) -> sp.Rational:
    value = sp.Integer(144_609)
    for old_order in range(14, order):
        value += (sp.Rational(7, 25)
                  * sp.binomial(old_order - 4, 4) ** 3
                  / sp.binomial(old_order, 4))
    return sp.factor(value)


def main() -> None:
    reserve = json.loads((ROOT / "rank4_quantitative_tree_reserve_exact_root_20260823.json")
                         .read_text(encoding="utf-8"))
    N = sp.symbols("N", positive=True)
    u_floor = sp.sympify(
        reserve["rank8_D4_coordinate_corollary"]["U_lower_bound"],
        locals={"n": N, "binomial": sp.binomial},
    )
    value, (n, w, x, U, V, Z) = build(1, "lcross")
    for order in (27, 28, 40, 80, 200, 1000):
        t = sp.Rational(1, order)
        y = 3 + sp.Rational(4347, 190) * t
        r = sp.Rational(4, 3) + (sp.Rational(760, 471) - sp.Rational(4, 3)) * sp.Rational(23, order)
        uv = sp.factor(u_floor.subs(N, order))
        floor = q5_floor(order)
        gap = sp.factor(floor / (5 * sp.binomial(order, 4) * sp.binomial(order, 5)))
        vv = 1 - gap
        exact = sp.cancel(value.subs({n: order, w: t * y, x: t * y * r,
                                      U: uv, V: vv, Z: 0}))
        old = sp.cancel(value.subs({n: order, w: t * y, x: t * y * r,
                                    U: uv, V: 1, Z: 0}))
        print(
            f"n={order} gap={sp.N(gap, 10)} old={sp.N(old, 10)} "
            f"combined={sp.N(exact, 10)} sign={sp.sign(exact)}",
            flush=True,
        )


if __name__ == "__main__":
    main()
