#!/usr/bin/env python3
"""Derive the exact same-tree consecutive-target difference symbolically."""

import sympy as sp


q, v, j = sp.symbols("q v j", integer=True, nonnegative=True)


def C(x, k):
    return sp.binomial(x, k)


def anchor(a, b):
    n = a + b
    order = n + 7
    f2 = C(n, 2) + 6 * n + 15
    f3 = (
        C(n, 3) + 5 * C(n, 2) + 6 * n + 1
        + C(a, 2) + 4 * a + 3
        + C(b, 2) + 4 * b + 3
        + 3
    )
    z2 = n + 6
    z3 = (
        (b + 1) * a + (4 * b + 6)
        + (a + 1) * b + (4 * a + 6)
        + 4 * n + 6 + n + 2
    )
    z4 = (
        (b + 1) * C(a, 2) + (4 * b + 6) * a + (3 * b + 3)
        + (a + 1) * C(b, 2) + (4 * a + 6) * b + (3 * a + 3)
        + 4 * C(n, 2) + 6 * n + 3 * n + 6
    )
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = sp.factor(p0 * c0 - f2 * r0)
    return f2, p0, r0, c0, determinant


def f_main(a, b, target):
    n = a + b
    return (
        C(n, target) + 5 * C(n, target - 1)
        + 6 * C(n, target - 2) + C(n, target - 3)
        + C(a, target - 1) + 4 * C(a, target - 2)
        + 3 * C(a, target - 3)
        + C(b, target - 1) + 4 * C(b, target - 2)
        + 3 * C(b, target - 3)
    )


def z_main(a, b, target):
    n = a + b
    return (
        (b + 1) * C(a, target - 2)
        + (4 * b + 6) * C(a, target - 3)
        + (3 * b + 3) * C(a, target - 4)
        + (a + 1) * C(b, target - 2)
        + (4 * a + 6) * C(b, target - 3)
        + (3 * a + 3) * C(b, target - 4)
        + 4 * C(n, target - 2) + 6 * C(n, target - 3)
    )


def delta(a, b, target):
    f2, p0, r0, c0, determinant = anchor(a, b)
    fj = f_main(a, b, target)
    return (
        (target + 1) * f2 * determinant
        * (f_main(a, b, target + 1) + 2 * fj + f_main(a, b, target - 1))
        + f2 * p0 * (
            (target + 1) * fj * (c0 + r0)
            - 3 * (p0 + f2) * (z_main(a, b, target + 1) + 2 * fj)
        )
    )


def main():
    # This is one fixed tree: it is P_{j+1}(q,v), while its target-j value
    # is P_j(q+1,v).
    a = q + v + j - 1
    b = q + j - 1
    difference = sp.factor(delta(a, b, j + 1) - delta(a, b, j))
    print("raw_count_ops", sp.count_ops(difference), flush=True)
    combined = sp.combsimp(difference)
    print("combsimp_count_ops", sp.count_ops(combined), flush=True)
    print(sp.factor(combined), flush=True)


if __name__ == "__main__":
    main()
