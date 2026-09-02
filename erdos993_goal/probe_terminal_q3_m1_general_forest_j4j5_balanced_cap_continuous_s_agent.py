#!/usr/bin/env python3
"""Stronger active balanced-cap cone with continuous remainder s.

For fixed d this replaces the finite s=0,...,d-1 loop by one or two exact
Bernstein boxes.  A pass is a valid strengthening of the integer domain.
"""

from __future__ import annotations

import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import C
from prove_terminal_q3_m1_general_forest_j8plus_agent import (
    certificate_expressions,
    tensor_bernstein,
)


def check(name, expression, box, unbounded):
    degrees, coefficients = tensor_bernstein(expression, box)
    bad = []
    count = 0
    minimum = None
    for index, coefficient in enumerate(coefficients):
        for powers, value in sp.Poly(coefficient, *unbounded).terms():
            count += 1
            if value < 0:
                bad.append((index, powers, value))
            elif value > 0:
                minimum = value if minimum is None else min(minimum, value)
    print(name, "degrees", degrees, "bern", len(coefficients),
          "monomials", count, "bad", len(bad), "minpos", minimum,
          flush=True)
    if bad:
        print("first_bad", bad[:3], flush=True)
    assert not bad, (name, bad[:3])


def main():
    numerator, _den, _mnum, _mden, variables, _tests, _dens = (
        certificate_expressions()
    )
    j, r, h, d, R, W, y = variables
    N = j + r
    w2 = sp.Poly(numerator, W).coeff_monomial(W**2)
    linear = sp.expand(numerator - w2 * W**2)
    B = N - 2 * h - 1
    high = C(N - 2 * h, 2)
    wpoly = sp.Poly(linear, W)
    slope_w = wpoly.coeff_monomial(W)
    constant_w = wpoly.coeff_monomial(1)
    low_num = sp.expand((d - 1) * C(d, 2) + (B - d + 1) * B)
    boundaries = {}
    for name, boundary in (
        ("low", sp.expand(slope_w * low_num + constant_w * B)),
        ("high", sp.expand(slope_w * high + constant_w)),
    ):
        yp = sp.Poly(boundary, y)
        boundaries[name] = (
            yp.coeff_monomial(1), yp.coeff_monomial(y)
        )

    H, A, E, u, v = sp.symbols("H A E u v", nonnegative=True)

    def cleared(jv, dv, hv, sv, qv, lv, wname):
        Rv = dv * qv + sv
        Nv = 2 * hv + dv + Rv + lv
        Sv = Nv - dv
        Kv = Sv - qv
        top = C(Sv, jv)
        center = ((dv - sv) * C(Kv - jv + 2, jv - 1)
                  + sv * C(Kv - jv + 1, jv - 1))
        b0, b1 = boundaries[wname]
        substitution = {j: jv, r: Nv - jv, h: hv, d: dv, R: Rv}
        return sp.expand(
            b0.subs(substitution, simultaneous=True) * (top + center)
            + b1.subs(substitution, simultaneous=True) * top
        )

    for jv in (4, 5):
        threshold = 2 * jv - 2
        # d=1 is already a cheap exact strip in the fixed-s producer.  This
        # stronger continuous-remainder experiment starts at d=2.
        for dv in range(2, jv + 1):
            qmap = A * u / (dv - 1)
            lmap = A * (1 - u)
            smap = (dv - 1) * v
            for wname in ("low", "high"):
                check(
                    f"j{jv}_d{dv}_hhigh_{wname}",
                    cleared(jv, dv, jv - 1 + H, smap, qmap, lmap, wname),
                    (u, v), (H, A),
                )

            for hv in range(1, jv - 1):
                c = threshold - 2 * hv
                if c >= dv - 1:
                    smaps = (("all", (dv - 1) * v, c - (dv - 1) * v + E),)
                else:
                    smaps = (
                        ("slow", c * v, c - c * v + E),
                        ("shigh", c + (dv - 1 - c) * v, E),
                    )
                for sector, svalue, avalue in smaps:
                    qvalue = avalue * u / (dv - 1)
                    lvalue = avalue * (1 - u)
                    for wname in ("low", "high"):
                        check(
                            f"j{jv}_d{dv}_h{hv}_{sector}_{wname}",
                            cleared(jv, dv, hv, svalue, qvalue, lvalue, wname),
                            (u, v), (E,),
                        )


if __name__ == "__main__":
    main()
