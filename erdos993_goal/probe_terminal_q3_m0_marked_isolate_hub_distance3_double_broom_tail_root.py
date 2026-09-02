#!/usr/bin/env python3
"""Exact route probe for the high-target tail of hub-distance-three brooms."""

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


def main() -> None:
    a, b, j, rho, tau = sp.symbols(
        "a b j rho tau", integer=True, nonnegative=True
    )
    n = a + b

    # T_(a,b,3): hubs at distance three, with a,b pendant leaves.
    # F=(1+x)^n(1+2x)+x(1+x)^(a+1)+x(1+x)^(b+1)+x^2.
    f2 = C(n, 2) + 2 * n + (a + 1) + (b + 1) + 1
    f3 = C(n, 3) + 2 * C(n, 2) + C(a + 1, 2) + C(b + 1, 2)
    z2 = a + b + 3
    z3 = (
        a * (b + 1) + b * (a + 1) + a + b + n + (n + 2)
    )
    z4 = (
        a * C(b + 1, 2) + b * C(a + 1, 2)
        + C(b, 2) + C(a, 2) + C(n, 2)
    )
    order = n + 4
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)
    print("determinant", stats(determinant, (a, b)))

    # Normalize by B=C(n,j-1), which stays positive through the top target
    # j=n+1.  In the tail j>=b+3, the b-side mixture is identically zero.
    f_j = (n - j + 1) / j + 2 + rho
    f_prev = (
        1
        + 2 * (j - 1) / (n - j + 2)
        + rho * (j - 1) / (a - j + 3)
    )
    f_next = (
        (n - j + 1) * (n - j) / (j * (j + 1))
        + 2 * (n - j + 1) / j
        + rho * (a - j + 2) / j
    )
    z_next = 1 + rho * (b + (a - j + 2) / (a + 1))
    delta = sp.factor(
        (j + 1) * f2 * determinant * (f_next + 2 * f_j + f_prev)
        + f2 * p0 * (
            (j + 1) * f_j * (c0 + r0)
            - 3 * (p0 + f2) * (z_next + 2 * f_j)
        )
    )
    assert sp.Poly(sp.together(delta), rho).degree() == 1

    q, x, y, v = sp.symbols("q x y v", integer=True, nonnegative=True)
    substitution = {b: q + 1, j: q + y + 4, a: x + y + 3}
    for label, endpoint in (
        ("lower", sp.Integer(0)),
        ("first_sample_upper", (a + 1) / n),
    ):
        expression = sp.factor(
            delta.subs(rho, endpoint).subs(substitution, simultaneous=True)
        )
        numerator, denominator = sp.fraction(expression)
        print(label, "denominator", sp.factor(denominator))
        print(label, "stats", stats(numerator, (q, x, y)))

    # The apparently bad upper endpoint above includes an impossible branch.
    # The weight is active only when a-j+2=x-q+1>=0.  Split b=1 (rho=1)
    # and parameterize the active b>=2 branch by q=r+1, x=r+s.
    r, s = sp.symbols("r s", integer=True, nonnegative=True)
    b1 = sp.factor(
        delta.subs(rho, 1).subs({b: 1, j: y + 4, a: x + y + 3}, simultaneous=True)
    )
    b1_num, b1_den = sp.fraction(b1)
    print("b1_exact denominator", sp.factor(b1_den))
    print("b1_exact stats", stats(b1_num, (x, y)))

    active_substitution = {
        b: r + 2,
        j: r + y + 5,
        a: r + s + y + 3,
    }
    active_upper = sp.factor(
        delta.subs(rho, (a + 1) / n)
        .subs(active_substitution, simultaneous=True)
    )
    active_upper_num, active_upper_den = sp.fraction(active_upper)
    print("active_upper denominator", sp.factor(active_upper_den))
    print("active_upper stats", stats(active_upper_num, (r, s, y)))

    # Middle regime 4<=j<=b+2.  Both side weights are active.  Test the
    # elementary first-sample rectangle 0<=rho<=(a+1)/n and
    # 0<=tau<=(b+1)/n at all four vertices.
    middle_fj = (n - j + 1) / j + 2 + rho + tau
    middle_fprev = (
        1
        + 2 * (j - 1) / (n - j + 2)
        + rho * (j - 1) / (a - j + 3)
        + tau * (j - 1) / (b - j + 3)
    )
    middle_fnext = (
        (n - j + 1) * (n - j) / (j * (j + 1))
        + 2 * (n - j + 1) / j
        + rho * (a - j + 2) / j
        + tau * (b - j + 2) / j
    )
    middle_znext = (
        1
        + rho * (b + (a - j + 2) / (a + 1))
        + tau * (a + (b - j + 2) / (b + 1))
    )
    middle_delta = sp.factor(
        (j + 1) * f2 * determinant
        * (middle_fnext + 2 * middle_fj + middle_fprev)
        + f2 * p0 * (
            (j + 1) * middle_fj * (c0 + r0)
            - 3 * (p0 + f2) * (middle_znext + 2 * middle_fj)
        )
    )
    middle_poly = sp.Poly(sp.together(middle_delta), rho, tau)
    assert middle_poly.total_degree() == 1
    middle_substitution = {
        j: y + 4,
        b: q + y + 2,
        a: q + v + y + 2,
    }
    for label, rho_endpoint, tau_endpoint in (
        ("middle_00", 0, 0),
        ("middle_10", (a + 1) / n, 0),
        ("middle_01", 0, (b + 1) / n),
        ("middle_11", (a + 1) / n, (b + 1) / n),
    ):
        expression = sp.factor(
            middle_delta.subs(
                {rho: rho_endpoint, tau: tau_endpoint}, simultaneous=True
            ).subs(middle_substitution, simultaneous=True)
        )
        numerator, denominator = sp.fraction(expression)
        print(label, "denominator", sp.factor(denominator))
        print(label, "stats", stats(numerator, (q, v, y)))

    minimum = None
    cells = 0
    for small in range(1, 31):
        for large in range(small, 201):
            n0 = large + small

            def f(rank: int) -> int:
                return (
                    ci(n0, rank)
                    + 2 * ci(n0, rank - 1)
                    + ci(large + 1, rank - 1)
                    + ci(small + 1, rank - 1)
                    + (1 if rank == 2 else 0)
                )

            def z(rank: int) -> int:
                if rank < 2:
                    return 0
                inner = rank - 2
                return (
                    large * ci(small + 1, inner)
                    + small * ci(large + 1, inner)
                    + ci(small, inner)
                    + ci(large, inner)
                    + ci(n0, inner)
                    + (n0 + 2) * (1 if inner == 1 else 0)
                )

            f2v, f3v = f(2), f(3)
            p0v = f3v + 2 * f2v + n0 + 4
            r0v = z(4) + 2 * z(3) + z(2)
            c0v = z(3) + 2 * f2v
            av = p0v * c0v - f2v * r0v
            assert av > 0
            for target in range(small + 3, n0 + 2):
                bv = f(target)
                assert bv > 0
                uv = f(target + 1) + 2 * bv + f(target - 1)
                ev = z(target + 1) + 2 * bv
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
