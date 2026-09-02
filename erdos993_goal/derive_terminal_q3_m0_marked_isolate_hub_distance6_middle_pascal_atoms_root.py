#!/usr/bin/env python3
"""Pascal-atom certificate probe for the distance-six middle recurrence.

For P_j(a,b) equal to the exact terminal payment at target j, compare
P_{j+1}(a+1,b+1) with P_j(a,b).  Pascal-expand every upper shift back to
binomial atoms with tops n=a+b, a, and b.  If every resulting atom weight is
nonnegative after a=x+j-2, b=y+j-2, the middle family follows from one base
target and induction.
"""

from __future__ import annotations

from collections import defaultdict

import sympy as sp


a, b, j = sp.symbols("a b j", integer=True, nonnegative=True)


def c2(z):
    return z * (z - 1) / 2


def c3(z):
    return z * (z - 1) * (z - 2) / 6


def anchors(left, right):
    n = left + right
    order = n + 7
    f2 = c2(n) + 6 * n + 15
    f3 = (
        c3(n)
        + 5 * c2(n)
        + 6 * n
        + 1
        + c2(left)
        + 4 * left
        + 3
        + c2(right)
        + 4 * right
        + 3
        + 3
    )
    z2 = n + 6
    z3 = (
        (right + 1) * left
        + (4 * right + 6)
        + (left + 1) * right
        + (4 * left + 6)
        + 4 * n
        + 6
        + n
        + 2
    )
    z4 = (
        (right + 1) * c2(left)
        + (4 * right + 6) * left
        + (3 * right + 3)
        + (left + 1) * c2(right)
        + (4 * left + 6) * right
        + (3 * left + 3)
        + 4 * c2(n)
        + 6 * n
        + 3 * n
        + 6
    )
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = sp.expand(p0 * c0 - f2 * r0)
    return tuple(map(sp.expand, (f2, p0, r0, c0, determinant)))


F_TERMS = (
    ("n", 0, 1),
    ("n", 1, 5),
    ("n", 2, 6),
    ("n", 3, 1),
    ("a", 1, 1),
    ("a", 2, 4),
    ("a", 3, 3),
    ("b", 1, 1),
    ("b", 2, 4),
    ("b", 3, 3),
)


def z_terms(left, right):
    return (
        ("n", 2, 4),
        ("n", 3, 6),
        ("a", 2, right + 1),
        ("a", 3, 4 * right + 6),
        ("a", 4, 3 * right + 3),
        ("b", 2, left + 1),
        ("b", 3, 4 * left + 6),
        ("b", 4, 3 * left + 3),
    )


def add_row(result, terms, rank_offset, scalar, upper_shifts):
    """Add a row at rank J+rank_offset in base-target-j atoms."""
    for category, core_shift, core_weight in terms:
        upper_shift = upper_shifts[category]
        initial_offset = upper_shifts["target"] + rank_offset - core_shift
        for pascal_shift in range(upper_shift + 1):
            atom = (category, initial_offset - pascal_shift)
            result[atom] += (
                scalar
                * core_weight
                * sp.binomial(upper_shift, pascal_shift)
            )


def payment_map(left, right, target, shifted):
    if shifted:
        local_left = left + 1
        local_right = right + 1
        local_target = target + 1
        upper_shifts = {"n": 2, "a": 1, "b": 1, "target": 1}
    else:
        local_left = left
        local_right = right
        local_target = target
        upper_shifts = {"n": 0, "a": 0, "b": 0, "target": 0}

    f2, p0, r0, c0, determinant = anchors(local_left, local_right)
    common = f2 * determinant
    correction = f2 * p0
    f_plus = (local_target + 1) * common
    f_zero = (
        2 * (local_target + 1) * common
        + correction
        * (
            (local_target + 1) * (c0 + r0)
            - 6 * (p0 + f2)
        )
    )
    f_minus = (local_target + 1) * common
    z_plus = -3 * correction * (p0 + f2)

    result = defaultdict(lambda: sp.Integer(0))
    add_row(result, F_TERMS, 1, f_plus, upper_shifts)
    add_row(result, F_TERMS, 0, f_zero, upper_shifts)
    add_row(result, F_TERMS, -1, f_minus, upper_shifts)
    add_row(
        result,
        z_terms(local_left, local_right),
        1,
        z_plus,
        upper_shifts,
    )
    return result


def polynomial_stats(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables, domain=sp.QQ)
    coefficients = polynomial.coeffs()
    return {
        "terms": len(coefficients),
        "degree": polynomial.total_degree(),
        "negative": sum(bool(coefficient < 0) for coefficient in coefficients),
        "zero": sum(bool(coefficient == 0) for coefficient in coefficients),
        "minimum": str(min(coefficients)),
    }


def main():
    current = payment_map(a, b, j, shifted=False)
    following = payment_map(a, b, j, shifted=True)
    atoms = sorted(set(current) | set(following))

    t, x, y = sp.symbols("t x y", integer=True, nonnegative=True)
    substitution = {
        j: t + 6,
        a: x + t + 4,
        b: y + t + 4,
    }
    failures = []
    for atom in atoms:
        weight = sp.expand((following[atom] - current[atom]).subs(substitution))
        stats = polynomial_stats(weight, (t, x, y))
        print(atom, stats, flush=True)
        if stats["negative"]:
            failures.append((atom, weight, stats))

    print("atom_count", len(atoms), "failure_count", len(failures), flush=True)
    for atom, weight, stats in failures:
        print("FAIL", atom, stats, sp.factor(weight), flush=True)


if __name__ == "__main__":
    main()
