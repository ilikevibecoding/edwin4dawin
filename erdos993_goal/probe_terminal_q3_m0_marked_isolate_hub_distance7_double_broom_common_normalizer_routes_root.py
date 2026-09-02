#!/usr/bin/env python3
"""Symbolic route probe for distance-seven double-broom m=0 payments."""

from __future__ import annotations

from math import factorial
from time import perf_counter

from sympy.polys.domains import QQ
from sympy.polys.fields import field


DISTANCE = 7


def falling(value, rank: int):
    result = 1
    for offset in range(rank):
        result *= value - offset
    return result


def C(value, rank: int):
    if rank < 0:
        return value * 0
    return falling(value, rank) / (value * 0 + factorial(rank))


def core_terms(distance, a, b):
    f_raw = []
    z_raw = []
    vertices = distance + 1
    for mask in range(1 << vertices):
        size = mask.bit_count()
        core_edges = sum(
            bool(mask & (1 << vertex)) and bool(mask & (1 << (vertex + 1)))
            for vertex in range(distance)
        )
        left_selected = bool(mask & 1)
        right_selected = bool(mask & (1 << distance))
        category = (
            "none"
            if left_selected and right_selected
            else "b"
            if left_selected
            else "a"
            if right_selected
            else "n"
        )
        if core_edges == 0:
            f_raw.append((category, size, 1))
        left_states = (
            ((0, 0, 1), (1, 1, a)) if left_selected else ((0, 0, 1),)
        )
        right_states = (
            ((0, 0, 1), (1, 1, b)) if right_selected else ((0, 0, 1),)
        )
        for left_shift, left_edges, left_weight in left_states:
            for right_shift, right_edges, right_weight in right_states:
                if core_edges + left_edges + right_edges != 1:
                    continue
                z_raw.append(
                    (
                        category,
                        size + left_shift + right_shift,
                        left_weight * right_weight,
                    )
                )

    def aggregate(raw):
        combined = {}
        for category, shift, weight in raw:
            combined[(category, shift)] = combined.get((category, shift), 0) + weight
        return tuple(
            (category, shift, weight)
            for (category, shift), weight in sorted(combined.items())
            if weight != 0
        )

    return aggregate(f_raw), aggregate(z_raw)


def fixed_coefficient(terms, rank, a, b):
    n = a + b
    total = 0
    for category, shift, weight in terms:
        residual = rank - shift
        if residual < 0:
            continue
        if category == "n":
            total += weight * C(n, residual)
        elif category == "a":
            total += weight * C(a, residual)
        elif category == "b":
            total += weight * C(b, residual)
        elif residual == 0:
            total += weight
    return total


def anchor(f_terms, z_terms, a, b):
    order = a + b + DISTANCE + 1
    f2 = fixed_coefficient(f_terms, 2, a, b)
    f3 = fixed_coefficient(f_terms, 3, a, b)
    z2 = fixed_coefficient(z_terms, 2, a, b)
    z3 = fixed_coefficient(z_terms, 3, a, b)
    z4 = fixed_coefficient(z_terms, 4, a, b)
    p0 = f3 + 2 * f2 + order
    r0 = z4 + 2 * z3 + z2
    c0 = z3 + 2 * f2
    determinant = p0 * c0 - f2 * r0
    return f2, p0, r0, c0, determinant


