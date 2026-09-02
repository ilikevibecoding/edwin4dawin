#!/usr/bin/env python3
"""Sharp conditional-tau diagnostic for terminal Newton m=1."""

import sympy as sp
import prove_terminal_q3_anchor_ordering_root as anchor_theorem


def C(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def main():
    N, d, B2, tau, R, j, y = sp.symbols("N d B2 tau R j y", nonnegative=True)
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

    cross, symbols = anchor_theorem.symbolic_cross()
    ns, ds, ts, ps, vs, neighbor = symbols
    A0 = sp.expand(cross.subs({
        ns: n, ds: d, ts: 1, ps: W, vs: n - 3 + B2 + tau, neighbor: R,
    }))
    ebar = j + 2 * y
    Q0 = (j + 1) * c0 - 3 * ebar * (p0 + a)
    Q1 = (j + 1) * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
    remainder = sp.expand(p0 * Q1 + p1 * Q0 + p1 * Q1)
    S1 = j / (r + 1)
    H1 = j * y / r
    U1 = 1 + S1 + H1
    coupledU0 = (N - 2 * j + 3 + (j - 1) * y) / (j + 1) + H1
    componentU0 = (d + 1) / (j + 1) + y + H1
    A1bar = sp.cancel(p0 + N + 2 + 2 * W + (c0 - a) * p1 / a)

    # Conditional degree-partition maximum B3 and the unrelaxed Zagreb upper.
    B3max = sp.expand(C(d - 1, 3) + C(N - d, 3))
    tauupper = sp.expand((2 * (n - 4) * B2 + B3max) / 7)
    print("tau upper", sp.factor(tauupper))
    gaps = {}
    for name, U0 in (("coupled", coupledU0), ("component", componentU0)):
        gap = sp.cancel((j + 1) * (A0 * U1 + a * A1bar * (U0 + U1)) + remainder)
        lower = sp.cancel(gap.subs({tau: tauupper, R: 0}).subs(N, j + r))
        print(name, "B2 degree", sp.Poly(lower, B2).degree())
        print(name, "B2 LC", sp.factor(sp.Poly(lower, B2).LC()))
        gaps[name] = lower

    B2lo = C(d - 1, 2)
    B2hi = sp.expand(B2lo + C(j + r - d, 2))
    functions = {}
    for method, expression in gaps.items():
        for yv in (0, 1):
            for endpoint, bv in (("lo", B2lo), ("hi", B2hi)):
                item = sp.cancel(expression.subs({y: yv, B2: bv}))
                functions[(method, yv, endpoint)] = sp.lambdify((j, r, d), item, "math")
    negatives = []
    minima = {}
    for jv in range(4, 41):
        for rv in range(1, 81):
            if jv + rv < 15:
                continue
            Nv = jv + rv
            for dv in range(1, Nv + 1):
                for yv in (0, 1):
                    for endpoint in ("lo", "hi"):
                        vals = [functions[(method, yv, endpoint)](jv, rv, dv) for method in gaps]
                        value = max(vals)
                        label = (yv, endpoint)
                        record = (value, vals, jv, rv, dv, label)
                        if label not in minima or value < minima[label][0]:
                            minima[label] = record
                        if value < 0:
                            negatives.append(record)
    print("minima", minima)
    print("negatives", sorted(negatives)[:20])


if __name__ == "__main__":
    main()
