#!/usr/bin/env python3
"""Rigorous Arb audit of the terminal comparisons in a Galvin tree.

The positive expansion

  ((1+2x)^t + x(1+x)^t)^m
    = sum_s binom(m,s) x^s
        (1+2x)^(t(m-s)) (1+x)^(ts)

is truncated at ``s_max``.  A Cauchy bound at the exact binomial saddle
encloses the whole omitted positive tail.  Thus every sign printed by
this program is rigorous despite the underlying coefficients having
millions of decimal digits.

This is a certificate about auxiliary inequalities, not a proof of
Erdos Problem 993.
"""

from __future__ import annotations

import argparse

from flint import arb, ctx


def ceil_div(a: int, b: int) -> int:
    return (a + b - 1) // b


def log_comb(n: int, k: int) -> arb:
    assert 0 <= k <= n
    return (
        arb(n + 1).lgamma()
        - arb(k + 1).lgamma()
        - arb(n - k + 1).lgamma()
    )


def inner_log_coefficient(n1: int, n2: int, degree: int) -> arb:
    """Rigorous log of [x^degree](1+2x)^n1(1+x)^n2."""
    j_min = max(0, degree - n1)
    j_max = min(n2, degree)
    assert j_min <= j_max

    e_degree = degree - j_min
    first_log = (
        log_comb(n2, j_min)
        + log_comb(n1, e_degree)
        + e_degree * arb(2).log()
    )
    relative_term = arb(1)
    relative_sum = arb(1)
    for j in range(j_min, j_max):
        numerator = (n2 - j) * (degree - j)
        denominator = 2 * (j + 1) * (n1 - degree + j + 1)
        relative_term *= arb(numerator) / denominator
        relative_sum += relative_term
    return first_log + relative_sum.log()


def reserve(
    previous: arb,
    current: arb,
    following: arb,
    rank: int,
) -> arb:
    return (
        rank * current * current
        + previous * current
        - (rank + 1) * previous * following
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--t", type=int, required=True)
    parser.add_argument("--m", type=int, required=True)
    parser.add_argument(
        "--offset",
        type=int,
        default=2,
        help="use r=L_*(Q)-offset; k=r+1 is the terminal rank",
    )
    parser.add_argument("--s-max", type=int, default=60)
    parser.add_argument("--precision", type=int, default=320)
    args = parser.parse_args()
    ctx.prec = args.precision

    t = args.t
    m = args.m
    population = t * m
    alpha_q = m * (t + 1) + 1
    order_q = 2 + m * (1 + 2 * t)
    cutoff = ceil_div(alpha_q * (order_q - 1), alpha_q + order_q)
    r = cutoff - args.offset
    ranks = (r - 1, r, r + 1, r + 2)
    assert 1 <= r < population

    log_two = arb(2).log()
    log_scale = log_comb(population, r) + r * log_two
    c_values: dict[int, arb] = {}
    tail_bounds: dict[int, arb] = {}

    for rank in ranks:
        truncated = arb(0)
        for special in range(args.s_max + 1):
            inner_log = inner_log_coefficient(
                t * (m - special),
                t * special,
                rank - special,
            )
            truncated += (
                log_comb(m, special)
                + inner_log
                - log_scale
            ).exp()

        saddle = arb(rank) / (2 * (population - rank))
        activity = (
            saddle
            * ((1 + saddle) / (1 + 2 * saddle)) ** t
        )
        tail_ratio = (
            arb(m - args.s_max - 1)
            / (args.s_max + 2)
            * activity
        )
        assert tail_ratio.upper() < 1
        first_omitted_log = (
            -rank * saddle.log()
            + population * (1 + 2 * saddle).log()
            + log_comb(m, args.s_max + 1)
            + (args.s_max + 1) * activity.log()
            - log_scale
        )
        tail_upper = (
            first_omitted_log.exp() / (1 - tail_ratio)
        ).upper()
        c_values[rank] = truncated + arb(0, tail_upper)
        tail_bounds[rank] = tail_upper

    def e_phase(rank: int) -> arb:
        source = rank - 1
        return (
            log_comb(population, source)
            + source * log_two
            - log_scale
        ).exp()

    def b_value(rank: int) -> arb:
        return c_values[rank] + e_phase(rank)

    bm = b_value(r - 1)
    b = b_value(r)
    bp = b_value(r + 1)
    bpp = b_value(r + 2)
    cm = c_values[r - 1]
    c = c_values[r]
    cp = c_values[r + 1]

    once_previous = b + cm
    once_current = bp + c
    once_following = bpp + cp
    rooted_reserve = reserve(bm, b, bp, r)
    once_reserve = reserve(
        once_previous, once_current, once_following, r + 1
    )
    assert rooted_reserve.lower() > 0
    assert once_reserve.lower() > 0

    q_rooted = rooted_reserve / (bm * b)
    q_once = once_reserve / (once_previous * once_current)
    u = r * b / bm
    w = (r + 1) * bp / b
    v = (r + 1) * once_current / once_previous

    curvature_surplus = (r + 1) * q_once - r * q_rooted
    lower_sandwich = v - w
    upper_sandwich = (r + 1) * u / r - v
    ordinary_ratio_drop = u / r + q_rooted - 1
    theta = bm / (bm + once_previous)

    assert upper_sandwich.lower() > 0
    assert ordinary_ratio_drop.lower() > 0
    if lower_sandwich.upper() < 0:
        likelihood_deficit = -lower_sandwich
    elif lower_sandwich.lower() >= 0:
        likelihood_deficit = arb(0)
    else:
        raise AssertionError("lower-sandwich sign was not resolved")

    compensation_left = (
        arb(r) / (r + 1) * v * q_rooted
        + arb(2) / (r + 1) * v * curvature_surplus
    )
    compensation_right = (
        2
        * theta
        * likelihood_deficit
        * (2 * ordinary_ratio_drop + likelihood_deficit)
    )
    compensation_margin = compensation_left - compensation_right
    assert compensation_left.lower() > 0
    assert compensation_margin.lower() > 0
    two_to_one_curvature = (
        r * q_rooted + 2 * curvature_surplus
    )
    weighted_likelihood_deficit = (
        v - r * likelihood_deficit
    )
    linear_compensation = (
        v * two_to_one_curvature
        - 2 * (r + 1) * r * likelihood_deficit
    )
    assert weighted_likelihood_deficit.lower() > 0
    assert linear_compensation.lower() > 0

    print("PASS")
    print(
        f"t={t} m={m} order(Q)={order_q} alpha(Q)={alpha_q} "
        f"L_*(Q)={cutoff} r={r} k={r + 1}"
    )
    print("A curvature surplus:", curvature_surplus)
    print("B lower-sandwich margin:", lower_sandwich)
    print("C upper-sandwich margin:", upper_sandwich)
    print("ordinary ratio drop M:", ordinary_ratio_drop)
    print("CLC left:", compensation_left)
    print("CLC right:", compensation_right)
    print(
        "CLC right/left:",
        compensation_right / compensation_left,
    )
    print(
        "weighted likelihood-deficit margin:",
        weighted_likelihood_deficit,
    )
    print("two-to-one curvature:", two_to_one_curvature)
    print("linear compensation margin:", linear_compensation)
    print(
        "largest omitted-tail enclosure:",
        max(tail_bounds.values(), key=lambda value: value.upper()),
    )


if __name__ == "__main__":
    main()
