#!/usr/bin/env python3
"""Densely test the candidate scaled-excess bounds near their sharp cases."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A as A_expr,
    T,
    V,
    load_bottom,
    m,
    q,
    x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_target_rows import (
    A,
    T as T_dict,
    V as V_dict,
    multiply,
    power,
)
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def scan(
    package: str,
    parity: int,
    c_value: int,
    m_value: int,
    x_value: int,
    maximum_r: int,
    constant: int,
    b_source,
    p_source,
) -> tuple[list[dict], dict | None]:
    cap = m_value + maximum_r + 5
    b_poly = evaluate(b_source, c_value, m_value, x_value, cap)
    p_poly = evaluate(p_source, c_value, m_value, x_value, cap)
    a = (
        m_value + x_value - 3
        if package == "bottom"
        else 2 * c_value + m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 5
        if package == "bottom"
        else 2 * m_value + parity - 4
    )
    for factor, exponent in ((A, a), (T_dict, b)):
        factor_power = power(factor, exponent, cap)
        b_poly = multiply(b_poly, factor_power, cap)
        p_poly = multiply(p_poly, factor_power, cap)
    n_value = 2 * m_value + x_value
    failures = []
    worst = None
    for r in range(maximum_r + 1):
        target = m_value + r + 5
        base = b_poly.get((target, target), 0)
        reserve = p_poly.get((target, target), 0)
        margin = (n_value + constant) * base + n_value * r * reserve
        if margin < 0:
            failures.append(
                {
                    "package": package,
                    "parity": parity,
                    "c": c_value if package == "group" else None,
                    "m": m_value,
                    "x": x_value,
                    "r": r,
                    "margin": margin,
                    "base": base,
                    "reserve_unit": reserve,
                }
            )
        if base < 0 and r and reserve > 0 and n_value:
            utilization = Fraction(
                -base * (n_value + constant), r * reserve * n_value
            )
            candidate = {
                "package": package,
                "parity": parity,
                "c": c_value if package == "group" else None,
                "m": m_value,
                "x": x_value,
                "r": r,
                "utilization_numerator": utilization.numerator,
                "utilization_denominator": utilization.denominator,
                "utilization": float(utilization),
                "margin": margin,
            }
            if worst is None or utilization > Fraction(
                worst["utilization_numerator"], worst["utilization_denominator"]
            ):
                worst = candidate
        b_poly = multiply(b_poly, V_dict, cap)
        p_poly = multiply(p_poly, V_dict, cap)
    return failures, worst


def main() -> None:
    failures = []
    worst_records = []
    case_count = 0
    order_checks = 0

    bottom_points = [(3, x_value) for x_value in range(8, 19)]
    for parity in (0, 1):
        constant_part, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant_part - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(sp.expand(q**2 * T**3 * affine * V + slope * A_expr))
        for m_value, x_value in bottom_points:
            local_failures, worst = scan(
                "bottom", parity, 0, m_value, x_value, 30, 66,
                b_source, p_source,
            )
            failures.extend(local_failures)
            if worst:
                worst_records.append(worst)
            case_count += 1
            order_checks += 31
            print("bottom", parity, m_value, x_value, flush=True)

    group_points = [
        (1, m_value, x_value)
        for m_value in range(10, 15)
        for x_value in range(18, 31)
    ]
    for parity in (0, 1):
        constant_part, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant_part - slope) / T**3), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(sp.expand(T**3 * affine * V + slope * A_expr))
        for c_value, m_value, x_value in group_points:
            local_failures, worst = scan(
                "group", parity, c_value, m_value, x_value, 40, 79,
                b_source, p_source,
            )
            failures.extend(local_failures)
            if worst:
                worst_records.append(worst)
            case_count += 1
            order_checks += 41
            print("group", parity, c_value, m_value, x_value, flush=True)

    worst = None
    for record in worst_records:
        utilization = Fraction(
            record["utilization_numerator"], record["utilization_denominator"]
        )
        if worst is None or utilization > Fraction(
            worst["utilization_numerator"], worst["utilization_denominator"]
        ):
            worst = record
    report = {
        "status": "PASS_DENSE_PROBE" if not failures else "FAIL",
        "parameter_case_count": case_count,
        "order_check_count": order_checks,
        "failure_count": len(failures),
        "worst_bound_utilization": worst,
        "first_failures": failures[:50],
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_affine_scaled_excess_bound_dense_corrected_"
        "C66_C79_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
