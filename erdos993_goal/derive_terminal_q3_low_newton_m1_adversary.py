#!/usr/bin/env python3
"""Adversarial symbolic search for terminal-q3 Newton degree m=1.

Derivation aid only.  This script keeps the root-degree correlations
`a=C(N,2)-(N-d)` and the conditional wedge interval.  It does not claim a
theorem; any successful relaxation must be frozen separately.
"""

from __future__ import annotations

import itertools

import sympy as sp


def main() -> None:
    N, j, r, d, W, y, rho, zbar, a, g = sp.symbols(
        "N j r d W y rho zbar a g", nonnegative=True
    )
    n = N + 1
    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W
    x = sp.factor((g / a + 3 * R1) / (2 * p1) - 1)

    # rho is the average number of prescribed component roots selected by
    # an independent j-set.  The incidence proof gives C/b<=2(j-rho), so
    # e0/b<=1+y+j-rho and the same C controls the extension floor.
    ebar = 1 + y + zbar
    q0bar = (j + 1) * a * (1 + x) - 3 * ebar * (p0 + a)
    q1bar = (
        (j + 1) * (a + R1)
        - 3 * ebar * p1
        - 3 * (p0 + a + p1)
    )
    pq1bar = sp.expand(p0 * q1bar + p1 * q0bar + p1 * q1bar)

    A1bar = sp.expand(p0 + N + 2 + 2 * W + x * p1)
    S1 = j / (r + 1)
    H1 = j * y / r
    U0base = (N - 3 * j + 2 * rho) / (j + 1) + 1 + y
    U0bar = U0base + H1
    U1bar = 1 + S1 + H1
    # Quantitative all-tree q3<=q2 reserve for Q=G disjoint K1.  For the
    # tree G of order n, put excess E=W-(n-2) and use the exact tree count
    # formulas with tau<=(n-1)E/3.  This is correlated with the same W.
    excess = W - (n - 2)
    tree_i2 = (n - 1) * (n - 2) / 2
    tree_i3 = (n - 2) * (n - 3) * (n - 4) / 6 + excess
    tree_m2 = (n - 2) * (n - 3) / 2 - excess
    tree_s2 = 2 * tree_m2
    tree_s3_at_tau_cap = (
        3 * (n - 3) * (n - 4) * (n - 5) / 6
        - 2 * (n - 4) * excess + (n - 1) * excess
    )
    forest_margin_lower = sp.factor(
        3 * (tree_i3 + tree_i2) * (tree_s2 + n - 1)
        - 2 * (tree_i2 + n) * (tree_s3_at_tau_cap + tree_s2)
    )
    A0lower = (p0 * g + a * forest_margin_lower) / (2 * p1)
    margin = sp.factor((j + 1) * (A0lower * U1bar + a * A1bar * (U0bar + U1bar)) + pq1bar)
    g_slope = sp.factor(sp.diff(margin, g))
    print("g_slope=", g_slope)

    coarse_q2floor = sp.factor((
        6*d**3 + 4*d**2*n**2 - 16*d**2*n - 4*d**2
        - 4*d*n**3 + 6*d*n**2 + 44*d*n - 20*d
        + n**4 + n**3 - 27*n**2 + 25*n + 12
    ) / 2)
    # Exact q2 gap in the root-local invariants.  Its R coefficient is
    # 3(N^2+N+2)>0 and every non-centered-star rooting has R>=1.
    root_neighbor_excess = sp.symbols("root_neighbor_excess", nonnegative=True)
    exact_q2gap = sp.factor((
        N**4 - 4*N**3*d + 3*N**3
        + 6*N**2*root_neighbor_excess + 2*N**2*W
        + 3*N**2*d**2 - 3*N**2*d - 2*N**2
        + 6*N*root_neighbor_excess - 22*N*W
        + 3*N*d**2 - N*d - 20*N
        + 12*root_neighbor_excess + 12*W*d - 8*W
        + 6*d**2 + 14*d
    ) / 2)
    q2floor = exact_q2gap.subs(root_neighbor_excess, 1)
    exact_a = sp.binomial(N, 2) - (N - d)
    exact_a = sp.expand_func(exact_a)
    Wlo = sp.expand(N - 1 + (d - 1) * (d - 2) / 2)
    Whi = sp.expand(Wlo + (N - d) * (N - d - 1) / 2)

    relaxed = sp.factor(margin.subs(g, q2floor).subs(a, exact_a).subs(N, j + r))
    print("degree W,y,rho,zbar,d=", [sp.Poly(relaxed, variable).degree() for variable in (W, y, rho, zbar, d)])
    functions = {}
    for wlabel, wendpoint in (("lo", Wlo), ("hi", Whi)):
        corner = sp.cancel(relaxed.subs(W, wendpoint.subs(N, j + r)))
        functions[wlabel] = sp.lambdify((j, r, d, y, rho, zbar), corner, "math")

    minimum = None
    negatives = []
    minimum_j3 = None
    negatives_j3 = []
    for jvalue in range(3, 21):
        for rvalue in range(1, 31):
            Nvalue = jvalue + rvalue
            if Nvalue < 15:
                continue
            for dvalue in range(1, Nvalue):
                singleton_floor = max(0, 2 * dvalue - Nvalue)
                root_floor = jvalue * singleton_floor / Nvalue
                vertices = {(0.0, max(1.0, root_floor)), (1.0, root_floor)}
                if 0 < root_floor < 1:
                    vertices.add((1.0 - root_floor, root_floor))
                for (wlabel, function), (yvalue, rhovalue) in itertools.product(
                    functions.items(), sorted(vertices)
                ):
                    Wvalue = float((Wlo if wlabel == "lo" else Whi).subs({N: Nvalue, d: dvalue}))
                    avalue = Nvalue * (Nvalue - 1) / 2 - (Nvalue - dvalue)
                    z2value = (
                        (Nvalue - dvalue) * (Nvalue - 2)
                        - 2 * (Wvalue - dvalue * (dvalue - 1) / 2 - 1)
                    )
                    q2_zbar = jvalue * z2value / (2 * avalue)
                    zbarvalue = min(jvalue - rhovalue, q2_zbar)
                    value = function(
                        jvalue, rvalue, dvalue, yvalue, rhovalue, zbarvalue
                    )
                    item = (
                        value, jvalue, rvalue, dvalue,
                        (yvalue, rhovalue, zbarvalue, wlabel),
                    )
                    if minimum is None or value < minimum[0]:
                        minimum = item
                    if value < 0:
                        negatives.append(item)
                    if jvalue == 3 and (minimum_j3 is None or value < minimum_j3[0]):
                        minimum_j3 = item
                    if jvalue == 3 and value < 0:
                        negatives_j3.append(item)
    print("grid_min=", minimum)
    print("negative_count=", len(negatives))
    print("first_negatives=", sorted(negatives)[:20])
    print("grid_min_j3=", minimum_j3)
    print("negative_count_j3=", len(negatives_j3))

    print("root-incidence floor used: rho>=max(1-y, j*max(0,2d-N)/N)")
    print("conditional diagnostic used: z_j/b<=j*z2/(2a) (UNPROVED all-rank qj<=q2)")


if __name__ == "__main__":
    main()
