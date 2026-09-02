#!/usr/bin/env python3
"""Falsify or support raw positivity of the triple-copy curvature source.

After factoring the common outer powers, the universal insertion uses
three one-copy shifts P=w^2, Q=w(1+z), R=(1+z)^2.  This script samples
exact coefficients of the fully symmetrized tensor without materializing
its tens of millions of possible six-variable terms.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, m, q, w, x, z
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


Pair = tuple[int, int]


def coefficient_map(expression: sp.Expr) -> dict[Pair, int]:
    return {
        tuple(map(int, exponent)): int(coefficient)
        for exponent, coefficient in sp.Poly(sp.expand(expression), z, w).terms()
    }


def shifted(source: dict[Pair, int], kind: str) -> dict[Pair, int]:
    result: dict[Pair, int] = {}
    shifts = {
        "P": ((0, 2, 1),),
        "Q": ((0, 1, 1), (1, 1, 1)),
        "R": ((0, 0, 1), (1, 0, 2), (2, 0, 1)),
    }[kind]
    for (pz, pw), value in source.items():
        for dz, dw, multiplier in shifts:
            key = (pz + dz, pw + dw)
            result[key] = result.get(key, 0) + multiplier * value
    return result


def sym_tensor_coefficient(
    target: tuple[Pair, Pair, Pair],
    f_shifted: dict[str, dict[Pair, int]],
    s_shifted: dict[str, dict[Pair, int]],
    d: int,
) -> int:
    total = 0
    terms = (
        (d * (d + 1), "P", "Q", "R"),
        (-2 * (d * d - 1), "Q", "P", "R"),
        (d * (d - 1), "R", "P", "Q"),
    )
    for weight, f_kind, s_kind_1, s_kind_2 in terms:
        for i in range(3):
            j, k = [index for index in range(3) if index != i]
            f_value = f_shifted[f_kind].get(target[i], 0)
            if not f_value:
                continue
            total += weight * f_value * (
                s_shifted[s_kind_1].get(target[j], 0)
                * s_shifted[s_kind_2].get(target[k], 0)
                + s_shifted[s_kind_2].get(target[j], 0)
                * s_shifted[s_kind_1].get(target[k], 0)
            )
    return total


def audit(package: str, parity: int, coordinate: str, values: dict) -> dict:
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    ell = quotient(d_reduced - reserve_reduced, V)
    q_source = quotient(reserve_reduced, T**2)
    s_source = quotient(T**2 * q_source, 1 + z)
    f = coefficient_map((-ell).subs(values))
    s = coefficient_map(s_source.subs(values))
    f_shifted = {kind: shifted(f, kind) for kind in ("P", "Q", "R")}
    s_shifted = {kind: shifted(s, kind) for kind in ("P", "Q", "R")}
    rng = random.Random(993_20260802 + parity + (package == "bottom"))
    first_negatives = []
    d_records = []
    checked: set[tuple[int, tuple[Pair, Pair, Pair]]] = set()
    for d_value in (2, 3, 5, 10, 24, 25, 26, 30, 100):
        checked_before = len(checked)
        first_for_d = None
        for _ in range(30000):
            # Generate a target from an actually supported tensor atom.
            _, f_kind, s_kind_1, s_kind_2 = rng.choice((
                (0, "P", "Q", "R"),
                (0, "Q", "P", "R"),
                (0, "R", "P", "Q"),
            ))
            maps = (
                f_shifted[f_kind],
                s_shifted[s_kind_1],
                s_shifted[s_kind_2],
            )
            target_list = [rng.choice(tuple(source)) for source in maps]
            rng.shuffle(target_list)
            target = tuple(target_list)
            key = (d_value, target)
            if key in checked:
                continue
            checked.add(key)
            value = sym_tensor_coefficient(
                target, f_shifted, s_shifted, d_value
            )
            if value < 0:
                first_for_d = {
                    "d": d_value,
                    "target_z_w_by_copy": [list(item) for item in target],
                    "coefficient": value,
                }
                first_negatives.append(first_for_d)
                break
        d_records.append({
            "d": d_value,
            "exact_sampled_coefficient_count": len(checked) - checked_before,
            "negative_sample_found": first_for_d is not None,
            "first_negative": first_for_d,
        })
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "parameters": {str(symbol): int(value) for symbol, value in values.items()},
        "exact_sampled_coefficient_count": len(checked),
        "negative_sample_found": bool(first_negatives),
        "first_negatives": first_negatives,
        "d_records": d_records,
    }


def main() -> None:
    records = [
        audit("group", 0, "m", {c: 1, m: 16, x: 40}),
        audit("bottom", 1, "x", {m: 20, x: 40}),
    ]
    report = {
        "status": (
            "RAW_TRIPLE_SOURCE_POSITIVITY_REFUTED"
            if any(record["negative_sample_found"] for record in records)
            else "NO_NEGATIVE_IN_EXACT_TARGETED_SAMPLE"
        ),
        "records": records,
        "warning": "A negative is conclusive; an all-positive sample is not a proof.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "triple_curvature_source_coefficients_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
