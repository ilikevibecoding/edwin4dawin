#!/usr/bin/env python3
"""Fast exact active balanced-cap probe for forest m=1, j=4,5.

This clears the positive shadow-cap denominator before parameter substitution,
instead of asking SymPy to cancel a large nested rational expression.
"""

from __future__ import annotations

import sympy as sp

from derive_terminal_q3_m1_general_forest_agent import C
from prove_terminal_q3_m1_general_forest_j8plus_agent import (
    certificate_expressions,
    tensor_bernstein,
)


def coefficient_check(name, expression, box_variables, unbounded_variables):
    if box_variables:
        degrees, coefficients = tensor_bernstein(expression, box_variables)
    else:
        degrees, coefficients = (), [sp.Poly(expression, *unbounded_variables).as_expr()]
    bad = []
    count = 0
    minimum = None
    for index, coefficient in enumerate(coefficients):
        terms = sp.Poly(coefficient, *unbounded_variables).terms()
        count += len(terms)
        for powers, value in terms:
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


def main(targets=(4, 5)):
    numerator, _den, _mnum, _mden, variables, _tests, _dens = (
        certificate_expressions()
    )
    j, r, h, d, R, W, y = variables
    N = j + r
    w2 = sp.Poly(numerator, W).coeff_monomial(W**2)
    linear = sp.expand(numerator - w2 * W**2)
    B = N - 2 * h - 1
    high = C(N - 2 * h, 2)

    boundaries = {}
    linear_w = sp.Poly(linear, W)
    assert linear_w.degree() <= 1
    slope_w = linear_w.coeff_monomial(W)
    constant_w = linear_w.coeff_monomial(1)
    # The correlated lower endpoint is low_num/B.  Construct its cleared
    # numerator directly; this is exactly equivalent to rational cancellation
    # but avoids a costly generic simplify.
    low_num = sp.expand((d - 1) * C(d, 2) + (B - d + 1) * B)
    for name, boundary in (
        ("low", sp.expand(slope_w * low_num + constant_w * B)),
        ("high", sp.expand(slope_w * high + constant_w)),
    ):
        boundary = sp.Poly(boundary, y)
        assert boundary.degree() <= 1
        boundaries[name] = (
            sp.expand(boundary.coeff_monomial(1)),
            sp.expand(boundary.coeff_monomial(y)),
        )

    H, A, E, Q, L, u = sp.symbols("H A E Q L u", nonnegative=True)
    assert targets and all(value in (4, 5) for value in targets)
    for jvalue in targets:
        threshold = 2 * jvalue - 2
        for dvalue in range(1, jvalue + 1):
            for svalue in range(dvalue):
                def cleared_expression(hvalue, qvalue, lvalue, wname):
                    Rvalue = dvalue * qvalue + svalue
                    Nvalue = 2 * hvalue + dvalue + Rvalue + lvalue
                    Svalue = Nvalue - dvalue
                    Kvalue = Svalue - qvalue
                    top = C(Svalue, jvalue)
                    center = ((dvalue - svalue) * C(Kvalue - jvalue + 2, jvalue - 1)
                              + svalue * C(Kvalue - jvalue + 1, jvalue - 1))
                    cap_denominator = sp.expand(top + center)
                    b0, b1 = boundaries[wname]
                    substitution = {
                        j: jvalue,
                        r: Nvalue - jvalue,
                        h: hvalue,
                        d: dvalue,
                        R: Rvalue,
                    }
                    b0 = b0.subs(substitution, simultaneous=True)
                    b1 = b1.subs(substitution, simultaneous=True)
                    return sp.expand(b0 * cap_denominator + b1 * top)

                if dvalue == 1:
                    for wname in ("low", "high"):
                        expression = cleared_expression(jvalue - 1 + H, Q, L, wname)
                        coefficient_check(
                            f"j{jvalue}_d1_active_hhigh_{wname}", expression,
                            (), (H, Q, L),
                        )
                    for hvalue in range(1, jvalue - 1):
                        l0 = threshold - 2 * hvalue
                        for wname in ("low", "high"):
                            expression = cleared_expression(hvalue, Q, l0 + E, wname)
                            coefficient_check(
                                f"j{jvalue}_d1_h{hvalue}_active_{wname}", expression,
                                (), (Q, E),
                            )
                    continue

                qmap = A * u / (dvalue - 1)
                lmap = A * (1 - u)
                for wname in ("low", "high"):
                    expression = cleared_expression(jvalue - 1 + H, qmap, lmap, wname)
                    coefficient_check(
                        f"j{jvalue}_d{dvalue}_s{svalue}_active_hhigh_{wname}",
                        expression, (u,), (H, A),
                    )
                for hvalue in range(1, jvalue - 1):
                    a0 = max(0, threshold - 2 * hvalue - svalue)
                    amap = a0 + E
                    qmap = amap * u / (dvalue - 1)
                    lmap = amap * (1 - u)
                    for wname in ("low", "high"):
                        expression = cleared_expression(hvalue, qmap, lmap, wname)
                        coefficient_check(
                            f"j{jvalue}_d{dvalue}_s{svalue}_h{hvalue}_active_{wname}",
                            expression, (u,), (E,),
                        )


if __name__ == "__main__":
    main()
