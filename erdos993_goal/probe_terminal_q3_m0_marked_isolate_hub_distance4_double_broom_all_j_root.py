#!/usr/bin/env python3
"""Exact route probe for all targets of hub-distance-four double brooms."""

from __future__ import annotations

from math import comb

import sympy as sp


def C(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def ci(value: int, rank: int) -> int:
    return comb(value, rank) if 0 <= rank <= value else 0


def stats(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    coefficients = polynomial.coeffs()
    return {
        "terms": len(polynomial.terms()),
        "negative": sum(value.is_negative is True for value in coefficients),
        "minimum": min(coefficients),
    }


def rows(large: int, small: int):
    n = large + small
    maximum = n + 5
    f = [0] * (maximum + 1)
    z = [0] * (maximum + 1)
    for rank in range(maximum + 1):
        f[rank] = (
            ci(n, rank) + 3 * ci(n, rank - 1) + ci(n, rank - 2)
            + ci(large, rank - 1) + 2 * ci(large, rank - 2)
            + ci(small, rank - 1) + 2 * ci(small, rank - 2)
            + (1 if rank in (2, 3) else 0)
        )
        if rank >= 2:
            inner = rank - 2
            z[rank] = (
                (large + 1) * (ci(small, inner) + 2 * ci(small, inner - 1))
                + (small + 1) * (ci(large, inner) + 2 * ci(large, inner - 1))
                + 2 * ci(n, inner)
                + (n + 2) * (1 if inner == 1 else 0)
                + n * (1 if inner == 2 else 0)
            )
    return f, z


def main() -> None:
    a, b, j, rho, tau = sp.symbols(
        "a b j rho tau", integer=True, nonnegative=True
    )
    n = a + b
    f2 = C(n, 2) + 4 * n + 6
    f3 = (
        C(n, 3) + 3 * C(n, 2) + n
        + C(a, 2) + 2 * a + C(b, 2) + 2 * b + 1
    )
    z2 = n + 4
    z3 = (a + 1) * (b + 2) + (b + 1) * (a + 2) + 3 * n + 2
    z4 = (
        (a + 1) * (C(b, 2) + 2 * b)
        + (b + 1) * (C(a, 2) + 2 * a)
        + 2 * C(n, 2) + n
    )
    p0 = f3 + 2 * f2 + n + 5
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)
    print("determinant", stats(determinant, (a, b)))

    nup1 = (n - j + 2) / (j - 1)
    nup2 = (n - j + 2) * (n - j + 1) / (j * (j - 1))
    nup3 = (
        (n - j + 2) * (n - j + 1) * (n - j)
        / ((j + 1) * j * (j - 1))
    )
    ndown = (j - 2) / (n - j + 3)
    aup1 = (a - j + 2) / (j - 1)
    bup1 = (b - j + 2) / (j - 1)
    aup2 = (a - j + 2) * (a - j + 1) / (j * (j - 1))
    bup2 = (b - j + 2) * (b - j + 1) / (j * (j - 1))
    adown = (j - 2) / (a - j + 3)
    bdown = (j - 2) / (b - j + 3)

    fj = 1 + 3 * nup1 + nup2 + rho * (2 + aup1) + tau * (2 + bup1)
    fprev = nup1 + 3 + ndown + rho * (1 + 2 * adown) + tau * (1 + 2 * bdown)
    fnext = nup1 + 3 * nup2 + nup3 + rho * (aup2 + 2 * aup1) + tau * (bup2 + 2 * bup1)
    znext = 2 * nup1 + (b + 1) * rho * (2 + aup1) + (a + 1) * tau * (2 + bup1)
    delta = sp.factor(
        (j + 1) * f2 * determinant * (fnext + 2 * fj + fprev)
        + f2 * p0 * (
            (j + 1) * fj * (c0 + r0)
            - 3 * (p0 + f2) * (znext + 2 * fj)
        )
    )
    affine = sp.Poly(sp.together(delta), rho, tau)
    assert affine.total_degree() == 1

    q, v, x, y, s = sp.symbols(
        "q v x y s", integer=True, nonnegative=True
    )
    middle_substitution = {
        j: y + 4,
        b: q + y + 2,
        a: q + v + y + 2,
    }
    u_a = a * (a - 1) / (n * (n - 1))
    u_b = b * (b - 1) / (n * (n - 1))
    for label, rv, tv in (
        ("middle_00", 0, 0),
        ("middle_10", u_a, 0),
        ("middle_01", 0, u_b),
    ):
        expression = sp.factor(
            delta.subs({rho: rv, tau: tv}, simultaneous=True)
            .subs(middle_substitution, simultaneous=True)
        )
        numerator, denominator = sp.fraction(expression)
        print(label, "denominator", sp.factor(denominator))
        print(label, "stats", stats(numerator, (q, v, y)))

    # At j=4 (k=j-2=2), rho=u_a and tau=u_b simultaneously.  The weighted
    # triangle starts only at j>=5, so certify this exact seam separately.
    j4 = sp.factor(
        delta.subs({j: 4, rho: u_a, tau: u_b}, simultaneous=True)
        .subs({b: q + 2, a: q + v + 2}, simultaneous=True)
    )
    j4_num, j4_den = sp.fraction(j4)
    print("middle_j4_actual denominator", sp.factor(j4_den))
    print("middle_j4_actual stats", stats(j4_num, (q, v)))

    tail_lower_substitution = {
        b: q + 1,
        j: q + y + 4,
        a: x + y + 1,
    }
    lower = sp.factor(
        delta.subs({rho: 0, tau: 0}, simultaneous=True)
        .subs(tail_lower_substitution, simultaneous=True)
    )
    lower_num, lower_den = sp.fraction(lower)
    print("tail_0 denominator", sp.factor(lower_den))
    print("tail_0 stats", stats(lower_num, (q, x, y)))

    tail_active_substitution = {
        b: q + 1,
        j: q + y + 4,
        a: q + y + s + 2,
    }
    upper = sp.factor(
        delta.subs({rho: u_a, tau: 0}, simultaneous=True)
        .subs(tail_active_substitution, simultaneous=True)
    )
    upper_num, upper_den = sp.fraction(upper)
    print("tail_1 denominator", sp.factor(upper_den))
    print("tail_1 stats", stats(upper_num, (q, s, y)))

    cells = 0
    minimum = None
    for small in range(1, 26):
        for large in range(small, 151):
            f, z = rows(large, small)
            n0 = large + small
            f2v, f3v = f[2], f[3]
            p0v = f3v + 2 * f2v + n0 + 5
            r0v = z[4] + 2 * z[3] + z[2]
            c0v = z[3] + 2 * f2v
            av = p0v * c0v - f2v * r0v
            assert av > 0
            for target in range(4, n0 + 3):
                bv = f[target]
                assert bv > 0
                uv = f[target + 1] + 2 * bv + f[target - 1]
                ev = z[target + 1] + 2 * bv
                value = (
                    (target + 1) * f2v * av * uv
                    + f2v * p0v * (
                        (target + 1) * bv * (c0v + r0v)
                        - 3 * (p0v + f2v) * ev
                    )
                )
                assert value > 0
                cells += 1
                record = (value, large, small, target)
                if minimum is None or record < minimum:
                    minimum = record
    print("literal", cells, minimum)


if __name__ == "__main__":
    main()
