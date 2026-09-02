#!/usr/bin/env python3
"""Certify Delta^7 through Delta^11 of the rank-6 broom residual.

For an n-vertex tree A, c0=1, c1=n, and c2=C(n-1,2).
Writing a=i3(A-N[root]), one has 0<=a<=c4.  The five highest
Newton coefficients of the terminal-broom residual then follow from
only trivial extension counting and c_j<=C(n,j).
"""

from __future__ import annotations

import sympy as sp

from verify_rank6_terminal_bundle_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)


n, a, b = sp.symbols("n a b", positive=True)


def choose(variable, rank: int):
    return (
        sp.prod(variable - offset for offset in range(rank))
        / sp.factorial(rank)
    )


def specialized_coefficients():
    coefficients = newton_coefficients(exact_decomposition())
    substitutions = {
        c[0]: 1,
        c[1]: n,
        c[2]: (n - 1) * (n - 2) / 2,
        h[4]: c[4] - a,
        h[5]: c[5] - b,
    }
    return [
        sp.factor(value.subs(substitutions))
        for value in coefficients
    ]


def exact_factors(coefficients) -> None:
    expected = {
        11: -2772 * c[5] * (a - c[4]),
        10: -252 * c[5] * (a - c[4]) * (15 * n + 37),
        9: (
            126
            * c[5]
            * (a - c[4])
            * (
                12 * c[3]
                - 2 * n**3
                - n**2
                - 109 * n
                - 90
            )
        ),
        8: (
            42
            * c[5]
            * (a - c[4])
            * (
                4 * n * c[3]
                + 144 * c[3]
                + 32 * c[4]
                - 2 * n**4
                - 17 * n**3
                - 479 * n
                - 122
            )
        ),
    }
    for rank, factor in expected.items():
        assert sp.expand(coefficients[rank] - factor) == 0

    bracket7 = (
        8 * a
        + 16 * c[3] * n**2
        - 112 * c[3] * n
        - 892 * c[3]
        - 48 * c[4] * n
        - 472 * c[4]
        - 80 * c[5]
        + 33 * n**4
        + 4 * n**3
        + 73 * n**2
        + 1338 * n
        - 28
    )
    assert sp.expand(
        coefficients[7]
        + sp.Rational(21, 2) * c[5] * (a - c[4]) * bracket7
    ) == 0


def sign_certificate() -> dict[str, sp.Expr]:
    # Delta^9: use c3 <= C(n,3).
    upper9 = sp.factor(
        (
            12 * c[3]
            - 2 * n**3
            - n**2
            - 109 * n
            - 90
        ).subs(c[3], choose(n, 3))
    )
    assert upper9 == -7 * n**2 - 105 * n - 90

    # Delta^8: both positive coefficient terms take their trivial
    # complete-graph upper bounds.
    upper8 = sp.factor(
        (
            4 * n * c[3]
            + 144 * c[3]
            + 32 * c[4]
            - 2 * n**4
            - 17 * n**3
            - 479 * n
            - 122
        ).subs(
            {
                c[3]: choose(n, 3),
                c[4]: choose(n, 4),
            }
        )
    )
    assert upper8 == -3 * n**3 - 56 * n**2 - 439 * n - 122

    # Delta^7: first discard 8a.  Extension counting gives
    #
    #   5c5 <= (n-4)c4,  4c4 <= (n-3)c3.
    #
    # The resulting coefficient of c3 is -(166n+586), so its
    # complete-graph upper bound gives the displayed positive
    # polynomial.
    c3_coefficient = sp.expand(
        16 * n**2
        - 112 * n
        - 892
        - (16 * n + 102) * (n - 3)
    )
    assert c3_coefficient == -166 * n - 586
    lower7 = sp.factor(
        c3_coefficient * choose(n, 3)
        + 33 * n**4
        + 4 * n**3
        + 73 * n**2
        + 1338 * n
        - 28
    )
    assert sp.expand(
        lower7
        - sp.Rational(4, 3)
        * (4 * n**4 - 8 * n**3 + 233 * n**2 + 857 * n - 21)
    ) == 0
    shifted = sp.expand(
        (
            4 * n**4
            - 8 * n**3
            + 233 * n**2
            + 857 * n
            - 21
        ).subs(n, n + 1)
    )
    assert sp.Poly(shifted, n).all_coeffs() == [
        4,
        8,
        233,
        1315,
        1065,
    ]
    return {
        "Delta7_lower_bracket": lower7,
        "Delta8_upper_bracket": upper8,
        "Delta9_upper_bracket": upper9,
    }


def main() -> int:
    coefficients = specialized_coefficients()
    exact_factors(coefficients)
    bounds = sign_certificate()
    print("rank-6 terminal-bundle Delta^7--Delta^11: CERTIFIED")
    for name, value in bounds.items():
        print(name, "=", value)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
