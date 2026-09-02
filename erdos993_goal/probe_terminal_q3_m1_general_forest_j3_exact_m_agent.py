#!/usr/bin/env python3
"""Probe the exact FQ32-residual split for forest m=1 at target j=3.

This is exploratory only.  It keeps the exact M coefficient.  Where that
coefficient is negative it uses the elementary upper bound
M=3*p0*R1-2*p1*R0 <= 3*p0*R1, rather than silently discarding M.
"""

from __future__ import annotations

from fractions import Fraction
import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import build, C
from prove_terminal_q3_m1_general_forest_j8plus_agent import (
    compile_exact_polynomial,
)


def expressions():
    numerator, denominator, mnum, mden, variables = build()
    j, r, h, d, R, W, y = variables
    N = j + r
    m = N - h
    p0 = sp.expand(C(N + 1, 3) - m * (N - 1) + W + C(N + 1, 2) - m)
    p1 = sp.expand(C(N + 1, 2) - m + N + 1)
    R1 = sp.expand(m * N - 2 * W)

    # The omitted exact term in build() is
    #   (j+1)*(a*x-p1)*M/(2*p1).
    # On a*x-p1<=0, M<=3*p0*R1 gives the rigorous lower below.
    correction = (j + 1) * (mnum / mden) * 3 * p0 * R1 / (2 * p1)
    alternate = sp.cancel(numerator / denominator + correction)
    alternate_num, alternate_den = sp.together(alternate).as_numer_denom()
    return (
        sp.expand(numerator), sp.factor(denominator),
        sp.expand(alternate_num), sp.factor(alternate_den),
        sp.expand(mnum), sp.factor(mden), variables,
    )


def abstract_scan(max_N: int = 25):
    current_num, current_den, alt_num, alt_den, mnum, mden, variables = expressions()
    j, r, h, d, R, W, y = variables
    current_num_eval = compile_exact_polynomial(current_num, variables)
    current_den_eval = compile_exact_polynomial(current_den, variables)
    alt_num_eval = compile_exact_polynomial(alt_num, variables)
    alt_den_eval = compile_exact_polynomial(alt_den, variables)
    mnum_eval = compile_exact_polynomial(mnum, variables)
    mden_eval = compile_exact_polynomial(mden, variables)

    minimum = None
    witness = None
    checked = 0
    surface_counts = {"alt_y0": 0, "current_y1": 0, "threshold": 0,
                      "current_y0": 0, "alt_y1": 0}
    for N in range(13, max_N + 1):
        rv = N - 3
        for hv in range(1, (N - 1) // 2 + 1):
            edge_budget = N - 2 * hv
            for dv in range(1, edge_budget + 1):
                rmax = edge_budget - dv
                upper_W = edge_budget * (edge_budget - 1) // 2
                B = edge_budget - 1
                for Rv in range(rmax + 1):
                    lower_W = max(dv * (dv - 1) // 2 + Rv, B)
                    for Wv in range(lower_W, upper_W + 1):
                        base = (3, rv, hv, dv, Rv, Wv)
                        c0 = mnum_eval(base + (Fraction(0),)) / mden_eval(base + (Fraction(0),))
                        c1 = mnum_eval(base + (Fraction(1),)) / mden_eval(base + (Fraction(1),))
                        assert c1 > c0
                        samples = []
                        if c0 >= 0:
                            samples.append(("current_y0", Fraction(0), "current"))
                        else:
                            samples.append(("alt_y0", Fraction(0), "alt"))
                        if c1 >= 0:
                            samples.append(("current_y1", Fraction(1), "current"))
                        else:
                            samples.append(("alt_y1", Fraction(1), "alt"))
                        if c0 < 0 < c1:
                            threshold = -c0 / (c1 - c0)
                            samples.append(("threshold", threshold, "current"))
                        for surface, yv, kind in samples:
                            values = base + (yv,)
                            if kind == "current":
                                value = current_num_eval(values) / current_den_eval(values)
                            else:
                                value = alt_num_eval(values) / alt_den_eval(values)
                            checked += 1
                            surface_counts[surface] += 1
                            if minimum is None or value < minimum:
                                minimum = value
                                witness = (surface, values, c0, c1, value)
    return checked, minimum, witness, surface_counts


def main():
    current_num, current_den, alt_num, alt_den, mnum, mden, variables = expressions()
    j, r, h, d, R, W, y = variables
    print("current_den", current_den, flush=True)
    print("alternate_den", alt_den, flush=True)
    print("alternate_terms", len(sp.Poly(alt_num, *variables).terms()), flush=True)
    print("alternate_W_degree", sp.Poly(alt_num, W).degree(), flush=True)
    print("alternate_y_degree", sp.Poly(alt_num, y).degree(), flush=True)
    print("m_j3_y0", sp.factor(mnum.subs({j: 3, y: 0})), flush=True)
    print("m_j3_slope", sp.factor(sp.diff(mnum, y).subs(j, 3)), flush=True)
    checked, minimum, witness, counts = abstract_scan()
    print("checked", checked, "counts", counts, flush=True)
    print("minimum", minimum, flush=True)
    print("witness", witness, flush=True)


if __name__ == "__main__":
    main()
