#!/usr/bin/env python3
"""Probe low-root-degree exact cones for the balanced-neighbor shadow cap."""

from __future__ import annotations

import itertools
import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import C
from prove_terminal_q3_m1_general_forest_j8plus_agent import (
    certificate_expressions,
    tensor_bernstein,
)


def coefficient_check(name, expression, box_variables, unbounded_variables):
    numerator, denominator = sp.together(sp.cancel(expression)).as_numer_denom()
    all_variables = tuple(box_variables) + tuple(unbounded_variables)
    reference = None
    for value in (0, 1, 2):
        candidate = sp.factor(denominator.subs({x: value for x in all_variables}))
        if candidate.is_number and candidate != 0:
            reference = candidate
            break
    assert reference is not None, (name, denominator)
    if reference < 0:
        numerator = -numerator
        denominator = -denominator
    if box_variables:
        degrees, coefficients = tensor_bernstein(sp.expand(numerator), box_variables)
    else:
        degrees, coefficients = (), [sp.expand(numerator)]
    bad = []
    count = 0
    minimum = None
    for index, coefficient in enumerate(coefficients):
        terms = sp.Poly(coefficient, *unbounded_variables).terms()
        count += len(terms)
        for powers, value in terms:
            if value < 0:
                bad.append((index, powers, value, coefficient))
            elif value > 0:
                minimum = value if minimum is None else min(minimum, value)
    print(name, "box_degrees", degrees, "bern", len(coefficients),
          "monomials", count, "den", sp.factor(denominator),
          "bad", len(bad), "minpos", minimum, flush=True)
    if bad:
        print("first_bad", [(i, p, str(v), str(c)) for i, p, v, c in bad[:2]],
              flush=True)


def main():
    numerator, _den, _mnum, _mden, variables, _tests, _dens = (
        certificate_expressions()
    )
    j, r, h, d, R, W, y = variables
    N = j + r
    w2 = sp.Poly(numerator, W).coeff_monomial(W**2)
    linear = sp.expand(numerator - w2 * W**2)
    B = N - 2 * h - 1
    low = sp.cancel((d - 1) * C(d, 2) / B + (1 - (d - 1) / B) * B)
    high = C(N - 2 * h, 2)

    H, A, E, Q, L, u = sp.symbols("H A E Q L u", nonnegative=True)
    for jvalue in (4, 5):
        threshold = 2 * jvalue - 2
        for dvalue in range(1, jvalue + 1):
            for svalue in range(dvalue):
                def capped_expression(hvalue, qvalue, lvalue, wvalue):
                    Rvalue = dvalue * qvalue + svalue
                    Nvalue = 2 * hvalue + dvalue + Rvalue + lvalue
                    Svalue = Nvalue - dvalue
                    Kvalue = Svalue - qvalue
                    f0 = C(Kvalue - jvalue + 2, jvalue - 1)
                    f1 = C(Kvalue - jvalue + 1, jvalue - 1)
                    top = C(Svalue, jvalue)
                    cap = sp.cancel(top / (
                        top + (dvalue - svalue) * f0 + svalue * f1
                    ))
                    return linear.subs({
                        j: jvalue,
                        r: Nvalue - jvalue,
                        h: hvalue,
                        d: dvalue,
                        R: Rvalue,
                        W: wvalue.subs({
                            j: jvalue, r: Nvalue - jvalue, h: hvalue,
                            d: dvalue, R: Rvalue,
                        }),
                        y: cap,
                    }, simultaneous=True)

                if dvalue == 1:
                    # s=0.  High-h active cone: h=j-1+H, L>=0, q>=0.
                    for wname, wvalue in (("low", low), ("high", high)):
                        expression = capped_expression(jvalue - 1 + H, Q, L, wvalue)
                        coefficient_check(
                            f"j{jvalue}_d1_active_hhigh_{wname}", expression,
                            (), (H, Q, L),
                        )
                    # Fixed low h, with L shifted to the active threshold.
                    for hvalue in range(1, jvalue - 1):
                        l0 = threshold - 2 * hvalue
                        for wname, wvalue in (("low", low), ("high", high)):
                            expression = capped_expression(hvalue, Q, l0 + E, wvalue)
                            coefficient_check(
                                f"j{jvalue}_d1_h{hvalue}_active_{wname}",
                                expression, (), (Q, E),
                            )
                    continue

                # d>=2. Map A=(d-1)q+L and q=A*u/(d-1).
                qmap = A * u / (dvalue - 1)
                lmap = A * (1 - u)
                for wname, wvalue in (("low", low), ("high", high)):
                    expression = capped_expression(jvalue - 1 + H, qmap, lmap, wvalue)
                    coefficient_check(
                        f"j{jvalue}_d{dvalue}_s{svalue}_active_hhigh_{wname}",
                        expression, (u,), (H, A),
                    )
                for hvalue in range(1, jvalue - 1):
                    a0 = max(0, threshold - 2 * hvalue - svalue)
                    amap = a0 + E
                    qmap = amap * u / (dvalue - 1)
                    lmap = amap * (1 - u)
                    for wname, wvalue in (("low", low), ("high", high)):
                        expression = capped_expression(hvalue, qmap, lmap, wvalue)
                        coefficient_check(
                            f"j{jvalue}_d{dvalue}_s{svalue}_h{hvalue}_active_{wname}",
                            expression, (u,), (E,),
                        )


if __name__ == "__main__":
    main()
