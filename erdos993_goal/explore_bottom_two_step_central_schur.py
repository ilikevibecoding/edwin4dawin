#!/usr/bin/env python3
"""Search whether the old central symmetric form is a Schur complement of the new."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def form(d: int) -> sp.Matrix:
    q = d - 1
    return central_inverse_from_blocks(d).inv() * reverse_identity(q)


def diagonal_congruence(left: sp.Matrix, right: sp.Matrix):
    if left.shape != right.shape:
        return None
    n = left.rows
    if any((left[i, j] == 0) != (right[i, j] == 0) for i in range(n) for j in range(n)):
        return None
    scales = [None] * n
    for i in range(n):
        if right[i, i] != 0:
            ratio = sp.factor(left[i, i] / right[i, i])
            root = sp.sqrt(ratio)
            if root.is_rational:
                scales[i] = root
    # Anti-triangular forms may have zero diagonal; propagate products.
    for seed in range(n):
        if scales[seed] is None:
            scales[seed] = sp.Integer(1)
        changed = True
        while changed:
            changed = False
            for i in range(n):
                for j in range(n):
                    if right[i, j] == 0:
                        continue
                    ratio = sp.factor(left[i, j] / right[i, j])
                    if scales[i] is not None and scales[j] is None:
                        scales[j] = sp.factor(ratio / scales[i])
                        changed = True
                    elif scales[j] is not None and scales[i] is None:
                        scales[i] = sp.factor(ratio / scales[j])
                        changed = True
    if any(value is None for value in scales):
        return None
    if sp.simplify(left - sp.diag(*scales) * right * sp.diag(*scales)) == sp.zeros(n):
        return scales
    return None


for d in range(5, 11):
    old = form(d - 2)
    new = form(d)
    q = new.rows
    matches = []
    for eliminated in combinations(range(q), 2):
        kept = [i for i in range(q) if i not in eliminated]
        a = new.extract(kept, kept)
        b = new.extract(kept, eliminated)
        c = new.extract(eliminated, kept)
        e = new.extract(eliminated, eliminated)
        if e.det() == 0:
            continue
        schur = sp.simplify(a - b * e.inv() * c)
        scales = diagonal_congruence(schur, old)
        if scales is not None:
            matches.append((eliminated, scales))
    print(f"d={d} matches={matches}", flush=True)
