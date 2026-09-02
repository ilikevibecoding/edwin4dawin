#!/usr/bin/env python3
"""Prove the two r=0 shifted predecessors in every affine package.

The central Pascal step at order one needs the original-coordinate
coefficients at (m+6,m+5) and (m+6,m+6).  Equivalently, these are the
reciprocal coefficients F_0(N-1,N) and F_0(N-1,N-1).  This script gives
all-parameter coefficientwise-positive hypergeometric certificates for
both shifts, both packages, and both parities.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_affine_bridge_r0_even import (
    A,
    C,
    M,
    T,
    bottom_central_ratio as bottom_even_ratio,
    bottom_kernel_even,
    c,
    group_central_ratio as group_even_ratio,
    group_kernel_even,
    m,
    w,
    x,
    z,
)
from prove_affine_bridge_r0_odd import (
    bottom_central_ratio as bottom_odd_ratio,
    bottom_kernel_odd,
    group_central_ratio as group_odd_ratio,
    group_kernel_odd,
)


def canonical_hash(poly: sp.Poly) -> str:
    payload = "\n".join(
        f"{powers}:{coefficient}"
        for powers, coefficient in poly.terms()
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def normalized_sum(
    kernel: sp.Expr,
    package: str,
    parity: int,
    shift_z: int,
    shift_w: int,
) -> tuple[sp.Expr, int, int]:
    """Return the shifted coefficient divided by its central binomial.

    Put k=m+delta in the expansion of T^b.  Only a bounded number of
    kernel monomials and delta values can reach the fixed shifted target.
    """
    if package == "group":
        left_constant = 9 - parity
        ratio = group_even_ratio if parity == 0 else group_odd_ratio
        top_left = (
            2 * c + 2 * m + x - 7
            if parity == 0
            else 2 * c + 2 * m + x - 6
        )
        top_right = 2 * c + 2 * m + x - 3
    else:
        left_constant = 10 - parity
        ratio = bottom_even_ratio if parity == 0 else bottom_odd_ratio
        top_left = (
            2 * m + x - 8
            if parity == 0
            else 2 * m + x - 7
        )
        top_right = 2 * m + x - 3

    maximum_degree = left_constant + 5 + shift_z + shift_w
    value = sp.Integer(0)
    kept = 0
    summands = 0
    for (power_z, power_w), coefficient in sp.Poly(kernel, z, w).terms():
        if power_z + power_w > maximum_degree:
            continue
        kept += 1
        delta_min = power_w - left_constant - shift_w
        delta_stop = 6 + shift_z - power_z
        for delta in range(delta_min, delta_stop):
            left_index = (
                left_constant + shift_w - power_w + delta
            )
            right_index = 5 + shift_z - power_z - delta
            if left_index < 0 or right_index < 0:
                continue
            value += (
                coefficient
                * ratio(delta)
                * sp.binomial(top_left - delta, left_index)
                * sp.binomial(top_right + delta, right_index)
            )
            summands += 1
    return sp.cancel(sp.expand_func(value)), kept, summands


def direct_coefficient(
    kernel: sp.Expr,
    a_value: int,
    b_value: int,
    target_z: int,
    target_w: int,
    substitutions: dict[sp.Symbol, int],
) -> int:
    numeric = sp.expand(kernel.subs(substitutions))
    product = sp.Poly(sp.expand(A**a_value * T**b_value * numeric), z, w)
    return int(product.coeff_monomial(z**target_z * w**target_w))


def expected_denominator(package: str, parity: int, shift: tuple[int, int]) -> sp.Expr:
    if package == "group" and parity == 0:
        return 3 * sp.prod(M + index for index in range(2, 10))
    if package == "group" and parity == 1:
        scalar = 1 if shift == (1, 0) else 3
        return scalar * sp.prod(M + index for index in range(3, 10))
    if package == "bottom" and parity == 0:
        scalar = 1 if shift == (1, 0) else 3
        return scalar * sp.prod(M + index for index in range(2, 8))
    return sp.prod(M + index for index in range(2, 8))


def normalization_binomial(package: str, parity: int, m_value: int) -> int:
    top = 2 * m_value - 4 + parity if package == "group" else 2 * m_value - 5 + parity
    return int(sp.binomial(top, m_value - 2))


def main() -> None:
    kernels = {
        ("group", 0): group_kernel_even()[1],
        ("group", 1): group_kernel_odd()[1],
        ("bottom", 0): bottom_kernel_even()[1],
        ("bottom", 1): bottom_kernel_odd()[1],
    }
    records = []
    direct_checks = []
    for package in ("group", "bottom"):
        for parity in (0, 1):
            kernel = kernels[(package, parity)]
            for shift in ((1, 0), (1, 1)):
                value, kept, summands = normalized_sum(
                    kernel, package, parity, *shift
                )
                substitutions = {m: M + 3}
                variables = (M, x)
                if package == "group":
                    substitutions[c] = C + 1
                    variables = (C, M, x)
                shifted = sp.cancel(value.subs(substitutions))
                numerator, denominator = map(sp.expand, sp.fraction(shifted))
                expected = sp.expand(expected_denominator(package, parity, shift))
                assert sp.expand(denominator - expected) == 0
                positive = sp.Poly(numerator, *variables)
                assert positive.terms()
                assert all(coefficient > 0 for coefficient in positive.coeffs())
                records.append({
                    "package": package,
                    "parity": parity,
                    "original_target_shift_z_w": list(shift),
                    "reciprocal_target": (
                        "(N-1,N)" if shift == (1, 0) else "(N-1,N-1)"
                    ),
                    "normalization": (
                        "binomial(2m-4+parity,m-2)"
                        if package == "group"
                        else "binomial(2m-5+parity,m-2)"
                    ),
                    "positive_denominator_after_m_equals_M_plus_3": str(expected),
                    "positive_numerator_term_count": len(positive.terms()),
                    "positive_numerator_degrees": list(map(int, positive.degree_list())),
                    "positive_numerator_smallest_coefficient": int(min(positive.coeffs())),
                    "positive_numerator_gcd": int(sp.gcd_list(positive.coeffs())),
                    "positive_numerator_sha256": canonical_hash(positive),
                    "kept_kernel_monomials": kept,
                    "bounded_hypergeometric_summands": summands,
                })

                sample = (
                    {c: 2, m: 4, x: 3}
                    if package == "group"
                    else {m: 4, x: 3}
                )
                m_value = sample[m]
                a_value = (
                    2 * sample[c] + m_value + sample[x] - 3
                    if package == "group"
                    else m_value + sample[x] - 3
                )
                b_value = (
                    2 * m_value + parity - 4
                    if package == "group"
                    else 2 * m_value + parity - 5
                )
                target_z = m_value + 5 + shift[0]
                target_w = m_value + 5 + shift[1]
                direct = direct_coefficient(
                    kernel, a_value, b_value, target_z, target_w, sample
                )
                reconstructed = int(
                    normalization_binomial(package, parity, m_value)
                    * value.subs(sample)
                )
                assert direct == reconstructed
                direct_checks.append({
                    "package": package,
                    "parity": parity,
                    "shift": list(shift),
                    "parameters": {str(key): val for key, val in sample.items()},
                    "direct": direct,
                    "reconstructed": reconstructed,
                })

    report = {
        "status": "PASS_AFFINE_BRIDGE_R0_SHIFTED_PREDECESSORS_ALL_PARAMETER",
        "scope": {
            "group": "c>=1,m>=3,x>=0",
            "bottom": "m>=3,x>=0",
            "parities": [0, 1],
            "newton_order": 0,
            "original_target_shifts": [[1, 0], [1, 1]],
        },
        "coefficient_identity": (
            "[z^(L+u)w^(L+v)]A^aT^b z^p w^q="
            "sum_k C(b,k)C(a+b-k,L+v-q-b+k)"
            "C(a+k,L+u-p-k), L=m+5"
        ),
        "records": records,
        "direct_transcription_checks": direct_checks,
        "conclusion": (
            "Both r=0 predecessors F_0(N-1,N) and F_0(N-1,N-1) "
            "are strictly positive in all four affine packages."
        ),
        "scope_warning": (
            "This proves the first boundary triple.  The Pascal recurrence "
            "at later orders reaches additional shifted states, so it is not "
            "by itself an all-order induction."
        ),
    }
    output = Path("affine_bridge_r0_shifted_predecessors_exact_20260810.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "record_count": len(records),
        "direct_check_count": len(direct_checks),
        "output": str(output),
    }, indent=2))


if __name__ == "__main__":
    main()
