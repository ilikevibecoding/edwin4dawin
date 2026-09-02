#!/usr/bin/env python3
"""Sparse exact route probe for hub-distance-six double brooms."""

from __future__ import annotations

from math import factorial
from time import perf_counter

from sympy.polys.domains import QQ
from sympy.polys.fields import field


DISTANCE = 6


def falling(value, rank: int):
    result = 1
    for offset in range(rank):
        result *= value - offset
    return result


def C(value, rank: int):
    if rank < 0:
        return 0
    return falling(value, rank) / (value * 0 + factorial(rank))


def core_terms(distance: int, a, b):
    """Return F/Z terms (category, x-shift, multiplicative weight)."""
    f_terms = []
    z_terms = []
    vertices = distance + 1
    for mask in range(1 << vertices):
        size = mask.bit_count()
        core_edges = sum(
            bool(mask & (1 << vertex)) and bool(mask & (1 << (vertex + 1)))
            for vertex in range(distance)
        )
        left_selected = bool(mask & 1)
        right_selected = bool(mask & (1 << distance))
        if core_edges == 0:
            category = (
                "none" if left_selected and right_selected
                else "b" if left_selected
                else "a" if right_selected
                else "n"
            )
            f_terms.append((category, size, 1))

        left_states = (
            ((0, 0, 1), (1, 1, a)) if left_selected
            else ((0, 0, 1),)
        )
        right_states = (
            ((0, 0, 1), (1, 1, b)) if right_selected
            else ((0, 0, 1),)
        )
        for left_shift, left_edges, left_weight in left_states:
            for right_shift, right_edges, right_weight in right_states:
                if core_edges + left_edges + right_edges != 1:
                    continue
                category = (
                    "none" if left_selected and right_selected
                    else "b" if left_selected
                    else "a" if right_selected
                    else "n"
                )
                z_terms.append((
                    category,
                    size + left_shift + right_shift,
                    left_weight * right_weight,
                ))
    return f_terms, z_terms


def fixed_coefficient(terms, rank: int, a, b):
    n = a + b
    total = 0
    for category, shift, weight in terms:
        residual = rank - shift
        if residual < 0:
            continue
        if category == "n":
            total += weight * C(n, residual)
        elif category == "a":
            total += weight * C(a, residual)
        elif category == "b":
            total += weight * C(b, residual)
        elif residual == 0:
            total += weight
    return total


def binomial_ratio(side, target, shift: int):
    """C(side,target-shift)/C(side,target-2)."""
    difference = 2 - shift
    result = 1
    if difference >= 0:
        for step in range(1, difference + 1):
            result *= (side - target + 3 - step) / (target - 2 + step)
    else:
        for step in range(-difference):
            result *= (target - 2 - step) / (side - target + 3 + step)
    return result


def normalized_coefficient(terms, target, a, b, rho, tau):
    n = a + b
    total = 0
    for category, shift, weight in terms:
        if category == "n":
            total += weight * binomial_ratio(n, target, shift)
        elif category == "a":
            total += weight * rho * binomial_ratio(a, target, shift)
        elif category == "b":
            total += weight * tau * binomial_ratio(b, target, shift)
        else:
            # The main charts are chosen above every finite-core shift.
            continue
    return total


def anchor(f_terms, z_terms, a, b):
    n = a + b
    order = n + DISTANCE + 1
    f2 = fixed_coefficient(f_terms, 2, a, b)
    f3 = fixed_coefficient(f_terms, 3, a, b)
    z2 = fixed_coefficient(z_terms, 2, a, b)
    z3 = fixed_coefficient(z_terms, 3, a, b)
    z4 = fixed_coefficient(z_terms, 4, a, b)
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = p0 * c0 - f2 * r0
    return f2, p0, r0, c0, determinant


def normalized_delta(f_terms, z_terms, a, b, target, rho, tau):
    f2, p0, r0, c0, determinant = anchor(f_terms, z_terms, a, b)
    fj = normalized_coefficient(f_terms, target, a, b, rho, tau)
    fprev = normalized_coefficient(f_terms, target - 1, a, b, rho, tau)
    fnext = normalized_coefficient(f_terms, target + 1, a, b, rho, tau)
    znext = normalized_coefficient(z_terms, target + 1, a, b, rho, tau)
    return (
        (target + 1) * f2 * determinant * (fnext + 2 * fj + fprev)
        + f2 * p0 * (
            (target + 1) * fj * (c0 + r0)
            - 3 * (p0 + f2) * (znext + 2 * fj)
        )
    )


