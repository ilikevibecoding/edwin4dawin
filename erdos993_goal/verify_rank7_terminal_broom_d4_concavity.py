#!/usr/bin/env python3
"""Exact conditional D4-concavity at all later-coordinate endpoints.

At a D5 endpoint, with y=c5 and fixed c4,

    c6 = (10*y^2/c4 - ell*y)/12,  ell in {1,6}.

At a D6 endpoint, c7=(12*c6^2/y-k*c6)/14, k in {1,7}.  Since
y=(1-D4)c4^2/c3 is affine in D4, a nonpositive second y-derivative
reduces D4 to its endpoints.
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
    y = sp.symbols("y", nonnegative=True)
    Y1, Y2, Y3, Y4, Y5 = sp.symbols("Y1:6", nonnegative=True)
    n = sp.symbols("n", integer=True, positive=True)
    ratio21 = (n - 1) * (n - 2) / (2 * n)
    assert sp.factor(
        ratio21.subs(n, n + 1)
        - ratio21
        - (n**2 + n + 2) / (2 * n * (n + 1))
    ) == 0
    assert ratio21.subs(n, 39) >= 18
    w39 = sp.Rational(19, 210)
    x39 = sp.Rational(76, 573)
    assert 1 / w39 >= 11
    assert 1 / x39 >= 7
    assert (1 - D4_CEILING) / x39 >= 4
    print("n>=39 hierarchy: c1>=39c0,c2>=18c1,c3>=11c2,c4>=7c3,c5>=4c4")
    coefficients = newton_coefficients(exact_decomposition())
    variables = (*c[:5], y)
    failures = 0
    for rank in range(3, 7):
        for s_num in (1, 2):
            root_s = sp.Rational(s_num, 2)
            for d_num in (1, 2):
                root_d = sp.Rational(d_num, 2)
                for ell in (1, 6):
                    c6_value = (10 * y**2 / c[4] - ell * y) / 12
                    for k in (1, 7):
                        c7_value = (12 * c6_value**2 / y - k * c6_value) / 14
                        endpoint = coefficients[rank].subs(
                            {
                                c[5]: y,
                                c[6]: c6_value,
                                c[7]: c7_value,
                                h[5]: root_s * y,
                                h[6]: root_d * c6_value,
                            },
                            simultaneous=True,
                        )
                        curvature = sp.cancel(-sp.diff(endpoint, y, 2))
                        numerator, denominator = sp.fraction(curvature)
                        polynomial = sp.Poly(
                            sp.expand(numerator), *variables, domain=sp.QQ
                        )
                        denominator_poly = sp.Poly(
                            denominator, *variables, domain=sp.QQ
                        )
                        positive = all(
                            value >= 0 for _, value in polynomial.terms()
                        ) and all(
                            value >= 0 for _, value in denominator_poly.terms()
                        )
                        if not positive:
                            # Use exact n>=39 coefficient-ratio consequences:
                            # c1>=39c0, c2>=18c1, c3>=11c2,
                            # c4>=7c3, and c5=y>=4c4.
                            constrained = curvature
                            for old, new in (
                                (y, 4 * c[4] + Y5),
                                (c[4], 7 * c[3] + Y4),
                                (c[3], 11 * c[2] + Y3),
                                (c[2], 18 * c[1] + Y2),
                                (c[1], 39 * c[0] + Y1),
                            ):
                                constrained = sp.cancel(constrained.subs(old, new))
                            constrained_numerator, constrained_denominator = sp.fraction(
                                constrained
                            )
                            constrained_variables = (c[0], Y1, Y2, Y3, Y4, Y5)
                            constrained_poly = sp.Poly(
                                sp.expand(constrained_numerator),
                                *constrained_variables,
                                domain=sp.QQ,
                            )
                            constrained_denominator_poly = sp.Poly(
                                sp.expand(constrained_denominator),
                                *constrained_variables,
                                domain=sp.QQ,
                            )
                            constrained_positive = all(
                                value >= 0 for _, value in constrained_poly.terms()
                            ) and all(
                                value >= 0
                                for _, value in constrained_denominator_poly.terms()
                            )
                            if constrained_positive:
                                print(
                                    "PASS_CONSTRAINED",
                                    rank,
                                    s_num,
                                    d_num,
                                    ell,
                                    k,
                                    "terms",
                                    len(constrained_poly.terms()),
                                    "degrees",
                                    constrained_poly.degree_list(),
                                )
                            else:
                                failures += 1
                                signs = {
                                    sp.sign(value)
                                    for _, value in constrained_poly.terms()
                                }
                                print(
                                    "FAIL",
                                    rank,
                                    s_num,
                                    d_num,
                                    ell,
                                    k,
                                    "terms",
                                    len(constrained_poly.terms()),
                                    "signs",
                                    signs,
                                )
                        else:
                            print(
                                "PASS",
                                rank,
                                s_num,
                                d_num,
                                ell,
                                k,
                                "terms",
                                len(polynomial.terms()),
                                "degrees",
                                polynomial.degree_list(),
                            )
    if failures:
        print("COEFFICIENTWISE_FAILURES", failures)
        return 1
    print("RANK7_MIDDLE_D4_CONCAVITY_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
