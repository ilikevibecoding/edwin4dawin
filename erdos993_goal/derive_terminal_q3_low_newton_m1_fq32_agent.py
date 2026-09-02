#!/usr/bin/env python3
"""FQ32-quantitative root-motif derivation for terminal Newton m=1."""

import sympy as sp


def C(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def main():
    N, d, B2, R, j, y = sp.symbols("N d B2 R j y", nonnegative=True)
    r = sp.symbols("r", integer=True, nonnegative=True)
    n = N + 1
    W = N - 1 + B2
    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W
    edgesF = N - d
    wedgesF = W - C(d, 2) - R
    a = sp.expand(C(N, 2) - edgesF)
    z2 = sp.expand(edgesF * (N - 2) - 2 * wedgesF)
    h2 = sp.expand(C(N - d, 2) - (N - d - R))
    c0 = sp.expand(a + z2 + h2)

    # Exact included q2 gap g and quantitative FQ32 forest margin.
    g = sp.expand(2 * p1 * c0 - 3 * a * R1)
    Utree = sp.expand((
        -12 * B2**2
        + 4 * B2 * n**2
        - 36 * B2 * n
        + 56 * B2
        + n**4
        - 8 * n**3
        + 17 * n**2
        + 2 * n
        - 24
    ) / 4)
    # Component-lift residual for Q=G disjoint union K1 (p=N,z=1).
    residual = sp.factor(
        (3 * N**4 - 9 * N**3 + 6 * N**2 + 24 * N - 24) / (2 * N)
    )
    forest_margin_lower = sp.expand(2 * Utree + residual)
    A0lower = sp.cancel((p0 * g + a * forest_margin_lower) / (2 * p1))

    # Refined e upper and retained A1,U0,U1 terms.
    ebar = j + 2 * y
    Q0bar = (j + 1) * c0 - 3 * ebar * (p0 + a)
    Q1bar = (
        (j + 1) * (a + R1)
        - 3 * ebar * p1
        - 3 * (p0 + a + p1)
    )
    remainder = sp.expand(p0 * Q1bar + p1 * Q0bar + p1 * Q1bar)
    S1 = j / (r + 1)
    H1 = j * y / r
    coupled_U0 = (N - 2 * j + 3 + (j - 1) * y) / (j + 1) + H1
    component_U0 = (d + 1) / (j + 1) + y + H1
    U1 = 1 + S1 + H1
    A1bar = sp.cancel(p0 + N + 2 + 2 * W + (c0 - a) * p1 / a)

    gaps = {}
    for name, U0 in (("coupled", coupled_U0), ("component", component_U0)):
        gap = sp.cancel(
            (j + 1) * (A0lower * U1 + a * A1bar * (U0 + U1))
            + remainder
        )
        print(name, "R slope", sp.factor(sp.diff(gap, R)))
        lower = sp.cancel(gap.subs(R, 0).subs(N, j + r))
        print(name, "B2 degree", sp.Poly(lower, B2).degree())
        print(name, "B2 LC", sp.factor(sp.Poly(lower, B2).LC()))
        gaps[name] = lower

    E = C(j + r - 2, 2)
    B2lo = C(d - 1, 2)
    B2hi = sp.expand(B2lo + C(j + r - d, 2))
    functions = {}
    # d=1 nonstar has B2 in [0,E].  For 2<=d<=N-1 use conditional endpoints.
    endpoint_specs = (
        ("d1_lo", 1, sp.Integer(0)),
        ("d1_hi", 1, E),
        ("inner_lo", d, B2lo),
        ("inner_hi", d, B2hi),
    )
    for method, expression in gaps.items():
        for yv in (0, 1):
            for endpoint, dvalue, bvalue in endpoint_specs:
                item = sp.cancel(expression.subs({
                    y: yv,
                    d: dvalue,
                    B2: bvalue.subs(d, dvalue),
                }))
                functions[(method, yv, endpoint)] = sp.lambdify((j, r, d), item, "math")

    minima = {}
    negatives = []
    for jv in range(4, 41):
        for rv in range(1, 81):
            if jv + rv < 15:
                continue
            Nv = jv + rv
            # d=1 endpoints.
            for yv in (0, 1):
                for endpoint in ("d1_lo", "d1_hi"):
                    vals = [functions[(method, yv, endpoint)](jv, rv, 1) for method in gaps]
                    value = max(vals)
                    label = (yv, endpoint)
                    record = (value, vals, jv, rv, 1, label)
                    if label not in minima or value < minima[label][0]:
                        minima[label] = record
                    if value < 0:
                        negatives.append(record)
            # inner degrees 2..N-1.
            for dv in range(2, Nv):
                for yv in (0, 1):
                    for endpoint in ("inner_lo", "inner_hi"):
                        vals = [functions[(method, yv, endpoint)](jv, rv, dv) for method in gaps]
                        value = max(vals)
                        label = (yv, endpoint)
                        record = (value, vals, jv, rv, dv, label)
                        if label not in minima or value < minima[label][0]:
                            minima[label] = record
                        if value < 0:
                            negatives.append(record)
    print("minima")
    for label, value in minima.items():
        print(label, value)
    print("negatives", sorted(negatives)[:20])


if __name__ == "__main__":
    main()
