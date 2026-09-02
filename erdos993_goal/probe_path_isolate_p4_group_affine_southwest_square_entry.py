#!/usr/bin/env python3
"""Probe finite entry into the reciprocal southwest-square cone.

For fixed parameters, the desired coefficient is at the fixed reciprocal
target (N,N).  If

  A^a S^b W^r (B^vee+r P^vee)

is coefficientwise nonnegative throughout 0<=i,j<=N at one order r,
then the recurrence F_{r+1}=W F_r+A^aS^bW^(r+1)P^vee preserves that
square at every later order because W and P^vee are coefficientwise
nonnegative.  This script tests entry; it does not prove uniform entry.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import (
    A as A_expr,
    T,
    V,
    c,
    m,
    to_sparse,
    x,
)
from analyze_path_isolate_p4_group_grouped_tail_symbolic import reciprocal
from probe_path_isolate_p4_affine_target_rows import multiply, power
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


A = {(0, 0): 1, (1, 0): 1, (0, 1): 1, (1, 1): 1}
S = {(2, 0): 1, (0, 2): 1, (2, 1): 1, (1, 2): 1}
W = {(1, 0): 1, (0, 1): 1, (1, 1): 1}


def evaluate(source, c_value: int, m_value: int, x_value: int, cap: int):
    result = {}
    for (pz, pw, pc, pm, px), coefficient in source.items():
        if pz > cap or pw > cap:
            continue
        value = coefficient * c_value**pc * m_value**pm * x_value**px
        if value:
            result[(pz, pw)] = result.get((pz, pw), 0) + value
    return {key: value for key, value in result.items() if value}


def add_scaled(left, right, scalar: int):
    result = dict(left)
    for key, value in right.items():
        updated = result.get(key, 0) + scalar * value
        if updated:
            result[key] = updated
        elif key in result:
            del result[key]
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--grid-x0", action="store_true")
    parser.add_argument("--rays-x0", action="store_true")
    args = parser.parse_args()
    if args.grid_x0 and args.rays_x0:
        raise ValueError("choose at most one probe mode")
    if args.rays_x0:
        parameter_points = sorted(
            {
                *( (1, m_value, 0) for m_value in range(3, 21) ),
                *( (c_value, 3, 0) for c_value in range(1, 21) ),
                *(
                    (max(1, m_value // 2 + delta), m_value, 0)
                    for m_value in range(3, 21)
                    for delta in (-1, 0, 1)
                ),
            }
        )
        maximum_r = 30
        output_name = (
            "path_isolate_p4_group_affine_southwest_square_entry_"
            "rays_x0_probe_20260801.json"
        )
    elif args.grid_x0:
        parameter_points = [
            (c_value, m_value, 0)
            for c_value in range(1, 9)
            for m_value in range(3, 11)
        ]
        maximum_r = 30
        output_name = (
            "path_isolate_p4_group_affine_southwest_square_entry_"
            "grid_x0_probe_20260801.json"
        )
    else:
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
        maximum_r = 40
        output_name = (
            "path_isolate_p4_group_affine_southwest_square_entry_"
            "probe_20260801.json"
        )
    records = []
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
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(sp.expand(T**3 * affine_kernel * V + slope * A_expr))
        p_reciprocal, p_degree = reciprocal(p_source)
        b_reciprocal, b_degree = reciprocal(b_source)
        assert p_degree == b_degree == 24
        for c_value, m_value, x_value in parameter_points:
            a = 2 * c_value + m_value + x_value - 3
            b = 2 * m_value + parity - 4
            target = 2 * c_value + 4 * m_value + x_value + 2 * parity + 8
            p_poly = evaluate(p_reciprocal, c_value, m_value, x_value, target)
            b_poly = evaluate(b_reciprocal, c_value, m_value, x_value, target)
            for factor, exponent in ((A, a), (S, b)):
                factor_power = power(factor, exponent, target)
                p_poly = multiply(p_poly, factor_power, target)
                b_poly = multiply(b_poly, factor_power, target)
            entry_order = None
            negative_counts = []
            first_negative = []
            central_failures = []
            for r in range(maximum_r + 1):
                combined = add_scaled(b_poly, p_poly, r)
                central_value = combined.get((target, target), 0)
                if central_value < 0:
                    central_failures.append(
                        {"r": r, "value": central_value}
                    )
                negatives = [
                    (key, value)
                    for key, value in combined.items()
                    if value < 0
                ]
                negative_counts.append(len(negatives))
                if negatives and len(first_negative) < 5:
                    key, value = min(negatives, key=lambda item: item[1])
                    first_negative.append(
                        {"r": r, "position": list(key), "value": value}
                    )
                if not negatives and entry_order is None:
                    entry_order = r
                    # Equation F_(r+1)=W F_r+positive proves that the
                    # southwest square remains nonnegative forever.
                    break
                p_poly = multiply(p_poly, W, target)
                b_poly = multiply(b_poly, W, target)
            record = {
                "parity": parity,
                "c": c_value,
                "m": m_value,
                "x": x_value,
                "target_N": target,
                "entry_order": entry_order,
                "negative_counts": negative_counts,
                "first_negative": first_negative,
                "pre_entry_central_failure_count": len(central_failures),
                "pre_entry_central_failures": central_failures[:20],
                "all_orders_certified_for_this_point": (
                    entry_order is not None and not central_failures
                ),
            }
            records.append(record)
            print(parity, c_value, m_value, x_value, target, entry_order, flush=True)
    report = {
        "status": "PROBE",
        "identity": "A^a*S^b*W^r*(B^vee+r*P^vee)",
        "square": "0<=z_degree,w_degree<=N",
        "maximum_r": maximum_r,
        "parameter_point_count": len(parameter_points),
        "all_entered": all(record["entry_order"] is not None for record in records),
        "all_orders_certified_for_every_point": all(
            record["all_orders_certified_for_this_point"]
            for record in records
        ),
        "pre_entry_central_failure_count": sum(
            record["pre_entry_central_failure_count"]
            for record in records
        ),
        "maximum_entry_order": max(
            (record["entry_order"] for record in records if record["entry_order"] is not None),
            default=None,
        ),
        "records": records,
    }
    Path(output_name).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
