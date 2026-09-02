#!/usr/bin/env python3
"""Exact certificate for three-quarters PGC at rank 3 on all forests.

The connected case is certified separately in
``verify_rank3_three_quarters_trees.py``.  This script proves the
disconnected case by exact symbolic moment bounds and also handles a
pendant K2 component.
"""

from __future__ import annotations

from math import comb

import sympy as sp


def bernstein_coefficients(
    expression: sp.Expr,
    variable: sp.Symbol,
) -> list[sp.Expr]:
    polynomial = sp.Poly(sp.expand(expression), variable)
    degree = polynomial.degree()
    return [
        sp.expand(
            sum(
                polynomial.coeff_monomial(variable**power)
                * sp.Rational(
                    comb(index, power),
                    comb(degree, power),
                )
                for power in range(index + 1)
            )
        )
        for index in range(degree + 1)
    ]


def assert_nonnegative_power_coefficients(
    expression: sp.Expr,
    variables: tuple[sp.Symbol, ...],
) -> int:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    assert polynomial.as_expr() != 0
    assert all(
        coefficient >= 0
        for _, coefficient in polynomial.terms()
    )
    return len(polynomial.terms())


def shifted_power_check(
    expression: sp.Expr,
    variables: tuple[sp.Symbol, ...],
    root: tuple[int, ...],
) -> int:
    substitution = {
        variable: variable + offset
        for variable, offset in zip(variables, root)
    }
    return assert_nonnegative_power_coefficients(
        sp.expand(expression.subs(substitution)),
        variables,
    )


