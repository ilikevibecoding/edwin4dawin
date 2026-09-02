#!/usr/bin/env python3
"""Diagnostic scan for polynomial root-neighbor tangent floors, S>=5."""

from __future__ import annotations

import math
import numpy as np
import sympy as sp

from derive_terminal_q3_m1_forest_j3_simple_f4_root import build


def C(n, k):
    return math.comb(n, k) if 0 <= k <= n else 0


def roots(coefficients):
    scale = max(abs(x) for x in coefficients)
    if not scale:
        return []
    values = list(coefficients)
    while len(values) > 1 and abs(values[0]) <= 1e-12 * scale:
        values.pop(0)
    return [float(z.real) for z in np.roots(values)
            if abs(z.imag) <= 1e-8 * max(1.0, abs(z.real))]


def main(max_N=60):
    numerator, _denominator, variables, _b = build()
    N, h, d, R, W, y = variables
    poly = sp.Poly(-numerator, W)
    functions = [sp.lambdify((N, h, d, R, y), poly.coeff_monomial(W**k), "math")
                 for k in (3, 2, 1, 0)]
    negatives = tests = 0
    maximum_negative_ratio = None
    maximum_negative = None
    minimum = None
    samples = []
    for Nv in range(13, max_N + 1):
        for hv in range(1, (Nv - 1) // 2 + 1):
            budget = Nv - 2 * hv
            if budget <= 0:
                continue
            for dv in range(1, budget + 1):
                Sv = Nv - dv
                if Sv < 5:
                    continue
                for Rv in range(budget - dv + 1):
                    eH = Nv - hv - dv - Rv
                    h3max = C(Sv, 3) - eH * (Sv - 2) + C(eH, 2)
                    B1_tangent = dv * C(Sv - 1, 2) - Rv * (Sv - 2)
                    coarse_classes = (B1_tangent + C(dv, 2) * Sv
                                      - (dv - 1) * Rv + C(dv, 3))
                    if h3max + coarse_classes <= 0:
                        continue
                    simple_ycap = (h3max / (h3max + coarse_classes)
                                   if h3max else 0.0)
                    low = max(C(dv, 2) + Rv, budget - 1)
                    slack = budget - dv - Rv
                    high = C(dv, 2) + C(Rv + 1, 2) + C(slack + 1, 2)
                    for yv in (0.0, simple_ycap):
                        c3, c2, c1, c0 = [fn(Nv, hv, dv, Rv, yv) for fn in functions]
                        candidates = [low, high]
                        candidates.extend(roots((3 * c3, 2 * c2, c1)))
                        for Wv in candidates:
                            if not low - 1e-8 <= Wv <= high + 1e-8:
                                continue
                            value = ((c3 * Wv + c2) * Wv + c1) * Wv + c0
                            record = (value, Nv, hv, dv, Rv, Wv, yv, simple_ycap)
                            tests += 1
                            if minimum is None or record < minimum:
                                minimum = record
                            if value < -1e-3:
                                negatives += 1
                                ratio = dv / budget
                                ratio_record = (ratio, Nv, hv, dv, Rv, Wv, yv)
                                if maximum_negative_ratio is None or ratio_record > maximum_negative_ratio:
                                    maximum_negative_ratio = ratio_record
                                if maximum_negative is None or record < maximum_negative:
                                    maximum_negative = record
                                if len(samples) < 12:
                                    samples.append(record)
    print("tests", tests, "negatives", negatives)
    print("minimum", minimum)
    print("maximum_negative_ratio", maximum_negative_ratio)
    print("most_negative", maximum_negative)
    print("samples", samples)


if __name__ == "__main__":
    main()
