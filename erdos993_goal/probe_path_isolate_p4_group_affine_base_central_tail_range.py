#!/usr/bin/env python3
"""Stress the direct affine base B=T^3*K_aff*V+J*A on all tail orders."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import (
    A,
    T,
    V,
    c,
    m,
    to_sparse,
    w,
    x,
    z,
)
from probe_path_isolate_p4_affine_target_rows import (
    A as A_dict,
    T as T_dict,
    V as V_dict,
    multiply,
    power,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def evaluate(source, c_value: int, m_value: int, x_value: int, cap: int):
    result = {}
    for (pz, pw, pc, pm, px), coefficient in source.items():
        if pz > cap or pw > cap:
            continue
        value = coefficient * c_value**pc * m_value**pm * x_value**px
        if value:
            result[(pz, pw)] = result.get((pz, pw), 0) + value
    return {key: value for key, value in result.items() if value}


def main() -> None:
    parameter_points = [
        (1, 3, 0),
        (1, 3, 4),
        (1, 3, 12),
        (1, 3, 24),
        (1, 3, 48),
        (1, 12, 0),
        (1, 12, 24),
        (4, 7, 0),
        (4, 7, 12),
        (8, 3, 0),
        (8, 3, 24),
    ]
    records = []
    negative_counts = {"base": 0, "combined": 0}
    failures = []
    worst_compensation = None
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        affine_kernel = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A))
        base_source = to_sparse(
            sp.expand(T**3 * affine_kernel * V + slope * A)
        )
        for c_value, m_value, x_value in parameter_points:
            maximum_target = m_value + 60 + 5
            exponent_a = 2 * c_value + m_value + x_value - 3
            exponent_t = 2 * m_value + parity - 4
            p_poly = evaluate(
                p_source, c_value, m_value, x_value, maximum_target
            )
            base_poly = evaluate(
                base_source, c_value, m_value, x_value, maximum_target
            )
            for factor, exponent in (
                (A_dict, exponent_a),
                (T_dict, exponent_t),
            ):
                factor_power = power(factor, exponent, maximum_target)
                p_poly = multiply(p_poly, factor_power, maximum_target)
                base_poly = multiply(base_poly, factor_power, maximum_target)
            smallest_base = None
            smallest_combined = None
            last_nonzero = -1
            for tail in range(60):
                target = m_value + tail + 5
                p_value = p_poly.get((target, target), 0)
                base_value = base_poly.get((target, target), 0)
                combined_value = base_value + tail * p_value
                if base_value < 0 and p_value > 0 and tail > 0:
                    required_fraction = Fraction(-base_value, tail * p_value)
                    if (
                        worst_compensation is None
                        or required_fraction
                        > Fraction(
                            worst_compensation["fraction_numerator"],
                            worst_compensation["fraction_denominator"],
                        )
                    ):
                        worst_compensation = {
                            "parity": parity,
                            "c": c_value,
                            "m": m_value,
                            "x": x_value,
                            "tail": tail,
                            "base": base_value,
                            "P": p_value,
                            "combined": combined_value,
                            "fraction_numerator": required_fraction.numerator,
                            "fraction_denominator": required_fraction.denominator,
                            "fraction_decimal": float(required_fraction),
                        }
                if base_value or combined_value:
                    last_nonzero = tail
                if smallest_base is None or base_value < smallest_base:
                    smallest_base = base_value
                if (
                    smallest_combined is None
                    or combined_value < smallest_combined
                ):
                    smallest_combined = combined_value
                for kind, value in (
                    ("base", base_value),
                    ("combined", combined_value),
                ):
                    if value < 0:
                        negative_counts[kind] += 1
                        if len(failures) < 50:
                            failures.append(
                                {
                                    "parity": parity,
                                    "c": c_value,
                                    "m": m_value,
                                    "x": x_value,
                                    "tail": tail,
                                    "kind": kind,
                                    "value": value,
                                    "P": p_value,
                                }
                            )
                p_poly = multiply(p_poly, V_dict, maximum_target)
                base_poly = multiply(base_poly, V_dict, maximum_target)
            records.append(
                {
                    "parity": parity,
                    "c": c_value,
                    "m": m_value,
                    "x": x_value,
                    "smallest_base": smallest_base,
                    "smallest_combined": smallest_combined,
                    "last_nonzero_tail": last_nonzero,
                }
            )
            print(parity, c_value, m_value, x_value, flush=True)
    report = {
        "status": "PROBE",
        "identity": "V^r*(B+rP), B=T^3*K_aff*V+J*A, P=J*A",
        "parameter_point_count": len(parameter_points),
        "tail_range": [0, 59],
        "case_count": len(parameter_points) * 2 * 60 * 2,
        "negative_counts_by_kind": negative_counts,
        "worst_negative_base_compensation": worst_compensation,
        "first_failures": failures,
        "records": records,
    }
    Path(
        "path_isolate_p4_group_affine_base_central_tail_range_probe_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
