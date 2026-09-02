#!/usr/bin/env python3
"""Numerical scout for Delta2/3 with exact surplus and U,V,Z floors."""

from __future__ import annotations

import argparse
import itertools
import json
import math
import sys
from pathlib import Path

import sympy as sp

import probe_rank8_delta2_source_curvatures as delta2
import probe_rank8_delta3_source_curvatures as delta3
from verify_rank8_q8_terminal_reduction import newton_coefficients, residual


HERE = Path(__file__).resolve().parent


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, choices=(2, 3), required=True)
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    parser.add_argument("--piece", choices=("lcross", "ucap"), required=True)
    args = parser.parse_args()
    sys.setrecursionlimit(200_000)

    raw = newton_coefficients(residual())
    module = delta2 if args.rank == 2 else delta3
    module.residual = lambda: None
    module.newton_coefficients = lambda _expression: raw
    value, variables = module.build(args.k, args.piece)
    numerator, denominator = sp.fraction(value)

    def rows(expression):
        polynomial = sp.Poly(sp.expand(expression), *variables, domain=sp.QQ)
        return [
            (monomial, float(coefficient))
            for monomial, coefficient in polynomial.terms()
        ], polynomial.degree_list()

    numerator_rows, numerator_degrees = rows(numerator)
    denominator_rows, denominator_degrees = rows(denominator)

    def evaluate(term_rows, degrees, point):
        powers = [
            [float(coordinate) ** exponent for exponent in range(degree + 1)]
            for coordinate, degree in zip(point, degrees)
        ]
        total = 0.0
        for monomial, coefficient in term_rows:
            term = coefficient
            for axis, exponent in enumerate(monomial):
                term *= powers[axis][exponent]
            total += term
        return total

    reserve = json.loads(
        (HERE / "rank4_quantitative_tree_reserve_exact_root_20260823.json")
        .read_text(encoding="utf-8")
    )
    N = sp.symbols("N", positive=True)
    u_floor_expression = sp.sympify(
        reserve["rank8_D4_coordinate_corollary"]["U_lower_bound"],
        locals={"n": N, "binomial": sp.binomial},
    )

    minimum = None
    witness = None
    negatives = 0
    negative_by_order = {}
    negative_by_B = {0.0: 0, 0.5: 0, 1.0: 0}
    negative_by_Z = {0.0: 0, 0.5: 0, 1.0: 0}
    points = 0
    for order in (28, 31, 40, 80, 200, 1000):
        mass = order - 2
        e_max = (mass - 1) * (mass - 2) / 2
        u_floor = float(u_floor_expression.subs(N, order))
        z_path = math.comb(order - 7, 7)
        z_floor = z_path / (z_path + math.comb(order - 2, 6))
        for B, A, u, v, z in itertools.product((0.0, 0.5, 1.0), repeat=5):
            surplus = 6 + (e_max - 6) * B
            c3 = math.comb(order - 2, 3) + surplus
            w_value = math.comb(order - 1, 2) / c3
            gamma_lower = max(0.0, surplus * (2 * surplus - mass) / (3 * mass))
            tau_lower = surplus + gamma_lower
            tau_upper = (order - 4) * surplus
            tau = tau_lower + (tau_upper - tau_lower) * A
            c4 = math.comb(order - 3, 4) + (order - 4) * surplus - tau
            x_value = c3 / c4
            u_value = u_floor + (1 - u_floor) * u
            v_floor = max(
                4 / (5 * (order - 5)),
                8 * surplus / (5 * (order - 2) * (order - 3)),
            )
            v_value = v_floor + (1 - v_floor) * v
            z_value = z_floor + (1 - z_floor) * z
            point = (order, w_value, x_value, u_value, v_value, z_value)
            result = evaluate(numerator_rows, numerator_degrees, point) / evaluate(
                denominator_rows, denominator_degrees, point
            )
            points += 1
            if minimum is None or result < minimum:
                minimum = result
                witness = {
                    "order": order,
                    "B": B,
                    "A": A,
                    "U_axis": u,
                    "V_axis": v,
                    "Z_axis": z,
                    "surplus": surplus,
                    "U": u_value,
                    "V": v_value,
                    "Z_floor": z_floor,
                    "Z": z_value,
                    "value": result,
                }
            if result < 0:
                negatives += 1
                negative_by_order[order] = negative_by_order.get(order, 0) + 1
                negative_by_B[B] += 1
                negative_by_Z[z] += 1

    print(
        f"DELTA{args.rank}_E6PLUS_UVZ rank={args.rank} k={args.k} piece={args.piece} "
        f"points={points} negatives={negatives} minimum={minimum:.12g} "
        f"witness={witness} negative_by_order={negative_by_order} "
        f"negative_by_B={negative_by_B} negative_by_Z_axis={negative_by_Z} "
        f"source_terms={len(numerator_rows)}/{len(denominator_rows)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
