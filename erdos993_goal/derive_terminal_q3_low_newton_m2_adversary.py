#!/usr/bin/env python3
"""Independent symbolic exploration of terminal Newton degree m=2.

This file is a derivation aid, not a theorem certificate.  It keeps the tree
wedge variable correlated between p0 and A1, unlike the first coarse split.
"""

import sympy as sp


def kappa(p: int, q: int, m: int) -> sp.Integer:
    if not max(p, q) <= m <= p + q:
        return sp.Integer(0)
    return sp.factorial(m) // (
        sp.factorial(m - p)
        * sp.factorial(m - q)
        * sp.factorial(p + q - m)
    )


def bernstein_coefficients(expression, variable, left, right):
    y = sp.symbols("bernstein_y")
    power = sp.Poly(sp.expand(expression.subs(variable, left + (right - left) * y)), y)
    degree = power.degree()
    ascending = [power.coeff_monomial(y**rank) for rank in range(degree + 1)]
    return [sp.factor(sum(
        ascending[rank] * sp.binomial(index, rank) / sp.binomial(degree, rank)
        for rank in range(index + 1)
    )) for index in range(degree + 1)]


def main() -> None:
    N, j, a, b, e0, W = sp.symbols(
        "N j a b e0 W", integer=True, nonnegative=True
    )
    p0 = sp.expand_func(
        sp.binomial(N + 1, 3)
        - N * (N - 1)
        + W
        + N * (N - 1) / 2
    )
    p1 = (N**2 + N + 2) / 2
    p2 = N + 2
    P = [p0, p1, p2]
    B = [
        (j + 1) * b * a - 3 * e0 * (p0 + a),
        (j + 1) * b * (a + N)
        - 3 * e0 * p1
        - 3 * b * (p1 + p0 + a),
        (j + 1) * b * N
        - 3 * e0 * p2
        - 6 * b * (p1 + p2),
    ]
    pq2 = sp.expand(sum(
        kappa(p, q, 2) * P[p] * B[q]
        for p in range(3) for q in range(3)
    ))

    r = N - j
    S2 = j / (r + 1)
    # Exact c0>=a anchor floor, with R1=N^2-2W.
    A1bar = sp.expand(p0 + N + 2 + 2 * W)
    A2bar = N**2 + 3 * N + 8
    R3 = j * (j - 1) / ((r + 1) * (r + 2))

    def gap(U0bar: sp.Expr, target_j: sp.Expr = j) -> sp.Expr:
        local_e = sp.expand(
            2 * A1bar * (1 + 2 * S2 + R3)
            + A2bar * (U0bar + 2 + 3 * S2 + R3)
        )
        return sp.factor(
            (target_j + 1) * a * local_e + coarse / b
        )

    E2 = sp.expand(2 * A1bar * (1 + S2) + A2bar * (3 + S2))
    coarse = sp.expand(pq2.subs(e0, (j + 2) * b))
    normalized = sp.factor((j + 1) * a * E2 + coarse / b)
    print("GENERAL normalized W slope")
    print(sp.factor(sp.diff(normalized, W)))
    print("GENERAL normalized a slope")
    print(sp.factor(sp.diff(normalized, a)))
    pair_floor = (N - 1) * (N - 2) / 2
    at_a_floor = sp.factor(normalized.subs(a, pair_floor))
    print("GENERAL a=floor W slope")
    print(sp.factor(sp.diff(at_a_floor, W)))
    print("GENERAL at W=N-1")
    print(sp.factor(at_a_floor.subs(W, N - 1)))
    print("GENERAL at W=C(N,2)")
    print(sp.factor(at_a_floor.subs(W, N * (N - 1) / 2)))

    high_u0 = (N - 2 * j + 1) / (j + 1)
    high_gap = gap(high_u0)
    print("HIGH-EXT normalized a slope")
    print(sp.factor(sp.diff(high_gap, a)))
    high_a_floor = sp.factor(high_gap.subs(a, pair_floor))
    print("HIGH-EXT normalized W slope at a=floor")
    print(sp.factor(sp.diff(high_a_floor, W)))
    print("HIGH-EXT W=N-1")
    print(sp.factor(high_a_floor.subs(W, N - 1)))
    print("HIGH-EXT W=C(N,2)")
    print(sp.factor(high_a_floor.subs(W, N * (N - 1) / 2)))

    low_gap = gap(sp.Integer(1))
    print("LOW-EXT normalized a slope")
    print(sp.factor(sp.diff(low_gap, a)))
    low_a_floor = sp.factor(low_gap.subs(a, pair_floor))
    print("LOW-EXT normalized W slope at a=floor")
    print(sp.factor(sp.diff(low_a_floor, W)))
    print("LOW-EXT W=N-1")
    print(sp.factor(low_a_floor.subs(W, N - 1)))
    print("LOW-EXT W=C(N,2)")
    print(sp.factor(low_a_floor.subs(W, N * (N - 1) / 2)))
    kcone, rcone = sp.symbols("kcone rcone", integer=True, nonnegative=True)
    low_cone = sp.cancel(
        low_a_floor.subs(W, N - 1).subs({j: 4 + kcone, N: 4 + kcone + rcone})
    )
    low_cone_num, low_cone_den = sp.fraction(low_cone)
    low_cone_poly = sp.Poly(sp.expand(low_cone_num), kcone, rcone)
    print(
        "LOW CONE",
        "den=", sp.factor(low_cone_den),
        "terms=", len(low_cone_poly.terms()),
        "min=", min(low_cone_poly.coeffs()),
        "negative=", [value for value in low_cone_poly.coeffs() if value < 0],
    )
    # The low-extension branch is used only for 0<=r<=2j.  Certify that
    # interval by Bernstein coefficients in r after j=4+k.
    low_unsub = sp.cancel(
        low_a_floor.subs(W, N - 1).subs({j: 4 + kcone, N: 4 + kcone + rcone})
    )
    low_num = sp.fraction(low_unsub)[0]
    low_bernstein = bernstein_coefficients(
        low_num, rcone, 0, 2 * (4 + kcone)
    )
    print("LOW BERNSTEIN count", len(low_bernstein))
    for index, coefficient in enumerate(low_bernstein):
        num, den = sp.together(coefficient).as_numer_denom()
        poly = sp.Poly(sp.expand(num), kcone)
        print(
            "LOW B", index, "den", den, "terms", len(poly.terms()),
            "min", min(poly.coeffs()),
            "neg", [value for value in poly.coeffs() if value < 0],
        )

    qcone = sp.symbols("qcone", integer=True, nonnegative=True)
    high_cone = sp.cancel(
        high_a_floor.subs(W, N - 1).subs({
            j: 4 + kcone,
            N: 3 * (4 + kcone) + qcone,
        })
    )
    high_num, high_den = sp.fraction(high_cone)
    high_poly = sp.Poly(sp.expand(high_num), kcone, qcone)
    print(
        "HIGH CONE", "den", sp.factor(high_den),
        "terms", len(high_poly.terms()), "min", min(high_poly.coeffs()),
        "neg", [value for value in high_poly.coeffs() if value < 0],
    )
    failures = []
    for local_j in range(4, 31):
        for local_N in range(max(15, local_j), 121):
            branch = high_a_floor if local_N >= 3 * local_j else low_a_floor
            value = sp.cancel(branch.subs({W: local_N - 1, j: local_j, N: local_N}))
            if value < 0:
                failures.append((local_j, local_N, value))
    print("GRID FAILURES", len(failures), failures[:20], failures[-5:])

    # j=3 correlation.  x=(z2+h2)/a, c0=a(1+x), and the q3/reserve
    # comparison gives e0<=4b(1+x)/3.  The extra c0-a improves B0 and the
    # A1,A2 anchors.  Keep the same exact p0/W correlation.
    x = sp.symbols("x", nonnegative=True)
    corr_pq = sp.expand(
        pq2.subs({j: 3, e0: sp.Rational(4, 3) * b * (1 + x)})
        + p2 * 4 * b * a * x
    )
    A1x = sp.expand(A1bar + x * p1)
    A2x = sp.expand(A2bar + x * p2)
    S2j3 = 3 / (N - 2)
    S3j3 = 6 / ((N - 2) * (N - 1))
    U0j3 = (N - 5) / 4
    E2x = sp.expand(
        2 * A1x * (1 + 2 * S2j3 + S3j3)
        + A2x * (U0j3 + 2 + 3 * S2j3 + S3j3)
    )
    corr_normalized = sp.factor(4 * a * E2x + corr_pq / b)
    print("J3 normalized W slope")
    print(sp.factor(sp.diff(corr_normalized, W)))
    print("J3 normalized a slope")
    print(sp.factor(sp.diff(corr_normalized, a)))
    corr_a_floor = sp.factor(corr_normalized.subs(a, pair_floor))
    print("J3 a=floor W slope")
    print(sp.factor(sp.diff(corr_a_floor, W)))
    print("J3 at W=N-1")
    print(sp.factor(corr_a_floor.subs(W, N - 1)))
    print("J3 at W=C(N,2)")
    print(sp.factor(corr_a_floor.subs(W, N * (N - 1) / 2)))


if __name__ == "__main__":
    main()
