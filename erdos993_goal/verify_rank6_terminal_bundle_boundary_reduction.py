#!/usr/bin/env python3
"""Verify the reduced boundary problem for R_1 and Delta R_1.

After the middle and high Newton coefficients are discharged, only
the first two coefficients of the terminal-broom residual remain.
This file checks their exact normalized forms and the structural
inequalities that reduce their proof to a bounded rooted cone.
"""

from __future__ import annotations

import sympy as sp

from verify_rank6_terminal_bundle_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)


X, D, r, q, Z = sp.symbols("X D r q Z", real=True)
n, m, u, Y = sp.symbols("n m u Y", positive=True)
E = sp.symbols("E", real=True)


def choose(variable, rank: int):
    return (
        sp.prod(variable - offset for offset in range(rank))
        / sp.factorial(rank)
    )


def normalized_boundaries():
    coefficients = newton_coefficients(exact_decomposition())
    common = {
        c[4]: X,
        c[5]: 1,
        c[6]: (1 - D) / X,
        h[4]: r * X,
        h[5]: q,
    }
    residual = sp.expand(coefficients[0].subs(common))
    first_difference = sp.expand(
        coefficients[1].subs({**common, c[3]: Z * X})
    )
    assert not any(
        variable in residual.free_symbols
        for variable in (*c, *h)
    )
    assert not any(
        variable in first_difference.free_symbols
        for variable in (*c, *h)
    )
    return residual, first_difference


def concavity_checks(residual, first_difference) -> None:
    assert sp.expand(
        sp.diff(residual, D, 2) + 144 * r * (r + 1)
    ) == 0
    assert sp.expand(
        sp.diff(residual, q, 2)
        - 4 * (X * r - 35 * X - 35)
    ) == 0
    assert sp.expand(
        sp.diff(first_difference, D, 2)
        + 144 * r * (Z + 1)
    ) == 0
    assert sp.expand(
        sp.diff(first_difference, q, 2)
        + 140 * X * (Z + 1)
    ) == 0
    assert sp.expand(
        sp.diff(first_difference, r, 2)
        - 12 * X * (14 * D - X**2 - 15 * X - 14)
    ) == 0

    # The two-extension ceiling D<=1/6+X/2 makes the final
    # r-curvature strictly negative.
    r_curvature_upper = sp.factor(
        (
            14 * D - X**2 - 15 * X - 14
        ).subs(D, sp.Rational(1, 6) + X / 2)
    )
    assert sp.expand(
        r_curvature_upper
        + X**2
        + 8 * X
        + sp.Rational(35, 3)
    ) == 0


def two_extension_ceiling() -> None:
    d, e, f = sp.symbols("d e f", positive=True)
    two_extension_lower = (
        sp.Rational(5, 6) * e**2 / d - e / 2
    )
    defect = 1 - d * f / e**2
    endpoint = sp.factor(defect.subs(f, two_extension_lower))
    assert sp.factor(
        endpoint - sp.Rational(1, 6) - d / (2 * e)
    ) == 0


def adjacent_ratio_coupling() -> None:
    """Check the exact rank-4 defect parametrization used at infinity."""
    z_from_defect = X * (1 - E)
    e_lower = (2 + X) / (10 + X)
    e_upper = (1 + 3 * X) / (3 * (2 + X))

    # E >= (2+Z)/10 is equivalent to E >= e_lower.
    assert sp.factor(
        e_lower - (2 + z_from_defect.subs(E, e_lower)) / 10
    ) == 0

    # E <= 1/6+Z/2 is equivalent to E <= e_upper.
    assert sp.factor(
        e_upper
        - sp.Rational(1, 6)
        - z_from_defect.subs(E, e_upper) / 2
    ) == 0


def rooted_parameterization(residual, first_difference):
    # F=A-N[root], a=i3(F), b=i4(F), d=i4(A), e=i5(A).
    # Put u=a/d and Y=b/a.  Then r=1-u and q=1-X*u*Y.
    rooted = {
        r: 1 - u,
        q: 1 - X * u * Y,
    }
    residual_rooted = sp.expand(residual.subs(rooted))
    first_rooted = sp.expand(first_difference.subs(rooted))

    # The whole-tree path lower bound d>=C(n-3,4), the trivial
    # a<=C(m,3), and the deletion half bound give the u interval.
    path_i4 = choose(n - 3, 4)
    u_combinatorial_upper = sp.factor(choose(m, 3) / path_i4)

    # The proved forest ratio bound and the two-extension inequality
    # give two simultaneous lower bounds for Y=b/a.
    forest_ratio_lower = sp.factor(
        (m**2 - 10 * m + 15) / (4 * (m - 1))
    )
    extension_ratio_lower = sp.factor(
        sp.Rational(3, 4)
        * (u * path_i4 / choose(m, 2) - 1)
    )

    # Whole-tree coefficient intervals used by the boundary proof.
    x_lower = sp.factor(5 / (n - 5))
    x_upper = sp.factor(
        5 * (n - 3) / ((n - 7) * (n - 8))
    )
    z_lower = sp.factor(4 / (n - 4))
    z_upper = sp.factor(
        4 * (n - 2) / ((n - 5) * (n - 6))
    )

    return {
        "residual_rooted": residual_rooted,
        "first_difference_rooted": first_rooted,
        "u_combinatorial_upper": u_combinatorial_upper,
        "forest_ratio_lower": forest_ratio_lower,
        "extension_ratio_lower": extension_ratio_lower,
        "x_lower": x_lower,
        "x_upper": x_upper,
        "z_lower": z_lower,
        "z_upper": z_upper,
    }


def main() -> int:
    residual, first_difference = normalized_boundaries()
    concavity_checks(residual, first_difference)
    two_extension_ceiling()
    adjacent_ratio_coupling()
    data = rooted_parameterization(residual, first_difference)
    print("rank-6 terminal-bundle boundary reduction: PASS")
    print("R1 normalized =", sp.factor(residual))
    print("Delta R1 normalized =", sp.factor(first_difference))
    for name in (
        "u_combinatorial_upper",
        "forest_ratio_lower",
        "extension_ratio_lower",
        "x_lower",
        "x_upper",
        "z_lower",
        "z_upper",
    ):
        print(name, "=", data[name])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
