#!/usr/bin/env python3
"""Diagnostic max of coupled and coarse-root exact-U1 j=3 lowers."""

from __future__ import annotations

import math
import numpy as np
import sympy as sp

from derive_terminal_q3_m1_forest_j3_exact_u1_root import build as build_coupled
from derive_terminal_q3_m1_forest_j3_simple_f4_root import build as build_coarse


def C(n, k):
    return math.comb(n, k) if 0 <= k <= n else 0


def P(n, k):
    return C(n - k + 1, k) if n >= 2 * k - 1 else 0


def real_roots(coefficients):
    scale = max(abs(x) for x in coefficients)
    if not scale:
        return []
    values = list(coefficients)
    while len(values) > 1 and abs(values[0]) <= 1e-12 * scale:
        values.pop(0)
    return [float(z.real) for z in np.roots(values)
            if abs(z.imag) <= 1e-8 * max(1.0, abs(z.real))]


def evaluate(coefficients, value):
    total = 0.0
    for coefficient in coefficients:
        total = total * value + coefficient
    return total


def main(max_N=50):
    n0, _d0, _mn, _md, variables, _b0 = build_coupled()
    n1, _d1, variables1, _b1 = build_coarse()
    assert variables == variables1
    N, h, d, R, W, y = variables
    polynomials = (sp.Poly(-n0, W), sp.Poly(-(N - 3) * n1, W))
    functions = tuple(tuple(sp.lambdify((N, h, d, R, y),
                                        poly.coeff_monomial(W**power), "math")
                              for power in (3, 2, 1, 0))
                      for poly in polynomials)
    tests = negatives = interior_tests = interior_negatives = 0
    minimum = interior_minimum = None
    blend_negatives = [0, 0, 0, 0]
    blend_minima = [None, None, None, None]
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
                    classes = (B1_tangent + C(dv, 2) * Sv
                               - (dv - 1) * Rv + C(dv, 3))
                    ycap = (h3max / (h3max + classes)
                            if h3max and classes > 0 else (0.0 if not h3max else 1.0))
                    if dv > 3 and Sv >= 3:
                        ycap = min(ycap, (Sv - 2) / (Sv - 2 + 3 * (dv - 3)))
                    low = C(dv, 2) + Rv
                    slack = budget - dv - Rv
                    high = C(dv, 2) + C(Rv + 1, 2) + C(slack + 1, 2)
                    endpoint_coefficients = []
                    for yv in sorted(set((0.0, ycap))):
                        coefficients = tuple(tuple(fn(Nv, hv, dv, Rv, yv)
                                                   for fn in branch)
                                             for branch in functions)
                        endpoint_coefficients.append(coefficients)
                        wvalues = [low, high]
                        for c3, c2, c1, _c0 in coefficients:
                            wvalues.extend(real_roots((3*c3, 2*c2, c1)))
                        difference = tuple(a-b for a, b in zip(*coefficients))
                        wvalues.extend(real_roots(difference))
                        for Wv in wvalues:
                            if not low - 1e-8 <= Wv <= high + 1e-8:
                                continue
                            values = tuple(evaluate(branch, Wv) for branch in coefficients)
                            best = max(values)
                            record = (best, Nv, hv, dv, Rv, Wv, yv, ycap, values)
                            tests += 1
                            if minimum is None or record < minimum:
                                minimum = record
                            if best < -1e-3:
                                negatives += 1
                                if len(samples) < 10:
                                    samples.append(record)
                        weights = (
                            dv / Nv,
                            dv / budget,
                            (dv + hv) / Nv,
                            dv * dv / (dv * dv + Sv * Sv),
                        )
                        for blend_index, weight in enumerate(weights):
                            blend = tuple(
                                (1 - weight) * left + weight * right
                                for left, right in zip(*coefficients)
                            )
                            blend_wvalues = [low, high]
                            c3, c2, c1, _c0 = blend
                            blend_wvalues.extend(real_roots((3*c3, 2*c2, c1)))
                            for Wv in blend_wvalues:
                                if not low - 1e-8 <= Wv <= high + 1e-8:
                                    continue
                                value = evaluate(blend, Wv)
                                record = (value,Nv,hv,dv,Rv,Wv,yv,ycap,weight)
                                if (blend_minima[blend_index] is None
                                        or record < blend_minima[blend_index]):
                                    blend_minima[blend_index] = record
                                if value < -1e-3:
                                    blend_negatives[blend_index] += 1
                    if ycap > 0:
                        for Wv in range(low, high + 1):
                            v0 = tuple(evaluate(branch, Wv)
                                       for branch in endpoint_coefficients[0])
                            v1 = tuple(evaluate(branch, Wv)
                                       for branch in endpoint_coefficients[1])
                            tvalues = [0.0, 1.0]
                            den = (v1[0]-v0[0])-(v1[1]-v0[1])
                            if abs(den) > 1e-12:
                                cross = (v0[1]-v0[0])/den
                                if 0 < cross < 1:
                                    tvalues.append(cross)
                            for t in tvalues:
                                values = tuple(a+t*(b-a) for a,b in zip(v0,v1))
                                best = max(values)
                                record = (best,Nv,hv,dv,Rv,Wv,t*ycap,ycap,values)
                                interior_tests += 1
                                if interior_minimum is None or record < interior_minimum:
                                    interior_minimum = record
                                if best < -1e-3:
                                    interior_negatives += 1
    print("tests",tests,"negatives",negatives,"minimum",minimum)
    print("interior_tests",interior_tests,"interior_negatives",interior_negatives,
          "interior_minimum",interior_minimum)
    print("samples",samples)
    print("blend_negatives",blend_negatives)
    print("blend_minima",blend_minima)


if __name__ == "__main__":
    main()
