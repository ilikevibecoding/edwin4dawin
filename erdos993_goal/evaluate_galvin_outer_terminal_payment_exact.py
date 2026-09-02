#!/usr/bin/env python3
"""Evaluate one outer-rooted Galvin terminal payment point exactly.

Only the coefficients around the requested boundary rank are retained.
For large instances, the A^m phase uses the coefficient recurrence from

    A (A^m)' = m A' A^m.

If A=sum a_j x^j and p_n=[x^n]A^m, then

    n p_n = sum_(j>=1) ((m+1)j-n) a_j p_(n-j).

Since deg(A)=t+1, this needs only the previous t+1 coefficients.  The
E^m phase is the closed form (1+2x)^(tm).
"""

from __future__ import annotations

import argparse
import math
import sys
from collections import deque

from flint import fmpq, fmpz, fmpz_poly as Poly


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)

X = Poly([0, 1])


def stable_ratio(numerator: int, denominator: int) -> float:
    shift = max(
        0,
        max(abs(numerator).bit_length(), denominator.bit_length()) - 52,
    )
    return int(numerator >> shift) / int(denominator >> shift)


def power_coefficients_by_recurrence(
    base_coefficients: list[int],
    exponent: int,
    ranks: set[int],
    *,
    integer_backend: str,
) -> dict[int, int | fmpz]:
    maximum = max(ranks)
    degree = len(base_coefficients) - 1
    use_flint = integer_backend == "flint"
    one = fmpz(1) if use_flint else 1
    zero = fmpz(0) if use_flint else 0
    bases = (
        [fmpz(value) for value in base_coefficients]
        if use_flint
        else base_coefficients
    )
    recent = deque([one], maxlen=degree)
    found = {0: one} if 0 in ranks else {}
    for n in range(1, maximum + 1):
        total = zero
        available = len(recent)
        for j in range(1, min(degree, available) + 1):
            total += (
                ((exponent + 1) * j - n)
                * bases[j]
                * recent[-j]
            )
        value, remainder = divmod(total, n)
        assert remainder == 0
        assert value >= 0
        recent.append(value)
        if n in ranks:
            found[n] = value
    return found


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--t", type=int, required=True)
    ap.add_argument("--m", type=int, required=True)
    ap.add_argument("--offset", type=int, default=2)
    ap.add_argument(
        "--method",
        choices=("recurrence", "flint"),
        default="recurrence",
    )
    ap.add_argument(
        "--integer-backend",
        choices=("flint", "python"),
        default="flint",
        help="big-integer backend for the bounded-memory recurrence",
    )
    args = ap.parse_args()

    t = args.t
    m_parameter = args.m
    alpha_terminal = m_parameter * (t + 1) + 1
    cutoff = (2 * alpha_terminal + 1) // 3
    r = cutoff - args.offset
    assert r >= 1

    a_coefficients = [
        math.comb(t, rank) * (1 << rank)
        + (math.comb(t, rank - 1) if 1 <= rank <= t + 1 else 0)
        for rank in range(t + 2)
    ]
    needed_ranks = {r - 1, r, r + 1, r + 2}
    if args.method == "recurrence":
        root_deleted_coefficients = power_coefficients_by_recurrence(
            a_coefficients,
            m_parameter,
            needed_ranks,
            integer_backend=args.integer_backend,
        )
    else:
        a = Poly(a_coefficients)
        root_deleted = a.pow_trunc(m_parameter, r + 2)
        root_deleted_coefficients = {
            rank: int(root_deleted[rank]) for rank in needed_ranks
        }

    def c_coefficient(rank: int) -> int:
        return root_deleted_coefficients.get(rank, 0)

    def e_phase(rank: int) -> int:
        # x E^m contributes at rank `rank`.
        source_rank = rank - 1
        if not 0 <= source_rank <= t * m_parameter:
            return 0
        return math.comb(t * m_parameter, source_rank) << source_rank

    def b_coefficient(rank: int) -> int:
        return c_coefficient(rank) + e_phase(rank)

    bm = b_coefficient(r - 1)
    b = b_coefficient(r)
    bp = b_coefficient(r + 1)
    bpp = b_coefficient(r + 2)
    cm = c_coefficient(r - 1)
    c = c_coefficient(r)
    cp = c_coefficient(r + 1)
    cross = b * c - bp * cm
    gsb = r * b * b + bm * b - (r + 1) * bm * bp
    a_clear = 2 * b * b + b * cm + (r + 1) * cross
    lambda_clear = 2 * b * b + b * cm + 2 * (r + 1) * cross
    mean_clear = bm * a_clear - (b + cm) * gsb
    payment_num = mean_clear * mean_clear
    payment_den = (
        b * b * bm * (b + cm + bm) * lambda_clear
    )
    x_num = (b + cm) * gsb
    x_den = bm * a_clear
    s_num = bm * a_clear * a_clear
    s_den = b * b * (b + cm + bm) * lambda_clear

    def reserve(
        previous: int,
        current: int,
        following: int,
        rank: int,
    ) -> int:
        return (
            rank * current * current
            + previous * current
            - (rank + 1) * previous * following
        )

    once_previous = b + cm
    once_current = bp + c
    once_following = bpp + cp
    once_reserve = reserve(
        once_previous,
        once_current,
        once_following,
        r + 1,
    )

    terminal_previous = b + bm + cm
    terminal_current = bp + b + c
    terminal_following = bpp + bp + cp
    terminal_reserve = reserve(
        terminal_previous,
        terminal_current,
        terminal_following,
        r + 1,
    )
    rooted_reserve = reserve(bm, b, bp, r)
    root_deleted_reserve = reserve(cm, c, cp, r)
    cascade_left = (r + 1) * terminal_reserve * bm
    cascade_right = r * rooted_reserve * terminal_previous
    local_payment = payment_den - payment_num
    two_step_local_margin_num = (
        3 * local_payment * cm
        + 4
        * bm
        * terminal_previous
        * once_previous
        * r
        * root_deleted_reserve
        - once_previous
        * r
        * rooted_reserve
        * terminal_previous
        * cm
    )
    coefficient_growth_num = (r + 1) * terminal_current
    coefficient_growth_den = r * b
    curvature_ratio_num = terminal_reserve * bm * b
    curvature_ratio_den = (
        terminal_previous * terminal_current * rooted_reserve
    )
    scaled_curvature_margin = (
        (r + 1) * curvature_ratio_num - r * curvature_ratio_den
    )
    one_vertex_curvature_left = (
        (r + 1) * once_reserve * bm * b
    )
    one_vertex_curvature_right = (
        r * rooted_reserve * once_previous * once_current
    )
    lower_sandwich_clear = (
        once_current * b - bp * once_previous
    )
    upper_sandwich_clear = (
        b * once_previous - bm * once_current
    )
    q_once = fmpq(once_reserve, once_previous * once_current)
    q_rooted = fmpq(rooted_reserve, bm * b)
    curvature_surplus = (r + 1) * q_once - r * q_rooted
    u_ratio = fmpq(r * b, bm)
    w_ratio = fmpq((r + 1) * bp, b)
    v_ratio = fmpq((r + 1) * once_current, once_previous)
    likelihood_deficit = max(fmpq(0), w_ratio - v_ratio)
    x_ratio = u_ratio / r
    m_ratio = x_ratio + q_rooted - 1
    theta_ratio = fmpq(bm, bm + once_previous)
    compensation_left = (
        fmpq(r, r + 1) * v_ratio * q_rooted
        + fmpq(2, r + 1) * v_ratio * curvature_surplus
    )
    compensation_right = (
        2
        * theta_ratio
        * likelihood_deficit
        * (2 * m_ratio + likelihood_deficit)
    )
    ordinary_margin = cascade_left - cascade_right
    c12_total_over_same_num = (
        once_previous
        * (
            2 * ordinary_margin * b
            + r
            * (b - once_current)
            * rooted_reserve
            * terminal_previous
        )
    )
    c12_total_over_same_den = (
        2
        * (r + 1)
        * once_reserve
        * bm
        * terminal_previous
        * b
    )
    c12_fraction_num = (
        c12_total_over_same_den - c12_total_over_same_num
    )

    assert min(bm, b, a_clear, lambda_clear, payment_den) > 0
    print(
        f"t={t} m={m_parameter} order="
        f"{1 + m_parameter * (1 + 2 * t)} "
        f"alpha(Q)={alpha_terminal} r={r} cutoff={cutoff}"
    )
    print("payment_ratio", stable_ratio(payment_num, payment_den))
    print("x", stable_ratio(x_num, x_den))
    print("s", stable_ratio(s_num, s_den))
    print("local_payment_positive", payment_num < payment_den)
    print("once_extended_same_rank_reserve_positive", once_reserve > 0)
    print("terminal_reserve_positive", terminal_reserve > 0)
    print("root_deleted_reserve_positive", root_deleted_reserve > 0)
    print(
        "two_step_local_margin_positive",
        two_step_local_margin_num >= 0,
    )
    print(
        "two_step_local_margin_over_abs_local_terms",
        stable_ratio(
            two_step_local_margin_num,
            3 * payment_den * cm
            + 4
            * bm
            * terminal_previous
            * once_previous
            * r
            * abs(root_deleted_reserve)
            + once_previous
            * r
            * abs(rooted_reserve)
            * terminal_previous
            * cm,
        ),
    )
    print(
        "ordinary_cascade_right_over_left",
        stable_ratio(cascade_right, cascade_left),
    )
    print(
        "coefficient_growth_(r+1)q_(r+1)/(rB_r)",
        stable_ratio(coefficient_growth_num, coefficient_growth_den),
    )
    print(
        "curvature_ratio_sigma_Q/sigma_R",
        stable_ratio(curvature_ratio_num, curvature_ratio_den),
    )
    print(
        "scaled_curvature_ratio_(r+1)sigma_Q/(r sigma_R)",
        stable_ratio(
            (r + 1) * curvature_ratio_num,
            r * curvature_ratio_den,
        ),
    )
    print("scaled_curvature_positive", scaled_curvature_margin >= 0)
    print(
        "one_vertex_curvature_positive",
        one_vertex_curvature_left >= one_vertex_curvature_right,
    )
    print(
        "one_vertex_tau_T_over_tau_F",
        stable_ratio(
            one_vertex_curvature_left,
            one_vertex_curvature_right,
        ),
    )
    print("lower_sandwich_w_le_v", lower_sandwich_clear >= 0)
    print(
        "lower_sandwich_relative_margin",
        stable_ratio(
            lower_sandwich_clear,
            once_current * b,
        ),
    )
    print("upper_sandwich_v_le_ku_over_r", upper_sandwich_clear >= 0)
    print(
        "upper_sandwich_relative_margin",
        stable_ratio(
            upper_sandwich_clear,
            b * once_previous,
        ),
    )
    print(
        "curvature_likelihood_compensation_positive",
        compensation_left >= compensation_right,
    )
    print("ordinary_ratio_drop_M_nonnegative", m_ratio >= 0)
    print("ordinary_ratio_drop_M", float(m_ratio))
    print(
        "curvature_likelihood_compensation_right_over_left",
        float(compensation_right / compensation_left),
    )
    print(
        "c12_same_rank_fraction_needed",
        stable_ratio(c12_fraction_num, c12_total_over_same_den),
    )
    print(
        "coupled_product_growth_times_curvature",
        stable_ratio(
            coefficient_growth_num * curvature_ratio_num,
            coefficient_growth_den * curvature_ratio_den,
        ),
    )
    print(
        "three_quarters_cascade_positive",
        3 * cascade_left >= 4 * cascade_right,
    )
    print("coefficient_digits", len(str(bm)), len(str(b)), len(str(bp)))


if __name__ == "__main__":
    main()
