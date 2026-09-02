#!/usr/bin/env python3
"""Root-motif coupled derivation for terminal Newton m=1."""

import sympy as sp

import prove_terminal_q3_anchor_ordering_root as anchor_theorem


def C(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def main():
    N, d, B2, B4, R, j, y = sp.symbols(
        "N d B2 B4 R j y", nonnegative=True
    )
    r = sp.symbols("r", integer=True, nonnegative=True)
    n = N + 1
    W = N - 1 + B2
    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W

    # Exact root-deletion rank-two coordinates.
    edgesF = N - d
    wedgesF = W - C(d, 2) - R
    a = sp.expand(C(N, 2) - edgesF)
    z2 = sp.expand(edgesF * (N - 2) - 2 * wedgesF)
    verticesH = N - d
    edgesH = N - d - R
    h2 = sp.expand(C(verticesH, 2) - edgesH)
    c0 = sp.expand(a + z2 + h2)
    x = sp.factor((c0 - a) / a)
    print("a", sp.factor(a))
    print("z2", sp.factor(z2))
    print("h2", sp.factor(h2))
    print("a*x", sp.factor(c0 - a))

    # Exact A0 from the pinned anchor cross at t=1.
    cross, symbols = anchor_theorem.symbolic_cross()
    ns, ds, ts, ps, vs, neighbors = symbols
    A0 = sp.expand(cross.subs({
        ns: n,
        ds: d,
        ts: 1,
        ps: W,
        vs: n - 3 + B2 + B4,
        neighbors: R,
    }))
    print("A0 B4 slope", sp.factor(sp.diff(A0, B4)))
    print("A0 R slope", sp.factor(sp.diff(A0, R)))

    # Exact c0 in Q0, exact R1 in Q1, and the refined e0 upper.
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
    U0base = (N - 2 * j + 3 + (j - 1) * y) / (j + 1)
    u1 = 1 + S1 + H1
    u0u1 = U0base + 1 + S1 + 2 * H1
    A1bar = sp.expand(p0 + N + 2 + 2 * W + x * p1)
    gap = sp.cancel((j + 1) * (A0 * u1 + a * A1bar * u0u1) + remainder)
    print("gap B4 slope", sp.factor(sp.diff(gap, B4)))
    print("gap R slope", sp.factor(sp.diff(gap, R)))

    # Pinned Zagreb/neighbor reduction, preserving B2 exactly.
    lower = sp.cancel(gap.subs({B4: (n - 4) * B2 / 3, R: 0}))
    lower = sp.cancel(lower.subs(N, j + r))
    print("lower B2 degree", sp.Poly(lower, B2).degree())
    print("lower B2 LC", sp.factor(sp.Poly(lower, B2).LC()))
    B2lo = sp.expand(C(d - 1, 2))
    B2hi = sp.expand(B2lo + C(j + r - d, 2))

    functions = {}
    endpoint_expressions = {}
    for yv in (0, 1):
        for bname, bv in (("lo", B2lo), ("hi", B2hi)):
            expression = sp.cancel(lower.subs({y: yv, B2: bv}))
            endpoint_expressions[(yv, bname)] = expression
            functions[(yv, bname)] = sp.lambdify((j, r, d), expression, "math")
    minima = {}
    negatives = []
    for jv in range(4, 41):
        for rv in range(1, 81):
            if jv + rv < 15:
                continue
            Nv = jv + rv
            for dv in range(1, Nv + 1):
                for label, function in functions.items():
                    value = function(jv, rv, dv)
                    if label not in minima or value < minima[label][0]:
                        minima[label] = (value, jv, rv, dv)
                    if value < 0:
                        negatives.append((value, jv, rv, dv, label))
    print("minima", minima)
    print("negatives", sorted(negatives)[:20])

    # The component-count extension floor is stronger for a high-degree root:
    # f_(j+1)/b>=(d-j)/(j+1), hence
    # U0/b>=(d+1)/(j+1)+y+H1.
    component_u0u1 = (d + 1) / (j + 1) + y + 1 + S1 + 2 * H1
    component_gap = sp.cancel(
        (j + 1) * (A0 * u1 + a * A1bar * component_u0u1) + remainder
    )
    component_lower = sp.cancel(
        component_gap.subs({B4: (n - 4) * B2 / 3, R: 0}).subs(N, j + r)
    )
    print("component B2 degree", sp.Poly(component_lower, B2).degree())
    print("component B2 LC", sp.factor(sp.Poly(component_lower, B2).LC()))
    component_functions = {}
    for yv in (0, 1):
        for bname, bv in (("lo", B2lo), ("hi", B2hi)):
            expression = sp.cancel(component_lower.subs({y: yv, B2: bv}))
            component_functions[(yv, bname)] = sp.lambdify((j, r, d), expression, "math")
    extension_combined_minimum = None
    extension_combined_negatives = []
    for jv in range(4, 41):
        for rv in range(1, 81):
            if jv + rv < 15:
                continue
            Nv = jv + rv
            for dv in range(1, Nv + 1):
                for label in functions:
                    coupled_value = functions[label](jv, rv, dv)
                    component_value = component_functions[label](jv, rv, dv)
                    value = max(coupled_value, component_value)
                    item = (value, coupled_value, component_value, jv, rv, dv, label)
                    if extension_combined_minimum is None or value < extension_combined_minimum[0]:
                        extension_combined_minimum = item
                    if value < 0:
                        extension_combined_negatives.append(item)
    print("extension combined minimum", extension_combined_minimum)
    print("extension combined negatives", sorted(extension_combined_negatives)[:20])

    # Second valid A0 floor from the forest-anchor q2 decomposition.  Keep
    # the exact c0/B2 coordinate instead of lowering x through the q2 gap.
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
    A0q2 = p0 * q2floor / (2 * p1)
    gap_q2 = sp.cancel(
        ((j + 1) * (A0q2 * u1 + a * A1bar * u0u1) + remainder)
        .subs(R, 0)
        .subs(N, j + r)
    )
    print("q2 gap B2 degree", sp.Poly(gap_q2, B2).degree())
    print("q2 gap B2 LC", sp.factor(sp.Poly(gap_q2, B2).LC()))
    q2_functions = {}
    for yv in (0, 1):
        for bname, bv in (("lo", B2lo), ("hi", B2hi)):
            expression = sp.cancel(gap_q2.subs({y: yv, B2: bv}))
            q2_functions[(yv, bname)] = sp.lambdify((j, r, d), expression, "math")
    combined_minimum = None
    combined_negatives = []
    for jv in range(4, 41):
        for rv in range(1, 81):
            if jv + rv < 15:
                continue
            Nv = jv + rv
            for dv in range(1, Nv + 1):
                for label in functions:
                    anchor_value = functions[label](jv, rv, dv)
                    q2_value = q2_functions[label](jv, rv, dv)
                    value = max(anchor_value, q2_value)
                    item = (value, anchor_value, q2_value, jv, rv, dv, label)
                    if combined_minimum is None or value < combined_minimum[0]:
                        combined_minimum = item
                    if value < 0:
                        combined_negatives.append(item)
    print("combined minimum", combined_minimum)
    print("combined negatives", sorted(combined_negatives)[:20])

    # Bernstein signs over d in [1,N] for the large-r cone are diagnostic.
    u = sp.symbols("u", nonnegative=True)
    for label, expression in endpoint_expressions.items():
        parameterized = sp.cancel(expression.subs(d, 1 + (j + r - 1) * u))
        numerator = sp.together(parameterized).as_numer_denom()[0]
        poly = sp.Poly(sp.expand(numerator), u)
        print("endpoint", label, "u degree", poly.degree())


if __name__ == "__main__":
    main()
