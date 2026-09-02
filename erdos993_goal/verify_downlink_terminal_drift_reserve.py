#!/usr/bin/env python3
"""Verify the exact down-link recurrence for terminal drift reserve."""

from __future__ import annotations

import sympy as sp


r = sp.symbols("r", positive=True)
u, p = sp.symbols("u p", real=True)
mean_q, mean_variance = sp.symbols(
    "mean_q mean_variance", real=True
)
variance_a, covariance_ap = sp.symbols(
    "variance_a covariance_ap", real=True
)
mean_cov, mean_z = sp.symbols(
    "mean_cov mean_z", real=True
)

# Global pointed reserve P=R-B, exactly equivalent to terminal drift.
global_reserve = (
    r
    + u
    + 2 * mean_q
    - mean_variance
    - variance_a
    - (r - u) * p
    + (r + 1) * (mean_cov + covariance_ap + mean_z)
)

# Average formal rank-two pointed reserve R_2-B_2.
# E[A_K p_K] = u p + Cov(A_K,p_K).
average_rank_two_reserve = (
    2
    + u
    + 2 * mean_q
    - mean_variance
    - 2 * p
    + u * p
    + covariance_ap
    + 3 * (mean_cov + mean_z)
)

average_component_b_rank_two = (
    1 - p + mean_cov + mean_z
)

between_correction = (
    (r - 2) * average_component_b_rank_two
    - variance_a
    + r * covariance_ap
)

assert sp.expand(
    global_reserve
    - average_rank_two_reserve
    - between_correction
) == 0

print("down-link terminal drift reserve: PASS")
print(
    "P_r = E[P_2(K)] +(r-2)E[M_B(2,K)]"
    "-Var(A_K)+r Cov(A_K,p_K)"
)
