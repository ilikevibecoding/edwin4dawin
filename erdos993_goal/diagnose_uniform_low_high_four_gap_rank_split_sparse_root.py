#!/usr/bin/env python3
"""Cancellation-free sparse check of rank-split four-gap reserves."""

from __future__ import annotations

import argparse
import math
from functools import lru_cache

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from explore_uniform_low_high_four_gap_symbolic_payments_root import CACHE, load_rows


ZERO = (0, 0, 0)


def poly_constant(value):
    return {} if value == 0 else {ZERO: QQ(value)}


def poly_variable(index):
    monomial = [0, 0, 0]
    monomial[index] = 1
    return {tuple(monomial): QQ.one}


def poly_add(*values):
    result = {}
    for value in values:
        for monomial, coefficient in value.items():
            result[monomial] = result.get(monomial, QQ.zero) + coefficient
            if result[monomial] == 0:
                del result[monomial]
    return result


def poly_scale(value, scalar):
    scalar = QQ(scalar)
    return {
        monomial: coefficient * scalar
        for monomial, coefficient in value.items()
        if coefficient * scalar != 0
    }


def poly_multiply(left, right):
    result = {}
    for first, first_coefficient in left.items():
        for second, second_coefficient in right.items():
            monomial = tuple(first[index] + second[index] for index in range(3))
            result[monomial] = (
                result.get(monomial, QQ.zero)
                + first_coefficient * second_coefficient
            )
            if result[monomial] == 0:
                del result[monomial]
    return result


def poly_power(value, exponent):
    result = poly_constant(1)
    base = value
    power = exponent
    while power:
        if power & 1:
            result = poly_multiply(result, base)
        power >>= 1
        if power:
            base = poly_multiply(base, base)
    return result


def transform_polynomial(value, images):
    maximums = [0, 0, 0]
    for monomial, _ in value.terms():
        for index, exponent in enumerate(monomial):
            maximums[index] = max(maximums[index], exponent)
    powers = []
    for image, maximum in zip(images, maximums):
        row = [poly_constant(1)]
        for _ in range(maximum):
            row.append(poly_multiply(row[-1], image))
        powers.append(row)
    result = {}
    for monomial, coefficient in value.terms():
        term = poly_constant(coefficient)
        for index, exponent in enumerate(monomial):
            term = poly_multiply(term, powers[index][exponent])
        result = poly_add(result, term)
    return result


def transform_fraction(value, images):
    return (
        transform_polynomial(value.numer, images),
        transform_polynomial(value.denom, images),
    )


def sign_summary(value):
    coefficients = list(value.values())
    negatives = sum(coefficient < 0 for coefficient in coefficients)
    origin = value.get(ZERO, QQ.zero)
    if not coefficients:
        status = "zero"
    elif negatives:
        status = "mixed"
    elif origin > 0:
        status = "positive"
    else:
        status = "nonnegative"
    return {
        "status": status,
        "terms": len(coefficients),
        "negative_terms": negatives,
        "minimum": str(min(coefficients)) if coefficients else "0",
        "origin": str(origin),
    }


def rising_polynomial(u, degree):
    result = poly_constant(1)
    for offset in range(degree):
        result = poly_multiply(result, poly_add(u, poly_constant(offset)))
    return poly_scale(result, QQ(1, math.factorial(degree)))


def decay_denominator(u, complement, total, order):
    result = {}
    for degree in range(order + 1):
        term = poly_multiply(
            rising_polynomial(u, degree),
            poly_power(complement, degree),
        )
        term = poly_multiply(term, poly_power(total, order - degree))
        result = poly_add(result, term)
    return result


