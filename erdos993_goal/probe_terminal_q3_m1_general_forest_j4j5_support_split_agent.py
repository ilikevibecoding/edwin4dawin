#!/usr/bin/env python3
"""Probe support-aware y=1 endpoint cones for forest m=1, j=4,5."""

from __future__ import annotations

import sympy as sp

from prove_terminal_q3_m1_general_forest_j8plus_agent import (
    certificate_expressions,
    tensor_bernstein,
)


def check(jvalue, case, name, expression, variables, S):
    degrees, coefficients = tensor_bernstein(sp.expand(expression), variables)
    bad = []
    total = 0
    for index, coefficient in enumerate(coefficients):
        powers = sp.Poly(coefficient, S).all_coeffs()
        total += len(powers)
        if not powers or any(value < 0 for value in powers):
            bad.append((index, coefficient))
    print("j", jvalue, case, name, "degrees", degrees,
          "bern", len(coefficients), "powers", total, "bad", len(bad), flush=True)
    if bad:
        print("first_bad", [(i, str(c)) for i, c in bad[:3]], flush=True)


def main():
    _num, _den, _mnum, _mden, variables, tests, _dens = certificate_expressions()
    j, r, h, d, _R, _W, _y = variables
    S, u, v = sp.symbols("S u v", nonnegative=True)
    y1tests = {name: expression for name, expression in tests.items()
               if name.startswith("y1_")}
    for jvalue in (4, 5):
        N = 13 + S
        # If h_j(H)>0 then |H|=N-d>=j.  For fixed h<ceil(j/2),
        # this support cap is stronger than d<=N-2h.
        for hvalue in range(1, (jvalue + 1) // 2):
            substitution = {
                j: jvalue,
                r: 13 - jvalue + S,
                h: hvalue,
                d: 1 + (N - jvalue - 1) * v,
            }
            for name, expression in y1tests.items():
                check(
                    jvalue, f"h{hvalue}", name,
                    expression.subs(substitution, simultaneous=True),
                    (v,), S,
                )

        # For h>=ceil(j/2), the ordinary root cap d<=N-2h already
        # implies N-d>=2h>=j.  Map the full closed support box.
        h0 = (jvalue + 1) // 2
        hmap = h0 + (N - 2 * h0 - 1) * u / 2
        dmap = 1 + (N - 2 * hmap - 1) * v
        substitution = {
            j: jvalue,
            r: 13 - jvalue + S,
            h: hmap,
            d: dmap,
        }
        for name, expression in y1tests.items():
            check(
                jvalue, f"h_ge_{h0}", name,
                expression.subs(substitution, simultaneous=True),
                (u, v), S,
            )


if __name__ == "__main__":
    main()
