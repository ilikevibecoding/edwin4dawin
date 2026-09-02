#!/usr/bin/env python3
"""Numerically scout Delta2/3 after imposing the exact degree-surplus identity."""

from __future__ import annotations

import argparse
import itertools
import math
import sys

import sympy as sp

from probe_rank8_delta2_source_curvatures import build as build_delta2
from probe_rank8_delta3_source_curvatures import build as build_delta3


def scout(rank: int, k: int, piece: str) -> None:
    builder = build_delta2 if rank == 2 else build_delta3
    value, variables = builder(k, piece)
    n, w, x, U, V, Z = variables
    numerator, denominator = sp.fraction(value)

    def term_data(expression):
        polynomial = sp.Poly(sp.expand(expression), *variables, domain=sp.QQ)
        return [
            (monomial, float(coefficient))
            for monomial, coefficient in polynomial.terms()
        ], polynomial.degree_list()

    numerator_terms, numerator_degrees = term_data(numerator)
    denominator_terms, denominator_degrees = term_data(denominator)

    def evaluate(terms, degrees, point):
        powers = [
            [float(coordinate) ** exponent for exponent in range(degree + 1)]
            for coordinate, degree in zip(point, degrees)
        ]
        total = 0.0
        for monomial, coefficient in terms:
            term = coefficient
            for axis, exponent in enumerate(monomial):
                term *= powers[axis][exponent]
            total += term
        return total

    def function(*point):
        return (evaluate(numerator_terms, numerator_degrees, point)
                / evaluate(denominator_terms, denominator_degrees, point))
    minimum = None
    witness = None
    negative = 0
    negative_by_B = {0.0: 0, 0.5: 0, 1.0: 0}
    negative_by_order = {}
    points = 0
    for order in (27, 28, 31, 40, 80, 200, 1000):
        mass = order - 2
        # Non-star maximum: positive excess-degree partition (mass-1)+1.
        # The unique omitted endpoint mass is the star and is a separate
        # literal family.
        e_max = (mass - 1) * (mass - 2) / 2
        for B, A, u, v, z in itertools.product((0.0, 0.5, 1.0), repeat=5):
            surplus = 4 + (e_max - 4) * B
            c3 = math.comb(order - 2, 3) + surplus
            w_value = math.comb(order - 1, 2) / c3
            # Exact motif identity c4=C(n-3,4)+(n-4)e-tau.  If
            # x_v=deg(v)-1 then sum x_v=n-2 and sum x_v^2=n-2+2e.
            # Cauchy gives gamma=sum C(x_v,3)>=e(2e-(n-2))/(3(n-2)),
            # while the connected nonleaf subtree gives
            # E=sum_uv x_u*x_v >= (n-2)^2/(n-2+2e)-1.  Insert these in
            # tau=gamma+e+E-(n-3), clamp at zero, and interpolate to the
            # path-minimality upper endpoint tau<=(n-4)e.
            gamma_lower = max(0.0, surplus * (2 * surplus - mass) / (3 * mass))
            # For a non-star, deleting leaves leaves a nontrivial tree on
            # the positive x_v.  Edgewise x_u*x_v-1 >=(x_u-1)+(x_v-1),
            # hence E>=mass-1 and tau=gamma+e+E-(mass-1)>=gamma+e.
            tau_lower = surplus + gamma_lower
            tau_upper = (order - 4) * surplus
            tau = tau_lower + (tau_upper - tau_lower) * A
            c4 = math.comb(order - 3, 4) + (order - 4) * surplus - tau
            x_value = c3 / c4
            # Component-retaining two-extension count gives 4/(5(n-5)).
            # The all-order rank-five component-surplus theorem now also gives
            # the rigorous branching-coupled floor V>=8e/(5(n-2)(n-3)); see
            # RANK5_COMPONENT_SURPLUS_ALL_ORDER_THEOREM_2026-08-25.md.
            v_floor = max(
                4 / (5 * (order - 5)),
                8 * surplus / (5 * (order - 2) * (order - 3)),
            )
            v_value = v_floor + (1 - v_floor) * v
            result = float(function(order, w_value, x_value, u, v_value, z))
            points += 1
            if minimum is None or result < minimum:
                minimum = result
                witness = (order, B, A, u, v, z, surplus, w_value, x_value, v_value)
            if result < 0:
                negative += 1
                negative_by_B[B] += 1
                negative_by_order[order] = negative_by_order.get(order, 0) + 1
    print(
        f"Delta{rank} k={k} {piece}: points={points} negatives={negative} "
        f"minimum={minimum:.12g} witness={witness} "
        f"negative_by_B={negative_by_B} negative_by_order={negative_by_order} "
        f"source_terms={len(numerator_terms)}/{len(denominator_terms)}",
        flush=True,
    )


def main() -> None:
    sys.setrecursionlimit(200_000)
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, choices=(2, 3))
    parser.add_argument("--k", type=int, choices=(1, 7))
    parser.add_argument("--piece")
    args = parser.parse_args()
    jobs = []
    for k in (1, 7):
        for piece in ("lcross", "ucap"):
            jobs.append((2, k, piece))
    for k in (1, 7):
        for piece in ("l0", "lcross", "ucap", "full"):
            jobs.append((3, k, piece))
    for rank, k, piece in jobs:
        if args.rank is not None and rank != args.rank:
            continue
        if args.k is not None and k != args.k:
            continue
        if args.piece is not None and piece != args.piece:
            continue
        scout(rank, k, piece)


if __name__ == "__main__":
    main()
