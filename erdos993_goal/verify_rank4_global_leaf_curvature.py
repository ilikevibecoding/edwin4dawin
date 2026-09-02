#!/usr/bin/env python3
"""Computer-algebra proof of global rank-4 leaf-curvature monotonicity.

For every tree T and every vertex p, attaching a new leaf at p does not
decrease the fourth factorial curvature C_4.  Orders below 20 are covered
by the accompanying exhaustive certificates.  This script proves every
order n>=20 by exact reductions and positive multivariate Bernstein
coefficients.
"""

from __future__ import annotations

from itertools import product

import sympy as sp


def tensor_bernstein_coefficients(poly, variables):
    expanded = sp.Poly(sp.expand(poly), *variables)
    degrees = tuple(expanded.degree(variable) for variable in variables)
    power_coefficients = dict(expanded.terms())
    output = []
    for index in product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for monomial, coefficient in power_coefficients.items():
            if all(j <= k for j, k in zip(monomial, index)):
                multiplier = 1
                for j, k, degree in zip(monomial, index, degrees):
                    multiplier *= sp.binomial(k, j) / sp.binomial(
                        degree, j
                    )
                value += coefficient * multiplier
        output.append((sp.factor(value), index))
    return degrees, output


def main() -> int:
    u = sp.symbols("u", nonnegative=True)
    A2, A3, A4, t = sp.symbols(
        "A2 A3 A4 t", nonnegative=True
    )
    B, Tc, P5 = sp.symbols("B Tc P5", nonnegative=True)
    q1, q2, qd = sp.symbols("q1 q2 qd", nonnegative=True)

    n, S, R, H, W, d, Z, Y = sp.symbols(
        "n S R H W d Z Y", real=True
    )

    def choose(a, k):
        return sp.prod(a - j for j in range(k)) / sp.factorial(k)

    e = n - 1
    i3 = choose(n, 3) - e * (n - 2) + S
    i4 = (
        choose(n, 4)
        - e * choose(n - 2, 2)
        + S * (n - 4)
        + choose(e, 2)
        - R
    )
    disconnected_pair_plus_edge = S * (e - 2) - 2 * R - H
    i5 = (
        choose(n, 5)
        - e * choose(n - 2, 3)
        + S * choose(n - 3, 2)
        + (choose(e, 2) - S) * (n - 4)
        - R * (n - 4)
        - disconnected_pair_plus_edge
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

    # Normalize the exact tree statistics.  For x_v=deg(v)-1:
    #
    # A_j = n^{-j} sum x_v^j,
    # B   = n^{-2} sum_{uv in E} x_u x_v,
    # Tc  = n^{-3} sum_{(u,v)} binom(x_u,2)x_v,
    # P5  = n^{-2} sum_v sum_{{a,b} subset N(v)} x_a x_b,
    #
    # and q1,q2,qd are the normalized first-neighborhood,
    # squared-neighborhood, and distance-two excess masses at p.
    N = 1 / u
    normalized_substitutions = {
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
    F = sp.cancel(delta.subs(normalized_substitutions) * u**6)
    assert sp.denom(F) == 1

    # Throughout n>=20, so 0<=u<=1/20.  Let
    # M=(n-2)/n=1-2u and m=M-t.
    M = 1 - 2 * u
    m = M - t
    shared_positive = 1 - 5 * u + 6 * u**2 + 2 * t * u

    # F decreases with A4, P5, q2, qd, and Tc.
    assert sp.expand(sp.diff(F, A4) + 15 * shared_positive) == 0
    assert sp.expand(
        sp.diff(F, P5) + 360 * u**2 * shared_positive
    ) == 0
    neighborhood_positive = (
        1 - 6 * u + 8 * u**2 + 3 * A2 * u + 6 * t * u**2
    )
    assert sp.expand(
        sp.diff(F, q2) + 60 * u * neighborhood_positive
    ) == 0
    assert sp.expand(
        sp.diff(F, qd) + 120 * u**2 * neighborhood_positive
    ) == 0
    assert sp.expand(
        sp.diff(F, Tc) + 360 * u * shared_positive
    ) == 0
    # Both displayed positive factors are at least 3/4 and 7/10,
    # respectively, on the domain.
    assert sp.Rational(1) - 5 * sp.Rational(1, 20) == sp.Rational(3, 4)
    assert sp.Rational(1) - 6 * sp.Rational(1, 20) == sp.Rational(7, 10)

    # Moment reduction.  Other-vertex excess mass is m, so
    #
    # A4 <= t^4 + m(A3-t^3),
    # A3 >= t^3 + (A2-t^2)^2/m.
    #
    # After replacing A4 by its upper bound, the derivative in A3 is
    # 3J.  J is positive for u<=1/20.
    effective_A3_derivative = sp.factor(
        sp.diff(F, A3) + m * sp.diff(F, A4)
    )
    J = (
        -12 * A2 * u
        + 64 * q1 * u**2
        + 42 * t**2 * u
        + 54 * t * u**2
        - 59 * t * u
        + 5 * t
        - 208 * u**3
        + 274 * u**2
        - 107 * u
        + 11
    )
    assert sp.expand(effective_A3_derivative - 3 * J) == 0
    # Dropping positive terms gives
    # J >= 11-119u-208u^3 > 0.
    J_lower_at_endpoint = (
        11
        - 119 * sp.Rational(1, 20)
        - 208 * sp.Rational(1, 20) ** 3
    )
    assert J_lower_at_endpoint > 0
    assert 5 - 59 * sp.Rational(1, 20) > 0

    # Correlation reduction.  The exact connected-shape formula gives
    # Tc <= (1-4u)B/2.  Substitute this upper bound.  The resulting
    # derivative in B is 36uK, and K>0.
    Tc_upper = (1 - 4 * u) * B / 2
    effective_B_derivative = sp.factor(
        sp.diff(F, B)
        + (1 - 4 * u) * sp.diff(F, Tc) / 2
    )
    K = (
        -6 * A2 * u
        + 32 * q1 * u**2
        + 16 * t**2 * u
        + 52 * t * u**2
        - 22 * t * u
        + 16 * u**3
        + 22 * u**2
        - 21 * u
        + 3
    )
    assert sp.expand(effective_B_derivative - 36 * u * K) == 0
    # K >= 3-49u > 0 after dropping positive terms and using
    # A2,t<=1.
    assert 3 - 49 * sp.Rational(1, 20) > 0

    # After q2=q1^2 and qd=m-q1, F is concave in q1.  Its minimum on
    # 0<=q1<=m is therefore at q1=0 or q1=m.
    q_reduced = sp.expand(F.subs({q2: q1**2, qd: m - q1}))
    q_second = sp.factor(sp.diff(q_reduced, q1, 2))
    q_concavity_factor = (
        15 * A2 * u
        + 30 * t * u**2
        - 48 * u**3
        + 40 * u**2
        - 30 * u
        + 5
    )
    assert sp.expand(
        q_second + 24 * u * q_concavity_factor
    ) == 0
    assert (
        5
        - 30 * sp.Rational(1, 20)
        - 48 * sp.Rational(1, 20) ** 3
        > 0
    )

    # Parameterize the remaining second moment by
    #
    # A2=t^2+m^2 z,  0<=z<=1.
    #
    # The monotone replacements above give
    # A3=t^3+m^3 z^2 and A4=t^4+m^4 z^2.  Also use
    # P5 <= (M^2-A2)/2 and the minimizing correlations B=Tc=0.
    v, s, z, w = sp.symbols("v s z w", nonnegative=True)
    t_box = M * s
    m_box = M * (1 - s)
    A2_box = t_box**2 + m_box**2 * z
    final_common = {
        A2: A2_box,
        A3: t_box**3 + m_box**3 * z**2,
        A4: t_box**4 + m_box**4 * z**2,
        t: t_box,
        B: 0,
        Tc: 0,
        P5: (M**2 - A2_box) / 2,
    }

    exact_minima = {}
    for endpoint_name, endpoint in (("q=0", 0), ("q=m", m_box)):
        branch = sp.expand(
            F.subs(
                final_common
                | {
                    q1: endpoint,
                    q2: endpoint**2,
                    qd: m_box - endpoint,
                }
            ).subs(u, v / 20)
        )
        for half in (0, 1):
            subbox = sp.expand(branch.subs(z, (half + w) / 2))
            degrees, coefficients = tensor_bernstein_coefficients(
                subbox, (v, s, w)
            )
            assert degrees == (6, 5, 3)
            minimum = min(coefficients, key=lambda item: item[0])
            assert minimum[0] > 0
            exact_minima[(endpoint_name, half)] = minimum

    expected_minima = {
        ("q=0", 0): (sp.Rational(18064377, 16000000), (6, 0, 3)),
        ("q=0", 1): (sp.Rational(6937407, 8000000), (6, 0, 1)),
        ("q=m", 0): (sp.Rational(893997, 640000), (6, 0, 3)),
        ("q=m", 1): (
            sp.Rational(162747873, 160000000),
            (6, 2, 2),
        ),
    }
    assert exact_minima == expected_minima

    print("global rank-4 leaf-curvature certificate: PASS")
    print("large-order domain: n >= 20")
    for key, (value, index) in exact_minima.items():
        print(
            f"{key}, z-half={key[1]}: "
            f"minimum Bernstein coefficient={value} "
            f"at {index}"
        )
    print(
        "orders 1..19 are supplied by the exhaustive fast-scan "
        "certificates"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