def reserve_numerator(
    beta, gamma, delta, N, M, degree, images, u, decay_order,
):
    beta_numerator, beta_denominator = transform_fraction(beta, images)
    gamma_numerator, gamma_denominator = transform_fraction(gamma, images)
    delta_numerator, delta_denominator = transform_fraction(delta, images)
    assert 0 <= decay_order <= degree
    total = poly_add(N, M)
    N_power = poly_power(N, degree)
    M_power = poly_power(M, degree)
    total_power = poly_power(total, degree - decay_order)
    left_decay = decay_denominator(u, M, total, decay_order)
    right_decay = decay_denominator(u, N, total, decay_order)
    first = poly_multiply(
        beta_numerator,
        poly_multiply(gamma_denominator, delta_denominator),
    )
    first = poly_multiply(
        first,
        poly_multiply(total_power, poly_multiply(left_decay, right_decay)),
    )
    second = poly_multiply(
        gamma_numerator,
        poly_multiply(beta_denominator, delta_denominator),
    )
    second = poly_multiply(second, poly_multiply(N_power, right_decay))
    third = poly_multiply(
        delta_numerator,
        poly_multiply(beta_denominator, gamma_denominator),
    )
    third = poly_multiply(third, poly_multiply(M_power, left_decay))
    numerator = poly_add(first, poly_scale(second, -1), poly_scale(third, -1))
    denominator_summaries = {
        "beta": sign_summary(beta_denominator),
        "gamma": sign_summary(gamma_denominator),
        "delta": sign_summary(delta_denominator),
    }
    return numerator, denominator_summaries


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=int, default=2)
    parser.add_argument("--threshold", type=int, default=32)
    parser.add_argument("--chart", choices=("ordinary", "scaled", "high"), default="ordinary")
    parser.add_argument("--decay-order", type=int, choices=(0, 1, 2, 3), default=0)
    parser.add_argument("--drop-delta", action="store_true")
    parser.add_argument("--drop-gamma", action="store_true")
    parser.add_argument("--use-delta-lower-bound", action="store_true")
    parser.add_argument("--use-delta-lower-bound-drop-gamma", action="store_true")
    arguments = parser.parse_args()
    assert arguments.threshold >= 8
    assert CACHE.exists()
    F, k, x, y = field("k,x,y", QQ)
    rows = load_rows(F)
    keys = sorted({key for row in rows.values() for key in row if key[0] >= 1})
    key = keys[arguments.index - 1]

    def coefficient(product):
        return rows[product].get(key, F.zero)

    assert sum((
        arguments.drop_delta,
        arguments.drop_gamma,
        arguments.use_delta_lower_bound,
        arguments.use_delta_lower_bound_drop_gamma,
    )) <= 1
    beta = coefficient(("T", "R"))
    gamma = -coefficient(("L", "R"))
    delta = -coefficient(("R", "R"))
    if arguments.use_delta_lower_bound or arguments.use_delta_lower_bound_drop_gamma:
        N_field, M_field = k + x, k + y
        paired = (
            (k - 1) * N_field / 2
            * (1 / (x + y + k + 2) + 1 / (x + y + 2 * k))
        )
        beta = beta - delta + delta * paired
        delta = F.zero
        if arguments.use_delta_lower_bound_drop_gamma:
            gamma = F.zero
    elif arguments.drop_delta:
        delta = F.zero
    elif arguments.drop_gamma:
        gamma = F.zero
    u, xv, gap = (poly_variable(index) for index in range(3))
    K = poly_add(u, poly_constant(arguments.threshold))
    X = xv
    N = poly_add(K, X)
    if arguments.chart == "ordinary":
        Y = poly_add(X, gap)
    elif arguments.chart == "scaled":
        Y = poly_add(X, poly_multiply(gap, N))
    else:
        Y = xv
        X = poly_add(Y, gap)
        N = poly_add(K, X)
    M = poly_add(K, Y)
    if arguments.use_delta_lower_bound_drop_gamma:
        numerator, denominator = transform_fraction(beta, (K, X, Y))
        denominator_summaries = {"effective_beta": sign_summary(denominator)}
    else:
        numerator, denominator_summaries = reserve_numerator(
            beta, gamma, delta, N, M, arguments.threshold - 1, (K, X, Y),
            u, arguments.decay_order,
        )
    print("KEY", key, flush=True)
    print(
        "THRESHOLD", arguments.threshold, "CHART", arguments.chart,
        "DECAY_ORDER", arguments.decay_order,
        "DROP_DELTA", arguments.drop_delta,
        "DROP_GAMMA", arguments.drop_gamma,
        "USE_DELTA_LOWER_BOUND", arguments.use_delta_lower_bound,
        "USE_DELTA_LOWER_BOUND_DROP_GAMMA",
        arguments.use_delta_lower_bound_drop_gamma, flush=True,
    )
    print("NUMERATOR", sign_summary(numerator), flush=True)
    print("DENOMINATORS", denominator_summaries, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
