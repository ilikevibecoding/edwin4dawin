#!/usr/bin/env python3
"""Analyze the exact two-copy source controlling the utilization slope.

For a symmetric source H, diagonal extraction against

  S_j^(r)=w^j(1+z)^(r-j)+z^j(1+w)^(r-j)

is twice the one-sided extraction against w^j(1+z)^(r-j).  Hence, if
U=-D and R is the positive reserve source, the numerator of

  h_(j+1)-h_j,  h_j=Phi_j(U)/Phi_j(R),

is the four-variable diagonal extraction of the common positive
baseline times

  (U_1 R_2-U_2 R_1)
  (w_1(1+z_2)-w_2(1+z_1)).

This script checks coefficient signs of that cleared two-copy source and
tests whether they are separated by elementary exponent statistics.
"""

from __future__ import annotations

from collections import defaultdict
import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, m, q, x, z, w
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def coefficient_map(expression: sp.Expr) -> dict[tuple[int, int], int]:
    return {
        tuple(map(int, powers)): int(coefficient)
        for powers, coefficient in sp.Poly(sp.expand(expression), z, w).terms()
        if coefficient
    }


def add_term(
    destination: dict[tuple[int, int, int, int], int],
    exponent: tuple[int, int, int, int],
    coefficient: int,
) -> None:
    value = destination.get(exponent, 0) + coefficient
    if value:
        destination[exponent] = value
    elif exponent in destination:
        del destination[exponent]


def cleared_cross(
    numerator: dict[tuple[int, int], int],
    reserve: dict[tuple[int, int], int],
) -> dict[tuple[int, int, int, int], int]:
    """Return (U1 R2-U2 R1)*(w1(1+z2)-w2(1+z1))."""
    cross: dict[tuple[int, int, int, int], int] = {}
    for (uz, uw), uc in numerator.items():
        for (rz, rw), rc in reserve.items():
            value = uc * rc
            add_term(cross, (uz, uw, rz, rw), value)
            add_term(cross, (rz, rw, uz, uw), -value)

    result: dict[tuple[int, int, int, int], int] = {}
    # w1 + w1*z2 - w2 - z1*w2
    shifts = (
        ((0, 1, 0, 0), 1),
        ((0, 1, 1, 0), 1),
        ((0, 0, 0, 1), -1),
        ((1, 0, 0, 1), -1),
    )
    for exponent, coefficient in cross.items():
        for shift, sign in shifts:
            add_term(
                result,
                tuple(left + right for left, right in zip(exponent, shift)),
                coefficient * sign,
            )
    return result


def statistic_values(exponent: tuple[int, int, int, int]) -> dict[str, int]:
    z1, w1, z2, w2 = exponent
    return {
        "total_w_minus_z": w1 + w2 - z1 - z2,
        "copy1_w_minus_z": w1 - z1,
        "copy2_w_minus_z": w2 - z2,
        "difference_of_copy_imbalances": (w1 - z1) - (w2 - z2),
        "total_w": w1 + w2,
        "total_z": z1 + z2,
        "copy1_total_minus_copy2_total": z1 + w1 - z2 - w2,
        "min_copy_imbalance": min(w1 - z1, w2 - z2),
        "max_copy_imbalance": max(w1 - z1, w2 - z2),
    }


def sign_word(entries: list[tuple[int, int]]) -> list[int]:
    result = []
    for _, value in entries:
        if not value:
            continue
        sign = 1 if value > 0 else -1
        if not result or result[-1] != sign:
            result.append(sign)
    return result


def audit(package, parity, coordinate, values):
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    numerator_expression = sp.expand(-quotient(d_expression, common).subs(values))
    reserve_expression = sp.expand(quotient(reserve_expression, common).subs(values))
    numerator = coefficient_map(numerator_expression)
    reserve = coefficient_map(reserve_expression)
    assert reserve and all(value > 0 for value in reserve.values())
    source = cleared_cross(numerator, reserve)

    grouped = {}
    for name in statistic_values((0, 0, 0, 0)):
        bins: dict[int, list[int]] = defaultdict(list)
        sums: dict[int, int] = defaultdict(int)
        for exponent, coefficient in source.items():
            key = statistic_values(exponent)[name]
            bins[key].append(coefficient)
            sums[key] += coefficient
        ordered_keys = sorted(bins)
        pure_bin_signs = []
        mixed_bins = []
        for key in ordered_keys:
            signs = {1 if value > 0 else -1 for value in bins[key]}
            if len(signs) == 1:
                pure_bin_signs.append((key, next(iter(signs))))
            else:
                mixed_bins.append(key)
        grouped[name] = {
            "bin_count": len(ordered_keys),
            "mixed_coefficient_sign_bin_count": len(mixed_bins),
            "first_mixed_bins": mixed_bins[:20],
            "pure_bin_sign_word": sign_word(pure_bin_signs),
            "bin_sum_sign_word": sign_word([(key, sums[key]) for key in ordered_keys]),
        }

    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "parameters": {str(symbol): int(value) for symbol, value in values.items()},
        "numerator_term_count": len(numerator),
        "numerator_negative_term_count": sum(value < 0 for value in numerator.values()),
        "reserve_term_count": len(reserve),
        "cleared_two_copy_term_count": len(source),
        "cleared_two_copy_negative_term_count": sum(value < 0 for value in source.values()),
        "cleared_two_copy_positive_term_count": sum(value > 0 for value in source.values()),
        "grouped_statistics": grouped,
    }


def main() -> None:
    records = [
        audit("group", 0, "m", {c: 1, m: 16, x: 40}),
        audit("bottom", 1, "x", {m: 20, x: 40}),
    ]
    report = {
        "status": "TWO_COPY_SOURCE_GEOMETRY_AUDIT",
        "identity": (
            "For symmetric U,R, the adjacent quotient determinant is the "
            "four-variable diagonal extraction of the positive common "
            "baseline times (U1*R2-U2*R1)*(w1*(1+z2)-w2*(1+z1))."
        ),
        "records": records,
        "warning": "Finite exact specializations; grouped bin sums are diagnostic only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "two_copy_source_geometry_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
