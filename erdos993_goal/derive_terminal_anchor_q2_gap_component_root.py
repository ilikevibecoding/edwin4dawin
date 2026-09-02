#!/usr/bin/env python3
"""Symbolically derive how the q2-mediated anchor gap changes under union."""

import sympy as s


def ch(x, k):
    return s.prod(x - i for i in range(k)) / s.factorial(k)


def q2_gap(n, m, wedges, d, root_excess, t):
    i2 = ch(n + t, 2) - m
    s2 = m * (n + t - 2) - 2 * wedges
    f2 = ch(n - 1, 2) - (m - d)
    wedges_f = wedges - ch(d, 2) - root_excess
    z2 = (m - d) * (n - 3) - 2 * wedges_f
    h2 = ch(n - d - 1, 2) - (m - d - root_excess)
    c1 = z2 + h2 + t * f2
    return s.expand(2 * i2 * c1 - 3 * f2 * s2)


def main():
    a, y, mr, ar, A, d, R, t = s.symbols("a y mr ar A d R t")
    base = q2_gap(a, a - 1, A, d, R, t)
    union = q2_gap(a + y, a - 1 + mr, A + ar, d, R, t)
    delta = s.factor(union - base)
    print("degrees", [s.degree(delta, x) for x in (mr, ar, y, t)])
    print("coefficient ar", s.factor(s.diff(delta, ar)))
    print("delta", delta)
    print("shifted t coefficients")
    for coefficient in reversed(s.Poly(s.expand(delta.subs(t, t + 1)), t).all_coeffs()):
        print(s.factor(coefficient))


if __name__ == "__main__":
    main()
