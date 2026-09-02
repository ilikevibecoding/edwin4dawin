#!/usr/bin/env python3
"""Locate the exact-integer finite-surplus relaxed Delta2 obstruction band."""

from __future__ import annotations

import math
from fractions import Fraction

import sympy as sp

from probe_rank8_delta2_source_curvatures import build
from verify_rank7_terminal_broom_middle_differences import D4_CEILING


def main() -> None:
    value, variables = build(1, "lcross")
    numerator, denominator = sp.fraction(sp.cancel(value))

    def rows(expression):
        polynomial = sp.Poly(sp.expand(expression), *variables, domain=sp.QQ)
        return [
            (monomial, float(coefficient))
            for monomial, coefficient in polynomial.terms()
        ], polynomial.degree_list()

    num_terms, num_degrees = rows(numerator)
    den_terms, den_degrees = rows(denominator)

    def evaluate(terms, degrees, point):
        powers = [
            [coordinate**power for power in range(degree + 1)]
            for coordinate, degree in zip(point, degrees)
        ]
        total = 0.0
        for monomial, coefficient in terms:
            term = coefficient
            for axis, power in enumerate(monomial):
                term *= powers[axis][power]
            total += term
        return total

    failures = {}
    for order in range(28, 35):
        mass = order - 2
        nonstar_max = (mass - 1) * (mass - 2) // 2
        negative_e = []
        negative_e_q5 = []
        q5_floor = Fraction(144_609)
        for old_order in range(14, order):
            q5_floor += Fraction(
                math.comb(old_order - 4, 4) ** 3,
                5 * math.comb(old_order, 4),
            )
        v_ceiling = 1.0 - float(
            q5_floor
            / (5 * math.comb(order - 1, 4) * math.comb(order - 1, 5))
        )
        minimum = None
        witness = None
        for excess in range(6, nonstar_max + 1):
            c3 = math.comb(order - 2, 3) + excess
            tau = (order - 1) * excess / 3
            c4 = math.comb(order - 3, 4) + (order - 4) * excess - tau
            w = math.comb(order - 1, 2) / c3
            x = c3 / c4
            d4_low = (2 + x) / 10
            d4_high = (1 + 3 * x) / 5
            U = (d4_high - d4_low) / (float(D4_CEILING) - d4_low)
            Z = (order - 19) / (order - 12)
            point = (order, w, x, U, 1.0, Z)
            result = evaluate(num_terms, num_degrees, point) / evaluate(
                den_terms, den_degrees, point
            )
            if minimum is None or result < minimum:
                minimum, witness = result, excess
            if result < 0:
                negative_e.append(excess)
            capped_point = (order, w, x, U, v_ceiling, Z)
            capped_result = evaluate(num_terms, num_degrees, capped_point) / evaluate(
                den_terms, den_degrees, capped_point
            )
            if capped_result < 0:
                negative_e_q5.append(excess)
        failures[order] = negative_e
        print(
            "ORDER", order,
            "NEGATIVE_E", negative_e,
            "NEGATIVE_E_UNIT_Q5", negative_e_q5,
            "V_CEILING", v_ceiling,
            "MINIMUM", minimum,
            "WITNESS_E", witness,
            flush=True,
        )
    print("SUMMARY", failures, flush=True)


if __name__ == "__main__":
    main()
