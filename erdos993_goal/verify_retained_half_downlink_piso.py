#!/usr/bin/env python3
"""Symbolically verify the retained-half PISO down-link identity."""

from __future__ import annotations

import sympy as sp


r = sp.symbols("r", integer=True, positive=True)
u, p = sp.symbols("u p", real=True)
mean_q, mean_within_variance = sp.symbols(
    "mean_q mean_within_variance", real=True
)
between_variance, between_covariance = sp.symbols(
    "between_variance between_covariance", real=True
)
mean_local_covariance, mean_local_open = sp.symbols(
    "mean_local_covariance mean_local_open", real=True
)
applicable_adjustment = sp.symbols(
    "applicable_adjustment", real=True
)

mean_cz = mean_local_covariance + mean_local_open

# The global factor-two pointed ISO margin R_r-2B_(r,q).
global_margin = (
    r
    + u
    + 2 * mean_q
    - mean_within_variance
    - between_variance
    - 2 * (r - u) * p
    + 2
    * (r + 1)
    * (mean_cz + between_covariance)
)

# Average formal rank-two pointed ISO margin.  The term
# E[A_K p_K] is u p + Cov(A_K,p_K).
average_raw_rank_two = (
    2
    + u
    + 2 * mean_q
    - mean_within_variance
    - 4 * p
    + 2 * u * p
    + 2 * between_covariance
    + 6 * mean_cz
)

between_correction = (
    (r - 2) * (1 - 2 * p + 2 * mean_cz)
    - between_variance
    + 2 * r * between_covariance
)

assert sp.expand(
    global_margin
    - average_raw_rank_two
    - between_correction
) == 0

# On inherited-hit or one-vertex boundary fibers, the applicable
# rank-two theorem uses ordinary ISO.  Its averaged difference from
# the formal pointed expression is denoted applicable_adjustment.
average_applicable_rank_two = (
    average_raw_rank_two + applicable_adjustment
)

retained_half_margin = (
    2 * global_margin - average_applicable_rank_two
)

assert sp.expand(
    retained_half_margin
    - (
        average_raw_rank_two
        + 2 * between_correction
        - applicable_adjustment
    )
) == 0

assert sp.expand(
    retained_half_margin
    - (
        global_margin
        + between_correction
        - applicable_adjustment
    )
) == 0

print("retained-half PISO down-link identities: PASS")
print("M_r = E[M_2^raw] + C_r")
print("2 M_r - E[M_2^app] = E[M_2^raw] + 2 C_r - J_r")
