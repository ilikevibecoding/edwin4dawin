#!/usr/bin/env python3
"""Analyze M=U^-1 W U^-1-W in the Catalan factorization of Q1."""

import itertools

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import checker
from verify_bottom_universal_schur_tp import catalan_toeplitz


for d in range(3, 13):
    q = d - 1
    U = catalan_toeplitz(q).T
    W = sp.diag(*[sp.Rational(1, sp.binomial(d, p + 1)) for p in range(q)])
    middle = sp.simplify(U.inv() * W * U.inv() - W)
    signed = sp.simplify(checker(q) * middle * checker(q))
    entry_signs = sorted(set(sp.sign(x) for x in signed))
    minor_signs = set()
    if d <= 8:
        for order in range(1, q + 1):
            for rows in itertools.combinations(range(q), order):
                for columns in itertools.combinations(range(q), order):
                    minor_signs.add(sp.sign(sp.factor(signed.extract(rows, columns).det())))
    print(
        f"d={d}: rank={signed.rank()}, entry_signs={entry_signs}, "
        f"minor_signs_d_le_8={sorted(minor_signs)}"
    )
    if d <= 7:
        print(signed)
