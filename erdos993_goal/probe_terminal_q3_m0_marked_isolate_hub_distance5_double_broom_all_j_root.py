#!/usr/bin/env python3
"""Exact route probe for all targets of hub-distance-five double brooms."""

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
    maximum = n + 6
    f = [0] * (maximum + 1)
    z = [0] * (maximum + 1)
    for rank in range(maximum + 1):
        f[rank] = (
            ci(n, rank) + 4 * ci(n, rank - 1) + 3 * ci(n, rank - 2)
            + ci(large, rank - 1) + 3 * ci(large, rank - 2) + ci(large, rank - 3)
            + ci(small, rank - 1) + 3 * ci(small, rank - 2) + ci(small, rank - 3)
            + (1 if rank == 2 else 0) + 2 * (1 if rank == 3 else 0)
        )
        if rank >= 2:
            inner = rank - 2
            z[rank] = (
                (large + 1) * ci(small, inner)
                + (3 * large + 4) * ci(small, inner - 1)
                + large * ci(small, inner - 2)
                + (small + 1) * ci(large, inner)
                + (3 * small + 4) * ci(large, inner - 1)
                + small * ci(large, inner - 2)
                + 3 * ci(n, inner) + 2 * ci(n, inner - 1)
                + (n + 2) * (1 if inner == 1 else 0)
                + (2 * n + 3) * (1 if inner == 2 else 0)
            )
    return f, z


