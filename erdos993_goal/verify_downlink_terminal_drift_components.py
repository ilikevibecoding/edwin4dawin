#!/usr/bin/env python3
"""Verify the exact down-link formulas for drift components (A),(B)."""

from __future__ import annotations

import sympy as sp


u, mean_q, mean_variance = sp.symbols(
    "u mean_q mean_variance", real=True
)
variance_a = sp.symbols("variance_a", nonnegative=True)
mean_hit_extension = sp.symbols(
    "mean_hit_extension", real=True
)

# Component (A), normalized by u:
#   u(q_F-c_r/b_r)
# = u + E(Ye)+E((1-Y)L)+2E q-Var(e).
# Total variance splits Var(e)=E Var(e|K)+Var(A_K).
global_a = (
    u
    + mean_hit_extension
    + 2 * mean_q
    - mean_variance
    - variance_a
)
average_local_a = (
    u
    + mean_hit_extension
    + 2 * mean_q
    - mean_variance
)
assert sp.expand(
    global_a - (average_local_a - variance_a)
) == 0

p, mean_cov, mean_z = sp.symbols(
    "p mean_cov mean_z", real=True
)
mean_a, mean_ap = sp.symbols("mean_a mean_ap", real=True)

# Component (B), normalized by the probability of avoiding the root:
#   (1-rho_(r-1))(u+1-r c_r/c_(r-1))
# = 1-p+Cov(Y,e)+E((1-Y)L).
# Total covariance splits into the within-fiber covariance plus
# Cov(A_K,p_K).
global_b = (
    1
    - p
    + mean_cov
    + mean_ap
    - mean_a * p
    + mean_z
)
average_local_b = 1 - p + mean_cov + mean_z
between_covariance = mean_ap - mean_a * p
assert sp.expand(
    global_b - average_local_b - between_covariance
) == 0

# Explicit local rank-two component-(B) formula for a residual forest
# of order N, with M edges and root degree D.
N, M, D = sp.symbols("N M D", positive=True)
b1 = N
b2 = N * (N - 1) / 2 - M
c1 = N - 1
c2 = (N - 1) * (N - 2) / 2 - (M - D)
u2 = 2 * b2 / b1
component_b2 = 1 + u2 - 2 * c2 / c1
normalized_b2 = sp.factor(c1 / b1 * component_b2)
explicit_b2 = 2 * (N * (N - 1) + M - N * D) / N**2
assert sp.factor(normalized_b2 - explicit_b2) == 0

print("down-link terminal drift components: PASS")
print("M_A(r) = E[M_A(2,K)] - Var(A_K)")
print("M_B(r) = E[M_B(2,K)] + Cov(A_K,p_K)")
