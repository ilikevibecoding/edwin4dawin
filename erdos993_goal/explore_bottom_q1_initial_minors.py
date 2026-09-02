#!/usr/bin/env python3
"""Extend exact initial-minor tests for the rank-deficient pencil coefficient."""

from __future__ import annotations

import sympy as sp

from verify_bottom_affine_rank_defect import q1_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import initial_minors


for d in range(3, 41):
    q = d - 1
    _, _, q1 = q1_data(d)
    positive = 0
    zero = 0
    for minor in initial_minors(q1):
        value = sp.factor(minor.det(method="domain-ge"))
        if value > 0:
            positive += 1
        elif value == 0:
            zero += 1
        else:
            raise AssertionError((d, minor.rows, value))
    print(f"d={d}, q={q}, positive={positive}, zero={zero}")