def main() -> None:
    n, e, c, h = sp.symbols(
        "n e c h", integer=True, nonnegative=True
    )
    z_stat, t_stat, d, s_stat = sp.symbols(
        "Z T d S", integer=True, nonnegative=True
    )

    i2 = n * (n - 1) / 2 - e
    i3 = (
        n * (n - 1) * (n - 2) / 6
        - e * (n - 2)
        + z_stat
    )
    i4 = (
        n * (n - 1) * (n - 2) * (n - 3) / 24
        - e * (n - 2) * (n - 3) / 2
        + z_stat * (n - 3)
        + e * (e - 1) / 2
        - z_stat
        - t_stat
    )
    g3 = sp.expand(3 * i3**2 + i2 * i3 - 4 * i2 * i4)

    nf = n - 2
    ef = e - d
    zf = z_stat - d * (d - 1) / 2 - s_stat
    f2 = nf * (nf - 1) / 2 - ef
    f3 = (
        nf * (nf - 1) * (nf - 2) / 6
        - ef * (nf - 2)
        + zf
    )
    g2f = sp.expand(2 * f2**2 + nf * f2 - 3 * nf * f3)
    cleared_gap = sp.expand(9 * nf * g3 - 8 * i2 * g2f)

    # Let h be the number of nontrivial components and c the total
    # number of components.  For x_v=deg(v)-1 over nonisolated
    # vertices, E=sum x_v=e-h.
    m2, m3, j_stat, x = sp.symbols(
        "M2 M3 J x", nonnegative=True
    )
    excess = e - h
    moment_gap = sp.expand(
        cleared_gap.subs(
            {
                n: e + c,
                z_stat: (m2 + excess) / 2,
                t_stat: (m3 - excess) / 6 + j_stat,
                d: x + 1,
            }
        )
    )

    k2 = (e + c) ** 2 - (e + c) - 2 * e
    assert sp.factor(
        sp.diff(moment_gap, j_stat)
        - 18 * (e + c - 2) * k2
    ) == 0
    assert sp.factor(
        sp.diff(moment_gap, s_stat)
        + 12 * (e + c - 2) * k2
    ) == 0
    assert sp.factor(
        sp.diff(moment_gap, m3)
        - 3 * (e + c - 2) * k2
    ) == 0

    # If x>=1, J>=xS, so the J,S contribution is nonnegative:
    # 18J-12S = (18-12/x)J + (12/x)(J-xS).
    relaxed = sp.expand(
        moment_gap.subs({j_stat: 0, s_stat: 0})
    )

    # Moment region 1: E <= M2 <= 2E and
    # M3 >= 3M2-2E.  Write M2=E(1+t).
    t = sp.symbols("t", nonnegative=True)
    region1 = sp.expand(
        relaxed.subs(
            {
                m2: excess * (1 + t),
                m3: excess * (1 + 3 * t),
            }
        )
    )

    big_h, isolates, other, local = sp.symbols(
        "H v a X", nonnegative=True
    )
    h_many_substitution = {
        h: 2 + big_h,
        c: 2 + big_h + isolates,
        x: 1 + local,
        e: 3 + local + other + big_h,
    }
    isolate_substitution = {
        h: 1,
        c: 2 + isolates,
        x: 1 + local,
        e: 2 + local + other,
    }

    # Rank 3 in the prefix implies alpha>=6.  A forest with an edge then
    # has n>=7.  In the h>=2 case this is
    # X+a+2H+v>=2; in the h=1 case it is X+a+v>=3.
    roots_h_many = [
        (2, 0, 0, 0),
        (0, 2, 0, 0),
        (0, 0, 1, 0),
        (0, 0, 0, 2),
        (1, 1, 0, 0),
        (1, 0, 0, 1),
        (0, 1, 0, 1),
    ]
    roots_isolate = [
        (first, second, 3 - first - second)
        for first in range(4)
        for second in range(4 - first)
    ]

    region1_h_many = bernstein_coefficients(
        region1.subs(h_many_substitution),
        t,
    )
    region1_isolate = bernstein_coefficients(
        region1.subs(isolate_substitution),
        t,
    )
    assert len(region1_h_many) == 3
    assert len(region1_isolate) == 3

    coefficient_checks = 0
    h_many_variables = (local, other, big_h, isolates)
    isolate_variables = (local, other, isolates)
    for coefficient in region1_h_many:
        for root in roots_h_many:
            coefficient_checks += shifted_power_check(
                coefficient,
                h_many_variables,
                root,
            )

    exceptional_roots = {(2, 1, 0), (3, 0, 0)}
    for coefficient in region1_isolate:
        for root in roots_isolate:
            if root not in exceptional_roots:
                coefficient_checks += shifted_power_check(
                    coefficient,
                    isolate_variables,
                    root,
                )

        # In the (2,1,0) orthant, the origin is infeasible in region 1;
        # every other lattice point lies in one of these three shifts.
        for root in ((3, 1, 0), (2, 2, 0), (2, 1, 1)):
            coefficient_checks += shifted_power_check(
                coefficient,
                isolate_variables,
                root,
            )

        # In the (3,0,0) orthant, feasibility requires a>=1.
        coefficient_checks += shifted_power_check(
            coefficient,
            isolate_variables,
            (3, 1, 0),
        )

    # Moment region 2: M2>=2E and M3>=M2^2/E.  The relaxed lower bound is
    # a convex quadratic in M2.  Certify its unconstrained vertex value.
    quadratic_a = sp.factor(
        sp.diff(relaxed, m2, 2) / 2
        + sp.diff(relaxed, m3) / excess
    )
    quadratic_b = sp.expand(
        sp.diff(relaxed, m2).subs(m2, 0)
    )
    quadratic_d = sp.expand(
        relaxed.subs({m2: 0, m3: 0})
    )
    vertex_value = sp.factor(
        quadratic_d
        - quadratic_b**2 / (4 * quadratic_a)
    )
    vertex_numerator, vertex_denominator = sp.together(
        vertex_value
    ).as_numer_denom()
    assert sp.factor(
        vertex_denominator
        - 16
        * (
            4 * c**2
            + 8 * c * e
            - 4 * c
            + 4 * e**2
            - 3 * e
            - 9 * h
        )
    ) == 0

    vertex_h_many = sp.expand(
        vertex_numerator.subs(h_many_substitution)
    )
    vertex_isolate = sp.expand(
        vertex_numerator.subs(isolate_substitution)
    )
    for root in roots_h_many:
        coefficient_checks += shifted_power_check(
            vertex_h_many,
            h_many_variables,
            root,
        )
    for root in roots_isolate:
        if root not in exceptional_roots:
            coefficient_checks += shifted_power_check(
                vertex_isolate,
                isolate_variables,
                root,
            )

    # Cover every non-origin lattice point in the first exceptional
    # orthant.
    for root in ((3, 1, 0), (2, 2, 0), (2, 1, 1)):
        coefficient_checks += shifted_power_check(
            vertex_isolate,
            isolate_variables,
            root,
        )

    # Cover the second exceptional orthant except its first two points on
    # the X-axis.
    for root in ((3, 1, 0), (3, 0, 1), (5, 0, 0)):
        coefficient_checks += shifted_power_check(
            vertex_isolate,
            isolate_variables,
            root,
        )

    # At the three uncovered tuples the quadratic vertex is below the
    # feasible moment interval.  The moment itself is forced, and the
    # exact boundary lower bounds are positive.
    region2 = sp.expand(
        relaxed.subs(m3, m2**2 / excess)
    )
    exceptional_values = []
    for values in (
        {e: 5, c: 2, h: 1, x: 3, m2: 10},
        {e: 5, c: 2, h: 1, x: 4, m2: 16},
        {e: 6, c: 2, h: 1, x: 5, m2: 25},
    ):
        value = sp.factor(region2.subs(values))
        assert value > 0
        exceptional_values.append(value)
    assert exceptional_values == [4119, 12400, 42030]

    # Pendant K2 component: x=0 and S=0.
    #
    # First suppose E>0.  Then another nontrivial component exists, so
    # h>=2.  Put E=1+a, h=2+H, and c=h+v.
    k2_region1_substitution = {
        h: 2 + big_h,
        c: 2 + big_h + isolates,
        e: 3 + other + big_h,
        x: 0,
    }
    k2_region1 = bernstein_coefficients(
        region1.subs(k2_region1_substitution),
        t,
    )
    for coefficient in k2_region1:
        coefficient_checks += (
            assert_nonnegative_power_coefficients(
                coefficient,
                (other, big_h, isolates),
            )
        )

    k2_vertex_numerator = sp.expand(
        vertex_numerator.subs(k2_region1_substitution)
    )
    coefficient_checks += assert_nonnegative_power_coefficients(
        k2_vertex_numerator,
        (other, big_h, isolates),
    )
    k2_denominator = sp.factor(
        vertex_denominator.subs(k2_region1_substitution)
    )
    assert sp.factor(
        k2_denominator
        - 16
        * (
            16 * big_h**2
            + 16 * big_h * other
            + 16 * big_h * isolates
            + 64 * big_h
            + 4 * other**2
            + 8 * other * isolates
            + 37 * other
            + 4 * isolates**2
            + 36 * isolates
            + 65
        )
    ) == 0

    # If E=0, every nontrivial component is K2.  Then alpha=c.  Rank 3
    # requires c>=6.  Put c=6+y and h=1+u(c-1), so 0<=u<=1.
    alpha, y, u = sp.symbols(
        "alpha y u", nonnegative=True
    )
    matching_gap = sp.factor(
        cleared_gap.subs(
            {
                n: 2 * h + (alpha - h),
                e: h,
                z_stat: 0,
                t_stat: 0,
                d: 1,
                s_stat: 0,
            }
        )
    )
    matching_transformed = sp.expand(
        matching_gap.subs(
            {
                alpha: 6 + y,
                h: 1 + u * (5 + y),
            }
        )
    )
    matching_bernstein = bernstein_coefficients(
        matching_transformed,
        u,
    )
    assert len(matching_bernstein) == 7
    for coefficient in matching_bernstein:
        coefficient_checks += (
            assert_nonnegative_power_coefficients(
                coefficient,
                (y,),
            )
        )

    print("PASS")
    print(
        "3 H_3(I(G)) >= 4 H_2(I(F)) for every forest whenever "
        "rank 3 is in the prefix."
    )
    print(
        f"Checked {coefficient_checks:,} exact nonnegative power "
        "coefficients across the orthant/Bernstein certificates."
    )
    print(
        "Exceptional feasible boundary lower bounds:",
        ", ".join(str(value) for value in exceptional_values),
    )


if __name__ == "__main__":
    main()
