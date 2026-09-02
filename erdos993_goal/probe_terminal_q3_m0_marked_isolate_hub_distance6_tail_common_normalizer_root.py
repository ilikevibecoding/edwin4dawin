#!/usr/bin/env python3
"""Correct common-normalizer charts for the distance-six tail payment."""

from time import perf_counter

import sympy as sp
from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    stats,
)
from prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_all_j_root import (
    F_TERMS,
    anchor,
    falling,
    ratio_from_base,
    z_terms,
)


def normalized_row(terms, rank_offset, base, a, b, rho, tau):
    n = a + b
    total = 0
    for category, shift, weight in terms:
        difference = rank_offset - shift + 2
        if category == "n":
            total += weight * ratio_from_base(n, base, difference)
        elif category == "a":
            if rho != 0:
                total += weight * rho * ratio_from_base(a, base, difference)
        elif category == "b":
            if tau != 0:
                total += weight * tau * ratio_from_base(b, base, difference)
    return total


def normalized_payment(a, b, target, rho, tau):
    """Delta_j/C(a+b,j-2), valid for j>=6 (finite core rows vanish)."""
    base = target - 2
    f2, p0, r0, c0, determinant = anchor(a, b)
    fm1 = normalized_row(F_TERMS, -1, base, a, b, rho, tau)
    f0 = normalized_row(F_TERMS, 0, base, a, b, rho, tau)
    fp1 = normalized_row(F_TERMS, 1, base, a, b, rho, tau)
    zp1 = normalized_row(z_terms(a, b), 1, base, a, b, rho, tau)
    return (
        (target + 1) * f2 * determinant * (fp1 + 2 * f0 + fm1)
        + f2
        * p0
        * (
            (target + 1) * f0 * (c0 + r0)
            - 3 * (p0 + f2) * (zp1 + 2 * f0)
        )
    )


def main():
    # rho=tau=0 exact domain.  The support constraint is encoded by q=s+t.
    _, t, r, s = field("t,r,s", QQ)
    b = s + t + 1
    a = s + t + r + 1
    target = t + r + 2 * s + 4
    start = perf_counter()
    expression = normalized_payment(a, b, target, 0, 0)
    stats("tail_zero_common_normalizer", expression, perf_counter() - start)

    # Active large-side domain a>=j-2.  rho is affine, so test the origin and
    # the depth-sensitive hypergeometric cap.
    _, q, u, y = field("q,u,y", QQ)
    b = q + 1
    target = q + y + 4
    a = q + y + u + 2
    n = a + b
    selected = target - 4
    u_a2 = falling(a, 2) / falling(n, 2)
    cap_a = u_a2 * (a - 2) / ((a - 2) + selected * b)
    for label, rho in (
        ("tail_active_origin_common_normalizer", 0),
        ("tail_active_cap_common_normalizer", cap_a),
    ):
        start = perf_counter()
        expression = normalized_payment(a, b, target, rho, 0)
        stats(label, expression, perf_counter() - start)
        if label.endswith("cap_common_normalizer"):
            print("cap_denominator_factor", sp.factor(expression.denom.as_expr()), flush=True)


if __name__ == "__main__":
    main()
