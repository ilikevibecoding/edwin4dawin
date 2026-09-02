#!/usr/bin/env python3
"""Depth-cap charts for the distance-six same-tree target recurrence."""

from time import perf_counter

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    DISTANCE,
    anchor,
    core_terms,
    stats,
)


def ratio_from_base(side, base, difference):
    result = 1
    if difference >= 0:
        for offset in range(difference):
            result *= (side - base - offset) / (base + offset + 1)
    else:
        for offset in range(-difference):
            result *= (base - offset) / (side - base + offset + 1)
    return result


def normalized_row(terms, rank_offset, base, a, b, rho, tau):
    n = a + b
    total = 0
    for category, shift, weight in terms:
        difference = rank_offset - shift + 4
        if category == "n":
            total += weight * ratio_from_base(n, base, difference)
        elif category == "a":
            total += weight * rho * ratio_from_base(a, base, difference)
        elif category == "b":
            total += weight * tau * ratio_from_base(b, base, difference)
        elif base + difference == 0:
            raise AssertionError("finite-core term unexpectedly survives")
    return total


def normalized_recurrence(f_terms, z_terms, a, b, target, rho, tau):
    base = target - 4
    f2, p0, r0, c0, determinant = anchor(f_terms, z_terms, a, b)
    fm1 = normalized_row(f_terms, -1, base, a, b, rho, tau)
    f0 = normalized_row(f_terms, 0, base, a, b, rho, tau)
    fp1 = normalized_row(f_terms, 1, base, a, b, rho, tau)
    fp2 = normalized_row(f_terms, 2, base, a, b, rho, tau)
    zp1 = normalized_row(z_terms, 1, base, a, b, rho, tau)
    zp2 = normalized_row(z_terms, 2, base, a, b, rho, tau)
    return (
        f2
        * determinant
        * (
            (target + 2) * fp2
            + (target + 3) * fp1
            - target * f0
            - (target + 1) * fm1
        )
        + f2
        * p0
        * (
            (c0 + r0) * ((target + 2) * fp1 - (target + 1) * f0)
            - 3
            * (p0 + f2)
            * (zp2 - zp1 + 2 * (fp1 - f0))
        )
    )


def main():
    _, q, v, y = field("q,v,y", QQ)
    target = y + 6
    b = q + y + 5
    a = q + v + y + 5
    n = a + b
    base = target - 4
    cap_a = a / (a + base * b)
    cap_b = b / (b + base * a)
    f_terms, z_terms = core_terms(DISTANCE, a, b)

    for label, rho, tau in (
        ("origin", 0, 0),
        ("large_cap", cap_a, 0),
        ("small_cap", 0, cap_b),
        ("both_caps", cap_a, cap_b),
    ):
        start = perf_counter()
        expression = normalized_recurrence(
            f_terms, z_terms, a, b, target, rho, tau
        )
        stats(
            "distance6_middle_same_tree_recurrence_" + label,
            expression,
            perf_counter() - start,
        )


if __name__ == "__main__":
    main()
