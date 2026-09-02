#!/usr/bin/env python3
"""Positive-term Galvin SCC locator using the rare-branch expansion.

For

  A=(1+2x)^t+x(1+x)^t,

expand

  A^m = sum_s binom(m,s) x^s
             (1+2x)^(t(m-s)) (1+x)^(ts).

At the two-thirds boundary only O(m(2/3)^t) special branches contribute,
so a small positive sum evaluates the local coefficient ratios even when
the exact coefficients have millions of digits.  This is reconnaissance,
not a certificate; exact replay remains mandatory for any claimed sign.
"""

from __future__ import annotations

import argparse

import mpmath as mp


def log_comb(n: int, k: int) -> mp.mpf:
    if not 0 <= k <= n:
        return mp.ninf
    return (
        mp.loggamma(n + 1)
        - mp.loggamma(k + 1)
        - mp.loggamma(n - k + 1)
    )


def logsumexp(values: list[mp.mpf]) -> mp.mpf:
    maximum = max(values)
    return maximum + mp.log(mp.fsum(mp.exp(value - maximum) for value in values))


def inner_log_coefficient(
    n1: int,
    n2: int,
    degree: int,
) -> mp.mpf:
    """log [x^degree](1+2x)^n1(1+x)^n2 by positive recurrence."""
    j_min = max(0, degree - n1)
    j_max = min(n2, degree)
    if j_min > j_max:
        return mp.ninf

    j = j_min
    e_degree = degree - j
    current = (
        log_comb(n2, j)
        + log_comb(n1, e_degree)
        + e_degree * mp.log(2)
    )
    logs = [current]
    while j < j_max:
        numerator = (n2 - j) * (degree - j)
        denominator = (
            2 * (j + 1) * (n1 - degree + j + 1)
        )
        current += mp.log(numerator) - mp.log(denominator)
        logs.append(current)
        j += 1
    return logsumexp(logs)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--t", type=int, required=True)
    ap.add_argument("--m", type=int, required=True)
    ap.add_argument("--offset", type=int, default=2)
    ap.add_argument(
        "--rank",
        type=int,
        default=None,
        help="evaluate this r directly instead of cutoff-offset",
    )
    ap.add_argument(
        "--order-sensitive-offset",
        type=int,
        default=None,
        help=(
            "set r=L_*(Q)-this value, where L_* is the "
            "order-sensitive Fisher--Ryan--Zykov cutoff"
        ),
    )
    ap.add_argument("--s-max", type=int, default=30)
    ap.add_argument("--dps", type=int, default=70)
    args = ap.parse_args()
    mp.mp.dps = args.dps

    t = args.t
    m = args.m
    alpha_q = m * (t + 1) + 1
    cutoff = (2 * alpha_q + 1) // 3
    order_q = 2 + m * (1 + 2 * t)
    order_sensitive_cutoff = (
        alpha_q * (order_q - 1) + alpha_q + order_q - 1
    ) // (alpha_q + order_q)
    if args.rank is not None:
        r = args.rank
    elif args.order_sensitive_offset is not None:
        r = (
            order_sensitive_cutoff
            - args.order_sensitive_offset
        )
    else:
        r = cutoff - args.offset
    ranks = (r - 1, r, r + 1, r + 2)
    population = t * m
    log_two = mp.log(2)

    def log_e_base(rank: int) -> mp.mpf:
        if not 0 <= rank <= population:
            return mp.ninf
        return log_comb(population, rank) + rank * log_two

    log_c: dict[int, mp.mpf] = {}
    tail_relative: dict[int, mp.mpf] = {}
    for rank in ranks:
        terms: list[mp.mpf] = []
        for special in range(0, min(args.s_max, m, rank) + 1):
            inner = inner_log_coefficient(
                t * (m - special),
                t * special,
                rank - special,
            )
            terms.append(log_comb(m, special) + inner)
        log_c[rank] = logsumexp(terms)
        tail_relative[rank] = mp.exp(terms[-1] - log_c[rank])

    log_e_phase = {
        rank: log_e_base(rank - 1) for rank in ranks
    }
    scale = log_c[r]

    def scaled(log_value: mp.mpf) -> mp.mpf:
        return mp.exp(log_value - scale)

    def c_value(rank: int) -> mp.mpf:
        return scaled(log_c[rank])

    def e_value(rank: int) -> mp.mpf:
        return scaled(log_e_phase[rank])

    def b_value(rank: int) -> mp.mpf:
        return c_value(rank) + e_value(rank)

    bm = b_value(r - 1)
    b = b_value(r)
    bp = b_value(r + 1)
    bpp = b_value(r + 2)
    cm = c_value(r - 1)
    c = c_value(r)
    cp = c_value(r + 1)

    def reserve(
        previous: mp.mpf,
        current: mp.mpf,
        following: mp.mpf,
        rank: int,
    ) -> mp.mpf:
        return (
            rank * current * current
            + previous * current
            - (rank + 1) * previous * following
        )

    rooted_reserve = reserve(bm, b, bp, r)
    q_previous = b + bm + cm
    q_current = bp + b + c
    q_following = bpp + bp + cp
    terminal_reserve = reserve(
        q_previous, q_current, q_following, r + 1
    )
    once_previous = b + cm
    once_current = bp + c
    once_following = bpp + cp
    once_reserve = reserve(
        once_previous, once_current, once_following, r + 1
    )
    sigma_root = rooted_reserve / (bm * b)
    sigma_once = once_reserve / (
        once_previous * once_current
    )
    sigma_q = terminal_reserve / (q_previous * q_current)
    scaled_ratio = (r + 1) * sigma_q / (r * sigma_root)
    leaf_occupancy = b / q_current
    coefficient_growth = (r + 1) * q_current / (r * b)
    coupled_product = coefficient_growth * sigma_q / sigma_root
    cascade_right_over_left = 1 / coupled_product

    ordinary_margin = (
        (r + 1) * bm * terminal_reserve
        - r * q_previous * rooted_reserve
    )
    c12_total_over_same_rank = (
        once_previous
        * (
            2 * ordinary_margin * b
            + r
            * (b - once_current)
            * rooted_reserve
            * q_previous
        )
        / (
            2
            * (r + 1)
            * once_reserve
            * bm
            * q_previous
            * b
        )
    )
    c12_same_rank_fraction_needed = (
        1 - c12_total_over_same_rank
    )
    u_ratio = r * b / bm
    w_ratio = (r + 1) * bp / b
    v_ratio = (r + 1) * once_current / once_previous
    curvature_surplus = (
        (r + 1) * sigma_once - r * sigma_root
    )
    lower_sandwich_margin = v_ratio - w_ratio
    upper_sandwich_margin = (
        (r + 1) * u_ratio / r - v_ratio
    )
    likelihood_deficit = max(
        mp.mpf("0"), -lower_sandwich_margin
    )
    x_ratio = u_ratio / r
    ordinary_ratio_drop = x_ratio + sigma_root - 1
    theta = bm / (bm + once_previous)
    compensation_left = (
        r * v_ratio * sigma_root / (r + 1)
        + 2 * v_ratio * curvature_surplus / (r + 1)
    )
    compensation_right = (
        2
        * theta
        * likelihood_deficit
        * (2 * ordinary_ratio_drop + likelihood_deficit)
    )

    print(
        f"t={t} m={m} r={r} cutoff={cutoff} "
        f"order_sensitive_cutoff={order_sensitive_cutoff} "
        f"scaled_curvature_ratio={mp.nstr(scaled_ratio, 22)}"
    )
    print(
        "scaled_curvature_margin_times_r",
        mp.nstr((scaled_ratio - 1) * r, 22),
    )
    print(
        "c12_same_rank_fraction_needed",
        mp.nstr(c12_same_rank_fraction_needed, 22),
    )
    print(
        "phase_ratio_e_over_c_at_r",
        mp.nstr(e_value(r) / c_value(r), 22),
    )
    print(
        "coefficient_growth",
        mp.nstr(coefficient_growth, 22),
    )
    print("sigma_root", mp.nstr(sigma_root, 22))
    print("sigma_terminal", mp.nstr(sigma_q, 22))
    print("sigma_once", mp.nstr(sigma_once, 22))
    print(
        "one_vertex_curvature_margin",
        mp.nstr(curvature_surplus, 22),
    )
    print(
        "lower_sandwich_margin",
        mp.nstr(lower_sandwich_margin, 22),
    )
    print(
        "upper_sandwich_margin",
        mp.nstr(upper_sandwich_margin, 22),
    )
    print(
        "ordinary_ratio_drop_M",
        mp.nstr(ordinary_ratio_drop, 22),
    )
    print(
        "CLC_right_over_left",
        mp.nstr(compensation_right / compensation_left, 22),
    )
    print(
        "leaf_occupancy_B_r/Q_(r+1)",
        mp.nstr(leaf_occupancy, 22),
    )
    print(
        "two_thirds_curvature_positive",
        3 * scaled_ratio >= 2,
    )
    print(
        "high_occupancy_SCC_package_positive",
        leaf_occupancy < mp.mpf("0.5") or scaled_ratio >= 1,
    )
    print(
        "ordinary_cascade_right_over_left",
        mp.nstr(cascade_right_over_left, 22),
    )
    print(
        "SM3_boundary_B_r/(3B_(r+1))",
        mp.nstr(b / (3 * bp), 22),
    )
    print(
        "three_quarters_positive",
        4 * cascade_right_over_left < 3,
    )
    print(
        "maximum_last_s_relative_contribution",
        mp.nstr(max(tail_relative.values()), 8),
    )


if __name__ == "__main__":
    main()