def fixed_delta(f_terms, z_terms, a, b, target: int):
    f2, p0, r0, c0, determinant = anchor(f_terms, z_terms, a, b)
    fj = fixed_coefficient(f_terms, target, a, b)
    fprev = fixed_coefficient(f_terms, target - 1, a, b)
    fnext = fixed_coefficient(f_terms, target + 1, a, b)
    znext = fixed_coefficient(z_terms, target + 1, a, b)
    return (
        (target + 1) * f2 * determinant * (fnext + 2 * fj + fprev)
        + f2 * p0 * (
            (target + 1) * fj * (c0 + r0)
            - 3 * (p0 + f2) * (znext + 2 * fj)
        )
    )


def stats(label, expression, seconds):
    numerator_terms = expression.numer.terms()
    denominator_terms = expression.denom.terms()
    negatives = [
        (monomial, coefficient)
        for monomial, coefficient in numerator_terms
        if coefficient < 0
    ]
    print(label, {
        "numerator_terms": len(numerator_terms),
        "denominator_terms": len(denominator_terms),
        "degree": max(sum(monomial) for monomial, _ in numerator_terms),
        "negative": len(negatives),
        "minimum": str(min(coefficient for _, coefficient in numerator_terms)),
        "denominator_negative": sum(
            coefficient < 0 for _, coefficient in denominator_terms
        ),
        "negative_terms": [
            (monomial, str(coefficient)) for monomial, coefficient in negatives[:30]
        ],
        "seconds": round(seconds, 3),
    }, flush=True)


def main():
    # Exact low seams, including all finite-core terms.
    for target in range(4, 13):
        _, q, v = field("q,v", QQ)
        b = q + target - 2
        a = q + v + target - 2
        f_terms, z_terms = core_terms(DISTANCE, a, b)
        start = perf_counter()
        expression = fixed_delta(f_terms, z_terms, a, b, target)
        stats(f"j{target}_middle_exact", expression, perf_counter() - start)

    # Main middle starts at j=6, beyond every category-none core term.
    _, q, v, y = field("q,v,y", QQ)
    target = y + 6
    b = q + y + 4
    a = q + v + y + 4
    n = a + b
    selected = target - 4
    u_a2 = falling(a, 2) / falling(n, 2)
    u_b2 = falling(b, 2) / falling(n, 2)
    cap_a = u_a2 * (a - 2) / ((a - 2) + selected * b)
    cap_b = u_b2 * (b - 2) / ((b - 2) + selected * a)
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    print(
        "none_shift_maxima",
        max(shift for category, shift, _ in f_terms if category == "none"),
        max(shift for category, shift, _ in z_terms if category == "none"),
        flush=True,
    )
    for label, rho, tau in (
        ("middle_origin_jge6", 0, 0),
        ("middle_large_cap_jge6", cap_a, 0),
        ("middle_small_cap_jge6", 0, cap_b),
        ("middle_both_caps_jge6", cap_a, cap_b),
    ):
        start = perf_counter()
        expression = normalized_delta(f_terms, z_terms, a, b, target, rho, tau)
        stats(label, expression, perf_counter() - start)

    # Main tail formulas are used only when q+y=j-4>=2, but positivity is
    # tested on the containing full orthant.
    _, q, x, y = field("q,x,y", QQ)
    b = q + 1
    target = q + y + 4
    a = x + y + 1
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    start = perf_counter()
    expression = normalized_delta(f_terms, z_terms, a, b, target, 0, 0)
    stats("tail_lower_jge6", expression, perf_counter() - start)

    _, q, s, y = field("q,s,y", QQ)
    b = q + 1
    target = q + y + 4
    a = q + y + s + 2
    n = a + b
    selected = target - 4
    u_a2 = falling(a, 2) / falling(n, 2)
    cap_a = u_a2 * (a - 2) / ((a - 2) + selected * b)
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    start = perf_counter()
    expression = normalized_delta(f_terms, z_terms, a, b, target, cap_a, 0)
    stats("tail_upper_cap_jge6", expression, perf_counter() - start)


if __name__ == "__main__":
    main()
