#!/usr/bin/env python3
"""Test monotonicity of positive-tail/removed-diagonal ratios across Bernstein columns."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import difference_matrix, super_ballot
from verify_bottom_sturm_variation_transform import transform


for d in range(3, 31):
    q = d - 1
    Tau = super_ballot(q)
    delta = difference_matrix(q) * Tau
    X = transform(d)
    failures = []
    for a in range(1, q):
        negative = -delta[a - 1, a - 1]
        ratios = []
        for column in range(q):
            tail = sum(delta[a - 1, p] * X[p, column] for p in range(a, q))
            ratios.append(sp.factor(tail / (negative * X[a - 1, column])))
        increasing = all(ratios[j + 1] > ratios[j] for j in range(q - 1))
        decreasing = all(ratios[j + 1] < ratios[j] for j in range(q - 1))
        if not (increasing or decreasing):
            failures.append(a)
    print(f"d={d}: nonmonotone_rows={failures}")
