#!/usr/bin/env python3
"""Test one-pivot Schur recurrences of the actual checker inverse."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import two_sided_data


def actual_checker(m: int) -> sp.Matrix:
    target = two_sided_data(2 * m + 3)[3][:m, :m]
    e = sp.diag(*[(-1) ** i for i in range(m)])
    return sp.simplify(e * target.inv() * e)


def diagonal_match(left: sp.Matrix, right: sp.Matrix):
    n = left.rows
    best = None
    for ar in range(n):
        for ac in range(n):
            if any(left[i, ac] == 0 or right[i, ac] == 0 for i in range(n)):
                continue
            if any(left[ar, j] == 0 or right[ar, j] == 0 for j in range(n)):
                continue
            rs = [sp.factor(left[i, ac] / right[i, ac]) for i in range(n)]
            cs = [sp.factor(left[ar, j] / (rs[ar] * right[ar, j])) for j in range(n)]
            residual = sp.simplify(left - sp.diag(*rs) * right * sp.diag(*cs))
            record = (residual.rank(), ar, ac, residual, rs, cs)
            if best is None or record[0] < best[0]:
                best = record
    return best


for m in range(2, 11):
    h = actual_checker(m)
    schur = sp.simplify(h[1:, 1:] - h[1:, 0] * h[0, 1:] / h[0, 0])
    previous = actual_checker(m - 1)
    match = diagonal_match(schur, previous)
    rank, ar, ac, residual, _, _ = match
    print(
        f"m={m}: schur_positive_entries={all(x > 0 for x in schur)}, "
        f"match_rank={rank}, residual_signs={sorted(set(map(sp.sign,residual)))}, "
        f"anchor=({ar},{ac})",
        flush=True,
    )
