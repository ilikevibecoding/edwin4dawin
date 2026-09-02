#!/usr/bin/env python3
"""Exact orthant probe for the unique-degree-4 exceptional profiles."""

from __future__ import annotations

import sympy as sp

from analyze_iso_n7_bundle_g1_sum0_connected_high_degree_growth_symbolic_rank7_g4_piecewise import (
    S,
    T,
    choose,
    cone_controls,
    n,
)


B, C, A, R = sp.symbols("B C A R", integer=True, nonnegative=True)


def main() -> None:
    branching_threes = B+2
    degree_twos = C
    order = 5+2*branching_threes+degree_twos
    moments = {
        rank: sp.binomial(4, rank)+branching_threes*sp.binomial(3, rank)+degree_twos*sp.binomial(2, rank)
        for rank in S
    }
    squares = {
        rank: sp.binomial(4, rank)**2+branching_threes*sp.binomial(3, rank)**2+degree_twos*sp.binomial(2, rank)**2
        for rank in T
    }
    controls = cone_controls(order, moments, squares)
    for index, control in enumerate(controls):
        total = 0
        negatives = []
        minimum = None
        for fixed_b in range(17):
            sector = sp.Poly(
                sp.expand(control.subs({B: fixed_b, C: 33-2*fixed_b+R})),
                R,
                domain=sp.QQ,
            )
            for powers, coefficient in sector.terms():
                total += 1
                candidate = (coefficient, "finite", fixed_b, powers)
                minimum = candidate if minimum is None else min(minimum, candidate)
                if coefficient < 0:
                    negatives.append(candidate)
        tail = sp.Poly(
            sp.expand(control.subs({B: 17+A, C: R})), A, R, domain=sp.QQ
        )
        for powers, coefficient in tail.terms():
            total += 1
            candidate = (coefficient, "tail", None, powers)
            minimum = min(minimum, candidate)
            if coefficient < 0:
                negatives.append(candidate)
        print(index, "TERMS", total, "NEGATIVE", len(negatives),
              "MIN_NEGATIVE", min(negatives) if negatives else None,
              "MIN_COEFFICIENT", minimum)


if __name__ == "__main__":
    main()
