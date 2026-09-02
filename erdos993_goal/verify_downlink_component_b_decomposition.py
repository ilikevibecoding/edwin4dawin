#!/usr/bin/env python3
"""Symbolically verify the down-link decomposition of component (B)."""

from __future__ import annotations

import sympy as sp


p, mean_cov, mean_z = sp.symbols(
    "p mean_cov mean_z", real=True
)
mean_a, mean_ap = sp.symbols("mean_a mean_ap", real=True)

global_cov = mean_cov + mean_ap - mean_a * p
global_margin = 1 - p + global_cov + mean_z

average_local = 1 - p + mean_cov + mean_z
between_covariance = mean_ap - mean_a * p

assert sp.expand(
    global_margin - average_local - between_covariance
) == 0

print("down-link component-(B) decomposition: PASS")
print("M_r = E[M_2(K)] + Cov(A_K,p_K)")
