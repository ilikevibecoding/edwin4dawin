#!/usr/bin/env python3
"""Focused q2-gap-coupled derivation for terminal Newton m=1."""

import sympy as sp


def kernel(p, q, m):
    if not max(p, q) <= m <= p + q:
        return 0
    return sp.factorial(m) // (
        sp.factorial(m - p) * sp.factorial(m - q) * sp.factorial(p + q - m)
    )


def main():
    N, j, a, b, e0, W, y, x, g, d = sp.symbols(
        "N j a b e0 W y x g d", nonnegative=True
    )
    r = sp.symbols("r", integer=True, nonnegative=True)
    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W
    Q0 = (j + 1) * b * a * (1 + x) - 3 * e0 * (p0 + a)
    Q1 = (
        (j + 1) * b * (a + R1)
        - 3 * e0 * p1
        - 3 * b * (p0 + a + p1)
    )
    pq1 = sp.expand(p0 * Q1 + p1 * Q0 + p1 * Q1)
    remainder = sp.cancel(pq1.subs(e0, b * (j + 2 * y)) / b)

    S1 = j / (r + 1)
    H1 = j * y / r
    U0base = (N - 2 * j + 3 + (j - 1) * y) / (j + 1)
    u1 = 1 + S1 + H1
    u0u1 = U0base + 1 + S1 + 2 * H1
    A1bar = p0 + N + 2 + 2 * W + x * p1
    gap_without_A0 = (j + 1) * a * A1bar * u0u1 + remainder

    # Exact q2 gap coordinate and the all-forest q3<=q2 lift of A0.
    xg = (g / a + 3 * R1) / (2 * p1) - 1
    A0lower = p0 * g / (2 * p1)
    gapg = sp.cancel(
        (gap_without_A0 + (j + 1) * A0lower * u1).subs(x, xg)
    )
    gslope = sp.factor(sp.diff(gapg, g))
    print("g slope numerator")
    print(sp.factor(sp.together(gslope).as_numer_denom()[0]))

    # Connected non-centered-star q2-gap floor, n=N+1 and 1<=d<=N-1.
    n = N + 1
    q2floor = sp.expand((
        6 * d**3
        + 4 * d**2 * n**2
        - 16 * d**2 * n
        - 4 * d**2
        - 4 * d * n**3
        + 6 * d * n**2
        + 44 * d * n
        - 20 * d
        + n**4
        + n**3
        - 27 * n**2
        + 25 * n
        + 12
    ) / 2)
    reduced = sp.cancel(gapg.subs(g, q2floor).subs(N, j + r))
    pair_floor = (j + r - 1) * (j + r - 2) / 2
    aslope = sp.cancel(sp.diff(reduced, a))
    floor = sp.cancel(reduced.subs(a, pair_floor))
    Wlo = sp.expand(
        j + r - 1 + (d - 1) * (d - 2) / 2
    )
    Whi = sp.expand(Wlo + (j + r - d) * (j + r - d - 1) / 2)
    print("degrees floor", [sp.Poly(floor, v).degree() for v in (W, y, d)])
    print("degrees a slope", [sp.Poly(aslope, v).degree() for v in (W, y, d)])

    functions = {}
    for name, expression in (("floor", floor), ("aslope", aslope)):
        for yv in (0, 1):
            for wname, wv in (("lo", Wlo), ("hi", Whi)):
                item = sp.cancel(expression.subs({y: yv, W: wv}))
                functions[(name, yv, wname)] = sp.lambdify((j, r, d), item, "math")
    negatives = []
    minima = {}
    for jv in range(4, 41):
        for rv in range(1, 81):
            if jv + rv < 15:
                continue
            Nv = jv + rv
            for dv in range(1, Nv):
                for label, function in functions.items():
                    value = function(jv, rv, dv)
                    if label not in minima or value < minima[label][0]:
                        minima[label] = (value, jv, rv, dv)
                    if value < 0:
                        negatives.append((value, jv, rv, dv, label))
    print("minima")
    for label, value in sorted(minima.items()):
        print(label, value)
    print("negatives", sorted(negatives)[:20])


if __name__ == "__main__":
    main()
