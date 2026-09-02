#!/usr/bin/env python3
"""Verify the exact rank-two down-link decomposition of pointed ISO."""

from __future__ import annotations

import sympy as sp


r = sp.symbols("r", positive=True)
u, p = sp.symbols("u p", real=True)
mean_q, mean_variance = sp.symbols(
    "mean_q mean_variance", real=True
)
mean_a2, mean_ap = sp.symbols("mean_a2 mean_ap", real=True)
mean_cov, mean_z = sp.symbols("mean_cov mean_z", real=True)

variance_a = mean_a2 - u**2
covariance_ap = mean_ap - u * p

# Total variance and covariance under the down-link mixture.
global_variance_e = mean_variance + variance_a
global_covariance = mean_cov + covariance_ap

# Global R_r-2B_r moment margin.
global_margin = (
    r
    + u
    + 2 * mean_q
    - global_variance_e
    - 2 * (r - u) * p
    + 2 * (r + 1) * global_covariance
    + 2 * (r + 1) * mean_z
)

# Average of the formal rank-two pointed margins on the fibers.
average_rank_two_margin = (
    2
    + u
    + 2 * mean_q
    - mean_variance
    - 4 * p
    + 2 * mean_ap
    + 6 * mean_cov
    + 6 * mean_z
)

between_correction = (
    (r - 2) * (1 - 2 * p + 2 * (mean_cov + mean_z))
    - variance_a
    + 2 * r * covariance_ap
)

assert sp.expand(
    global_margin
    - average_rank_two_margin
    - between_correction
) == 0

print("down-link pointed ISO decomposition: PASS")
print(
    "M_r = E[M_2(K)]"
    "+(r-2)(1-2p+2E(C_K+Z_K))"
    "-Var(A_K)+2r Cov(A_K,p_K)"
)
