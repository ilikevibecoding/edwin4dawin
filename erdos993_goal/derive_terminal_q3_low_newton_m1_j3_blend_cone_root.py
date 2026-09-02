#!/usr/bin/env python3
"""Symbolic cone probe for the general-root tree m=1,j=3 cell.

The proof candidate uses only three correlated ingredients:

* y=h3/f3 <= min(1,C(S,3)/b);
* tau <= C(d-1,3)+(d-2)(R-1)+3L+4(S-2)L/3;
* U0/b >= (3 U_coupled+U_rank4)/4.

It tests the six y/tau endpoint numerators on one continuous root box.
This is a derivation probe until every coefficient is certified.
"""

from __future__ import annotations

import itertools

import sympy as sp


def C(value, rank):
    return sp.prod(value - k for k in range(rank)) / sp.factorial(rank)


def bernstein3(expression, u, v, w):
    polynomial = sp.Poly(sp.expand(expression), u, v, w)
    degrees = tuple(polynomial.degree(x) for x in (u, v, w))
    output = {}
    for index in itertools.product(*[range(degree + 1) for degree in degrees]):
        value = sp.Integer(0)
        for power in itertools.product(*[range(i + 1) for i in index]):
            value += (
                polynomial.coeff_monomial(u**power[0] * v**power[1] * w**power[2])
                * sp.binomial(index[0], power[0]) / sp.binomial(degrees[0], power[0])
                * sp.binomial(index[1], power[1]) / sp.binomial(degrees[1], power[1])
                * sp.binomial(index[2], power[2]) / sp.binomial(degrees[2], power[2])
            )
        output[index] = sp.factor(value)
    return degrees, output


def symbolic_gap():
    N, d, R, B2, tau, y = sp.symbols("N d R B2 tau y", nonnegative=True)
    S = N - d
    W = N - 1 + B2
    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W
    a = C(N, 2) - S
    P = W - C(d, 2) - R
    z2 = S * (N - 2) - 2 * P
    h2 = C(S, 2) - (S - R)
    b = C(N, 3) - S * (N - 2) + P
    c0 = a + z2 + h2
    R0 = (
        N * C(N, 2)
        - 2 * (W * (N - 1) + C(N, 2) - W)
        + 3 * (N - 2 + B2 + tau)
    )
    A0 = p0 * c0 - a * R0
    A1 = p0 * a + p1 * c0 + p1 * a - a * R1
    ebar = 1 + y + 3 * z2 / (2 * a)
    Q0 = 4 * (c0 + R0) - 3 * ebar * (p0 + a)
    Q1 = 4 * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
    remainder = p0 * Q1 + p1 * Q0 + p1 * Q1
    U1 = 1 + 3 / (N - 2) + 3 * y / (N - 3)
    Uc = (N - 3 + 2 * y) / 4 + 3 * y / (N - 3)
    f4floor = (
        C(N, 4) - S * C(N - 2, 2) + P * (N - 4)
        + C(S, 2) - C(S, 3)
    )
    Ur = f4floor / b + 1 + y + h2 / b
    Ublend = (3 * Uc + Ur) / 4
    gap = 4 * (A0 * U1 + A1 * (Ublend + U1)) + remainder
    L = B2 - C(d - 1, 2)
    tcap = C(d - 1, 3) + (d - 2) * (R - 1) + 3 * L + 4 * (S - 2) * L / 3
    hbin = C(S, 3) / b
    return (N, d, R, B2, tau, y), gap, tcap, hbin


def main() -> None:
    symbols, gap, tcap, hbin = symbolic_gap()
    N, d, R, B2, tau, y = symbols
    q, u, v, w = sp.symbols("q u v w", nonnegative=True)
    Nbox = 15 + q
    # Marked degree d=1 is already a separately frozen exact theorem.
    # Here d>=2 and S=N-d>=1, so d=2+(N-3)u.
    dbox = 2 + (Nbox - 3) * u
    Sbox = Nbox - dbox
    Rbox = 1 + (Sbox - 1) * v
    blo = C(dbox - 1, 2)
    bhi = blo + C(Rbox, 2) + C(Sbox - Rbox, 2)
    Bbox = blo + (bhi - blo) * w
    box = {N: Nbox, d: dbox, R: Rbox, B2: Bbox}

    # Clear the known-positive endpoint denominators before the box map.  This
    # is algebraically identical to substituting y after boxing, but avoids a
    # very expensive multivariate rational cancellation on the hbin face.
    gap0 = sp.together(gap.subs(y, 0))
    assert sp.Poly(sp.together(gap).as_numer_denom()[0], y).degree() == 1
    gaph = sp.together(gap0 + hbin * sp.diff(gap, y))
    endpoint_data = {
        "y0": gap0.as_numer_denom(),
        "yhbin": gaph.as_numer_denom(),
    }

    total = bad_total = 0
    # For d>=2, b-C(S,3)>=(d-2)[3N^2-3Nd-6N+d^2+5d]/6>=0,
    # so hbin<=1 and the only y endpoints are 0 and hbin.
    for yname, (endpoint_numerator, endpoint_denominator) in endpoint_data.items():
        for tname, tvalue in (("t0", 0), ("tcap", tcap)):
            numerator0 = endpoint_numerator.subs(tau, tvalue)
            denominator0 = endpoint_denominator.subs(tau, tvalue)
            boxed_numerator = sp.together(
                numerator0.subs(box, simultaneous=True)
            )
            numerator = boxed_numerator.as_numer_denom()[0]
            denominator = sp.factor(
                denominator0.subs(box, simultaneous=True)
                * boxed_numerator.as_numer_denom()[1]
            )
            print(yname, tname, "den", sp.factor(denominator), flush=True)
            degrees, coefficients = bernstein3(numerator, u, v, w)
            bad = {}
            for index, coefficient in coefficients.items():
                qpoly = sp.Poly(sp.expand(coefficient), q)
                if not qpoly.coeffs() or any(value < 0 for value in qpoly.coeffs()):
                    bad[index] = sp.factor(coefficient)
            total += len(coefficients)
            bad_total += len(bad)
            print(
                yname, tname, "degrees", degrees,
                "coefficients", len(coefficients), "bad", len(bad),
                "first", list(bad.items())[:3], flush=True,
            )
    print("TOTAL", total, "BAD", bad_total)


if __name__ == "__main__":
    main()
