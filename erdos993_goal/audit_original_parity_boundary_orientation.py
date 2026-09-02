#!/usr/bin/env python3
"""Audit the two leading parity coefficients on all 26 focused cases."""

from __future__ import annotations

from fractions import Fraction
import json
import math
from pathlib import Path

from probe_path_isolate_p4_affine_scaled_excess_local_summands import choose, local
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    focused_cases,
    reduced_sources,
)


def aggregate_indices(
    source,
    a: int,
    b: int,
    order: int,
    target: int,
    c_value: int,
    m_value: int,
    x_value: int,
    indices: set[int],
) -> dict[int, int]:
    numeric = evaluate(source, c_value, m_value, x_value, target)
    return {
        j: choose(order, j)
        * sum(
            choose(b, k) * local(numeric, a, b, order, target, k, j)
            for k in range(b + 1)
        )
        for j in indices
    }


def coefficient_at(
    ell: dict[int, int], reserve: dict[int, int], r: int, j: int
) -> int:
    numerator = (
        Fraction(-ell[j], math.comb(r + 1, j))
        + Fraction(-ell[j + 1], math.comb(r + 1, j + 1))
    )
    reserve_unweighted = Fraction(reserve[j], math.comb(r, j))
    value = math.comb(r, j) * ((r + 1) * reserve_unweighted - numerator)
    if value.denominator != 1:
        raise AssertionError("nonintegral original coefficient")
    return int(value)


def main() -> None:
    records = []
    for case in focused_cases():
        package, parity, coordinate, c_value, m_value, x_value, r, grid = case
        ell_source, reserve_source = reduced_sources(package, parity, coordinate)
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
        indices = {r - 1, r, r + 1}
        ell = aggregate_indices(
            ell_source, a, reduced_b, r + 1, reduced_target,
            c_value, m_value, x_value, indices,
        )
        reserve = aggregate_indices(
            reserve_source, a, reduced_b, r, reduced_target,
            c_value, m_value, x_value, {r - 1, r},
        )
        penultimate = coefficient_at(ell, reserve, r, r - 1)
        leading = coefficient_at(ell, reserve, r, r)
        records.append({
            "grid": grid,
            "package": package,
            "parity": parity,
            "coordinate": coordinate,
            "m": m_value,
            "x": x_value,
            "r": r,
            "penultimate_sign": 1 if penultimate > 0 else -1 if penultimate < 0 else 0,
            "leading_sign": 1 if leading > 0 else -1 if leading < 0 else 0,
            "same_nonzero_sign": penultimate * leading > 0,
        })
    passed = all(record["same_nonzero_sign"] for record in records)
    report = {
        "status": (
            "PASS_PARITY_LEADING_SIGNS_AGREE_ALL_FOCUSED_CASES"
            if passed else "PARITY_LEADING_SIGN_FAILURE"
        ),
        "case_count": len(records),
        "failure_count": sum(not record["same_nonzero_sign"] for record in records),
        "records": records,
        "warning": "Finite exact focused audit only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_parity_boundary_orientation_audit_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
