#!/usr/bin/env python3
"""Prove the r=0, epsilon=1 cases of the two affine bridge families."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from prove_affine_bridge_r0_even import (
    A,
    C,
    M,
    V,
    affine_in_x,
    c,
    canonical_hash,
    direct_coefficient,
    m,
    minimum_total_degree,
    positive_blocks,
    total_degree_slice,
    w,
    x,
    z,
)
from prove_path_isolate_p4_bottom_pair_affine_slope import load_bottom
from prove_path_isolate_p4_residual_affine_slope import load_parts


def group_kernel_odd() -> tuple[sp.Expr, sp.Expr]:
    constant, slope = load_parts(1)
    signed = constant - slope
    full = sp.expand(signed * V + slope * A)
    affine = sp.expand(affine_in_x(signed) * V + slope * A)
    return full, affine


def bottom_kernel_odd() -> tuple[sp.Expr, sp.Expr]:
    constant, slope = load_bottom(1)
    signed = constant - slope
    full = sp.expand(signed * V + slope * A)
    affine = sp.expand(affine_in_x(signed) * V + slope * A)
    return full, affine


def group_central_ratio(delta: int) -> sp.Expr:
    """C(2m-3,m+delta)/C(2m-3,m-2)."""
    if delta >= -2:
        distance = delta + 2
        return sp.prod(
            (m - 1 - i) / (m - 1 + i)
            for i in range(distance)
        )
    distance = -2 - delta
    return sp.prod(
        (m - 2 - i) / (m + i)
        for i in range(distance)
    )


def bottom_central_ratio(delta: int) -> sp.Expr:
    """C(2m-4,m+delta)/C(2m-4,m-2)."""
    distance = abs(delta + 2)
    return sp.prod(
        (m - 2 - i) / (m - 1 + i)
        for i in range(distance)
    )


def group_normalized_sum(kernel: sp.Expr) -> tuple[sp.Expr, int, int]:
    result = sp.Integer(0)
    kept_monomials = 0
    bounded_summands = 0
    for (p, q), coefficient in sp.Poly(kernel, z, w).terms():
        # The two lower binomial indices sum to 13-p-q.
        if p + q > 13:
            continue
        kept_monomials += 1
        for delta in range(q - 8, 6 - p):
            left_index = 8 - q + delta
            right_index = 5 - p - delta
            if left_index < 0 or right_index < 0:
                continue
            result += (
                coefficient
                * group_central_ratio(delta)
                * sp.binomial(
                    2 * c + 2 * m + x - 6 - delta,
                    left_index,
                )
                * sp.binomial(
                    2 * c + 2 * m + x - 3 + delta,
                    right_index,
                )
            )
            bounded_summands += 1
    return (
        sp.cancel(sp.expand_func(result)),
        kept_monomials,
        bounded_summands,
    )


def bottom_normalized_sum(kernel: sp.Expr) -> tuple[sp.Expr, int, int]:
    result = sp.Integer(0)
    kept_monomials = 0
    bounded_summands = 0
    for (p, q), coefficient in sp.Poly(kernel, z, w).terms():
        # The two lower binomial indices sum to 14-p-q.
        if p + q > 14:
            continue
        kept_monomials += 1
        for delta in range(q - 9, 6 - p):
            left_index = 9 - q + delta
            right_index = 5 - p - delta
            if left_index < 0 or right_index < 0:
                continue
            result += (
                coefficient
                * bottom_central_ratio(delta)
                * sp.binomial(
                    2 * m + x - 7 - delta,
                    left_index,
                )
                * sp.binomial(
                    2 * m + x - 3 + delta,
                    right_index,
                )
            )
            bounded_summands += 1
    return (
        sp.cancel(sp.expand_func(result)),
        kept_monomials,
        bounded_summands,
    )


def main() -> None:
    group_full, group_affine = group_kernel_odd()
    bottom_full, bottom_affine = bottom_kernel_odd()

    group_discarded_minimum = minimum_total_degree(
        sp.expand(group_full - group_affine)
    )
    bottom_discarded_minimum = minimum_total_degree(
        sp.expand(bottom_full - bottom_affine)
    )
    assert group_discarded_minimum is not None
    assert bottom_discarded_minimum is not None
    assert group_discarded_minimum > 13
    assert bottom_discarded_minimum > 14

    group_value, group_kept, group_summands = group_normalized_sum(
        group_affine
    )
    group_shifted = sp.cancel(group_value.subs({c: C + 1, m: M + 3}))
    group_numerator, group_denominator = map(
        sp.expand, sp.fraction(group_shifted)
    )
    group_denominator_expected = sp.prod(M + i for i in range(3, 9))
    assert sp.expand(group_denominator - group_denominator_expected) == 0
    group_prefactor = 32 * (2 * M + 5) * (2 * M + 7)
    group_positive = sp.Poly(
        sp.cancel(group_numerator / group_prefactor), C, M, x
    )
    assert sp.expand(
        group_numerator - group_prefactor * group_positive.as_expr()
    ) == 0
    assert all(coefficient > 0 for coefficient in group_positive.coeffs())

    bottom_value, bottom_kept, bottom_summands = bottom_normalized_sum(
        bottom_affine
    )
    bottom_shifted = sp.cancel(bottom_value.subs(m, M + 3))
    bottom_numerator, bottom_denominator = map(
        sp.expand, sp.fraction(bottom_shifted)
    )
    bottom_denominator_expected = sp.prod(M + i for i in range(2, 7))
    assert sp.expand(bottom_denominator - bottom_denominator_expected) == 0
    bottom_prefactor = 64 * (2 * M + 3) * (2 * M + 5) * (2 * M + 7)
    bottom_positive = sp.Poly(
        sp.cancel(bottom_numerator / bottom_prefactor), M, x
    )
    assert sp.expand(
        bottom_numerator
        - bottom_prefactor * bottom_positive.as_expr()
    ) == 0
    assert bottom_positive.degree(x) == 0
    assert all(coefficient > 0 for coefficient in bottom_positive.coeffs())

    direct_checks = []
    for c_value, m_value, x_value in ((1, 3, 0), (2, 4, 3)):
        direct = direct_coefficient(
            group_affine,
            2 * c_value + m_value + x_value - 3,
            2 * m_value - 3,
            m_value + 5,
            {c: c_value, m: m_value, x: x_value},
        )
        reconstructed = int(
            sp.binomial(2 * m_value - 3, m_value - 2)
            * group_value.subs(
                {c: c_value, m: m_value, x: x_value}
            )
        )
        assert direct == reconstructed
        direct_checks.append(
            {
                "family": "group",
                "c": c_value,
                "m": m_value,
                "x": x_value,
                "direct": direct,
                "reconstructed": reconstructed,
            }
        )
    for m_value, x_value in ((3, 0), (4, 3)):
        direct = direct_coefficient(
            bottom_affine,
            m_value + x_value - 3,
            2 * m_value - 4,
            m_value + 5,
            {m: m_value, x: x_value},
        )
        reconstructed = int(
            sp.binomial(2 * m_value - 4, m_value - 2)
            * bottom_value.subs({m: m_value, x: x_value})
        )
        assert direct == reconstructed
        direct_checks.append(
            {
                "family": "bottom",
                "m": m_value,
                "x": x_value,
                "direct": direct,
                "reconstructed": reconstructed,
            }
        )

    report = {
        "status": "PASS_AFFINE_BRIDGE_R0_ODD_ALL_PARAMETER",
        "scope": {
            "parity_epsilon": 1,
            "newton_tail_index_r": 0,
            "group_domain": "c>=1,m>=3,x>=0",
            "bottom_domain": "m>=3,x>=0",
        },
        "coefficient_identity": {
            "group_center": "k=m+delta; lower indices 8-q+delta and 5-p-delta",
            "bottom_center": "k=m+delta; lower indices 9-q+delta and 5-p-delta",
        },
        "affine_projection": {
            "group_discarded_quadratic_minimum_total_degree": group_discarded_minimum,
            "group_relevant_maximum_total_degree": 13,
            "bottom_discarded_quadratic_minimum_total_degree": bottom_discarded_minimum,
            "bottom_relevant_maximum_total_degree": 14,
        },
        "group": {
            "normalization": "binomial(2m-3,m-2)",
            "identity": (
                "F_grp/binomial(2m-3,m-2)="
                f"({sp.factor(group_prefactor)})*P_grp/"
                f"({sp.factor(group_denominator)})"
            ),
            "P_grp": str(group_positive.as_expr()),
            "P_grp_blocks_by_C_x": positive_blocks(
                group_positive, (C, x)
            ),
            "P_grp_term_count": len(group_positive.terms()),
            "P_grp_degrees_C_M_x": list(
                map(int, group_positive.degree_list())
            ),
            "P_grp_smallest_coefficient": int(
                min(group_positive.coeffs())
            ),
            "P_grp_sha256": canonical_hash(group_positive),
            "kept_kernel_monomials": group_kept,
            "bounded_hypergeometric_summands": group_summands,
            "low_total_degree_slices": {
                str(degree): str(
                    sp.factor(total_degree_slice(group_affine, degree))
                )
                for degree in range(12, 14)
            },
        },
        "bottom": {
            "normalization": "binomial(2m-4,m-2)",
            "identity": (
                "F_bot/binomial(2m-4,m-2)="
                f"({sp.factor(bottom_prefactor)})*P_bot/"
                f"({sp.factor(bottom_denominator)})"
            ),
            "P_bot": str(bottom_positive.as_expr()),
            "P_bot_term_count": len(bottom_positive.terms()),
            "P_bot_degrees_M_x": list(
                map(int, bottom_positive.degree_list())
            ),
            "P_bot_smallest_coefficient": int(
                min(bottom_positive.coeffs())
            ),
            "P_bot_sha256": canonical_hash(bottom_positive),
            "kept_kernel_monomials": bottom_kept,
            "bounded_hypergeometric_summands": bottom_summands,
            "low_total_degree_slice": str(
                sp.factor(total_degree_slice(bottom_affine, 14))
            ),
        },
        "direct_transcription_checks": direct_checks,
        "conclusion": (
            "The r=0, epsilon=1 instances of A_grp and A_bot are "
            "strictly positive throughout their full parameter domains."
        ),
    }
    output = Path("affine_bridge_r0_odd_exact_20260810.json")
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "status": report["status"],
        "group_P_terms": report["group"]["P_grp_term_count"],
        "bottom_P_terms": report["bottom"]["P_bot_term_count"],
        "group_summands": group_summands,
        "bottom_summands": bottom_summands,
        "direct_checks": len(direct_checks),
        "output": str(output),
    }, indent=2))


if __name__ == "__main__":
    main()
