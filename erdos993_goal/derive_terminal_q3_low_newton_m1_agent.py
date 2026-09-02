#!/usr/bin/env python3
"""Symbolic search for terminal q3 Newton coefficient m=1.

Derivation aid only; no theorem is claimed by this file.
"""

import sympy as sp

import prove_terminal_q3_forest_anchor_lift_agent as forest_anchor


def kappa(p: int, q: int, m: int) -> sp.Integer:
    if not max(p, q) <= m <= p + q:
        return sp.Integer(0)
    return sp.factorial(m) // (
        sp.factorial(m - p)
        * sp.factorial(m - q)
        * sp.factorial(p + q - m)
    )


def positive(expression, *variables):
    poly = sp.Poly(sp.expand(expression), *variables)
    return all(value > 0 for value in poly.coeffs()), [
        (monomial, value) for monomial, value in poly.terms() if value < 0
    ]


def main() -> None:
    N, j, a, b, e0, W, y, x = sp.symbols(
        "N j a b e0 W y x", nonnegative=True
    )
    r, k, q = sp.symbols("r k q", integer=True, nonnegative=True)
    p0 = sp.expand(sp.expand_func(
        sp.binomial(N + 1, 3) - N * (N - 1) + W + N * (N - 1) / 2
    ))
    p1 = (N**2 + N + 2) / 2
    P = [p0, p1]

    # Retain c0=a(1+x), c1=a and exact R1.
    Q = [
        (j + 1) * b * a * (1 + x) - 3 * e0 * (p0 + a),
        (j + 1) * b * (a + N**2 - 2 * W)
        - 3 * e0 * p1
        - 3 * b * (p0 + a + p1),
    ]
    pq1 = sp.expand(sum(
        kappa(left, right, 1) * P[left] * Q[right]
        for left in range(2) for right in range(2)
    ))
    print("pq1 kernels", [
        (left, right, kappa(left, right, 1))
        for left in range(2) for right in range(2)
        if kappa(left, right, 1)
    ])
    remainder = sp.factor(pq1.subs(e0, b * (j + 2 * y)) / b)
    A1 = sp.expand(p0 + N + 2 + 2 * W + x * p1)
    S1 = j / (r + 1)
    H1 = j * y / r
    U0base = (N - 2 * j + 3 + (j - 1) * y) / (j + 1)
    E = sp.expand(A1 * (U0base + 1 + S1 + 2 * H1))
    gap = sp.factor((j + 1) * a * E + remainder)
    print("a degree", sp.Poly(gap, a).degree())
    pair_floor = (N - 1) * (N - 2) / 2
    Wlo = N - 1
    Whi = N * (N - 1) / 2
    substituted = sp.factor(gap.subs(N, j + r))
    slope = sp.factor(sp.diff(substituted, a))
    floor = sp.factor(substituted.subs(a, pair_floor.subs(N, j + r)))
    print("degrees slope W,y,x", [sp.Poly(slope, v).degree() for v in (W, y, x)])
    print("degrees floor W,y,x", [sp.Poly(floor, v).degree() for v in (W, y, x)])

    # Quantitative A0 floor from the forest-anchor lift identity
    # 6*p1*A0=3*p0*q2gap+3*a*(forest q3<=q2 margin).
    data = forest_anchor.symbolic_reduction()
    nn, mm, AA, dd, RR, tt = data["symbols"]
    EE = sp.symbols("EE", nonnegative=True)
    constant_q2gap = data["newton"][0]
    structural = sp.expand(constant_q2gap.subs({
        mm: nn - 1,
        AA: forest_anchor.choose(dd, 2) + RR + EE,
    }))
    alpha = sp.factor(sp.diff(structural, EE))
    beta = sp.factor(sp.diff(structural, RR))
    base = sp.factor(structural.subs({EE: 0, RR: 0}))
    connected_q2gap = sp.factor(base + alpha * (nn - dd - 2) + beta)
    centered_star_q2gap = sp.factor(base.subs(dd, nn - 1))
    print("connected q2 gap", connected_q2gap)
    print("connected q2 d degree", sp.Poly(connected_q2gap, dd).degree())
    print("connected q2 d derivative", sp.factor(sp.diff(connected_q2gap, dd)))
    print("centered star q2 gap", centered_star_q2gap)

    d = sp.symbols("d", integer=True, positive=True)
    q2lower = sp.expand(connected_q2gap.subs({nn: N + 1, dd: d}))
    A0lower = sp.factor(p0 * q2lower / (2 * p1))
    u1bar = 1 + S1 + H1
    enhanced = sp.factor(gap + (j + 1) * A0lower * u1bar)
    enhanced_sub = sp.factor(enhanced.subs(N, j + r))
    enhanced_slope = sp.factor(sp.diff(enhanced_sub, a))
    enhanced_floor = sp.factor(
        enhanced_sub.subs(a, pair_floor.subs(N, j + r))
    )
    print("enhanced degrees W,y,x,d", [
        sp.Poly(enhanced_floor, v).degree() for v in (W, y, x, d)
    ])
    # Diagnostic integer grid over exact W endpoints, x endpoints, y endpoints,
    # and d endpoints 1,N-1 (the latter is outside the nonstar range but useful).
    for dlabel, dvalue in (("one", 1), ("maxnonstar", N - 1)):
        negatives = []
        for xvalue in (0, 3):
            for yvalue in (0, 1):
                for wname, wvalue in (("lo", Wlo), ("hi", Whi)):
                    corner = sp.factor(enhanced_floor.subs({
                        d: dvalue.subs(N, j + r) if hasattr(dvalue, "subs") else dvalue,
                        x: xvalue,
                        y: yvalue,
                        W: wvalue.subs(N, j + r),
                    }))
                    numerator = sp.together(corner).as_numer_denom()[0]
                    high = positive(
                        numerator.subs({j: 4 + k, r: 11 + q}), k, q
                    )
                    if not high[0]:
                        negatives.append((xvalue, yvalue, wname, high[1][:3]))
        print("enhanced", dlabel, "high negative corners", negatives)

    # Keep the exact q2 gap g correlated with x and A0:
    # g=2*p1*a*(1+x)-3*a*R1 and A0>=p0*g/(2*p1).
    g = sp.symbols("g", nonnegative=True)
    R1 = N**2 - 2 * W
    x_from_g = sp.factor((g / a + 3 * R1) / (2 * p1) - 1)
    A0_from_g = p0 * g / (2 * p1)
    correlated_g = sp.factor(
        (gap + (j + 1) * A0_from_g * u1bar).subs(x, x_from_g)
    )
    print("g slope", sp.factor(sp.diff(correlated_g, g)))
    g_floor = sp.factor(correlated_g.subs(g, q2lower))
    print("g-floor a degree", sp.Poly(g_floor, a).degree())
    root_Wlo = sp.expand(N - 1 + (d - 1) * (d - 2) / 2)
    root_Whi = sp.expand(root_Wlo + (N - d) * (N - d - 1) / 2)
    root_sub = sp.cancel(g_floor.subs(N, j + r))
    root_a_slope = sp.cancel(sp.diff(root_sub, a))
    root_floor = sp.cancel(root_sub.subs(a, pair_floor.subs(N, j + r)))
    print("root-floor degrees W,y,d", [
        sp.Poly(root_floor, v).degree() for v in (W, y, d)
    ])
    # Exact integer grid diagnostic over the relaxed root interval.
    root_functions = {}
    for yvalue in (0, 1):
        for wname, wvalue in (("lo", root_Wlo), ("hi", root_Whi)):
            expression = sp.cancel(root_floor.subs({
                y: yvalue,
                W: wvalue.subs(N, j + r),
            }))
            root_functions[(yvalue, wname)] = sp.lambdify((j, r, d), expression, "math")
    negatives = []
    minimum = None
    for jvalue in range(4, 31):
        for rvalue in range(1, 61):
            if jvalue + rvalue < 15:
                continue
            Nvalue = jvalue + rvalue
            for dvalue in range(1, Nvalue):
                for label, function in root_functions.items():
                    value = function(jvalue, rvalue, dvalue)
                    if minimum is None or value < minimum[0]:
                        minimum = (value, jvalue, rvalue, dvalue, label)
                    if value < 0:
                        negatives.append((value, jvalue, rvalue, dvalue, label))
    print("correlated-g grid min", minimum)
    print("correlated-g grid negatives", sorted(negatives)[:12])

    for xvalue in (0, 3):
        for yvalue in (0, 1):
            for wname, wvalue in (("lo", Wlo), ("hi", Whi)):
                corner = sp.factor(floor.subs({
                    x: xvalue,
                    y: yvalue,
                    W: wvalue.subs(N, j + r),
                }))
                numerator, denominator = sp.together(corner).as_numer_denom()
                high = positive(
                    numerator.subs({j: 4 + k, r: 11 + q}), k, q
                )
                strips = []
                for rv in range(1, 11):
                    check = positive(
                        numerator.subs({r: rv, j: 4 + 11 - rv + q}), q
                    )
                    if not check[0]:
                        strips.append((rv, check[1][:6]))
                print(
                    "floor", xvalue, yvalue, wname,
                    "den", sp.factor(denominator),
                    "high", high,
                    "strips", strips,
                )


if __name__ == "__main__":
    main()
