#!/usr/bin/env python3
"""Probe the strong m-recurrence for affine-plus-reserve target rows."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_p4_curvature_reserve_identity import split_sparse
from probe_path_isolate_p4_affine_target_rows import (
    A,
    T,
    V,
    PolyDict,
    add,
    expression_dict,
    multiply,
    power,
    target_row,
)


z, w, c, m, x = sp.symbols("z w c m x")
T_expr = z * (1 + z) + w * (1 + w)


def subtract(left: PolyDict, right: PolyDict) -> PolyDict:
    return add(left, {key: -value for key, value in right.items()})


def q_shift(source: PolyDict, shift: int, target: int, scalar: int) -> PolyDict:
    return {
        (pz + shift, pw + shift): scalar * value
        for (pz, pw), value in source.items()
        if pz + shift <= target and pw + shift <= target
    }


def main() -> None:
    records = []
    weights = (1, 6, 13, 12, 4)
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
        cache: dict[tuple[int, int, int, int], PolyDict] = {}

        def build(c_value: int, m_value: int, x_value: int, order: int) -> PolyDict:
            key = (c_value, m_value, x_value, order)
            if key in cache:
                return cache[key]
            target = m_value + order + 4
            exponent_a = 2 * c_value + m_value + x_value - 3
            source = expression_dict(
                affine.subs({c: c_value, m: m_value, x: x_value}), target
            )
            for factor, exponent in (
                (A, exponent_a),
                (T, 2 * m_value + parity - 1),
                (V, order),
            ):
                source = multiply(source, power(factor, exponent, target), target)
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
                source = add(
                    source, {monomial: order * value for monomial, value in reserve.items()}
                )
            cache[key] = source
            return source

        for c_value, m_value in ((1, 3), (2, 2), (3, 1)):
            for x_value in (0, 1, 4):
                for order in range(9):
                    target = m_value + order + 5
                    residual = build(c_value, m_value + 1, x_value, order)
                    old_sum: PolyDict = {}
                    for lag, weight in enumerate(weights):
                        if order < lag:
                            continue
                        old = build(c_value, m_value, x_value, order - lag)
                        old_sum = add(
                            old_sum,
                            q_shift(old, lag + 1, target, weight),
                        )
                    result = target_row(subtract(residual, old_sum), target)
                    records.append(
                        {
                            "parity_epsilon": parity,
                            "c": c_value,
                            "m": m_value,
                            "x": x_value,
                            "newton_order": order,
                            **result,
                        }
                    )

    negative = [record for record in records if record["central_coefficient"] < 0]
    non_hcu = [record for record in records if not record["hcu_at_target"]]
    report = {
        "status": "PROBE",
        "recurrence": (
            "F_k(m+1)-F_k(m)-6F_{k-1}(m)-13F_{k-2}(m)"
            "-12F_{k-3}(m)-4F_{k-4}(m)"
        ),
        "case_count": len(records),
        "negative_central_count": len(negative),
        "non_hcu_target_row_count": len(non_hcu),
        "first_negative": negative[:30],
        "first_non_hcu": non_hcu[:30],
        "minimum_central_record": min(records, key=lambda item: item["central_coefficient"]),
        "minimum_schur_record": min(records, key=lambda item: item["minimum_schur_coefficient"]),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
