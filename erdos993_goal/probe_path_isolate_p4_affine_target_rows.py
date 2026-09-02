#!/usr/bin/env python3
"""Probe only the homogeneous rows actually extracted from group K0+xK1."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


z, w, c, m, x = sp.symbols("z w c m x")
T_expr = z * (1 + z) + w * (1 + w)

PolyDict = dict[tuple[int, int], int]
A: PolyDict = {(0, 0): 1, (1, 0): 1, (0, 1): 1, (1, 1): 1}
T: PolyDict = {(1, 0): 1, (0, 1): 1, (2, 0): 1, (0, 2): 1}
V: PolyDict = {(0, 0): 1, (1, 0): 1, (0, 1): 1}


def multiply(left: PolyDict, right: PolyDict, target: int) -> PolyDict:
    result: PolyDict = {}
    for (az, aw), ac in left.items():
        for (bz, bw), bc in right.items():
            pz, pw = az + bz, aw + bw
            if pz > target or pw > target or pz + pw > 2 * target:
                continue
            result[(pz, pw)] = result.get((pz, pw), 0) + ac * bc
    return {key: value for key, value in result.items() if value}


def power(base: PolyDict, exponent: int, target: int) -> PolyDict:
    assert exponent >= 0
    result: PolyDict = {(0, 0): 1}
    current = base
    value = exponent
    while value:
        if value & 1:
            result = multiply(result, current, target)
        value //= 2
        if value:
            current = multiply(current, current, target)
    return result


def expression_dict(expression: sp.Expr, target: int) -> PolyDict:
    result: PolyDict = {}
    for (pz, pw), coefficient in sp.Poly(sp.expand(expression), z, w).terms():
        if pz <= target and pw <= target and pz + pw <= 2 * target:
            result[(pz, pw)] = int(coefficient)
    return result


def target_row(source: PolyDict, target: int) -> dict:
    row = [source.get((i, 2 * target - i), 0) for i in range(2 * target + 1)]
    differences = []
    previous = 0
    for i in range(target + 1):
        differences.append(row[i] - previous)
        previous = row[i]
    assert row == list(reversed(row))
    return {
        "central_coefficient": row[target],
        "minimum_row_coefficient": min(row),
        "minimum_schur_coefficient": min(differences),
        "hcu_at_target": all(value >= 0 for value in differences),
        "first_negative_schur_index": next(
            (i for i, value in enumerate(differences) if value < 0), None
        ),
    }


def add(left: PolyDict, right: PolyDict) -> PolyDict:
    result = dict(left)
    for key, value in right.items():
        result[key] = result.get(key, 0) + value
        if result[key] == 0:
            del result[key]
    return result


def main() -> None:
    records = []
    boundary_pairs = ((1, 3), (2, 2), (3, 1))
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / T_expr**3), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        slope_over_t5 = sp.cancel(slope / T_expr**5)
        assert sp.expand(slope - T_expr**5 * slope_over_t5) == 0
        for c_value, m_value in boundary_pairs:
            exponent_t = 2 * m_value + parity - 1
            for x_value in (0, 1, 4, 12):
                exponent_a = 2 * c_value + m_value + x_value - 3
                numeric_kernel = expression_dict(
                    affine.subs({c: c_value, m: m_value, x: x_value}),
                    m_value + 12,
                )
                for order in range(9):
                    target = m_value + order + 4
                    source = {
                        key: value
                        for key, value in numeric_kernel.items()
                        if key[0] <= target
                        and key[1] <= target
                        and sum(key) <= 2 * target
                    }
                    for factor, exponent in (
                        (A, exponent_a),
                        (T, exponent_t),
                        (V, order),
                    ):
                        source = multiply(source, power(factor, exponent, target), target)
                    reserve: PolyDict = {}
                    if order >= 1:
                        reserve = expression_dict(slope_over_t5, target)
                        for factor, exponent in (
                            (A, exponent_a + 1),
                            (T, 2 * m_value + parity + 1),
                            (V, order - 1),
                        ):
                            reserve = multiply(
                                reserve, power(factor, exponent, target), target
                            )
                        reserve = {
                            key: order * value for key, value in reserve.items()
                        }
                    combined = add(source, reserve)
                    affine_result = target_row(source, target)
                    combined_result = target_row(combined, target)
                    records.append(
                        {
                            "parity_epsilon": parity,
                            "c": c_value,
                            "m": m_value,
                            "x": x_value,
                            "newton_order": order,
                            "target": target,
                            **affine_result,
                            "reserve_central_coefficient": reserve.get(
                                (target, target), 0
                            ),
                            "combined_central_coefficient": combined_result[
                                "central_coefficient"
                            ],
                            "combined_minimum_schur_coefficient": combined_result[
                                "minimum_schur_coefficient"
                            ],
                            "combined_hcu_at_target": combined_result[
                                "hcu_at_target"
                            ],
                        }
                    )
    negative_central = [record for record in records if record["central_coefficient"] < 0]
    non_hcu = [record for record in records if not record["hcu_at_target"]]
    combined_negative = [
        record for record in records if record["combined_central_coefficient"] < 0
    ]
    combined_non_hcu = [
        record for record in records if not record["combined_hcu_at_target"]
    ]
    report = {
        "status": "PROBE",
        "case_count": len(records),
        "negative_central_count": len(negative_central),
        "non_hcu_target_row_count": len(non_hcu),
        "combined_negative_central_count": len(combined_negative),
        "combined_non_hcu_target_row_count": len(combined_non_hcu),
        "first_negative_central": negative_central[:20],
        "first_non_hcu_target_rows": non_hcu[:20],
        "first_combined_negative_central": combined_negative[:20],
        "first_combined_non_hcu_target_rows": combined_non_hcu[:20],
        "minimum_central_record": min(records, key=lambda item: item["central_coefficient"]),
        "minimum_schur_record": min(records, key=lambda item: item["minimum_schur_coefficient"]),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
