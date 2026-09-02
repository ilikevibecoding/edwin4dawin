#!/usr/bin/env python3
"""Inspect coefficient ratios of leading principal minors of the deflated pencil."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import T, null_coordinate_data


for order in range(2, 7):
    print(f"order={order}")
    for d in range(max(4, order + 2), 14):
        _, _, _, middle0, middle1 = null_coordinate_data(d)
        pencil = middle0[:order, :order] + T * middle1[:order, :order]
        numerator, _ = sp.fraction(sp.cancel(pencil.det(method="domain-ge")))
        polynomial = sp.Poly(numerator, T)
        coefficients = list(reversed(polynomial.all_coeffs()))
        content = sp.gcd_list(coefficients)
        primitive = [sp.Integer(value / content) for value in coefficients]
        ratios = [sp.factor(primitive[j] / primitive[j - 1]) for j in range(1, len(primitive))]
        print(f" d={d}: primitive={primitive}, ratios={ratios}")
