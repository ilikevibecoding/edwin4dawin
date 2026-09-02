#!/usr/bin/env python3
"""Test real-negative-rootedness and interlacing of deflated initial minors."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import T, null_coordinate_data
from verify_bottom_reverse_tp_offdiagonal_homotopy import initial_minors


for d in range(3, 13):
    _, _, _, middle0, middle1 = null_coordinate_data(d)
    pencil = middle0 + T * middle1
    total_nonconstant = 0
    real_negative = 0
    failures = []
    for index, minor in enumerate(initial_minors(pencil)):
        numerator, _ = sp.fraction(sp.cancel(minor.det(method="domain-ge")))
        polynomial = sp.Poly(numerator, T)
        if polynomial.degree() <= 0:
            continue
        total_nonconstant += 1
        roots = sp.nroots(polynomial, n=30, maxsteps=200)
        good = all(abs(float(sp.im(root))) < 1e-18 and float(sp.re(root)) < 0 for root in roots)
        if good:
            real_negative += 1
        else:
            failures.append((index, polynomial.degree(), roots))
            if len(failures) >= 3:
                break
    print(
        f"d={d}, nonconstant_checked={total_nonconstant}, "
        f"real_negative={real_negative}, failures={failures}"
    )
