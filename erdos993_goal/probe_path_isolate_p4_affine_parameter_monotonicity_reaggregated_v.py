#!/usr/bin/env python3
"""Test the exact V-reaggregation of affine monotonicity increments."""

from __future__ import annotations

import json
import functools
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A, T, V, load_bottom, m, q, x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c, to_sparse
from probe_path_isolate_p4_affine_scaled_excess_local_summands import choose, local
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse
from stress_path_isolate_p4_affine_parameter_monotonicity_large_rays import (
    audit_components,
)


def quotient(numerator: sp.Expr, denominator: sp.Expr) -> sp.Expr:
    result = sp.cancel(numerator / denominator)
    if not result.is_polynomial():
        raise AssertionError("claimed exact quotient is not polynomial")
    return sp.expand(result)


@functools.cache
def group_increment(parity: int, coordinate: str):
    constant, slope = split_sparse(
        Path(
            "path_isolate_p4_group_integrand_stable_"
            f"parity{parity}_terms_20260730.json"
        ),
        "zwcmsx",
    )
    kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
    affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
    p = sp.expand(slope * A)
    base = sp.expand(T**3 * affine * V + p)
    increments = {
        "x": (
            sp.expand(A * base.subs(x, x + 1) - base),
            sp.expand((A - 1) * p),
        ),
        "c": (
            sp.expand(A**2 * base.subs(c, c + 1) - base),
            sp.expand((A**2 - 1) * p),
        ),
        "m": (
            sp.expand(A * T**2 * base.subs(m, m + 1) - q * base),
            sp.expand((A * T**2 - q) * p),
        ),
    }
    return increments[coordinate]


@functools.cache
def bottom_increment(parity: int, coordinate: str):
    constant, slope = load_bottom(parity)
    kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
    affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
    p = sp.expand(slope * A)
    base = sp.expand(q**2 * T**3 * affine * V + p)
    increments = {
        "x": (
            sp.expand(A * base.subs(x, x + 1) - base),
            sp.expand((A - 1) * p),
        ),
        "m": (
            sp.expand(A * T**2 * base.subs(m, m + 1) - q * base),
            sp.expand(A * T**2 * p.subs(m, m + 1) - q * p),
        ),
    }
    return increments[coordinate]


def aggregate(
    source,
    a: int,
    b: int,
    order: int,
    target: int,
    c_value: int,
    m_value: int,
    x_value: int,
) -> list[int]:
    numeric = evaluate(source, c_value, m_value, x_value, target)
    values = [0] * (order + 1)
    for k in range(b + 1):
        k_weight = choose(b, k)
        for j in range(order + 1):
            values[j] += (
                k_weight * choose(order, j)
                * local(numeric, a, b, order, target, k, j)
            )
    return values


def blocks(values: list[int]) -> list[dict]:
    result = []
    for index, value in enumerate(values):
        if not value:
            continue
        sign = 1 if value > 0 else -1
        if not result or result[-1]["sign"] != sign:
            result.append({"sign": sign, "start": index, "end": index, "count": 1})
        else:
            result[-1]["end"] = index
            result[-1]["count"] += 1
    return result


def roots(values: list[int]) -> dict:
    polynomial = fmpz_poly(values)
    negative = positive = nonreal = below = above = 0
    nonreal_negative_real_part = 0
    nonreal_positive_real_part = 0
    nonreal_unresolved_real_part = 0
    for root, multiplicity in polynomial.complex_roots():
        if root.imag.is_zero():
            if root.real < 0:
                negative += multiplicity
            elif root.real > 0:
                positive += multiplicity
                below += multiplicity if root.real < 1 else 0
                above += multiplicity if root.real > 1 else 0
        else:
            nonreal += multiplicity
            if root.real < 0:
                nonreal_negative_real_part += multiplicity
            elif root.real > 0:
                nonreal_positive_real_part += multiplicity
            else:
                nonreal_unresolved_real_part += multiplicity
    return {
        "degree": polynomial.degree(),
        "negative": negative,
        "positive": positive,
        "nonreal": nonreal,
        "nonreal_negative_real_part": nonreal_negative_real_part,
        "nonreal_positive_real_part": nonreal_positive_real_part,
        "nonreal_unresolved_real_part": nonreal_unresolved_real_part,
        "positive_below_one": below,
        "positive_above_one": above,
    }


def main() -> None:
    ctx.prec = 80
    requested = [
        ("group", 0, "m", 1, 16, 40, 25),
        ("bottom", 1, "x", 0, 20, 40, 26),
        ("group", 0, "m", 1, 90, 180, 120),
        ("group", 0, "m", 1, 120, 240, 160),
        ("bottom", 1, "x", 0, 120, 240, 180),
    ]
    records = []
    for package, parity, coordinate, c_value, m_value, x_value, r in requested:
        d_expression, reserve_expression = (
            group_increment(parity, coordinate)
            if package == "group"
            else bottom_increment(parity, coordinate)
        )
        common = T**3 if package == "group" else q**2 * T**3
        d_reduced = quotient(d_expression, common)
        reserve_reduced = quotient(reserve_expression, common)
        ell = quotient(d_reduced - reserve_reduced, V)
        assert sp.expand(d_reduced - (V * ell + reserve_reduced)) == 0
        assert quotient(reserve_reduced, T**2).is_polynomial()

        a = (
            2 * c_value + m_value + x_value - 3
            if package == "group" else m_value + x_value - 3
        )
        original_b = (
            2 * m_value + parity - 4
            if package == "group" else 2 * m_value + parity - 5
        )
        target = m_value + r + 5 + (coordinate == "m")
        reduced_target = target if package == "group" else target - 2
        reduced_b = original_b + 3

        ell_values = aggregate(
            to_sparse(ell), a, reduced_b, r + 1, reduced_target,
            c_value, m_value, x_value,
        )
        reserve_values = aggregate(
            to_sparse(reserve_reduced), a, reduced_b, r, reduced_target,
            c_value, m_value, x_value,
        )
        reaggregated = [
            ell_values[j]
            + ((r + 1) * reserve_values[j] if j <= r else 0)
            for j in range(r + 2)
        ]
        original = audit_components(
            package, parity, coordinate, c_value, m_value, x_value, r,
            to_sparse(d_expression), to_sparse(reserve_expression),
        )
        assert sum(reaggregated) == original["full_total"]
        order = len(reaggregated) - 1
        ulc_failures = [
            j for j in range(1, order)
            if (
                j * (order - j) * reaggregated[j] ** 2
                < (j + 1) * (order - j + 1)
                * reaggregated[j - 1] * reaggregated[j + 1]
            )
        ]
        record = {
            "package": package,
            "parity": parity,
            "coordinate": coordinate,
            "c": c_value if package == "group" else None,
            "m": m_value,
            "x": x_value,
            "r": r,
            "identity_sum_matches_original": True,
            "full_total_positive": sum(reaggregated) > 0,
            "nonzero_sign_blocks": blocks(reaggregated),
            "signed_ulc_failure_count": len(ulc_failures),
            "root_summary": roots(reaggregated),
        }
        records.append(record)
        print(record, flush=True)

    report = {
        "status": "PASS_EXACT_V_REAGGREGATION",
        "case_count": len(records),
        "records": records,
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
