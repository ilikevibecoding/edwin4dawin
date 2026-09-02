#!/usr/bin/env python3
"""Scan exact normalized compensation inequalities for the two-star ISO base."""

from fractions import Fraction
from math import comb


def C(n, q):
    return comb(n, q) if 0 <= q <= n else 0


def groups(a, b, r):
    n = a + b
    B = {j: C(n, r + j) for j in range(-3, 2)}
    X = {j: C(a, r + j - 1) for j in range(-3, 2)}
    Y = {j: C(b, r + j - 1) for j in range(-3, 2)}
    bb = (-2*B[0]*B[-2] - 2*B[0]*B[-3] - (r+1)*B[1]*B[-3]
          + (r-1)*B[-1]**2 + 2*B[-1]*B[-2] + 2*B[-1]*B[-3]
          + 2*B[-2]**2)
    def cross(Z):
        return (-(r+1)*B[0]*Z[-2] + (r-1)*B[-1]*Z[-1] - B[-1]*Z[-2]
                + (r-1)*B[-2]*Z[0] + 2*B[-2]*Z[-1] + 2*B[-2]*Z[-2]
                - B[-3]*Z[0] - (r+1)*B[-3]*Z[1] + 2*B[-3]*Z[-1])
    xy = (-(r+1)*X[0]*Y[-2] + 2*r*X[-1]*Y[-1]
          -(r+1)*X[-2]*Y[0] + 2*X[-2]*Y[-2])
    return B, X, Y, bb, cross(X), cross(Y), xy


def main():
    extrema = {}
    violations = {}
    for k in range(1, 61):
        r = k + 3
        for a in range(0, 121):
            for b in range(0, 121):
                n = a + b
                if n < k:
                    continue
                B, X, Y, bb, bx, by, xy = groups(a, b, r)
                B0, X0, Y0 = B[-3], X[-2], Y[-2]
                if B0 == 0:
                    continue
                BB = Fraction(bb, B0*B0)
                BX = Fraction(bx, B0*X0) if X0 else Fraction(0)
                BY = Fraction(by, B0*Y0) if Y0 else Fraction(0)
                XY = Fraction(xy, X0*Y0) if X0 and Y0 else Fraction(0)
                x = Fraction(X0, B0)
                y = Fraction(Y0, B0)
                tests = {
                    "BB": BB,
                    "BB_plus_BX": BB + BX if X0 else None,
                    "BB_plus_BY": BB + BY if Y0 else None,
                    "BB_plus_xBX": BB + x*BX if X0 else BB,
                    "BB_plus_yBY": BB + y*BY if Y0 else BB,
                    "BB_plus_weighted_linear": BB + x*BX + y*BY,
                    "XY": XY if X0 and Y0 else None,
                    "full": BB + x*BX + y*BY + x*y*XY,
                    "reserve_after_linear": BB + x*BX + y*BY,
                }
                for name, value in tests.items():
                    if value is None:
                        continue
                    old = extrema.get(name)
                    if old is None or value < old[0]:
                        extrema[name] = (value, k, a, b, x, y, BB, BX, BY, XY)
                    if value < 0:
                        violations[name] = violations.get(name, 0) + 1
    for name in sorted(extrema):
        value, k, a, b, x, y, BB, BX, BY, XY = extrema[name]
        print(name, "min", value, "at", (k, a, b), "x,y", x, y,
              "components", BB, BX, BY, XY, "negative_count", violations.get(name, 0))


if __name__ == "__main__":
    main()
