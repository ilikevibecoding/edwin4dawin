#!/usr/bin/env python3
"""Derive the r=6 half-blocked margins for a rooted star plus isolates.

This symbolic calculation treats the star center as the distinguished
root and assumes m,t are in the stable polynomial range.  Small
boundary values are handled by the exact finite scanner.
"""

from __future__ import annotations

import sympy as sp
import sys


m, t = sp.symbols("m t", integer=True, nonnegative=True)
r = sp.Integer(6)


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    output = sp.Integer(1)
    for offset in range(rank):
        output *= value - offset
    return sp.expand(output / sp.factorial(rank))


def coefficient(rank):
    return choose(m + t, rank) + choose(t, rank - 1)


bm = coefficient(5)
br = coefficient(6)
u = sp.cancel(6 * br / bm)
p_bar = sp.cancel(choose(t, 4) / bm)
downlink_mass = 5 * bm


def local_phi(
    residual_n,
    residual_m,
    degree_square_sum,
    state,
    root_degree,
):
    n = residual_n
    a = sp.cancel(
        (n * (n - 1) - 2 * residual_m) / n
    )
    mean_q = sp.cancel(
        (n * residual_m - degree_square_sum) / n
    )
    variance = sp.cancel(
        degree_square_sum / n
        - 4 * residual_m**2 / n**2
    )
    if state == "selected":
        p = sp.Integer(1)
        covariance = z_value = sp.Integer(0)
    elif state == "blocked":
        p = covariance = z_value = sp.Integer(0)
    else:
        p = 1 / n
        e_root = n - 1 - root_degree
        covariance = sp.cancel(e_root / n - p * a)
        z_value = sp.cancel(e_root / n)
    burden = sp.cancel(
        (2 - a) * p - 3 * covariance - 3 * z_value
    )
    raw = sp.cancel(
        2 + a + 2 * mean_q - variance - 2 * burden
    )
    adjustment = (
        2 * burden if state == "selected" else 0
    )
    drift = sp.cancel(
        1 - 2 * p + 2 * (covariance + z_value)
    )
    centered_p = p - p_bar
    centered = a - u - r * centered_p
    return sp.cancel(
        raw
        - adjustment
        + 2 * (r - 2) * drift
        + 2 * r**2 * centered_p**2
        - 2 * centered**2
    )


state_sums = {
    "selected": sp.Integer(0),
    "blocked": sp.Integer(0),
    "open": sp.Integer(0),
}
blocked_one_sum = sp.Integer(0)

# K contains the center and three isolates.
selected_count = choose(t, 3)
selected_n = t - 3
selected_phi = local_phi(
    selected_n, 0, 0, "selected", 0
)
state_sums["selected"] += sp.cancel(
    selected_count
    * selected_n
    * selected_phi
    / downlink_mass
)

# K avoids the center and contains a star leaves and 4-a isolates.
for leaves_chosen in range(5):
    count = (
        choose(m, leaves_chosen)
        * choose(t, 4 - leaves_chosen)
    )
    if leaves_chosen == 0:
        residual_n = 1 + m + t - 4
        residual_m = m
        degree_square_sum = m * m + m
        state = "open"
        root_degree = m
    else:
        residual_n = m + t - 4
        residual_m = degree_square_sum = 0
        state = "blocked"
        root_degree = 0
    phi = local_phi(
        residual_n,
        residual_m,
        degree_square_sum,
        state,
        root_degree,
    )
    state_sums[state] += sp.cancel(
        count
        * residual_n
        * phi
        / downlink_mass
    )
    if leaves_chosen == 1:
        blocked_one_sum += sp.cancel(
            count
            * residual_n
            * phi
            / downlink_mass
        )

selected_half = sp.factor(
    sp.cancel(
        state_sums["selected"]
        + state_sums["blocked"] / 2
    )
)
open_half = sp.factor(
    sp.cancel(
        state_sums["open"]
        + state_sums["blocked"] / 2
    )
)
selected_nmh = sp.factor(
    sp.cancel(selected_half + blocked_one_sum / 2)
)
open_nmh = sp.factor(
    sp.cancel(open_half - blocked_one_sum / 2)
)


def describe(name, expression):
    numerator, denominator = map(
        sp.factor, sp.fraction(expression)
    )
    print(name)
    print("numerator:")
    print(numerator)
    print("denominator:")
    print(denominator)
    print("degrees:", sp.Poly(numerator, m, t).degree_list())


if "--raw" in sys.argv:
    describe("selected + blocked/2", selected_half)
    describe("open + blocked/2", open_half)
    describe(
        "selected + blocked_one + blocked_many/2",
        selected_nmh,
    )
    describe("open + blocked_many/2", open_nmh)

# Save compact machine-readable symbolic strings.
from pathlib import Path
import json

Path("star_isolates_r6_blocked_split_symbolic_20260728.json").write_text(
    json.dumps(
        {
            "selected_plus_half_blocked": str(selected_half),
            "open_plus_half_blocked": str(open_half),
            "selected_nmh": str(selected_nmh),
            "open_nmh": str(open_nmh),
            "prefix_condition_b6_minus_b5": str(
                sp.factor(br - bm)
            ),
        },
        indent=2,
    ),
    encoding="utf-8",
)
