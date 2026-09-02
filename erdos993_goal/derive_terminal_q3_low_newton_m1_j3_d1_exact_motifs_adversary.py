#!/usr/bin/env python3
"""Exact motif formula for m=1,j=3 when deg_G(w)=1.

Derivation aid only.  Unlike the coarse lower-bound experiments, this keeps
the common rank-four surplus in every place it occurs.  The resulting
formula is exact in (N,R,Y,e,tau_F,h3/f3), where R is the root degree in
F=G-w and Y is its distance-two incidence count.
"""

from __future__ import annotations

import itertools

import sympy as sp


def tensor_bernstein(expression: sp.Expr, variables: tuple[sp.Symbol, ...]):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    output = {}
    for index in itertools.product(*[range(degree + 1) for degree in degrees]):
        value = sp.Integer(0)
        for powers in itertools.product(*[range(item + 1) for item in index]):
            coefficient = polynomial.coeff_monomial(sp.prod(
                variable**power for variable, power in zip(variables, powers)
            ))
            value += coefficient * sp.prod(
                sp.binomial(index[k], powers[k]) / sp.binomial(degrees[k], powers[k])
                for k in range(len(variables))
            )
        output[index] = sp.factor(value)
    return degrees, output


def main() -> None:
    N, R, Y, e, tau, y = sp.symbols("N R Y e tau y", nonnegative=True)
    j = sp.Integer(3)
    n = N + 1
    tau_G = tau + R * (R - 1) / 2 + Y - 1
    excess_G = e + R - 1
    W = excess_G + (n - 2)

    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W

    a = (N - 1) * (N - 2) / 2
    AF = e + N - 2
    z2 = (N - 2) * (N - 3) - 2 * e
    h2 = (N - 1) * (N - 2) / 2 - (N - 1 - R)
    b = (N - 2) * (N - 3) * (N - 4) / 6 + e
    c0 = sp.expand(z2 + h2 + a)

    # Exact one-edge rank-four coefficient for G disjoint K1.
    s2_G = 2 * ((n - 2) * (n - 3) / 2 - excess_G)
    s3_G = (
        (n - 3) * (n - 4) * (n - 5) / 2
        - 2 * (n - 4) * excess_G + 3 * tau_G
    )
    R0 = sp.expand(s3_G + s2_G)
    A0 = sp.expand(p0 * c0 - a * R0)
    A1 = sp.expand(p0 * a + p1 * c0 + p1 * a - a * R1)

    # Exact terminal rank-three one-edge count and exact i4(F), sharing tau.
    z3 = (
        (N - 3) * (N - 4) * (N - 5) / 2
        - 2 * (N - 4) * e + 3 * tau
    )
    ebar = sp.factor(1 + y + z3 / b)
    q0bar = (j + 1) * (c0 + R0) - 3 * (p0 + a) * ebar
    q1bar = (
        (j + 1) * (a + R1)
        - 3 * p1 * ebar - 3 * (p0 + a + p1)
    )
    pq1_over_b = sp.expand(p0 * q1bar + p1 * q0bar + p1 * q1bar)

    h1 = N - 1
    U1_over_b = sp.factor((b + h2 + a + h1) / b)
    f4 = (
        (N - 3) * (N - 4) * (N - 5) * (N - 6) / 24
        + (N - 4) * e - tau
    )
    U0_over_b = sp.factor(f4 / b + y + 1 + h2 / b)

    exact = sp.factor(
        (j + 1) * a * (
            A0 * U1_over_b + A1 * (U0_over_b + U1_over_b)
        ) + a * pq1_over_b
    )
    numerator, denominator = sp.together(exact).as_numer_denom()
    print("denominator", sp.factor(denominator))
    print("numerator_degrees", {
        str(variable): sp.Poly(numerator, variable).degree()
        for variable in (R, Y, e, tau, y)
    })
    for variable in (Y, tau, y):
        print(f"slope_{variable}", sp.factor(sp.diff(exact, variable)))

    path_y = (N - 5) / (N - 2)
    path = sp.factor(exact.subs({R: 1, Y: 1, e: 0, tau: 0, y: path_y}))
    print("path_factor", path)

    independent_worst = sp.factor(exact.subs({
        Y: N - R - 1,
        tau: (N - 1) * e / 3,
        y: 1,
    }))
    worst_num, worst_den = sp.together(independent_worst).as_numer_denom()
    print("independent_worst_denominator", sp.factor(worst_den))
    print("independent_worst_degrees", {
        "R": sp.Poly(worst_num, R).degree(),
        "e": sp.Poly(worst_num, e).degree(),
        "N": sp.Poly(worst_num, N).degree(),
    })
    q, u, v = sp.symbols("q u v", nonnegative=True)
    Nbox = 15 + q
    Rbox = 1 + (Nbox - 2) * u
    emin_box = (Rbox - 1) * (Rbox - 2) / 2
    emax_box = (Nbox - 2) * (Nbox - 3) / 2
    ebox = emin_box + (emax_box - emin_box) * v
    box_poly = sp.cancel(worst_num.subs({
        N: Nbox, R: Rbox, e: ebox,
    }, simultaneous=True))
    box_degrees, box_coefficients = tensor_bernstein(box_poly, (u, v))
    bad_box = {}
    for index, coefficient in box_coefficients.items():
        qpoly = sp.Poly(sp.expand(coefficient), q)
        if any(value < 0 for value in qpoly.all_coeffs()):
            bad_box[index] = str(coefficient)
    print("box_bernstein_degrees", box_degrees)
    print("box_bernstein_coefficients", len(box_coefficients))
    print("box_bad_power_coefficients", len(bad_box), list(bad_box.items())[:5])
    slope_certificates = {}
    for label, adverse_slope in (
        ("Y", -sp.diff(exact, Y)),
        ("tau", -sp.diff(exact, tau)),
        ("y", -sp.diff(exact, y)),
    ):
        slope_num = sp.together(adverse_slope).as_numer_denom()[0]
        slope_box = sp.cancel(slope_num.subs({
            N: Nbox, R: Rbox, e: ebox,
        }, simultaneous=True))
        degrees, coefficients = tensor_bernstein(slope_box, (u, v))
        bad = {}
        for index, coefficient in coefficients.items():
            if any(value < 0 for value in sp.Poly(sp.expand(coefficient), q).all_coeffs()):
                bad[index] = str(coefficient)
        slope_certificates[label] = {
            "degrees": degrees,
            "coefficients": len(coefficients),
            "bad": len(bad),
            "zero": sum(value == 0 for value in coefficients.values()),
        }
    print("slope_bernstein", slope_certificates)
    worst_fn = sp.lambdify((N, R, e), independent_worst, "math")
    worst_minimum = None
    worst_negatives = []
    for Nv in range(15, 61):
        emax = (Nv - 2) * (Nv - 3) // 2
        for Rv in range(1, Nv):
            emin = (Rv - 1) * (Rv - 2) // 2
            for ev in range(emin, emax + 1):
                value = worst_fn(Nv, Rv, ev)
                item = (value, Nv, Rv, ev)
                if worst_minimum is None or value < worst_minimum[0]:
                    worst_minimum = item
                if value < 0:
                    worst_negatives.append(item)
    print("independent_worst_minimum", worst_minimum)
    print("independent_worst_negatives", len(worst_negatives), sorted(worst_negatives)[:10])

    # A coarse exact-domain grid, not a certificate.  Basic necessary bounds:
    # e>=C(R-1,2), 1<=Y<=N-R-1 for a nonstar rooted tree, and
    # 0<=tau<=min((N-1)e/3,(N-4)e).  y endpoints are included.
    fn = sp.lambdify((N, R, Y, e, tau, y), exact, "math")
    minimum = None
    negatives = []
    checks = 0
    for Nv in range(15, 61):
        emax = (Nv - 3) * (Nv - 4) // 2
        for Rv in range(1, Nv - 1):
            emin = (Rv - 1) * (Rv - 2) // 2
            if emin > emax:
                continue
            for Yv in {1, max(1, Nv - Rv - 1)}:
                for ev in {emin, emax}:
                    taumax = min((Nv - 1) * ev / 3, (Nv - 4) * ev)
                    for tauv in {0, taumax}:
                        tauGv = tauv + Rv * (Rv - 1) / 2 + Yv - 1
                        if tauGv < 0 or tauGv > Nv * (ev + Rv - 1) / 3:
                            continue
                        for yv in (0, 1):
                            value = fn(Nv, Rv, Yv, ev, tauv, yv)
                            item = (value, Nv, Rv, Yv, ev, tauv, yv)
                            checks += 1
                            if minimum is None or value < minimum[0]:
                                minimum = item
                            if value < 0:
                                negatives.append(item)
    print("coarse_grid_checks", checks)
    print("coarse_grid_minimum", minimum)
    print("coarse_grid_negatives", len(negatives), sorted(negatives)[:10])


if __name__ == "__main__":
    main()
