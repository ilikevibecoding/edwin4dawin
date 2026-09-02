#!/usr/bin/env python3
"""Exploratory exact W-crossing algebra for the forest m1,j3 tail.

This is deliberately a probe, not a theorem artifact.  It uses the two root
builders only to expose and test the common-denominator branch algebra before
the independent verifier is frozen.
"""

from __future__ import annotations

import sympy as sy

from derive_terminal_q3_m1_forest_j3_exact_u1_root import build as build_c
from derive_terminal_q3_m1_forest_j3_simple_f4_root import build as build_t


def choose(x, k):
    out = sy.Integer(1)
    for q in range(k):
        out *= x - q
    return sy.cancel(out / sy.factorial(k))


def main():
    n0, d0, _mnum, _mden, variables, b0 = build_c()
    n1, d1, variables1, b1 = build_t()
    assert variables == variables1 and sy.expand(b0 - b1) == 0
    N, h, d, R, W, y = variables
    P_c = sy.Poly(-n0, W)
    P_t = sy.Poly(-(N - 3) * n1, W)
    print("built", P_c.degree(), P_t.degree(), flush=True)
    print("den_ratio", sy.factor(d0 / d1), flush=True)

    diff = sy.Poly(P_t - P_c, W)
    print("diff_degree", diff.degree(), flush=True)
    print("diff_factor", sy.factor(diff.as_expr()), flush=True)

    S = N - d
    eH = N - h - d - R
    U3 = sy.expand(choose(S, 3) - eH * (S - 2) + choose(eH, 2))
    B = sy.expand(
        d * choose(S - 1, 2) - R * (S - 2)
        + choose(d, 2) * S - (d - 1) * R + choose(d, 3)
    )
    m = N - h
    p0 = sy.expand(choose(N + 1, 3) - m * (N - 1) + W
                   + choose(N + 1, 2) - m)
    p1 = sy.expand(choose(N + 1, 2) - m + N + 1)
    R1 = sy.expand(m * N - 2 * W)
    a = sy.expand(choose(N, 2) - (m - d))
    z2 = sy.expand((m - d) * (N - 2)
                   - 2 * (W - choose(d, 2) - R))
    h2 = sy.expand(choose(S, 2) - (m - d - R))
    c0 = sy.expand(a + z2 + h2)
    b = sy.expand(choose(N, 3) - (m - d) * (N - 2)
                  + W - choose(d, 2) - R)
    A1 = sy.expand(p0 * a + p1 * c0 + p1 * a - a * R1)
    coarse_f4 = sy.expand(
        d * choose(S - 2, 3) - R * choose(S - 3, 2)
        + choose(d, 2) * choose(S - 1, 2)
        - (d - 1) * R * (S - 2)
        + choose(d, 3) * S - choose(d - 1, 2) * R
        + choose(d, 4)
    )
    C = sy.expand(h2 + coarse_f4)
    Uc = (N - 3 + 2 * y) / 4 + 3 * y / (N - 3)
    Ut = 1 + y + C / b
    dU = sy.cancel(Ut - Uc)
    ratio = sy.factor(diff.as_expr() / (A1 * dU))
    print("diff_over_A1_dU", ratio, flush=True)
    assert sy.factor(ratio - 1152 * (N - 3) * a * p1 * b) == 0
    for label, y_num, y_den in (
        ("unit", sy.Integer(1), sy.Integer(1)),
        ("ratio", U3, sy.expand(U3 + B)),
    ):
        Pc = sy.Poly(sy.expand(P_c.as_expr().subs(y, y_num / y_den) * y_den), W)
        Pt = sy.Poly(sy.expand(P_t.as_expr().subs(y, y_num / y_den) * y_den), W)
        cap_dU = sy.cancel(dU.subs(y, y_num / y_den))
        K_num, K_den = sy.together(cap_dU).as_numer_denom()
        K_num = sy.expand(K_num)
        K_den = sy.factor(K_den)
        K = sy.Poly(K_num, W)
        print(label, "degrees", Pc.degree(), Pt.degree(), K.degree(), flush=True)
        print(label, "K_den", K_den, flush=True)
        print(label, "K", sy.factor(K.as_expr()), flush=True)
        field = sy.QQ.frac_field(N, h, d, R)
        pc_field = sy.Poly(Pc.as_expr(), W, domain=field)
        pt_field = sy.Poly(Pt.as_expr(), W, domain=field)
        k_field = sy.Poly(K.as_expr(), W, domain=field)
        qc, rc = pc_field.div(k_field)
        qt, rt = pt_field.div(k_field)
        assert sy.expand(rc.as_expr() - rt.as_expr()) == 0
        print(label, "quotient_degrees", qc.degree(), qt.degree(),
              "remainder_degree", rc.degree(), flush=True)
        print(label, "qdiff", sy.factor(qt.as_expr() - qc.as_expr()), flush=True)
        rnum, rden = sy.together(rc.as_expr()).as_numer_denom()
        qcnum, qcden = sy.together(qc.as_expr()).as_numer_denom()
        qtnum, qtden = sy.together(qt.as_expr()).as_numer_denom()
        print(label, "remainder_den", sy.factor(rden),
              "terms", len(sy.Poly(sy.expand(rnum), N,h,d,R).terms()), flush=True)
        print(label, "qc_den", sy.factor(qcden), "qt_den", sy.factor(qtden), flush=True)


if __name__ == "__main__":
    main()
