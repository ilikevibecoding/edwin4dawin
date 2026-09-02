#!/usr/bin/env python3
"""Test the exact integer branch-weight tau bound against the n=28 Delta2 corner."""

from __future__ import annotations

import math

import sympy as sp

from probe_rank8_delta2_source_curvatures import build
from verify_rank7_terminal_broom_middle_differences import D4_CEILING


def tau_partition_bound(order: int, excess: int) -> tuple[int, tuple[int, ...]]:
    best = -1
    witness: tuple[int, ...] = ()

    def visit(remaining: int, maximum: int, weights: tuple[int, ...]) -> None:
        nonlocal best, witness
        if remaining == 0:
            branch_count = len(weights)
            weight_sum = sum(weights)
            if not weights or branch_count + weight_sum > order - 2:
                return
            largest = weights[0]
            b3 = sum((weight + 1) * weight * (weight - 1) // 6 for weight in weights)
            bound = 3 * excess + b3 + largest * (weight_sum - largest)
            if bound > best:
                best, witness = bound, weights
            return
        for weight in range(maximum, 0, -1):
            cost = weight * (weight + 1) // 2
            if cost <= remaining:
                visit(remaining - cost, weight, weights + (weight,))

    visit(excess, int(math.isqrt(2 * excess)) + 1, ())
    assert best >= 0
    return best, witness


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

    order = 28
    negative = []
    minimum = None
    minimum_row = None
    for excess in range(6, 51):
        tau, weights = tau_partition_bound(order, excess)
        c3 = math.comb(order - 2, 3) + excess
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
        if result < 0:
            negative.append(excess)
        row = (result, excess, tau, weights)
        if minimum is None or result < minimum:
            minimum, minimum_row = result, row
        print("E", excess, "TAU_MAX", tau, "WEIGHTS", weights, "VALUE", result, flush=True)
    print("NEGATIVE", negative, flush=True)
    print("MINIMUM", minimum_row, flush=True)


if __name__ == "__main__":
    main()
