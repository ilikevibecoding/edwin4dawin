#!/usr/bin/env python3
"""Canonical-field exploration of left gap-1 slack over the zero face."""

from __future__ import annotations

import math

from sympy.polys.domains import QQ
from sympy.polys.fields import field


BASES = ("T", "L", "R")
PRODUCTS = (
    ("T", "T"), ("T", "L"), ("T", "R"),
    ("L", "L"), ("L", "R"), ("R", "R"),
)


def form(row):
    return row[1] ** 2 - row[0] * row[2] - row[0] * row[1]


def cross(first, second):
    return (
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def product_row(first, second, whole, tail, capacity):
    if first == second:
        return capacity * form(whole[first]) + cross(whole[first], tail[first])
    return (
        capacity * cross(whole[first], whole[second])
        + cross(whole[first], tail[second])
        + cross(whole[second], tail[first])
    )


def add(*rows):
    return {
        basis: tuple(sum(row[basis][index] for row in rows) for index in range(3))
        for basis in BASES
    }


def scale(row, scalar):
    return {
        basis: tuple(scalar * value for value in row[basis])
        for basis in BASES
    }


def promote(target, value):
    return target.from_expr(value.as_expr()) if hasattr(value, "as_expr") else target(value)


def outer_coefficients(value, coefficient_field):
    if value == 0:
        return [coefficient_field.zero]
    assert value.denom.degree() == 0
    denominator = value.denom[(0,)]
    result = [coefficient_field.zero for _ in range(value.numer.degree() + 1)]
    for (power,), coefficient in value.numer.terms():
        result[power] = coefficient / denominator
    return result


def sign_counts(value):
    numerator = [coefficient for _, coefficient in value.numer.terms()]
    denominator = [coefficient for _, coefficient in value.denom.terms()]
    return (
        len(numerator), sum(coefficient < 0 for coefficient in numerator),
        min(numerator), len(denominator),
        sum(coefficient < 0 for coefficient in denominator), min(denominator),
    )


def main() -> int:
    F, k, x, y = field("k,x,y", QQ)
    N, M = k + x, k + y
    zero = (F.zero,) * 3
    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    whole_zero = {
        "T": tuple((N + 1) * (M + 1) * value / (N * M)
                   for value in (1, rs, rs * (rs - 1))),
        "L": tuple(-(N + 1) * value / (N * M)
                   for value in (1, rl, rl * (rl - 1))),
        "R": tuple(-(M + 1) * value / (N * M)
                   for value in (1, rr, rr * (rr - 1))),
    }
    left_previous = (N + 1) / N
    removed = {
        "T": zero,
        "L": zero,
        "R": (
            (M + 1) / M * (
                1 + (k - 1) * (N + 1) / (y + 2)
                + (k - 1) * (k - 2) * (N**2 - 1)
                / (2 * (y + 2) * (y + 3))
            ),
            (M + 1) / M * (
                y + 1 + k * (N + 1)
                + k * (k - 1) * (N**2 - 1) / (2 * (y + 2))
            ),
            (M + 1) / M * (
                y * (y + 1) + (k + 1) * (N + 1) * (y + 1)
                + k * (k + 1) * (N**2 - 1) / 2
            ),
        ),
    }
    tail_zero = add(whole_zero, scale(removed, -1))
    right_previous = (M + 1) / M
    right_high = {
        "T": zero,
        "L": zero,
        "R": (
            right_previous,
            right_previous * (y + 1),
            right_previous * y * (y + 1),
        ),
    }
    prior = (
        right_previous / (y + 2),
        right_previous,
        right_previous * (y + 1),
    )
    first = {
        "T": zero,
        "L": zero,
        "R": tuple((k - 1 + index) * prior[index] for index in range(3)),
    }
    remainder = add(
        whole_zero, scale(right_high, -1), scale(first, -(N + 1))
    )

    S, s = field("s", F)
    lift = lambda row: {
        basis: tuple(promote(S, value) for value in row[basis])
        for basis in BASES
    }
    whole_zero_s = lift(whole_zero)
    tail_zero_s = lift(tail_zero)
    right_high_s, first_s, remainder_s = map(lift, (right_high, first, remainder))
    N_s = promote(S, N)
    D = N_s**2 - 1
    multiplier = (D + 2 * N_s * s + s**2) / D
    whole = add(
        right_high_s,
        scale(first_s, N_s + 1 + s),
        scale(remainder_s, multiplier),
    )
    tail = scale(tail_zero_s, multiplier)

    rows = {
        product: outer_coefficients(
            product_row(*product, whole, tail, N_s - 2), F
        )
        for product in PRODUCTS
    }
    assert max(len(row) for row in rows.values()) == 5
    G, u, xg, yg = field("u,x,y", QQ)
    H, uh, yh, zh = field("u,y,z", QQ)
    J, ul, xl, zl = field("u,x,z", QQ)

    def shifted(value):
        return G.from_expr(value.as_expr().subs({
            k.as_expr(): u.as_expr() + 8,
            x.as_expr(): xg.as_expr(),
            y.as_expr(): yg.as_expr(),
        }))

    def high(value):
        return H.from_expr(value.as_expr().subs({
            k.as_expr(): uh.as_expr() + 8,
            x.as_expr(): yh.as_expr() + zh.as_expr(),
            y.as_expr(): yh.as_expr(),
        }))

    def low(value):
        return J.from_expr(value.as_expr().subs({
            k.as_expr(): ul.as_expr() + 8,
            x.as_expr(): xl.as_expr(),
            y.as_expr(): xl.as_expr() + zl.as_expr(),
        }))

    def coefficient(product, degree):
        row = rows[product]
        return row[degree] if degree < len(row) else F.zero

    for degree in range(1, 5):
        print("DEGREE", degree, flush=True)
        for product in PRODUCTS:
            value = coefficient(product, degree)
            if value != 0:
                print(product, sign_counts(shifted(value)), flush=True)
        alpha = coefficient(("T", "L"), degree)
        beta = coefficient(("T", "R"), degree)
        epsilon = coefficient(("L", "L"), degree)
        gamma = -coefficient(("L", "R"), degree)
        delta = -coefficient(("R", "R"), degree)
        U3 = sum(
            math.prod(k - 1 - index for index in range(power))
            * (M / N) ** power / math.factorial(power)
            for power in range(4)
        )
        V3 = sum(
            math.prod(k - 1 - index for index in range(power))
            * (N / M) ** power / math.factorial(power)
            for power in range(4)
        )
        reciprocal_union = (k - 1) * N / (x + y + k + 2)
        reciprocal_pair_union = (
            (k - 1) * N / 2
            * (1 / (x + y + k + 2) + 1 / (x + y + 2 * k))
        )
        candidates = {
            "alpha_plus_epsilon": alpha + epsilon,
            "beta_minus_delta": beta - delta,
            "alpha_U3_minus_gamma": alpha * U3 - gamma,
            "beta_V3_minus_delta": beta * V3 - delta,
            "beta_V3_minus_gamma_minus_delta": beta * V3 - gamma - delta,
        }
        for label, value in candidates.items():
            print("CANDIDATE", label, sign_counts(shifted(value)), flush=True)
        regional = {
            "high_beta": high(beta),
            "high_delta": high(delta),
            "high_reserve": high(beta * U3 - gamma - delta),
            "high_drop_delta": high(beta * U3 - gamma),
            "high_drop_gamma": high(beta * U3 - delta),
            "low_beta": low(beta),
            "low_delta": low(delta),
            "low_reserve": low(beta * V3 - gamma - delta),
            "low_gamma_power7_reserve": low(
                beta * V3 - delta - gamma * (N / M) ** 7
            ),
            "low_unit_gamma_power7": low(
                beta - delta - gamma * (N / M) ** 7
            ),
            "low_drop_gamma": low(beta * V3 - delta),
            "low_reciprocal_union_drop_gamma": low(
                beta - delta + delta * reciprocal_union
            ),
            "low_reciprocal_union_gamma_power7": low(
                beta - delta + delta * reciprocal_union
                - gamma * (N / M) ** 7
            ),
            "low_reciprocal_pair_drop_gamma": low(
                beta - delta + delta * reciprocal_pair_union
            ),
            "low_reciprocal_pair_gamma_power7": low(
                beta - delta + delta * reciprocal_pair_union
                - gamma * (N / M) ** 7
            ),
        }
        for label, value in regional.items():
            print("REGION", label, sign_counts(value), flush=True)
        low_beta_value = regional["low_beta"]
        negatives = [
            (monomial, coefficient)
            for monomial, coefficient in low_beta_value.numer.terms()
            if coefficient < 0
        ]
        print("LOW_BETA_NEGATIVE_TERMS", negatives, flush=True)
    print("PASS_EXACT_LEFT_GAP1_ZERO_FACE_STRUCTURAL_EXPLORATION", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
