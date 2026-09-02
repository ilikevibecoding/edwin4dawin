#!/usr/bin/env python3
"""Diagnostic Delta2 e>=6 scout with U, V, and rooted-deletion floors.

This keeps the exact degree-surplus formulas for c3 and c4, applies the
proved quantitative rank-four U floor and both proved rank-five V floors,
and also retains the elementary rooted-deletion ratio bound

    Z = i7(T-q)/i7(T)
      >= C(n-7,7)/(C(n-7,7)+C(n-2,6)).

The current scout uses the stronger proved attachment-incidence floor

    Z >= (n-19)/(n-12),

and independently checks that it dominates the older path/binomial floor
displayed above.  This script is a diagnostic scout, not a theorem proof.
"""

from __future__ import annotations

import itertools
import json
import math
import sys
from pathlib import Path

import sympy as sp

import probe_rank8_delta2_source_curvatures as delta2
from verify_rank8_q8_terminal_reduction import newton_coefficients, residual


HERE = Path(__file__).resolve().parent


def main() -> None:
    sys.setrecursionlimit(200_000)
    raw_coefficients = newton_coefficients(residual())
    delta2.residual = lambda: None
    delta2.newton_coefficients = lambda _expression: raw_coefficients
    value, variables = delta2.build(1, "lcross")
    n, w, x, U, V, Z = variables
    numerator, denominator = sp.fraction(value)

    def terms(expression):
        polynomial = sp.Poly(sp.expand(expression), *variables, domain=sp.QQ)
        return [
            (monomial, float(coefficient))
            for monomial, coefficient in polynomial.terms()
        ], polynomial.degree_list()

    numerator_terms, numerator_degrees = terms(numerator)
    denominator_terms, denominator_degrees = terms(denominator)

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
    negative = 0
    negative_by_B = {0.0: 0, 0.5: 0, 1.0: 0}
    negative_by_Z = {0.0: 0, 0.5: 0, 1.0: 0}
    negative_by_order = {}
    points = 0
    for order in (*range(28, 51), 60, 80, 120, 200, 1000):
        mass = order - 2
        e_max = (mass - 1) * (mass - 2) / 2
        assert e_max >= 6
        # Deliberately drop the proved U and V floors in this pass.  If the
        # larger box is already nonnegative above a cutoff, the eventual exact
        # certificate can avoid two high-degree rational substitutions.
        u_floor = 0.0
        z_path = math.comb(order - 7, 7)
        z_containing_ceiling = math.comb(order - 2, 6)
        older_z_floor = z_path / (z_path + z_containing_ceiling)
        z_floor = (order - 19) / (order - 12)
        assert z_floor >= older_z_floor
        for B, A, u, v, z in itertools.product((0.0, 0.5, 1.0), repeat=5):
            surplus = 6 + (e_max - 6) * B
            c3 = math.comb(order - 2, 3) + surplus
            w_value = math.comb(order - 1, 2) / c3
            gamma_lower = max(
                0.0, surplus * (2 * surplus - mass) / (3 * mass)
            )
            tau_lower = surplus + gamma_lower
            tau_upper = (order - 4) * surplus
            tau = tau_lower + (tau_upper - tau_lower) * A
            c4 = math.comb(order - 3, 4) + (order - 4) * surplus - tau
            x_value = c3 / c4
            u_value = u_floor + (1 - u_floor) * u
            v_floor = 0.0
            v_value = v_floor + (1 - v_floor) * v
            z_value = z_floor + (1 - z_floor) * z
            point = (order, w_value, x_value, u_value, v_value, z_value)
            result = (
                evaluate(numerator_terms, numerator_degrees, point)
                / evaluate(denominator_terms, denominator_degrees, point)
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
                    "w": w_value,
                    "x": x_value,
                    "U": u_value,
                    "V": v_value,
                    "Z_floor": z_floor,
                    "Z": z_value,
                    "value": result,
                }
            if result < 0:
                negative += 1
                negative_by_B[B] += 1
                negative_by_Z[z] += 1
                negative_by_order[order] = negative_by_order.get(order, 0) + 1

    print(
        "DELTA2_E6PLUS_JOINT_FLOORS_ROOT_RATIO "
        f"points={points} negatives={negative} minimum={minimum:.12g} "
        f"witness={witness} negative_by_B={negative_by_B} "
        f"negative_by_Z_axis={negative_by_Z} negative_by_order={negative_by_order} "
        f"source_terms={len(numerator_terms)}/{len(denominator_terms)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
