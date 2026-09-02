#!/usr/bin/env python3
"""Certify rank-4 leaf monotonicity for every tree of order at least 120.

The proof normalizes the exact rank-4 leaf-increment polynomial by n^6,
extracts a uniformly positive macroscopic-degree term, and bounds every
lower-order statistic error by explicit structural coefficient norms.
"""

from __future__ import annotations

import sympy as sp


def bernstein_coefficients(poly, variable, degree):
    power = sp.Poly(sp.expand(poly), variable)
    return [
        sp.factor(
            sum(
                power.coeff_monomial(variable**j)
                * sp.binomial(k, j)
                / sp.binomial(degree, j)
                for j in range(power.degree() + 1)
                if j <= k
            )
        )
        for k in range(degree + 1)
    ]


def main() -> int:
    u = sp.symbols("u", positive=True)
    A2, A3, A4, t = sp.symbols(
        "A2 A3 A4 t", nonnegative=True
    )
    Es, Er, Eh, Ew, Ed, Ez, Ey = sp.symbols(
        "Es Er Eh Ew Ed Ez Ey", real=True
    )
    variables = (A2, A3, A4, t, Es, Er, Eh, Ew, Ed, Ez, Ey)

    n, S, R, H, W, d, Z, Y = sp.symbols(
        "n S R H W d Z Y", real=True
    )

    def choose(a, b):
        return sp.prod(a - j for j in range(b)) / sp.factorial(b)

    e = n - 1
    i3 = choose(n, 3) - e * (n - 2) + S
    i4 = (
        choose(n, 4)
        - e * choose(n - 2, 2)
        + S * (n - 4)
        + choose(e, 2)
        - R
    )
    Q = S * (e - 2) - 2 * R - H
    i5 = (
        choose(n, 5)
        - e * choose(n - 2, 3)
        + S * choose(n - 3, 2)
        + (choose(e, 2) - S) * (n - 4)
        - R * (n - 4)
        - Q
        + W
    )
    curvature = sp.expand(576 * i4**2 - 720 * i3 * i5)
    delta = sp.expand(
        curvature.xreplace(
            {
                n: n + 1,
                S: S + d,
                R: R + Z,
                H: H + choose(d, 2),
                W: W + Y,
            }
        )
        - curvature
    )

    # For x_v=deg(v)-1, put A_j=sum_v(x_v/n)^j and
    # t=x_p/n.  The error variables below all have absolute value <=1;
    # the accompanying note proves the stated uniform statistic bounds.
    substitutions = {
        n: 1 / u,
        S: (A2 / 2 + sp.Rational(1, 2) * Es * u) / u**2,
        R: (A3 / 6 + sp.Rational(2, 3) * Er * u) / u**3,
        H: (A3 / 6 + sp.Rational(1, 6) * Eh * u**2) / u**3,
        W: (A4 / 24 + sp.Rational(29, 24) * Ew * u) / u**4,
        d: (t + Ed * u) / u,
        Z: (t**2 / 2 + sp.Rational(3, 2) * Ez * u) / u**2,
        Y: (t**3 / 6 + sp.Rational(8, 3) * Ey * u) / u**3,
    }
    normalized = sp.cancel(delta.subs(substitutions) * u**6)
    leading = (
        21
        - 45 * A2
        + 48 * A3
        - 15 * A4
        - 20 * t**3
        + 36 * t**2
        - 18 * t
    )
    assert sp.expand(normalized.subs(u, 0) - leading) == 0

    # If r in [0,1], then
    # 45r^2-48r^3+15r^4 <= (53/4)r.
    # Positivity is certified by the degree-30 Bernstein coefficients.
    r = sp.symbols("r", nonnegative=True)
    moment_majorant = (
        sp.Rational(53, 4) - 45 * r + 48 * r**2 - 15 * r**3
    )
    moment_bernstein = bernstein_coefficients(
        moment_majorant, r, 30
    )
    assert min(moment_bernstein) > 0

    # h(t)=20t^3-36t^2+18t has its maximum at
    # (6-sqrt(6))/10, where it is 54/25+6sqrt(6)/25 < 11/4.
    h = 20 * t**3 - 36 * t**2 + 18 * t
    t_max = (6 - sp.sqrt(6)) / 10
    assert sp.factor(sp.diff(h, t).subs(t, t_max)) == 0
    h_max = sp.simplify(h.subs(t, t_max))
    assert h_max == sp.Rational(54, 25) + 6 * sp.sqrt(6) / 25
    # 24*sqrt(6) < 59 because the difference of squares is 25.
    assert 59**2 - 24**2 * 6 == 25
    assert float(h_max) < sp.Rational(11, 4)

    # Since sum_v x_v/n=(n-2)/n<=1, the two bounds imply
    # leading >= 21-53/4-11/4 = 5.
    assert 21 - sp.Rational(53, 4) - sp.Rational(11, 4) == 5

    remainder_over_u = sp.Poly(
        sp.expand((normalized - leading) / u), u, *variables
    )
    coefficient_norm_by_u_degree: dict[int, sp.Rational] = {}
    for monomial, coefficient in remainder_over_u.terms():
        power_u = monomial[0]
        coefficient_norm_by_u_degree[power_u] = (
            coefficient_norm_by_u_degree.get(power_u, 0)
            + abs(coefficient)
        )
    expected_norms = {
        0: 4034,
        1: 22189,
        2: 43084,
        3: 37338,
        4: 15732,
        5: 2880,
    }
    assert coefficient_norm_by_u_degree == expected_norms

    def remainder_bound(order):
        return sum(
            value / sp.Integer(order) ** (power + 1)
            for power, value in coefficient_norm_by_u_degree.items()
        )

    coarse_threshold = 813
    assert remainder_bound(coarse_threshold) < 5
    assert remainder_bound(coarse_threshold - 1) >= 5

    # Sharpen the error analysis by retaining the exact connected-shape
    # variables rather than replacing them with independent errors.
    B, Tc, P5, q1, q2, qd = sp.symbols(
        "B Tc P5 q1 q2 qd", nonnegative=True
    )
    structural_variables = (
        A2,
        A3,
        A4,
        t,
        B,
        Tc,
        P5,
        q1,
        q2,
        qd,
    )
    N = 1 / u
    structural_substitutions = {
        n: N,
        S: (N**2 * A2 + N - 2) / 2,
        H: (N**3 * A3 - (N - 2)) / 6,
        R: (N**3 * A3 - (N - 2)) / 6 + N**2 * B,
        W: (
            N**4 * A4
            - 2 * N**3 * A3
            - N**2 * A2
            + 2 * (N - 2)
        )
        / 24
        + N**3 * Tc
        + N**2 * P5,
        d: N * t + 1,
        Z: (N**2 * t**2 + N * t) / 2 + N * q1,
        Y: (
            (N**3 * t**3 - N * t) / 6
            + (N**2 * q2 - N * q1) / 2
            + N**2 * t * q1
            + N * qd
        ),
    }
    structural_normalized = sp.cancel(
        delta.subs(structural_substitutions) * u**6
    )
    assert sp.expand(structural_normalized.subs(u, 0) - leading) == 0
    first_correction = sp.factor(
        sp.diff(structural_normalized, u).subs(u, 0)
    )
    first_bracket = sp.factor(-first_correction / 3)
    expected_first_bracket = (
        -36 * A2**2
        + 12 * A2 * A3
        + 20 * A2 * t**3
        + 36 * A2 * t**2
        - 72 * A2 * t
        - 186 * A2
        - 32 * A3 * t**2
        + 24 * A3 * t
        + 142 * A3
        + 10 * A4 * t
        - 25 * A4
        - 96 * B
        + 120 * Tc
        + 40 * q1 * t
        - 24 * q1
        + 20 * q2
        - 40 * t**3
        + 128 * t**2
        - 90 * t
        + 142
    )
    assert sp.expand(first_bracket - expected_first_bracket) == 0

    # The shape bounds are:
    #   Tc <= B/2,
    #   q2 <= q1^2,
    #   0 <= q1 <= 1-t,
    #   A4 <= A3 <= A2 <= 1.
    # The correlation contribution is then nonpositive.
    assert sp.factor((-96 * B + 120 * Tc).subs(Tc, B / 2)) == -36 * B

    # The moment contribution is nonpositive.  After using A3<=A2
    # and dropping the negative A4 term, its remaining coefficient is
    # 20t^3+4t^2-48t-44 <= 0.
    moment_nonnegative = 44 + 48 * t - 4 * t**2 - 20 * t**3
    assert min(bernstein_coefficients(moment_nonnegative, t, 3)) > 0

    # The convex local q1 expression is maximized at q1=0 or q1=1-t.
    q_endpoint = sp.factor(
        (40 * t - 24) * (1 - t) + 20 * (1 - t) ** 2
    )
    assert sp.expand(
        q_endpoint + 4 * (t - 1) * (5 * t - 1)
    ) == 0
    t_only = -40 * t**3 + 128 * t**2 - 90 * t
    assert sp.factor(t_only) == -2 * t * (20 * t**2 - 64 * t + 45)
    z = sp.symbols("z", nonnegative=True)
    small_t_bernstein = bernstein_coefficients(
        sp.expand(
            (20 * t**2 - 64 * t + 45).subs(t, z / 5)
        ),
        z,
        2,
    )
    assert small_t_bernstein == [45, sp.Rational(193, 5), 33]
    # On [0,1/5], the quadratic factor is positive.  On [1/5,1],
    # adding the positive endpoint produces the following positive
    # cubic after t=(1+4z)/5.
    endpoint_positive = 20 * t**3 - 54 * t**2 + 33 * t + 2
    endpoint_bernstein = bernstein_coefficients(
        sp.expand(endpoint_positive.subs(t, (1 + 4 * z) / 5)),
        z,
        3,
    )
    assert endpoint_bernstein == [
        sp.Rational(33, 5),
        sp.Rational(257, 25),
        5,
        1,
    ]
    # Hence first_bracket <=142 and first_correction >=-426.
    first_correction_lower_bound = -426

    structural_poly = sp.Poly(
        sp.expand(structural_normalized), u, *structural_variables
    )
    higher_norm_by_u_degree: dict[int, sp.Rational] = {}
    for monomial, coefficient in structural_poly.terms():
        power_u = monomial[0]
        if power_u >= 2:
            higher_norm_by_u_degree[power_u] = (
                higher_norm_by_u_degree.get(power_u, 0)
                + abs(coefficient)
            )
    expected_higher_norms = {
        2: 19925,
        3: 39927,
        4: 39188,
        5: 20448,
        6: 6888,
    }
    assert higher_norm_by_u_degree == expected_higher_norms

    def structural_lower_bound(order):
        return (
            5
            + sp.Rational(first_correction_lower_bound, order)
            - sum(
                value / sp.Integer(order) ** power
                for power, value in higher_norm_by_u_degree.items()
            )
        )

    threshold = 120
    assert structural_lower_bound(threshold) > 0
    assert structural_lower_bound(threshold - 1) <= 0

    print("rank-4 asymptotic leaf-curvature certificate: PASS")
    print(f"leading lower bound: 5")
    print(
        "coarse remainder coefficient norms:",
        dict(sorted(coefficient_norm_by_u_degree.items())),
    )
    print(
        f"coarse threshold: {coarse_threshold}; "
        f"remainder bound there="
        f"{float(remainder_bound(coarse_threshold)):.12f}"
    )
    print(f"first structural correction lower bound: {first_correction_lower_bound}")
    print(
        "higher structural coefficient norms:",
        dict(sorted(higher_norm_by_u_degree.items())),
    )
    print(
        f"valid for every n >= {threshold}; "
        f"normalized lower bound at threshold="
        f"{float(structural_lower_bound(threshold)):.12f}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
