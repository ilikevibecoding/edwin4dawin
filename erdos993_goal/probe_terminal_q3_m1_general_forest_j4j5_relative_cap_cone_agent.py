#!/usr/bin/env python3
"""Exact high-root-degree cones using the all-R relative-shadow cap."""

from __future__ import annotations

import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import C
from prove_terminal_q3_m1_general_forest_j8plus_agent import (
    certificate_expressions,
    tensor_bernstein,
)


def check(name, expression, variables, S):
    numerator, denominator = sp.together(sp.cancel(expression)).as_numer_denom()
    reference = sp.factor(denominator.subs({S: 0, **{x: 0 for x in variables}}))
    assert reference.is_number and reference != 0, (name, denominator, reference)
    if reference < 0:
        numerator = -numerator
        denominator = -denominator
    degrees, coefficients = tensor_bernstein(sp.expand(numerator), variables)
    bad = []
    powers_total = 0
    minimum = None
    for index, coefficient in enumerate(coefficients):
        powers = sp.Poly(coefficient, S).all_coeffs()
        powers_total += len(powers)
        if not powers or any(value < 0 for value in powers):
            bad.append((index, coefficient))
        positives = [value for value in powers if value > 0]
        if positives:
            local = min(positives)
            minimum = local if minimum is None else min(minimum, local)
    print(name, "degrees", degrees, "bern", len(coefficients),
          "powers", powers_total, "den", sp.factor(denominator),
          "bad", len(bad), "minpos", minimum, flush=True)
    if bad:
        print("first_bad", [(i, str(c)) for i, c in bad[:3]], flush=True)


def main():
    numerator, _den, _mnum, _mden, variables, _tests, _dens = (
        certificate_expressions()
    )
    j, r, h, d, R, W, y = variables
    N = j + r
    wpoly = sp.Poly(numerator, W)
    w2 = wpoly.coeff_monomial(W**2)
    linear = sp.expand(numerator - w2 * W**2)
    B = N - 2 * h - 1
    low = sp.factor((d - 1) * C(d, 2) / B + (1 - (d - 1) / B) * B)
    high = C(N - 2 * h, 2)
    rmax = N - 2 * h - d
    relative_cap = sp.factor(
        (N - d - j + 1) / (N - d - j + 1 + j * (d - j))
    )

    S, u, v = sp.symbols("S u v", nonnegative=True)
    for jvalue in (4, 5):
        Nv = 13 + S
        cases = []
        # On the supported y>0 face, N-d=|H|>=j.  For small fixed h this
        # support cap is stronger than the ordinary root-component cap.
        for hvalue in range(1, (jvalue + 1) // 2):
            cases.append((
                f"h{hvalue}", hvalue,
                jvalue + 1 + (Nv - 2 * jvalue - 1) * v,
                (v,),
            ))
        # Once 2h>=j, the root cap already implies the support cap.
        h0 = (jvalue + 1) // 2
        hmap = h0 + (Nv - jvalue - 2 * h0 - 1) * u / 2
        dmap = jvalue + 1 + (Nv - 2 * hmap - jvalue - 1) * v
        cases.append((f"h_ge_{h0}", hmap, dmap, (u, v)))

        for case, hcase, dcase, box in cases:
            substitution = {
                j: jvalue,
                r: Nv - jvalue,
                h: hcase,
                d: dcase,
            }
            for wname, wvalue in (("low", low), ("high", high)):
                for rname, rvalue in (("zero", 0), ("max", rmax)):
                    expression = linear.subs(W, wvalue).subs(R, rvalue).subs(
                        y, relative_cap
                    )
                    transformed = expression.subs(substitution, simultaneous=True)
                    check(
                        f"j{jvalue}_{case}_{wname}_{rname}",
                        transformed, box, S,
                    )


if __name__ == "__main__":
    main()
