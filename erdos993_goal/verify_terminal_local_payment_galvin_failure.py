#!/usr/bin/env python3
"""Exact replay of a negative terminal local payment in a Galvin tree.

This is not a counterexample to Erdős Problem 993 or to the pendant
cascade.  It refutes only the strategy of proving the two summands in
the exact local-payment decomposition separately.

For the outer-rooted Galvin tree T_(m,t),

    E=(1+2x)^t,
    A=E+x(1+x)^t,
    R=A^m+xE^m,
    R-q=A^m,

take t=22, m=9200 and attach q-p-l.  At the required prefix rank, the
isolated local payment is negative, while the same-rank compensation,
ordinary cascade, and three-quarters cascade are all positive.
"""

from __future__ import annotations

import math
import sys
from collections import deque


if hasattr(sys, "set_int_max_str_digits"):
    sys.set_int_max_str_digits(0)


def power_coefficients(
    base: list[int],
    exponent: int,
    ranks: set[int],
) -> dict[int, int]:
    """Use A(A^m)'=mA'A^m with only deg(A) retained coefficients."""
    degree = len(base) - 1
    recent = deque([1], maxlen=degree)
    found = {0: 1} if 0 in ranks else {}
    for n in range(1, max(ranks) + 1):
        total = sum(
            ((exponent + 1) * j - n) * base[j] * recent[-j]
            for j in range(1, min(degree, len(recent)) + 1)
        )
        value, remainder = divmod(total, n)
        assert remainder == 0
        assert value >= 0
        recent.append(value)
        if n in ranks:
            found[n] = value
    return found


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


def stable_ratio(numerator: int, denominator: int) -> float:
    shift = max(
        0,
        max(abs(numerator).bit_length(), denominator.bit_length()) - 52,
    )
    return (numerator >> shift) / (denominator >> shift)


def main() -> None:
    t = 22
    m_parameter = 9200
    alpha_r = m_parameter * (t + 1)
    alpha_q = alpha_r + 1
    cutoff = (2 * alpha_q + 1) // 3
    r = cutoff - 2
    k = r + 1
    assert alpha_q == 211601
    assert r == 141065
    assert k == 141066 < cutoff == 141067

    a_coefficients = [
        math.comb(t, rank) * (1 << rank)
        + (math.comb(t, rank - 1) if 1 <= rank <= t + 1 else 0)
        for rank in range(t + 2)
    ]
    needed = {r - 1, r, r + 1, r + 2}
    c_values = power_coefficients(
        a_coefficients,
        m_parameter,
        needed,
    )

    def e_phase(rank: int) -> int:
        source = rank - 1
        if not 0 <= source <= t * m_parameter:
            return 0
        return math.comb(t * m_parameter, source) << source

    def b(rank: int) -> int:
        return c_values[rank] + e_phase(rank)

    bm = b(r - 1)
    b0 = b(r)
    bp = b(r + 1)
    bpp = b(r + 2)
    cm = c_values[r - 1]
    c0 = c_values[r]
    cp = c_values[r + 1]

    cross = b0 * c0 - bp * cm
    local_reserve = (
        2 * b0 * b0 + b0 * cm + 2 * (r + 1) * cross
    )
    mean_numerator = (
        bm * ((r + 1) * (bp + c0) + b0)
        - r * b0 * (b0 + cm)
    )
    payment_denominator = (
        bm * (b0 + cm + bm) * local_reserve
    )
    local_payment = payment_denominator - mean_numerator**2
    assert local_payment < 0

    once_previous = b0 + cm
    once_current = bp + c0
    once_following = bpp + cp
    once_reserve = reserve(
        once_previous,
        once_current,
        once_following,
        k,
    )
    assert once_reserve > 0

    terminal_previous = b0 + bm + cm
    terminal_current = bp + b0 + c0
    terminal_following = bpp + bp + cp
    terminal_reserve = reserve(
        terminal_previous,
        terminal_current,
        terminal_following,
        k,
    )
    rooted_reserve = reserve(bm, b0, bp, r)
    root_deleted_reserve = reserve(cm, c0, cp, r)
    assert rooted_reserve > 0
    assert root_deleted_reserve > 0
    assert terminal_reserve > 0

    cascade_left = k * terminal_reserve * bm
    cascade_right = r * rooted_reserve * terminal_previous
    # This is the local obligation obtained by replacing the actual
    # once-extended reserve with only the inductive lower bound
    # (4/3)H_r(R-q).  The same witness refutes that tempting recursive
    # separation as well.
    two_step_local_margin_numerator = (
        3 * local_payment * cm
        + 4
        * bm
        * terminal_previous
        * once_previous
        * r
        * root_deleted_reserve
        - once_previous * cascade_right * cm
    )
    assert two_step_local_margin_numerator < 0
    coefficient_growth_num = k * terminal_current
    coefficient_growth_den = r * b0
    curvature_ratio_num = terminal_reserve * bm * b0
    curvature_ratio_den = (
        terminal_previous * terminal_current * rooted_reserve
    )
    scaled_curvature_margin = (
        k * curvature_ratio_num - r * curvature_ratio_den
    )
    assert cascade_left > cascade_right
    assert 3 * cascade_left > 4 * cascade_right
    assert (
        coefficient_growth_num
        * curvature_ratio_num
        * cascade_right
        == coefficient_growth_den
        * curvature_ratio_den
        * cascade_left
    )
    assert scaled_curvature_margin > 0

    print("PASS")
    print(
        f"t={t}, m={m_parameter}, |R|="
        f"{1 + m_parameter * (1 + 2 * t)}, "
        f"alpha(Q)={alpha_q}, k={k}<{cutoff}"
    )
    print(
        "local payment ratio M^2/D:",
        stable_ratio(mean_numerator**2, payment_denominator),
    )
    print(
        "negative payment / D:",
        stable_ratio(-local_payment, payment_denominator),
    )
    print(
        "ordinary cascade right/left:",
        stable_ratio(cascade_right, cascade_left),
    )
    print(
        "coefficient growth:",
        stable_ratio(coefficient_growth_num, coefficient_growth_den),
    )
    print(
        "curvature ratio sigma_Q/sigma_R:",
        stable_ratio(curvature_ratio_num, curvature_ratio_den),
    )
    print(
        "scaled curvature ratio:",
        stable_ratio(
            k * curvature_ratio_num,
            r * curvature_ratio_den,
        ),
    )
    print(
        "coupled product:",
        stable_ratio(
            coefficient_growth_num * curvature_ratio_num,
            coefficient_growth_den * curvature_ratio_den,
        ),
    )
    print(
        "three-quarters margin/left:",
        stable_ratio(
            3 * cascade_left - 4 * cascade_right,
            3 * cascade_left,
        ),
    )
    print(
        "two-step local margin positive:",
        two_step_local_margin_numerator > 0,
    )
    print(
        "coefficient digit lengths:",
        len(str(bm)),
        len(str(b0)),
        len(str(bp)),
    )


if __name__ == "__main__":
    main()
