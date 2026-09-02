#!/usr/bin/env python3
"""Rigorous Arb certificate for a Galvin SCC counterexample.

This refutes only the strengthened scaled-curvature cascade (SCC), not
the ordinary pendant cascade, the three-quarters cascade, unimodality, or
Erdős Problem 993.

The coefficient identity

  A^m = sum_s binom(m,s) x^s
             (1+2x)^(t(m-s)) (1+x)^(ts)

has positive terms.  We sum s <= S with rigorous Arb balls and bound the
entire positive tail s > S by evaluating at x=1 and a geometric binomial
tail.  All four required coefficients are thereby enclosed without ever
constructing their roughly half-million-digit exact integer values.
"""

from __future__ import annotations

from flint import arb, ctx


ctx.prec = 320

T = 27
M = 47725
S_MAX = 60


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
        denominator = (
            2 * (j + 1) * (n1 - degree + j + 1)
        )
        relative_term *= arb(numerator) / denominator
        relative_sum += relative_term
    return first_log + relative_sum.log()


def reserve(previous: arb, current: arb, following: arb, rank: int) -> arb:
    return (
        rank * current * current
        + previous * current
        - (rank + 1) * previous * following
    )


def main() -> None:
    alpha_q = M * (T + 1) + 1
    cutoff = (2 * alpha_q + 1) // 3
    r = cutoff - 2
    ranks = (r - 1, r, r + 1, r + 2)
    population = T * M
    assert alpha_q == 1_336_301
    assert cutoff == 890_867
    assert r == 890_865

    log_two = arb(2).log()
    log_scale = log_comb(population, r) + r * log_two

    c_values: dict[int, arb] = {}
    tail_bounds: dict[int, arb] = {}
    for rank in ranks:
        truncated = arb(0)
        for special in range(S_MAX + 1):
            inner_log = inner_log_coefficient(
                T * (M - special),
                T * special,
                rank - special,
            )
            term_log = (
                log_comb(M, special)
                + inner_log
                - log_scale
            )
            truncated += term_log.exp()

        # Cauchy's positive-coefficient bound at the exact E^m saddle
        # for this rank.  This avoids the exponentially loose x=1 bound.
        x = arb(rank) / (2 * (population - rank))
        y = x * ((1 + x) / (1 + 2 * x)) ** T
        tail_ratio = (
            arb(M - S_MAX - 1) / (S_MAX + 2) * y
        )
        assert tail_ratio.upper() < 1
        first_omitted_log = (
            -rank * x.log()
            + population * (1 + 2 * x).log()
            + log_comb(M, S_MAX + 1)
            + (S_MAX + 1) * y.log()
            - log_scale
        )
        tail_upper = (
            first_omitted_log.exp() / (1 - tail_ratio)
        ).upper()
        # A symmetric error ball is a conservative enclosure of the
        # one-sided interval [0, tail_upper].
        tail_ball = arb(0, tail_upper)
        c_values[rank] = truncated + tail_ball
        tail_bounds[rank] = tail_upper

    def e_phase(rank: int) -> arb:
        source = rank - 1
        return (
            log_comb(population, source)
            + source * log_two
            - log_scale
        ).exp()

    def b(rank: int) -> arb:
        return c_values[rank] + e_phase(rank)

    bm = b(r - 1)
    b0 = b(r)
    bp = b(r + 1)
    bpp = b(r + 2)
    cm = c_values[r - 1]
    c0 = c_values[r]
    cp = c_values[r + 1]

    rooted_reserve = reserve(bm, b0, bp, r)
    q_previous = b0 + bm + cm
    q_current = bp + b0 + c0
    q_following = bpp + bp + cp
    terminal_reserve = reserve(
        q_previous, q_current, q_following, r + 1
    )
    print("rooted reserve enclosure:", rooted_reserve)
    print("terminal reserve enclosure:", terminal_reserve)
    assert rooted_reserve.lower() > 0
    assert terminal_reserve.lower() > 0

    scaled_left = (
        (r + 1) * terminal_reserve * bm * b0
    )
    scaled_right = (
        r * rooted_reserve * q_previous * q_current
    )
    scaled_difference = scaled_left - scaled_right
    scaled_ratio = scaled_left / scaled_right
    assert scaled_difference.upper() < 0
    assert scaled_ratio.upper() < 1
    leaf_occupancy = b0 / q_current
    assert leaf_occupancy.upper() < arb(1) / 2
    assert 3 * scaled_left.lower() > 2 * scaled_right.upper()

    cascade_left = (r + 1) * terminal_reserve * bm
    cascade_right = r * rooted_reserve * q_previous
    cascade_ratio = cascade_right / cascade_left
    assert cascade_left.lower() > cascade_right.upper()
    assert 3 * cascade_left.lower() > 4 * cascade_right.upper()

    print("PASS")
    print(f"t={T}, m={M}, alpha(Q)={alpha_q}, r={r}, cutoff={cutoff}")
    print("rigorous scaled-curvature ratio:", scaled_ratio)
    print("rigorous scaled-curvature difference:", scaled_difference)
    print("rigorous leaf occupancy:", leaf_occupancy)
    print("rigorous ordinary cascade right/left:", cascade_ratio)
    print(
        "largest rigorous omitted-tail bound:",
        max(tail_bounds.values(), key=lambda value: value.upper()),
    )


if __name__ == "__main__":
    main()
