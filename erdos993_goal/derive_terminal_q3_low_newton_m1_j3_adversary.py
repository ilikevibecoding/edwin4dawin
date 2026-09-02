#!/usr/bin/env python3
"""Exact-symbolic m=1,j=3 lower-bound search in rooted tree motifs.

Derivation aid only.  It uses the proved all-forest q3<=q2 theorem, exact
rank <=3 rooted counts, the quantitative all-tree rank-four reserve, and
the path-minimal i4 floor.  No theorem is claimed until the remaining motif
domain is certified without relaxation gaps.
"""

from __future__ import annotations

import itertools

import sympy as sp


def main() -> None:
    N, d, W, R, y = sp.symbols("N d W R y", nonnegative=True)
    j = sp.Integer(3)
    n = N + 1

    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W

    a = sp.expand(N * (N - 1) / 2 - (N - d))
    AF = W - d * (d - 1) / 2 - R
    z2 = sp.expand((N - d) * (N - 2) - 2 * AF)
    h2 = sp.expand((N - d) * (N - d - 1) / 2 - (N - d - R))
    b = sp.expand(N * (N - 1) * (N - 2) / 6 - (N - d) * (N - 2) + AF)
    c0 = sp.expand(z2 + h2 + a)
    g = sp.factor(2 * p1 * c0 - 3 * a * R1)

    # Quantitative q3<=q2 reserve for Q=G disjoint K1.  The tree G has
    # excess E=W-(n-2); substitute the proved tau cap.
    excess = W - (n - 2)
    tree_i2 = (n - 1) * (n - 2) / 2
    tree_i3 = (n - 2) * (n - 3) * (n - 4) / 6 + excess
    tree_m2 = (n - 2) * (n - 3) / 2 - excess
    tree_s2 = 2 * tree_m2
    tree_s3_cap = (
        (n - 3) * (n - 4) * (n - 5) / 2
        - 2 * (n - 4) * excess + (n - 1) * excess
    )
    forest_margin = sp.factor(
        3 * (tree_i3 + tree_i2) * (tree_s2 + n - 1)
        - 2 * (tree_i2 + n) * (tree_s3_cap + tree_s2)
    )
    A0 = sp.factor((p0 * g + a * forest_margin) / (2 * p1))
    A1 = sp.expand(p0 * a + p1 * c0 + p1 * a - a * R1)

    # Proven q3(F)<=q2(F): z3/b<=3*z2/(2a).  Thus
    # e0/b<=1+y+3*z2/(2a).  The e0 coefficient is adverse.
    ebar = 1 + y + 3 * z2 / (2 * a)
    q0bar = (j + 1) * c0 - 3 * (p0 + a) * ebar
    q1bar = (
        (j + 1) * (a + R1)
        - 3 * p1 * ebar
        - 3 * (p0 + a + p1)
    )
    pq1_over_b = sp.expand(p0 * q1bar + p1 * q0bar + p1 * q1bar)

    # At j=3 the first U-shadow is completely explicit.  Only U0 uses an
    # i4 floor; every N-vertex forest has i4>=i4(P_N)=C(N-3,4).
    h1 = N - d
    U1_over_b = sp.factor((b + h2 + a + h1) / b)
    path_i4 = (N - 3) * (N - 4) * (N - 5) * (N - 6) / 24
    U0_over_b = sp.factor(path_i4 / b + y + 1 + h2 / b)

    lower = sp.factor(
        (j + 1) * a * (
            A0 * U1_over_b + A1 * (U0_over_b + U1_over_b)
        ) + a * pq1_over_b
    )
    print("y_degree", sp.Poly(lower, y).degree())
    print("y_slope", sp.factor(sp.diff(lower, y)))

    # Numerical adversarial scan of the relaxed root-motif box.  Invalid
    # points with a,b,z2,h2<0 are discarded, but this remains search only.
    function = sp.lambdify((N, d, W, R, y), lower, "math")
    invariant_function = sp.lambdify((N, d, W, R), (a, b, z2, h2), "math")
    count = negatives = 0
    minimum = None
    for Nv in range(15, 101):
        for dv in range(1, Nv + 1):
            Wlo = Nv - 1 + (dv - 1) * (dv - 2) // 2
            Whi = Wlo + (Nv - dv) * (Nv - dv - 1) // 2
            Rvalues = {0} if dv == Nv else {1, max(1, Nv - dv)}
            for Wv, Rv, yv in itertools.product({Wlo, Whi}, Rvalues, (0, 1)):
                invariant_values = invariant_function(Nv, dv, Wv, Rv)
                if any(value < 0 for value in invariant_values):
                    continue
                value = function(Nv, dv, Wv, Rv, yv)
                item = (value, Nv, dv, Wv, Rv, yv)
                count += 1
                if minimum is None or value < minimum[0]:
                    minimum = item
                if value < 0:
                    negatives += 1
    print("relaxed_box_checks", count)
    print("relaxed_box_minimum", minimum)
    print("relaxed_box_negatives", negatives)
    for Nv in (15, 50, 100):
        # For an endpoint-rooted path F=P_N, h3=i3(P_(N-1)).
        bv = int(b.subs({N: Nv, d: 1, W: Nv - 1, R: 1}))
        hv = (Nv - 3) * (Nv - 4) * (Nv - 5) // 6
        print(
            "path_endpoint_lower", Nv,
            function(Nv, 1, Nv - 1, 1, hv / bv),
            "y", f"{hv}/{bv}",
        )


if __name__ == "__main__":
    main()
