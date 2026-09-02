#!/usr/bin/env python3
"""Verify exact Bernstein certificates for the rank-6 spider theorem.

The certificate domain is split into finitely many cells according to
three reserved arms.  On each cell, the remaining normalized arm mass is
a standard 3-simplex and s=1/(n-1) lies in [0,1/17].

Every calculation uses Fraction.  A nonnegative Bernstein coefficient
list is a rigorous continuous (hence integer-lattice) certificate.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from fractions import Fraction
from math import comb, factorial, prod

from derive_rank6_spider_cumulative_factors import (
    increment,
    strong_polynomial,
)
from explore_rank6_spider_aggregate_certificate import (
    verify_aggregate_formulas,
)
from scan_rank6_spider_cumulative_states import (
    ROOT_AXIS,
    root_feasible,
    states_of_weight,
    strong_value,
)


# Sparse polynomials in (b0,b1,b2,b3,s).
ZERO_EXPONENT = (0, 0, 0, 0, 0)


def add(left, right):
    out = defaultdict(Fraction)
    out.update(left)
    for exponent, coefficient in right.items():
        out[exponent] += coefficient
        if out[exponent] == 0:
            del out[exponent]
    return dict(out)


def scale(poly, coefficient):
    coefficient = Fraction(coefficient)
    if coefficient == 0:
        return {}
    return {
        exponent: coefficient * value
        for exponent, value in poly.items()
        if coefficient * value
    }


def multiply(left, right):
    out = defaultdict(Fraction)
    for left_exp, left_coefficient in left.items():
        for right_exp, right_coefficient in right.items():
            exponent = tuple(
                a + b for a, b in zip(left_exp, right_exp)
            )
            out[exponent] += left_coefficient * right_coefficient
    return {
        exponent: coefficient
        for exponent, coefficient in out.items()
        if coefficient
    }


def powers(poly, maximum):
    out = [{ZERO_EXPONENT: Fraction(1)}]
    for _ in range(maximum):
        out.append(multiply(out[-1], poly))
    return out


def monomial(axis, coefficient=1):
    exponent = [0] * 5
    exponent[axis] = 1
    return {tuple(exponent): Fraction(coefficient)}


def normalized_fractions(reserve):
    """Return sparse normalized M,T,U,R fractions on one cell."""
    total_reserve = sum(reserve)
    x = []
    for axis, amount in enumerate(reserve):
        # Xi = Bi + amount*s - total_reserve*s*Bi.
        value = monomial(axis)
        if amount:
            value = add(value, monomial(4, amount))
        cross = [0] * 5
        cross[axis] = 1
        cross[4] = 1
        value = add(
            value,
            {tuple(cross): Fraction(-total_reserve)},
        )
        x.append(value)

    g0 = x[0]
    g1 = scale(x[1], Fraction(1, 2))
    g2 = scale(x[2], Fraction(1, 3))
    m = add(add(g0, g1), g2)
    t = add(g1, g2)
    u = g2
    r = x[3]
    return (m, t, u, r)


def normalized_power_polynomial(source, reserve):
    degree = source.total_degree()
    fractions = normalized_fractions(reserve)
    maximum_powers = [
        max(powers_[axis] for powers_, _ in source.terms())
        for axis in range(4)
    ]
    fraction_powers = [
        powers(fraction, maximum)
        for fraction, maximum in zip(fractions, maximum_powers)
    ]

    out = defaultdict(Fraction)
    for source_powers, source_coefficient in source.terms():
        coefficient = Fraction(
            int(source_coefficient.p),
            int(source_coefficient.q),
        )
        s_power = degree - sum(source_powers)
        exponent = (0, 0, 0, 0, s_power)
        term = {exponent: coefficient}
        for axis, power in enumerate(source_powers):
            term = multiply(term, fraction_powers[axis][power])
        for term_exponent, term_coefficient in term.items():
            out[term_exponent] += term_coefficient
    return {
        exponent: coefficient
        for exponent, coefficient in out.items()
        if coefficient
    }


def compositions(total, parts):
    if parts == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for rest in compositions(total - first, parts - 1):
            yield (first,) + rest


def multichoose(upper, lower):
    out = 1
    for top, bottom in zip(upper, lower):
        if bottom > top:
            return 0
        out *= comb(top, bottom)
    return out


def bernstein_coefficients(
    poly,
    simplex_degree=None,
    interval_degree=None,
    weight_floor=17,
):
    actual_simplex_degree = max(sum(exponent[:4]) for exponent in poly)
    actual_interval_degree = max(exponent[4] for exponent in poly)
    simplex_degree = simplex_degree or actual_simplex_degree
    interval_degree = interval_degree or actual_interval_degree
    assert simplex_degree >= actual_simplex_degree
    assert interval_degree >= actual_interval_degree

    betas = list(compositions(simplex_degree, 4))
    coefficients = {
        (beta, level): Fraction(0)
        for beta in betas
        for level in range(interval_degree + 1)
    }
    for exponent, coefficient in poly.items():
        alpha = exponent[:4]
        alpha_degree = sum(alpha)
        s_power = exponent[4]
        # Replace s by v/weight_floor, where v is in [0,1].
        coefficient /= weight_floor**s_power
        # Multinomial(d; alpha, d-|alpha|), not merely C(d,|alpha|).
        # This is the denominator in the degree-d simplex Bernstein
        # coefficient of the monomial B**alpha.
        simplex_denominator = (
            factorial(simplex_degree)
            // (
                factorial(simplex_degree - alpha_degree)
                * prod(factorial(value) for value in alpha)
            )
        )
        interval_denominator = comb(interval_degree, s_power)
        for beta in betas:
            numerator = multichoose(beta, alpha)
            if not numerator:
                continue
            simplex_weight = Fraction(numerator, simplex_denominator)
            for level in range(s_power, interval_degree + 1):
                interval_weight = Fraction(
                    comb(level, s_power),
                    interval_denominator,
                )
                coefficients[(beta, level)] += (
                    coefficient * simplex_weight * interval_weight
                )
    return (
        coefficients,
        simplex_degree,
        interval_degree,
        actual_simplex_degree,
        actual_interval_degree,
    )


def bernstein_extrema(
    poly,
    simplex_degree=None,
    interval_degree=None,
    weight_floor=17,
):
    (
        coefficients,
        simplex_degree,
        interval_degree,
        actual_simplex_degree,
        actual_interval_degree,
    ) = bernstein_coefficients(
        poly,
        simplex_degree,
        interval_degree,
        weight_floor,
    )
    values = list(coefficients.values())
    minimum_key = min(coefficients, key=coefficients.get)
    return (
        coefficients[minimum_key],
        minimum_key,
        max(values),
        sum(value < 0 for value in values),
        len(values),
        actual_simplex_degree,
        actual_interval_degree,
    )


def evaluate_sparse(poly, point):
    total = Fraction(0)
    for exponent, coefficient in poly.items():
        term = coefficient
        for value, power in zip(point, exponent):
            term *= value**power
        total += term
    return total


def evaluate_source(source, point):
    total = Fraction(0)
    for exponent, coefficient in source.terms():
        term = Fraction(int(coefficient.p), int(coefficient.q))
        for value, power in zip(point, exponent):
            term *= value**power
        total += term
    return total


def self_test_transformations():
    """Independently evaluate both exact coordinate transformations."""
    source = strong_polynomial(0)
    reserve = (3, 0, 0, 0)
    normalized = normalized_power_polynomial(source, reserve)
    barycentric = (
        Fraction(1, 10),
        Fraction(2, 10),
        Fraction(3, 10),
        Fraction(4, 10),
    )
    s = Fraction(1, 20)
    reserve_total = sum(reserve)
    x = tuple(
        amount * s + (1 - reserve_total * s) * value
        for amount, value in zip(reserve, barycentric)
    )
    g0, g1, g2 = x[0], x[1] / 2, x[2] / 3
    normalized_state = (
        g0 + g1 + g2,
        g1 + g2,
        g2,
        x[3],
    )
    source_point = tuple(value / s for value in normalized_state)
    expected = s ** source.total_degree() * evaluate_source(
        source, source_point
    )
    actual = evaluate_sparse(normalized, barycentric + (s,))
    assert actual == expected

    weight_floor = 18
    (
        coefficients,
        simplex_degree,
        interval_degree,
        _,
        _,
    ) = bernstein_coefficients(
        normalized,
        weight_floor=weight_floor,
    )
    v = weight_floor * s
    reconstructed = Fraction(0)
    for (beta, level), coefficient in coefficients.items():
        simplex_basis = Fraction(
            factorial(simplex_degree),
            prod(factorial(value) for value in beta),
        )
        for value, power in zip(barycentric, beta):
            simplex_basis *= value**power
        interval_basis = (
            comb(interval_degree, level)
            * v**level
            * (1 - v) ** (interval_degree - level)
        )
        reconstructed += coefficient * simplex_basis * interval_basis
    assert reconstructed == actual


def arm_reserves(required_arm_type=None, extra_r=0):
    out = []
    for c0 in range(4):
        for c1 in range(4 - c0):
            c2 = 3 - c0 - c1
            counts = (c0, c1, c2)
            if (
                required_arm_type is not None
                and counts[required_arm_type] == 0
            ):
                continue
            out.append((c0, 2 * c1, 3 * c2, extra_r))
    return out


def targets():
    values = {
        label: strong_polynomial(axis)
        for label, axis in {
            "L1": 0,
            "L2": 1,
            "L3": 2,
            "L4+": 3,
        }.items()
    }
    base = values["L1"]
    return [
        # The virtual L1 expression is a common lower bound even when no
        # length-1 arm exists.  It is positive from W=n-1 >= 18.
        ("L1-virtual", base, arm_reserves(), 18),
        ("Delta-M", increment(base, 0), arm_reserves(), 17),
        ("Delta-T", increment(base, 1), arm_reserves(0), 17),
        ("Delta-U", increment(base, 2), arm_reserves(1), 17),
        ("Delta-R", increment(base, 3), arm_reserves(2), 17),
        ("L2-L1", values["L2"] - base, arm_reserves(1), 17),
        ("L3-L1", values["L3"] - base, arm_reserves(2), 17),
        (
            "L4+-L1",
            values["L4+"] - base,
            arm_reserves(2, extra_r=1),
            17,
        ),
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--simplex-degree",
        type=int,
        default=None,
        help="degree-elevate the simplex Bernstein basis",
    )
    parser.add_argument(
        "--interval-degree",
        type=int,
        default=None,
        help="degree-elevate the interval Bernstein basis",
    )
    args = parser.parse_args()

    aggregate_checks = verify_aggregate_formulas()
    print(
        "aggregate i4/i5 formulas against direct spider polynomials: "
        f"PASS ({aggregate_checks:,} arm partitions)"
    )

    order18 = []
    rooted_cases = 0
    for state in states_of_weight(17):
        for label in ROOT_AXIS:
            if root_feasible(state, label):
                order18.append((strong_value(state, label), state, label))
                rooted_cases += 1
    order18_minimum = min(order18)
    assert order18_minimum == (31256, (5, 2, 1, 9), "L1")
    assert rooted_cases == 449
    print(
        "order-18 rooted aggregate base: PASS "
        f"({rooted_cases} cases, minimum={order18_minimum})"
    )

    self_test_transformations()
    print("exact normalization/Bernstein reconstruction self-test: PASS")

    all_nonnegative = True
    for name, source, reserves, weight_floor in targets():
        target_minimum = None
        target_witness = None
        target_negatives = 0
        for reserve in reserves:
            normalized = normalized_power_polynomial(source, reserve)
            result = bernstein_extrema(
                normalized,
                args.simplex_degree,
                args.interval_degree,
                weight_floor,
            )
            minimum, key, _, negatives, count, actual_b, actual_s = result
            target_negatives += negatives
            if target_minimum is None or minimum < target_minimum:
                target_minimum = minimum
                target_witness = (
                    reserve,
                    key,
                    actual_b,
                    actual_s,
                    len(normalized),
                    weight_floor,
                )
        certified = target_negatives == 0
        all_nonnegative &= certified
        print(
            f"{name}: certified={certified} cells={len(reserves)} "
            f"minimum={target_minimum} negatives={target_negatives} "
            f"witness={target_witness}",
            flush=True,
        )
    print(
        "rank-6 strong rooted inequality for every spider of order >=18: "
        + ("CERTIFIED" if all_nonnegative else "NOT CERTIFIED")
    )
    return 0 if all_nonnegative else 1


if __name__ == "__main__":
    raise SystemExit(main())
