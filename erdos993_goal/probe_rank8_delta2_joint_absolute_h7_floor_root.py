#!/usr/bin/env python3
"""Scout Delta2 with the joint absolute forest lower bound on h7."""

from __future__ import annotations

import itertools
import math
import sys

import sympy as sp

import probe_rank8_delta2_source_curvatures as delta2
from verify_rank8_q8_terminal_reduction import newton_coefficients, residual


def main() -> None:
    sys.setrecursionlimit(200_000)
    raw_coefficients = newton_coefficients(residual())
    delta2.residual = lambda: None
    delta2.newton_coefficients = lambda _expression: raw_coefficients
    value, variables = delta2.build(1, "lcross")
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

    minimum = None
    witness = None
    negative = 0
    negative_by_order = {}
    negative_rows = []
    active_floor_counts = {"attachment": 0, "absolute_h7": 0}
    points = 0
    for order in (*range(28, 51), 60, 80, 120, 200, 1000):
        mass = order - 2
        # For a non-star, the positive x_v=d(v)-1 partition has at least
        # two parts, so its exact extremum is (mass-1)+1.  The unique star
        # endpoint x=(mass) is a separate literal family.
        e_max = (mass - 1) * (mass - 2) / 2
        for B, A, u, v, z in itertools.product((0.0, 0.5, 1.0), repeat=5):
            surplus = 6 + (e_max - 6) * B
            c3_actual = math.comb(order - 2, 3) + surplus
            w = math.comb(order - 1, 2) / c3_actual
            gamma_lower = max(0.0, surplus * (2 * surplus - mass) / (3 * mass))
            tau_lower = surplus + gamma_lower
            # The Zagreb inequality and B3<=(n-4)e/3 give the sharp usable
            # path-surplus reserve
            #   i4(T)-i4(P_n)=(n-4)e-tau >= (2n-11)e/3,
            # hence tau <= (n-1)e/3 for every n>=15.
            tau_upper = (order - 1) * surplus / 3
            tau = tau_lower + (tau_upper - tau_lower) * A
            c4_actual = math.comb(order - 3, 4) + (order - 4) * surplus - tau
            x = c3_actual / c4_actual
            # Keep the full proved source range 0<=V<=1.  An earlier scout
            # experimented with a quantitative Q5 reserve, but that reserve
            # has not been established and must not enter a proof certificate.
            V = v

            # Use the proved forest two-extension cap
            # d4 <= (1+3x)/5, which is strictly tighter than the old
            # constant 1559/3575 ceiling throughout n=28..34.
            d4_low = (2 + x) / 10
            d4_high = (1 + 3 * x) / 5
            d4 = d4_low + (d4_high - d4_low) * u
            # The source tensor's U coordinate is normalized to the older
            # constant ceiling, so convert this tighter coordinate exactly.
            U = (d4 - d4_low) / (1559 / 3575 - d4_low)
            c5 = (1 - d4) / x**2
            x5 = (1 / x) / c5
            a = order - 7
            q_low = (30 / x5 - 18 - 3) / (7 * a)
            q = q_low + 15 * V / (7 * a)
            c6 = c5 * (7 * a * q + 3) / 36
            c7 = a * q * c6 / 6
            c0 = 2 * w / ((order - 1) * (order - 2))
            attachment_floor = (order - 19) / (order - 12)
            absolute_floor = math.comb(order - 7, 7) * c0 / c7
            if absolute_floor >= attachment_floor:
                active_floor_counts["absolute_h7"] += 1
            else:
                active_floor_counts["attachment"] += 1
            z_floor = max(attachment_floor, absolute_floor)
            if z_floor > 1 + 1e-10:
                # Such a relaxed global coefficient point cannot be a tree,
                # because it contradicts h7<=c7.
                continue
            Z = z_floor + (1 - z_floor) * z
            point = (order, w, x, U, V, Z)
            result = evaluate(numerator_terms, numerator_degrees, point) / evaluate(
                denominator_terms, denominator_degrees, point
            )
            points += 1
            row = (result, order, B, A, u, v, z, surplus, w, x, q, c7, c0,
                   attachment_floor, absolute_floor, Z)
            if minimum is None or row < witness:
                minimum = result
                witness = row
            if result < 0:
                negative += 1
                negative_by_order[order] = negative_by_order.get(order, 0) + 1
                negative_rows.append(row)

    print(
        "DELTA2_JOINT_ABSOLUTE_H7_FLOOR "
        f"points={points} negatives={negative} minimum={minimum:.12g} "
        f"witness={witness} negative_by_order={negative_by_order} "
        f"active_floor_counts={active_floor_counts} "
        f"negative_rows={negative_rows} "
        f"source_terms={len(numerator_terms)}/{len(denominator_terms)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