def main() -> None:
    a, b, j, rho, tau = sp.symbols(
        "a b j rho tau", integer=True, nonnegative=True
    )
    n = a + b
    order = n + 6
    edges = n + 5
    wedges = C(a + 1, 2) + C(b + 1, 2) + 4
    connected_four = C(a + 1, 3) + C(b + 1, 3) + n + 3
    f2 = C(order, 2) - edges
    f3 = C(order, 3) - edges * (order - 2) + wedges
    z2 = edges
    z3 = edges * (order - 2) - 2 * wedges
    z4 = (
        edges * C(order - 2, 2) - 2 * C(edges, 2)
        - 2 * wedges * (order - 4) + 3 * connected_four
    )
    p0 = f3 + 2 * f2 + order
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
    ndown1 = (j - 2) / (n - j + 3)
    ndown2 = (j - 2) * (j - 3) / ((n - j + 3) * (n - j + 4))
    aup1 = (a - j + 2) / (j - 1)
    bup1 = (b - j + 2) / (j - 1)
    aup2 = (a - j + 2) * (a - j + 1) / (j * (j - 1))
    bup2 = (b - j + 2) * (b - j + 1) / (j * (j - 1))
    adown1 = (j - 2) / (a - j + 3)
    bdown1 = (j - 2) / (b - j + 3)
    adown2 = (j - 2) * (j - 3) / ((a - j + 3) * (a - j + 4))
    bdown2 = (j - 2) * (j - 3) / ((b - j + 3) * (b - j + 4))

    fj = 3 + 4 * nup1 + nup2 + rho * (3 + aup1 + adown1) + tau * (3 + bup1 + bdown1)
    fprev = (
        3 * ndown1 + 4 + nup1
        + rho * (1 + 3 * adown1 + adown2)
        + tau * (1 + 3 * bdown1 + bdown2)
    )
    fnext = (
        3 * nup1 + 4 * nup2 + nup3
        + rho * (1 + 3 * aup1 + aup2)
        + tau * (1 + 3 * bup1 + bup2)
    )
    znext = (
        2 + 3 * nup1
        + rho * ((b + 1) * aup1 + (3 * b + 4) + b * adown1)
        + tau * ((a + 1) * bup1 + (3 * a + 4) + a * bdown1)
    )
    delta = sp.factor(
        (j + 1) * f2 * determinant * (fnext + 2 * fj + fprev)
        + f2 * p0 * (
            (j + 1) * fj * (c0 + r0)
            - 3 * (p0 + f2) * (znext + 2 * fj)
        )
    )
    assert sp.Poly(sp.together(delta), rho, tau).total_degree() == 1

    q, v, x, y, s, r = sp.symbols(
        "q v x y s r", integer=True, nonnegative=True
    )
    u_a2 = a * (a - 1) / (n * (n - 1))
    u_b2 = b * (b - 1) / (n * (n - 1))
    u_a = a * (a - 1) * (a - 2) / (n * (n - 1) * (n - 2))
    u_b = b * (b - 1) * (b - 2) / (n * (n - 1) * (n - 2))
    u_a4 = (
        a * (a - 1) * (a - 2) * (a - 3)
        / (n * (n - 1) * (n - 2) * (n - 3))
    )
    u_b4 = (
        b * (b - 1) * (b - 2) * (b - 3)
        / (n * (n - 1) * (n - 2) * (n - 3))
    )
    u_a5 = (
        a * (a - 1) * (a - 2) * (a - 3) * (a - 4)
        / (n * (n - 1) * (n - 2) * (n - 3) * (n - 4))
    )
    u_b5 = (
        b * (b - 1) * (b - 2) * (b - 3) * (b - 4)
        / (n * (n - 1) * (n - 2) * (n - 3) * (n - 4))
    )
    middle_substitution = {
        j: y + 8,
        b: q + y + 6,
        a: q + v + y + 6,
    }
    for label, rv, tv in (
        ("middle_00", 0, 0),
        ("middle_10", u_a5, 0),
        ("middle_01", 0, u_b5),
    ):
        expression = sp.factor(
            delta.subs({rho: rv, tau: tv}, simultaneous=True)
            .subs(middle_substitution, simultaneous=True)
        )
        numerator, denominator = sp.fraction(expression)
        print(label, "denominator", sp.factor(denominator))
        print(label, "stats", stats(numerator, (q, v, y)))

    seam = sp.factor(
        delta.subs({j: 4, rho: u_a2, tau: u_b2}, simultaneous=True)
        .subs({b: q + 2, a: q + v + 2}, simultaneous=True)
    )
    seam_num, seam_den = sp.fraction(seam)
    print("j4_seam denominator", sp.factor(seam_den))
    print("j4_seam stats", stats(seam_num, (q, v)))

    seam5 = sp.factor(
        delta.subs({j: 5, rho: u_a, tau: u_b}, simultaneous=True)
        .subs({b: q + 3, a: q + v + 3}, simultaneous=True)
    )
    seam5_num, seam5_den = sp.fraction(seam5)
    print("j5_seam denominator", sp.factor(seam5_den))
    print("j5_seam stats", stats(seam5_num, (q, v)))

    seam6 = sp.factor(
        delta.subs({j: 6, rho: u_a4, tau: u_b4}, simultaneous=True)
        .subs({b: q + 4, a: q + v + 4}, simultaneous=True)
    )
    seam6_num, seam6_den = sp.fraction(seam6)
    print("j6_seam denominator", sp.factor(seam6_den))
    print("j6_seam stats", stats(seam6_num, (q, v)))

    seam7 = sp.factor(
        delta.subs({j: 7, rho: u_a5, tau: u_b5}, simultaneous=True)
        .subs({b: q + 5, a: q + v + 5}, simultaneous=True)
    )
    seam7_num, seam7_den = sp.fraction(seam7)
    print("j7_seam denominator", sp.factor(seam7_den))
    print("j7_seam stats", stats(seam7_num, (q, v)))

    tail_b1_j4 = sp.factor(
        delta.subs({j: 4, b: 1, rho: u_a2, tau: 0}, simultaneous=True)
        .subs(a, s + 2)
    )
    tail_b1_j4_num, tail_b1_j4_den = sp.fraction(tail_b1_j4)
    print("tail_b1_j4 denominator", sp.factor(tail_b1_j4_den))
    print("tail_b1_j4 stats", stats(tail_b1_j4_num, (s,)))

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

    tail_b1 = sp.factor(
        delta.subs({b: 1, j: y + 5, rho: u_a, tau: 0}, simultaneous=True)
        .subs(a, y + s + 3)
    )
    tail_b1_num, tail_b1_den = sp.fraction(tail_b1)
    print("tail_b1_jge5 denominator", sp.factor(tail_b1_den))
    print("tail_b1_jge5 stats", stats(tail_b1_num, (s, y)))

    tail_b2_j5 = sp.factor(
        delta.subs({b: 2, j: 5, rho: u_a, tau: 0}, simultaneous=True)
        .subs(a, s + 3)
    )
    tail_b2_j5_num, tail_b2_j5_den = sp.fraction(tail_b2_j5)
    print("tail_b2_j5 denominator", sp.factor(tail_b2_j5_den))
    print("tail_b2_j5 stats", stats(tail_b2_j5_num, (s,)))

    for small_side in (2, 3):
        tail_j6 = sp.factor(
            delta.subs(
                {b: small_side, j: 6, rho: u_a4, tau: 0},
                simultaneous=True,
            ).subs(a, s + 4)
        )
        tail_j6_num, tail_j6_den = sp.fraction(tail_j6)
        print(f"tail_b{small_side}_j6 denominator", sp.factor(tail_j6_den))
        print(f"tail_b{small_side}_j6 stats", stats(tail_j6_num, (s,)))

    for small_side in (2, 3, 4):
        tail_j7 = sp.factor(
            delta.subs(
                {b: small_side, j: 7, rho: u_a5, tau: 0},
                simultaneous=True,
            ).subs(a, s + 5)
        )
        tail_j7_num, tail_j7_den = sp.fraction(tail_j7)
        print(f"tail_b{small_side}_j7 denominator", sp.factor(tail_j7_den))
        print(f"tail_b{small_side}_j7 stats", stats(tail_j7_num, (s,)))

    tail_specs = {
        "tail_b2_jge8": ({b: 2, j: y + 8, a: y + s + 6}, (s, y)),
        "tail_b3_jge8": ({b: 3, j: y + 8, a: y + s + 6}, (s, y)),
        "tail_b4_jge8": ({b: 4, j: y + 8, a: y + s + 6}, (s, y)),
        "tail_bge5_jge8": (
            {b: r + 5, j: r + y + 8, a: r + y + s + 6},
            (r, s, y),
        ),
    }
    for label, (substitution, variables) in tail_specs.items():
        tail_upper = sp.factor(
            delta.subs({rho: u_a5, tau: 0}, simultaneous=True)
            .subs(substitution, simultaneous=True)
        )
        tail_upper_num, tail_upper_den = sp.fraction(tail_upper)
        print(label, "denominator", sp.factor(tail_upper_den))
        print(label, "stats", stats(tail_upper_num, variables))

    cells = 0
    minimum = None
    for small in range(1, 21):
        for large in range(small, 121):
            f, z = rows(large, small)
            n0 = large + small
            f2v, f3v = f[2], f[3]
            p0v = f3v + 2 * f2v + n0 + 6
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