def fixed_delta(a, b, target):
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    f2, p0, r0, c0, determinant = anchor(f_terms, z_terms, a, b)
    fm1 = fixed_coefficient(f_terms, target - 1, a, b)
    f0 = fixed_coefficient(f_terms, target, a, b)
    fp1 = fixed_coefficient(f_terms, target + 1, a, b)
    zp1 = fixed_coefficient(z_terms, target + 1, a, b)
    return (
        (target + 1) * f2 * determinant * (fp1 + 2 * f0 + fm1)
        + f2
        * p0
        * (
            (target + 1) * f0 * (c0 + r0)
            - 3 * (p0 + f2) * (zp1 + 2 * f0)
        )
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


def normalized_row(terms, rank_offset, base, lift, a, b, rho, tau):
    n = a + b
    total = 0
    for category, shift, weight in terms:
        difference = rank_offset - shift + lift
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
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    base = target - 2
    f2, p0, r0, c0, determinant = anchor(f_terms, z_terms, a, b)
    fm1 = normalized_row(f_terms, -1, base, 2, a, b, rho, tau)
    f0 = normalized_row(f_terms, 0, base, 2, a, b, rho, tau)
    fp1 = normalized_row(f_terms, 1, base, 2, a, b, rho, tau)
    zp1 = normalized_row(z_terms, 1, base, 2, a, b, rho, tau)
    return (
        (target + 1) * f2 * determinant * (fp1 + 2 * f0 + fm1)
        + f2
        * p0
        * (
            (target + 1) * f0 * (c0 + r0)
            - 3 * (p0 + f2) * (zp1 + 2 * f0)
        )
    )


def normalized_recurrence(a, b, target, rho, tau):
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    base = target - 4
    f2, p0, r0, c0, determinant = anchor(f_terms, z_terms, a, b)
    fm1 = normalized_row(f_terms, -1, base, 4, a, b, rho, tau)
    f0 = normalized_row(f_terms, 0, base, 4, a, b, rho, tau)
    fp1 = normalized_row(f_terms, 1, base, 4, a, b, rho, tau)
    fp2 = normalized_row(f_terms, 2, base, 4, a, b, rho, tau)
    zp1 = normalized_row(z_terms, 1, base, 4, a, b, rho, tau)
    zp2 = normalized_row(z_terms, 2, base, 4, a, b, rho, tau)
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


def side_boundary_correction(side, other, target, gap):
    assert target == side + gap
    f_terms, z_terms = core_terms(DISTANCE, side, other)
    f2, p0, r0, c0, determinant = anchor(
        f_terms, z_terms, side, other
    )

    def side_row(terms, rank_offset):
        total = 0
        for category, shift, weight in terms:
            if category != "a":
                continue
            complement_rank = shift - gap - rank_offset
            if complement_rank >= 0:
                total += weight * C(side, complement_rank)
        return total

    fm1 = side_row(f_terms, -1)
    f0 = side_row(f_terms, 0)
    fp1 = side_row(f_terms, 1)
    zp1 = side_row(z_terms, 1)
    return (
        (target + 1) * f2 * determinant * (fp1 + 2 * f0 + fm1)
        + f2
        * p0
        * (
            (target + 1) * f0 * (c0 + r0)
            - 3 * (p0 + f2) * (zp1 + 2 * f0)
        )
    )


def stats(label, expression):
    start = perf_counter()
    numerator_terms = expression.numer.terms()
    denominator_terms = expression.denom.terms()
    negative_terms = [
        (monomial, coefficient)
        for monomial, coefficient in numerator_terms
        if coefficient < 0
    ]
    result = {
        "numerator_terms": len(numerator_terms),
        "denominator_terms": len(denominator_terms),
        "numerator_degree": max(sum(monomial) for monomial, _ in numerator_terms),
        "denominator_degree": max(sum(monomial) for monomial, _ in denominator_terms),
        "negative_numerator": len(negative_terms),
        "negative_denominator": sum(
            coefficient < 0 for _, coefficient in denominator_terms
        ),
        "minimum_numerator": str(
            min(coefficient for _, coefficient in numerator_terms)
        ),
        "first_negative": [
            (monomial, str(coefficient))
            for monomial, coefficient in negative_terms[:20]
        ],
        "inspection_seconds": round(perf_counter() - start, 3),
    }
    print(label, result, flush=True)
    return result


def depth4_cap(a, b, target):
    """Four selected vertices, then the depth-sensitive residual cap."""
    n = a + b
    remaining = target - 6
    prefix = falling(a, 4) / falling(n, 4)
    if remaining == 0:
        return prefix
    return prefix * (a - 4) / ((a - 4) + remaining * b)


def main():
    _, probe_a, probe_b = field("probe_a,probe_b", QQ)
    f_probe, z_probe = core_terms(DISTANCE, probe_a, probe_b)
    print("F_TERMS", f_probe, flush=True)
    print("Z_TERMS", z_probe, flush=True)
    print(
        "NONE_SHIFT_MAXIMA",
        max(shift for category, shift, _ in f_probe if category == "none"),
        max(shift for category, shift, _ in z_probe if category == "none"),
        flush=True,
    )

    _, q, v = field("q,v", QQ)
    for target in (4, 5, 6):
        b = q + target - 2
        a = b + v
        stats(f"middle_j{target}_exact", fixed_delta(a, b, target))

    _, q, v, y = field("q,v,y", QQ)
    target = y + 6
    b = q + y + 5
    a = b + v
    base = target - 4
    cap_a = a / (a + base * b)
    cap_b = b / (b + base * a)
    for label, rho, tau in (
        ("middle_recurrence_origin", 0, 0),
        ("middle_recurrence_large_cap", cap_a, 0),
        ("middle_recurrence_small_cap", 0, cap_b),
        ("middle_recurrence_both_caps", cap_a, cap_b),
    ):
        stats(label, normalized_recurrence(a, b, target, rho, tau))

    _, u = field("u", QQ)
    for label, expression in (
        ("tail_j4_b1", fixed_delta(u + 1, 1, 4)),
        ("tail_j5_b1", fixed_delta(u + 1, 1, 5)),
        ("tail_j5_b2", fixed_delta(u + 2, 2, 5)),
    ):
        stats(label, expression)

    _, t, r, s = field("t,r,s", QQ)
    b = s + t + 1
    a = s + t + r + 1
    target = t + r + 2 * s + 4
    stats("tail_zero_bulk", normalized_payment(a, b, target, 0, 0))

    _, t, r = field("t,r", QQ)
    b = t + 1
    a = t + r + 1
    stats(
        "tail_zero_gap3_large_correction",
        side_boundary_correction(a, b, a + 3, 3),
    )
    stats(
        "tail_zero_gap4_large_correction",
        side_boundary_correction(a, b, a + 4, 4),
    )

    _, q, u, y = field("q,u,y", QQ)
    b = q + 1
    target = q + y + 4
    a = q + y + u + 2
    n = a + b
    selected = target - 4
    cap_a = falling(a, 2) / falling(n, 2) * (a - 2) / (
        (a - 2) + selected * b
    )
    stats("tail_active_origin", normalized_payment(a, b, target, 0, 0))
    stats("tail_active_cap", normalized_payment(a, b, target, cap_a, 0))
    selected3 = target - 5
    cap_a3 = falling(a, 3) / falling(n, 3) * (a - 3) / (
        (a - 3) + selected3 * b
    )
    stats("tail_active_depth3_cap", normalized_payment(a, b, target, cap_a3, 0))

    _, w, u = field("w,u", QQ)
    q = w + 2
    b = q + 1
    target = q + 4
    a = q + u + 2
    n = a + b
    selected = target - 4
    cap_a = falling(a, 2) / falling(n, 2) * (a - 2) / (
        (a - 2) + selected * b
    )
    selected3 = target - 5
    cap_a3 = falling(a, 3) / falling(n, 3) * (a - 3) / (
        (a - 3) + selected3 * b
    )
    correction = side_boundary_correction(b, a, target, 3)
    lower_binomial = falling(n, 3) / 6
    stats(
        "tail_active_y0_origin_Cn3_payment",
        lower_binomial * normalized_payment(a, b, target, 0, 0)
        + correction,
    )
    stats(
        "tail_active_y0_cap_Cn3_payment",
        lower_binomial * normalized_payment(a, b, target, cap_a, 0)
        + correction,
    )
    stats(
        "tail_active_y0_depth3_cap_Cn3_payment",
        lower_binomial * normalized_payment(a, b, target, cap_a3, 0)
        + correction,
    )

    # The tail domain has q+y>=2.  At q+y=2 the four-vertex prefix is exact;
    # above it, split the orthant and use one residual hypergeometric cap.
    _, u = field("u", QQ)
    for q_fixed, y_fixed in ((0, 2), (1, 1), (2, 0)):
        b = q_fixed + 1
        target = q_fixed + y_fixed + 4
        a = q_fixed + y_fixed + u + 2
        stats(
            f"tail_active_j6_q{q_fixed}_exact_depth4",
            normalized_payment(a, b, target, depth4_cap(a, b, target), 0),
        )

    for label, q_value, y_value in (
        ("tail_active_depth4_qge3", "w+3", "y"),
        ("tail_active_depth4_q2_yge1", "2", "w+1"),
        ("tail_active_depth4_q1_yge2", "1", "w+2"),
        ("tail_active_depth4_q0_yge3", "0", "w+3"),
    ):
        _, w, u, y = field("w,u,y", QQ)
        q = w + 3 if q_value == "w+3" else int(q_value)
        y_local = y if y_value == "y" else w + int(y_value.split("+")[1])
        b = q + 1
        target = q + y_local + 4
        a = q + y_local + u + 2
        stats(
            label,
            normalized_payment(a, b, target, depth4_cap(a, b, target), 0),
        )

    # At y=0, q>=2 and both sides of C(n,q+2) are at least four (with
    # equality at q=2), hence B>=C(n,4).  Pay the gap-three correction at
    # the affine origin and the depth-four cap.
    _, w, u = field("w,u", QQ)
    q = w + 2
    b = q + 1
    target = q + 4
    a = q + u + 2
    n = a + b
    correction = side_boundary_correction(b, a, target, 3)
    lower_binomial4 = falling(n, 4) / 24
    stats(
        "tail_active_y0_origin_Cn4_payment",
        lower_binomial4 * normalized_payment(a, b, target, 0, 0)
        + correction,
    )
    stats(
        "tail_active_y0_depth4_cap_Cn4_payment",
        lower_binomial4
        * normalized_payment(a, b, target, depth4_cap(a, b, target), 0)
        + correction,
    )

    # In the zero-baseline gap-three boundary, B=C(2t+r+2,t).
    # Split t=0, t=1, and t>=2; on the last branch B>=C(n,2).
    _, r = field("r", QQ)
    t = 0
    b = t + 1
    a = t + r + 1
    target = a + 3
    zero_bulk = normalized_payment(a, b, target, 0, 0)
    correction = side_boundary_correction(a, b, target, 3)
    stats("tail_zero_gap3_t0_exact_payment", zero_bulk + correction)

    _, r = field("r", QQ)
    t = 1
    b = t + 1
    a = t + r + 1
    target = a + 3
    n = a + b
    zero_bulk = normalized_payment(a, b, target, 0, 0)
    correction = side_boundary_correction(a, b, target, 3)
    stats("tail_zero_gap3_t1_exact_payment", n * zero_bulk + correction)

    _, w, r = field("w,r", QQ)
    t = w + 2
    b = t + 1
    a = t + r + 1
    target = a + 3
    n = a + b
    zero_bulk = normalized_payment(a, b, target, 0, 0)
    correction = side_boundary_correction(a, b, target, 3)
    lower_binomial2 = falling(n, 2) / 2
    stats(
        "tail_zero_gap3_tge2_Cn2_payment",
        lower_binomial2 * zero_bulk + correction,
    )

    # When r=0 both equal sides have gap three, so pay both corrections.
    stats(
        "tail_zero_gap3_equal_tge2_Cn2_payment",
        lower_binomial2 * zero_bulk + 2 * correction,
    )


if __name__ == "__main__":
    main()
