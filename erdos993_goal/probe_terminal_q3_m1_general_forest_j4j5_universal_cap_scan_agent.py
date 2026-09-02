#!/usr/bin/env python3
"""Numerical/exact-integer probe of the universal balanced-neighbor y cap."""

from __future__ import annotations

import math
import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import C
from prove_terminal_q3_m1_general_forest_j8plus_agent import certificate_expressions


def path_floor(n: int, k: int) -> int:
    if n - k + 1 < k:
        return 0
    return math.comb(n - k + 1, k)


def main(max_N: int = 70):
    numerator, _den, _mnum, _mden, variables, _tests, _dens = (
        certificate_expressions()
    )
    j, r, h, d, R, W, y = variables
    N = j + r
    polynomial = sp.Poly(numerator, W)
    qa = polynomial.coeff_monomial(W**2)
    linear = sp.expand(numerator - qa * W**2)
    B = N - 2 * h - 1
    low = sp.cancel((d - 1) * C(d, 2) / B + (1 - (d - 1) / B) * B)
    high = C(N - 2 * h, 2)
    funcs = {}
    for jvalue in (4, 5):
        funcs[(jvalue, "linear_low")] = sp.lambdify(
            (r, h, d, R, y), linear.subs({j: jvalue, W: low}), "math"
        )
        funcs[(jvalue, "linear_high")] = sp.lambdify(
            (r, h, d, R, y), linear.subs({j: jvalue, W: high}), "math"
        )
        funcs[(jvalue, "full_low")] = sp.lambdify(
            (r, h, d, R, y), numerator.subs({j: jvalue, W: low}), "math"
        )
        funcs[(jvalue, "full_high")] = sp.lambdify(
            (r, h, d, R, y), numerator.subs({j: jvalue, W: high}), "math"
        )

    for jvalue in (4, 5):
        minima = {name: None for name in ("linear_low", "linear_high", "full_low", "full_high")}
        negatives = {name: 0 for name in minima}
        cells = 0
        for Nv in range(13, max_N + 1):
            rv = Nv - jvalue
            for hv in range(1, (Nv - 1) // 2 + 1):
                Bv = Nv - 2 * hv - 1
                if Bv <= 0:
                    continue
                for dv in range(1, Nv - 2 * hv + 1):
                    Sv = Nv - dv
                    cSj = math.comb(Sv, jvalue) if Sv >= jvalue else 0
                    if not cSj:
                        continue
                    for Rv in range(Nv - 2 * hv - dv + 1):
                        qv, sv = divmod(Rv, dv)
                        f0 = path_floor(Sv - qv, jvalue - 1)
                        f1 = path_floor(Sv - qv - 1, jvalue - 1)
                        center = (dv - sv) * f0 + sv * f1
                        ycap = cSj / (cSj + center)
                        cells += 1
                        for name in minima:
                            value = funcs[(jvalue, name)](rv, hv, dv, Rv, ycap)
                            record = (value, Nv, hv, dv, Rv, qv, sv, ycap, center)
                            if minima[name] is None or record < minima[name]:
                                minima[name] = record
                            if value < -1e-4:
                                negatives[name] += 1
        print("j", jvalue, "cells", cells, flush=True)
        for name in minima:
            print(name, "negative", negatives[name], "minimum", minima[name], flush=True)


if __name__ == "__main__":
    main()
