#!/usr/bin/env python3
"""Exact conditional D5-concavity at the root and D6 endpoints.

After concavity reduces h5/c5, h6/c6, and D6 to endpoints, write y=c6.
The two D6 endpoints give

    c7 = (12*y^2/c5 - k*y)/14,  k in {1,7}.

Since y=(1-D5)c5^2/c4 is affine in D5 for fixed earlier data, a
nonpositive second y-derivative reduces D5 to its two endpoints.
"""

from __future__ import annotations

import sympy as sp

from verify_rank7_terminal_broom_middle_differences import D4_CEILING
from verify_rank7_terminal_broom_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)


def main() -> int:
    y, C, Y = sp.symbols("y C Y", nonnegative=True)
    n = sp.symbols("n", integer=True, positive=True)
    w_high = 3 * (n - 1) / ((n - 3) * (n - 4))
    assert sp.factor(
        w_high
        - w_high.subs(n, n + 1)
        - 3 * (n + 2) / ((n - 4) * (n - 3) * (n - 2))
    ) == 0
    w39 = sp.factor(w_high.subs(n, 39))
    x39 = sp.factor(4 * w39 / (3 * (1 - w39)))
    assert w39 == sp.Rational(19, 210)
    assert x39 == sp.Rational(76, 573)
    assert sp.factor((1 - D4_CEILING) / x39) >= 4
    print("n>=39 core consequence: c5/c4 >=", sp.factor((1-D4_CEILING)/x39), ">= 4")
    coefficients = newton_coefficients(exact_decomposition())
    variables = (*c[:6], y)
    failures = 0
    for rank in range(3, 7):
        for s_num in (1, 2):
            root_s = sp.Rational(s_num, 2)
            for d_num in (1, 2):
                root_d = sp.Rational(d_num, 2)
                for k in (1, 7):
                    endpoint = coefficients[rank].subs(
                        {
                            c[6]: y,
                            c[7]: (12 * y**2 / c[5] - k * y) / 14,
                            h[5]: root_s * c[5],
                            h[6]: root_d * y,
                        },
                        simultaneous=True,
                    )
                    curvature = sp.cancel(-sp.diff(endpoint, y, 2))
                    numerator, denominator = sp.fraction(curvature)
                    polynomial = sp.Poly(sp.expand(numerator), *variables, domain=sp.QQ)
                    signs = {sp.sign(value) for _, value in polynomial.terms()}
                    denominator_poly = sp.Poly(denominator, *variables, domain=sp.QQ)
                    assert all(value >= 0 for _, value in denominator_poly.terms())
                    if any(value < 0 for _, value in polynomial.terms()):
                        # The only coefficientwise failures occur for Delta^3.
                        # Use the exact upper D5 endpoint
                        #   D5 <= 1/6 + c4/(2c5)
                        # and the n>=39 consequence c5>=4c4, with slacks Y,C.
                        constrained = sp.cancel(
                            curvature.subs(
                                y,
                                5 * c[5] ** 2 / (6 * c[4]) - c[5] / 2 + Y,
                            ).subs(c[5], 4 * c[4] + C)
                        )
                        constrained_numerator, constrained_denominator = sp.fraction(
                            constrained
                        )
                        constrained_variables = (*c[:4], c[4], C, Y)
                        constrained_poly = sp.Poly(
                            sp.expand(constrained_numerator),
                            *constrained_variables,
                            domain=sp.QQ,
                        )
                        constrained_denominator_poly = sp.Poly(
                            constrained_denominator,
                            *constrained_variables,
                            domain=sp.QQ,
                        )
                        if not all(
                            value >= 0 for _, value in constrained_poly.terms()
                        ) or not all(
                            value >= 0
                            for _, value in constrained_denominator_poly.terms()
                        ):
                            failures += 1
                            print(
                                "FAIL",
                                rank,
                                s_num,
                                d_num,
                                k,
                                "terms",
                                len(polynomial.terms()),
                                "signs",
                                signs,
                                "factor",
                                sp.factor(curvature),
                            )
                        else:
                            print(
                                "PASS_CONSTRAINED",
                                rank,
                                s_num,
                                d_num,
                                k,
                                "terms",
                                len(constrained_poly.terms()),
                                "degrees",
                                constrained_poly.degree_list(),
                            )
                    else:
                        print(
                            "PASS",
                            rank,
                            s_num,
                            d_num,
                            k,
                            "terms",
                            len(polynomial.terms()),
                            "degrees",
                            polynomial.degree_list(),
                        )
    if failures:
        print("COEFFICIENTWISE_FAILURES", failures)
        return 1
    print("RANK7_MIDDLE_D5_CONCAVITY_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
