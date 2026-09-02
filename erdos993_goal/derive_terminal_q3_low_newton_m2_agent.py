#!/usr/bin/env python3
"""Symbolic exploration of the terminal Newton-m=2 coefficient."""

import sympy as sp


def kappa(p, q, m):
    if not max(p, q) <= m <= p + q:
        return 0
    return sp.factorial(m) // (
        sp.factorial(m - p) * sp.factorial(m - q) * sp.factorial(p + q - m)
    )


def main():
    N, j, a, b, e0, p0, x, y, z, w, hh, zz = sp.symbols(
        "N j a b e0 p0 x y z w hh zz", positive=True
    )
    p1 = (N**2 + N + 2) / 2
    p2 = N + 2
    P = [p0, p1, p2, 1]
    Q = [
        (j + 1) * b * a - 3 * e0 * (p0 + a),
        (j + 1) * b * (a + N) - 3 * e0 * p1 - 3 * b * (p0 + a + p1),
        (j + 1) * b * N - 3 * e0 * p2 - 6 * b * (p1 + p2),
    ]
    pq2 = sp.expand(sum(
        kappa(left, right, 2) * P[left] * Q[right]
        for left in range(3)
        for right in range(3)
    ))
    print("kernel expression")
    print(sp.collect(pq2, [e0, p0, a]))

    coarse = sp.expand(pq2.subs(e0, (j + 2) * b))
    print("coarse p0 slope/b")
    print(sp.factor(sp.diff(coarse, p0) / b))
    print("coarse a slope/b")
    print(sp.factor(sp.diff(coarse, a) / b))
    p0_upper = N * (N - 1) * (N + 1) / 6
    pair_floor = (N - 1) * (N - 2) / 2
    coarse_final = sp.factor(coarse.subs({p0: p0_upper, a: pair_floor}) / b)
    print("coarse [PQ]2/b")
    print(coarse_final)

    p0_lower = (N - 1) * (N**2 - 2 * N + 6) / 6
    A1 = p0_lower + N + 2
    A2 = N**2 + 3 * N + 8
    r = N - j
    R2 = j / (r + 1)
    E2 = sp.expand(A1 * (2 + 2 * R2) + A2 * (3 + R2))
    normalized = sp.factor((j + 1) * a * E2 + coarse.subs(p0, p0_upper) / b)
    print("coarse normalized a slope")
    print(sp.factor(sp.diff(normalized, a)))
    final_gap = sp.factor(normalized.subs(a, pair_floor))
    print("coarse normalized final")
    print(final_gap)

    # j=3 correlated e0 and c0 improve Q0 only by 4b*a*x.  Improve anchors
    # by x*p1 and x*p2 as at m=3.
    correlated_before_p0 = sp.expand(
        pq2.subs({j: 3, e0: sp.Rational(4, 3) * b * (1 + x)})
        + (N + 2) * 4 * b * a * x
    )
    # The correction above is P2 times the missing 4b(c0-a) in Q0.
    print("corr p0 slope/b")
    print(sp.factor(sp.diff(correlated_before_p0, p0) / b))
    correlated = sp.expand(correlated_before_p0.subs(p0, p0_upper))
    A1x = p0_lower + N + 2 + x * p1
    A2x = N**2 + 3 * N + 8 + x * p2
    R2j3 = 3 / (N - 2)
    E2x = sp.expand(A1x * (2 + 2 * R2j3) + A2x * (3 + R2j3))
    corr_norm = sp.factor(4 * a * E2x + correlated / b)
    print("corr normalized a slope")
    print(sp.factor(sp.diff(corr_norm, a)))
    corr_final = sp.factor(corr_norm.subs(a, pair_floor))
    print("corr final")
    print(corr_final)

    # At j=3 use exact U1=p0 and U2=p1, with U0>=b.  Bound the positive
    # p0 occurrence from below and the remainder occurrence from above.
    strong_S = sp.expand(
        A1x * (2 * p0_lower + 2 * p1)
        + A2x * (b + 2 * p0_lower + p1)
    )
    strong_gap = sp.expand(4 * a * strong_S + correlated)
    print("strong a slope")
    print(sp.factor(sp.diff(strong_gap, a)))
    strong_after_a = sp.expand(strong_gap.subs(a, pair_floor))
    print("strong b slope")
    print(sp.factor(sp.diff(strong_after_a, b)))
    b_upper = N * (N - 1) * (N - 2) / 6
    strong_final = sp.factor(strong_after_a.subs(b, b_upper))
    print("strong final")
    print(strong_final)

    # Rooted-forest extension floor: 4f4>=(N-9)b, so
    # U0=g4+g3=f4+h3+b+h2>=(N-5)b/4.
    U0_floor = (N - 5) * b / 4
    floor_S = sp.expand(
        A1x * (2 * p0_lower + 2 * p1)
        + A2x * (U0_floor + 2 * p0_lower + p1)
    )
    floor_gap = sp.expand(4 * a * floor_S + correlated)
    print("floor a slope")
    print(sp.factor(sp.diff(floor_gap, a)))
    floor_after_a = sp.expand(floor_gap.subs(a, pair_floor))
    print("floor b slope")
    print(sp.factor(sp.diff(floor_after_a, b)))
    floor_final = sp.factor(floor_after_a.subs(b, b_upper))
    print("floor final")
    print(floor_final)
    print("floor x slope")
    print(sp.factor(sp.diff(floor_final, x)))
    print("floor x=3")
    print(sp.factor(floor_final.subs(x, 3)))

    # Absolute forest minimum i4(F)>=C(N-3,4).
    absolute_f4 = (N - 3) * (N - 4) * (N - 5) * (N - 6) / 24
    abs_U0 = absolute_f4 + b
    abs_S = sp.expand(
        A1x * (2 * p0_lower + 2 * p1)
        + A2x * (abs_U0 + 2 * p0_lower + p1)
    )
    abs_gap = sp.expand(4 * a * abs_S + correlated)
    print("abs a slope")
    print(sp.factor(sp.diff(abs_gap, a)))
    abs_after_a = sp.expand(abs_gap.subs(a, pair_floor))
    print("abs b slope")
    print(sp.factor(sp.diff(abs_after_a, b)))
    abs_final = sp.factor(abs_after_a.subs(b, b_upper))
    print("abs final")
    print(abs_final)
    print("abs x slope")
    print(sp.factor(sp.diff(abs_final, x)))
    print("abs x=3")
    print(sp.factor(abs_final.subs(x, 3)))

    # Keep the common p0 coordinate across the positive and adverse pieces.
    A1joint = p0 + N + 2 + x * p1
    joint_S = sp.expand(
        A1joint * (2 * p0 + 2 * p1)
        + A2x * (U0_floor + 2 * p0 + p1)
    )
    joint_gap = sp.expand(4 * a * joint_S + correlated_before_p0)
    print("joint p0 derivative at lower")
    print(sp.factor(sp.diff(joint_gap, p0).subs(p0, p0_lower)))
    joint_at_p0 = sp.expand(joint_gap.subs(p0, p0_lower))
    print("joint a slope")
    print(sp.factor(sp.diff(joint_at_p0, a)))
    joint_at_a = sp.expand(joint_at_p0.subs(a, pair_floor))
    print("joint b slope")
    print(sp.factor(sp.diff(joint_at_a, b)))
    joint_final = sp.factor(joint_at_a.subs(b, b_upper))
    print("joint final")
    print(joint_final)
    print("joint x slope")
    print(sp.factor(sp.diff(joint_final, x)))
    print("joint x=3")
    print(sp.factor(joint_final.subs(x, 3)))

    # Exact root decomposition p0=g3+g2=b+h2+a+h1 gives b<=p0-a.
    print("joint raw b slope")
    print(sp.factor(sp.diff(joint_gap, b)))
    coupled_b = sp.expand(joint_gap.subs(b, p0 - a))
    print("coupled p0 derivative at lower")
    print(sp.factor(sp.diff(coupled_b, p0).subs(p0, p0_lower)))
    coupled_p = sp.expand(coupled_b.subs(p0, p0_lower))
    print("coupled a slope")
    print(sp.factor(sp.diff(coupled_p, a)))
    coupled_a = sp.factor(coupled_p.subs(a, pair_floor))
    print("coupled final")
    print(coupled_a)
    print("coupled x slope")
    print(sp.factor(sp.diff(coupled_a, x)))
    print("coupled x=3")
    print(sp.factor(coupled_a.subs(x, 3)))
    print("coupled x=2")
    print(sp.factor(coupled_a.subs(x, 2)))

    # For x>=2, z2<=2a gives h2>=a(x-2), hence
    # b<=p0-a-h2<=p0-a(x-1).
    highx_b = sp.expand(joint_gap.subs(b, p0 - a * (x - 1)))
    print("highx p0 derivative at lower")
    print(sp.factor(sp.diff(highx_b, p0).subs(p0, p0_lower)))
    highx_p = sp.expand(highx_b.subs(p0, p0_lower))
    print("highx a slope")
    print(sp.factor(sp.diff(highx_p, a)))
    highx_a = sp.factor(highx_p.subs(a, pair_floor))
    print("highx final")
    print(highx_a)
    print("highx x slope")
    print(sp.factor(sp.diff(highx_a, x)))
    print("highx x=3")
    print(sp.factor(highx_a.subs(x, 3)))

    # Resolve x=y+z with y=h2/a in [0,1], z=z2/a in [0,2].  The coupled
    # extension floor gives U0>=(N-3)b/4+a*y, and the exact root split gives
    # b<=p0-a(1+y).
    resolved_U0 = (N - 3) * b / 4 + a * y
    resolved_A1 = p0 + N + 2 + (y + z) * p1
    resolved_A2 = N**2 + 3 * N + 8 + (y + z) * p2
    resolved_S = sp.expand(
        resolved_A1 * (2 * p0 + 2 * p1)
        + resolved_A2 * (resolved_U0 + 2 * p0 + p1)
    )
    resolved_pq = correlated_before_p0.subs(x, y + z)
    resolved_gap = sp.expand(4 * a * resolved_S + resolved_pq)
    print("resolved raw b slope")
    print(sp.factor(sp.diff(resolved_gap, b)))
    resolved_b = sp.expand(resolved_gap.subs(b, p0 - a * (1 + y)))
    print("resolved p0 derivative at lower")
    print(sp.factor(sp.diff(resolved_b, p0).subs(p0, p0_lower)))
    resolved_p = sp.expand(resolved_b.subs(p0, p0_lower))
    print("resolved a derivative")
    print(sp.factor(sp.diff(resolved_p, a)))
    resolved_a = sp.factor(resolved_p.subs(a, pair_floor))
    print("resolved final")
    print(resolved_a)
    print("resolved y derivative")
    print(sp.factor(sp.diff(resolved_a, y)))
    print("resolved z derivative")
    print(sp.factor(sp.diff(resolved_a, z)))
    for yy_value in (0, 1):
        for zz_value in (0, 2):
            print(f"resolved y{yy_value}z{zz_value}")
            print(sp.factor(resolved_a.subs({y: yy_value, z: zz_value})))

    # Exact root coordinates: w=h1=N-deg(root)=|E(F)|,
    # a=C(N,2)-w, p0=a+b+h2+w.  Keep h2 and z2 absolute.
    a_root = N * (N - 1) / 2 - w
    b_root = p0 - a_root - hh - w
    x_root = (zz + hh) / a_root
    U0_root = (N - 3) * b_root / 4 + hh
    A1root = p0 + N + 2 + x_root * p1
    A2root = N**2 + 3 * N + 8 + x_root * p2
    Sroot = sp.expand(
        A1root * (2 * p0 + 2 * p1)
        + A2root * (U0_root + 2 * p0 + p1)
    )
    pqroot = correlated_before_p0.subs({
        x: x_root,
        a: a_root,
        b: b_root,
    })
    root_gap = sp.factor(4 * a_root * Sroot + pqroot)
    pbase = (
        N * (N - 1) * (N + 1) / 6
        - N * (N - 1)
        + N * (N - 1) / 2
    )
    p0_lower_w = sp.factor(
        pbase + (N - w) * (N - w - 1) / 2 + w
    )
    p0_upper_w = sp.factor(
        pbase
        + (N - w) * (N - w - 1) / 2
        + w * (w + 1) / 2
    )
    print("conditional p interval")
    print(p0_lower_w)
    print(p0_upper_w)
    print("root p0 derivative at lower")
    print(sp.factor(sp.diff(root_gap, p0).subs(p0, p0_lower)))
    print("root p0 second")
    print(sp.factor(sp.diff(root_gap, p0, 2)))
    root_at_p = sp.factor(root_gap.subs(p0, p0_lower))
    print("root z derivative")
    print(sp.factor(sp.diff(root_at_p, zz)))
    print("root h derivative")
    print(sp.factor(sp.diff(root_at_p, hh)))
    # Probe the four elementary h/z endpoints.
    h_low = (w - 1) * (w - 2) / 2
    h_high = w * (w - 1) / 2
    for hname, hvalue in (("lo", h_low), ("hi", h_high)):
        for zname, zvalue in (("lo", 0), ("hi", 2 * a_root)):
            endpoint = sp.factor(root_at_p.subs({hh: hvalue, zz: zvalue}))
            print(f"root h{hname} z{zname}")
            print(endpoint)

    # Degree-conditioned p0 endpoints, and the sharper z2<=w(N-2).
    for pname, pvalue in (("lo", p0_lower_w), ("hi", p0_upper_w)):
        root_p_endpoint = sp.factor(root_gap.subs(p0, pvalue))
        print(f"degree p{pname} h-second")
        print(sp.factor(sp.diff(root_p_endpoint, hh, 2)))
        for hname, hvalue in (("lo", h_low), ("hi", h_high)):
            for zname, zvalue in (("lo", 0), ("hi", w * (N - 2))):
                endpoint = sp.factor(root_p_endpoint.subs({hh: hvalue, zz: zvalue}))
                print(f"degree p{pname} h{hname} z{zname}")
                print(endpoint)

    # Floating diagnostic of the exact root-coordinate relaxation.  The p0
    # direction is concave and the h2 direction convex in the scanned box;
    # z2 is affine.  Test p/z endpoints and the exact h vertex.
    import math

    p_second_fn = sp.lambdify((N, w, hh, zz), sp.diff(root_gap, p0, 2), "math")
    candidates = []
    curvature_fail = None
    for pname, pvalue in (("lo", p0_lower_w), ("hi", p0_upper_w)):
        expr = sp.cancel(root_gap.subs(p0, pvalue))
        f_fn = sp.lambdify((N, w, hh, zz), expr, "math")
        dh_fn = sp.lambdify((N, w, hh, zz), sp.diff(expr, hh), "math")
        d2h_fn = sp.lambdify((N, w), sp.diff(expr, hh, 2), "math")
        candidates.append((pname, f_fn, dh_fn, d2h_fn))
    diagnostic_min = None
    for nv in range(14, 101):
        for wv in range(nv):
            av = nv * (nv - 1) / 2 - wv
            hlo = 0 if wv < 2 else (wv - 1) * (wv - 2) / 2
            hhi = wv * (wv - 1) / 2
            zhi = min(2 * av, wv * (nv - 2))
            # p curvature is affine in h,z, so its four corners suffice.
            for hv in (hlo, hhi):
                for zv in (0, zhi):
                    if p_second_fn(nv, wv, hv, zv) > 1e-7:
                        curvature_fail = ("p", nv, wv, hv, zv)
            for pname, f_fn, dh_fn, d2h_fn in candidates:
                hcurv = d2h_fn(nv, wv)
                if hcurv < -1e-7:
                    curvature_fail = ("h", pname, nv, wv, hcurv)
                for zv in (0, zhi):
                    hs = [float(hlo), float(hhi)]
                    if hcurv > 0:
                        vertex = hlo - dh_fn(nv, wv, hlo, zv) / hcurv
                        if hlo <= vertex <= hhi:
                            hs.append(vertex)
                    for hv in hs:
                        value = f_fn(nv, wv, hv, zv)
                        item = (value, nv, wv, pname, hv, zv)
                        if diagnostic_min is None or item < diagnostic_min:
                            diagnostic_min = item
    print("root relaxation curvature fail", curvature_fail)
    print("root relaxation minimum N14..100", diagnostic_min)

    # Exact wedge/root coupling.  Let X be the number of F-edges incident
    # with the distinguished component roots.  Then
    # W_G=C(N-w,2)+W_F+X, z2=w(N-2)-2W_F, and
    # h2=C(w,2)-(w-X).  Eliminate W_F and X.
    p0_coupled = sp.factor(
        pbase
        + (N - w) * (N - w - 1) / 2
        + (w * (N - 2) - zz) / 2
        + hh - w * (w - 1) / 2 + w
    )
    coupled_root_gap = sp.factor(root_gap.subs(p0, p0_coupled))
    print("wedge-coupled h second")
    print(sp.factor(sp.diff(coupled_root_gap, hh, 2)))
    print("wedge-coupled z second")
    print(sp.factor(sp.diff(coupled_root_gap, zz, 2)))
    print("wedge-coupled mixed")
    print(sp.factor(sp.diff(coupled_root_gap, hh, zz)))

    coupled_fn = sp.lambdify((N, w, hh, zz), coupled_root_gap, "math")
    coupled_h1 = sp.lambdify((N, w, hh, zz), sp.diff(coupled_root_gap, hh), "math")
    coupled_h2 = sp.lambdify((N, w), sp.diff(coupled_root_gap, hh, 2), "math")
    coupled_z1 = sp.lambdify((N, w, hh, zz), sp.diff(coupled_root_gap, zz), "math")
    coupled_z2 = sp.lambdify((N, w), sp.diff(coupled_root_gap, zz, 2), "math")
    coupled_min = None
    for nv in range(14, 151):
        for wv in range(nv):
            av = nv * (nv - 1) / 2 - wv
            hlo = 0 if wv < 2 else (wv - 1) * (wv - 2) / 2
            hhi = wv * (wv - 1) / 2
            zlo, zhi = 0.0, float(min(2 * av, wv * (nv - 2)))
            # Diagnostic alternating inclusion of stationary points and
            # boundary vertices for the bivariate quadratic.
            points = [(float(hv), float(zv)) for hv in (hlo, hhi) for zv in (zlo, zhi)]
            hcurv = coupled_h2(nv, wv)
            zcurv = coupled_z2(nv, wv)
            for zv in (zlo, zhi):
                if hcurv:
                    hv = hlo - coupled_h1(nv, wv, hlo, zv) / hcurv
                    if hlo <= hv <= hhi:
                        points.append((hv, zv))
            for hv in (float(hlo), float(hhi)):
                if zcurv:
                    zv = zlo - coupled_z1(nv, wv, hv, zlo) / zcurv
                    if zlo <= zv <= zhi:
                        points.append((hv, zv))
            for hv, zv in points:
                value = coupled_fn(nv, wv, hv, zv)
                item = (value, nv, wv, hv, zv)
                if coupled_min is None or item < coupled_min:
                    coupled_min = item
    print("wedge-coupled minimum N14..150", coupled_min)


if __name__ == "__main__":
    main()
