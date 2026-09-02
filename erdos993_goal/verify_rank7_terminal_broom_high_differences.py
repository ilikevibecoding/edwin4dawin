#!/usr/bin/env python3
"""Exact sign certificate for Delta^8 through Delta^13 of rank-7 R_t.

The proof uses only identities for a tree A of order n, ordinary
extension counting, and the sharp path/star bounds at rank three.
It is valid for every rooted tree core of order n >= 15.
"""

from __future__ import annotations

import sympy as sp

from verify_rank7_terminal_broom_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)


n, a, b, x = sp.symbols("n a b x", nonnegative=True)


def choose(variable, rank: int):
    return sp.prod(variable - offset for offset in range(rank)) / sp.factorial(rank)


def specialized_coefficients():
    coefficients = newton_coefficients(exact_decomposition())
    substitutions = {
        c[0]: 1,
        c[1]: n,
        c[2]: (n - 1) * (n - 2) / 2,
        # If J=A-N[root], then a=i_4(J), b=i_5(J).
        h[5]: c[5] - a,
        h[6]: c[6] - b,
    }
    return [sp.factor(value.subs(substitutions, simultaneous=True)) for value in coefficients]


def exact_factors(coefficients):
    brackets = {}
    expected = {
        13: -12012 * c[6] * (a - c[5]),
        12: -15708 * c[6] * (a - c[5]) * (n + 3),
        11: 462
        * c[6]
        * (a - c[5])
        * (12 * c[3] - 2 * n**3 - 3 * n**2 - 137 * n - 157),
        10: 21
        * c[6]
        * (a - c[5])
        * (
            24 * c[3] * n
            + 1174 * c[3]
            + 240 * c[4]
            - 14 * n**4
            - 163 * n**3
            - 129 * n**2
            - 5024 * n
            - 2538
        ),
    }
    for rank, expected_value in expected.items():
        assert sp.expand(coefficients[rank] - expected_value) == 0

    brackets[9] = (
        56 * c[3] * n**2
        - 356 * c[3] * n
        - 4228 * c[3]
        - 160 * c[4] * n
        - 2000 * c[4]
        - 320 * c[5]
        + 133 * n**4
        + 238 * n**3
        + 441 * n**2
        + 8596 * n
        + 1652
    )
    assert sp.expand(
        coefficients[9]
        + sp.Rational(21, 2) * c[6] * (a - c[5]) * brackets[9]
    ) == 0

    brackets[8] = (
        32 * a
        + 168 * c[3] ** 2
        + (714 * n**2 - 3234 * n - 11340) * c[3]
        - (1992 * n + 9936) * c[4]
        - (480 * n + 3560) * c[5]
        - 480 * c[6]
        + 735 * n**4
        - 1260 * n**3
        + 3465 * n**2
        + 10080 * n
        + 756
    )
    assert sp.expand(
        coefficients[8]
        + sp.Rational(7, 2) * c[6] * (a - c[5]) * brackets[8]
    ) == 0
    return brackets


def sign_certificate(brackets):
    # Delta^11 and Delta^10: replace positive c3,c4 terms by the
    # trivial complete-graph upper bounds.
    upper11 = sp.factor(
        (12 * c[3] - 2 * n**3 - 3 * n**2 - 137 * n - 157).subs(
            c[3], choose(n, 3)
        )
    )
    assert upper11 == -9 * n**2 - 133 * n - 157

    upper10 = sp.factor(
        (
            24 * c[3] * n
            + 1174 * c[3]
            + 240 * c[4]
            - 14 * n**4
            - 163 * n**3
            - 129 * n**2
            - 5024 * n
            - 2538
        ).subs({c[3]: choose(n, 3), c[4]: choose(n, 4)})
    )
    assert sp.expand(
        upper10
        + sp.Rational(2, 3)
        * (59 * n**3 + 897 * n**2 + 7039 * n + 3807)
    ) == 0

    # Delta^9: extension counting gives
    # 4c4 <= (n-3)c3 and 5c5 <= (n-4)c4.  The resulting
    # coefficient of c3 is negative, so c3<=C(n,3) finishes it.
    lower9 = sp.factor(
        brackets[9].subs(
            {
                c[4]: (n - 3) * c[3] / 4,
                c[5]: (n - 4) * (n - 3) * c[3] / 20,
            },
            simultaneous=True,
        )
    )
    coefficient9 = sp.factor(sp.diff(lower9, c[3]))
    assert sp.expand(coefficient9 + 8 * (78 * n + 365)) == 0
    lower9_final = sp.factor(lower9.subs(c[3], choose(n, 3)))
    assert sp.expand(
        lower9_final
        - sp.Rational(1, 3)
        * (
            87 * n**4
            + 190 * n**3
            + 5079 * n**2
            + 22868 * n
            + 4956
        )
    ) == 0

    # Delta^8: discard 32a.  Bound c4,c5,c6 successively by
    # extension counting.  What remains is f_n(c3)=168c3^2+L_n c3+P_n.
    lower8 = sp.factor(
        (brackets[8] - 32 * a).subs(
            {
                c[4]: (n - 3) * x / 4,
                c[5]: (n - 4) * (n - 3) * x / 20,
                c[6]: (n - 5) * (n - 4) * (n - 3) * x / 120,
                c[3]: x,
            },
            simultaneous=True,
        )
    )
    coefficient8 = -2 * (14 * n**3 - 127 * n**2 + 1727 * n + 2892)
    constant8 = 735 * n**4 - 1260 * n**3 + 3465 * n**2 + 10080 * n + 756
    assert sp.expand(lower8 - (168 * x**2 + coefficient8 * x + constant8)) == 0

    # Sharp coefficientwise path minimality gives c3>=C(n-2,3).
    # The derivative at that endpoint is positive for n>=15, hence
    # f_n is increasing throughout the actual interval.
    path_c3 = choose(n - 2, 3)
    derivative_at_path = sp.factor(sp.diff(lower8, x).subs(x, path_c3))
    assert sp.expand(
        derivative_at_path - 2 * (14 * n**3 - 125 * n**2 - 999 * n - 3564)
    ) == 0
    shifted_derivative = sp.Poly(
        sp.expand((derivative_at_path / 2).subs(n, n + 15)), n
    )
    assert shifted_derivative.all_coeffs() == [14, 505, 4701, 576]

    lower8_final = sp.factor(lower8.subs(x, path_c3))
    assert sp.expand(
        lower8_final
        - sp.Rational(1, 3)
        * (
            n**5
            + 833 * n**4
            + 5285 * n**3
            + 3985 * n**2
            - 20976 * n
            + 79740
        )
    ) == 0
    shifted8 = sp.Poly(sp.expand(lower8_final.subs(n, n + 15)), n)
    assert shifted8.all_coeffs() == [
        sp.Rational(1, 3),
        sp.Rational(908, 3),
        sp.Rational(57515, 3),
        sp.Rational(1400110, 3),
        5054858,
        20476200,
    ]

    return {
        "Delta11_upper_bracket": upper11,
        "Delta10_upper_bracket": upper10,
        "Delta9_lower_bracket": lower9_final,
        "Delta8_derivative_at_path": derivative_at_path,
        "Delta8_lower_bracket": lower8_final,
    }


def main() -> int:
    coefficients = specialized_coefficients()
    brackets = exact_factors(coefficients)
    bounds = sign_certificate(brackets)
    print("rank-7 terminal-broom Delta^8--Delta^13: CERTIFIED for n>=15")
    for name, value in bounds.items():
        print(name, "=", value)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
