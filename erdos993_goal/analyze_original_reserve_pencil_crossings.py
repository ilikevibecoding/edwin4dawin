#!/usr/bin/env python3
"""Audit imaginary-axis crossing candidates in the reserve-to-target pencil."""

from __future__ import annotations

from fractions import Fraction
import json
import math
from pathlib import Path

from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    DEFAULT_PATHS,
    nonzero_sign_word,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_original_reserve_differential_module import (
    reconstruct,
)


OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "original_reserve_pencil_crossings_20260802.json"
)


def product(left: list[int], right: list[int]) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for j, left_value in enumerate(left):
        for k, right_value in enumerate(right):
            result[j + k] += left_value * right_value
    return result


def subtract(left: list[int], right: list[int]) -> list[int]:
    result = [
        (left[j] if j < len(left) else 0)
        - (right[j] if j < len(right) else 0)
        for j in range(max(len(left), len(right)))
    ]
    while result and result[-1] == 0:
        result.pop()
    return result


def crossing_parameter(reserve_value: int, target_value: int):
    denominator = reserve_value - target_value
    if denominator == 0:
        return None
    value = Fraction(reserve_value, denominator)
    return {
        "value": str(value),
        "strictly_between_zero_and_one": 0 < value < 1,
    }


def audit(record: dict, source: str) -> dict:
    coefficient, reserve = reconstruct(record)
    ce, co = coefficient[0::2], coefficient[1::2]
    re, ro = reserve[0::2], reserve[1::2]

    # At u<0, an imaginary-axis crossing in
    # (1-t)R+tC requires both parity parts to vanish.  Eliminating t gives
    # H(u)=E_C(u)O_R(u)-O_C(u)E_R(u)=0.
    cross = subtract(product(ce, ro), product(co, re))
    reflected = [
        value if j % 2 == 0 else -value
        for j, value in enumerate(cross)
    ]
    reflected_word = nonzero_sign_word(reflected)
    stable = [math.comb(len(coefficient) - 1, j) for j in range(len(coefficient))]
    se, so = stable[0::2], stable[1::2]
    stable_cross = subtract(product(ce, so), product(co, se))
    stable_reflected = [
        value if j % 2 == 0 else -value
        for j, value in enumerate(stable_cross)
    ]
    stable_reflected_word = nonzero_sign_word(stable_reflected)
    return {
        "source": source,
        "package": record.get("package"),
        "parity": record.get("parity"),
        "coordinate": record.get("coordinate"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": int(record["r"]),
        "cross_polynomial_degree": len(cross) - 1,
        "negative_axis_descartes_sign_word": reflected_word,
        "negative_axis_descartes_sign_changes": max(0, len(reflected_word) - 1),
        "binomial_reference_cross_degree": len(stable_cross) - 1,
        "binomial_reference_negative_axis_descartes_sign_word": (
            stable_reflected_word
        ),
        "binomial_reference_negative_axis_descartes_sign_changes": max(
            0, len(stable_reflected_word) - 1
        ),
        "constant_term_crossing_parameter": crossing_parameter(
            reserve[0], coefficient[0]
        ),
        "leading_term_crossing_parameter": crossing_parameter(
            reserve[-1], coefficient[-1]
        ),
        "penultimate_term_crossing_parameter": crossing_parameter(
            reserve[-2], coefficient[-2]
        ),
    }


def main() -> None:
    records = []
    for path_string in DEFAULT_PATHS:
        path = Path(path_string)
        data = json.loads(path.read_text(encoding="utf-8"))
        candidates = [data["record"]] if "record" in data else data.get("records", [])
        records.extend(
            audit(record, path.name)
            for record in candidates
            if "ell_values" in record and "reserve_values" in record
        )
    histogram = {}
    binomial_histogram = {}
    for record in records:
        changes = str(record["negative_axis_descartes_sign_changes"])
        histogram[changes] = histogram.get(changes, 0) + 1
        binomial_changes = str(
            record["binomial_reference_negative_axis_descartes_sign_changes"]
        )
        binomial_histogram[binomial_changes] = (
            binomial_histogram.get(binomial_changes, 0) + 1
        )
    report = {
        "status": "ORIGINAL_RESERVE_PENCIL_CROSSING_AUDIT",
        "case_count": len(records),
        "negative_axis_descartes_change_histogram": histogram,
        "binomial_reference_negative_axis_descartes_change_histogram": (
            binomial_histogram
        ),
        "maximum_negative_axis_descartes_sign_changes": max(
            record["negative_axis_descartes_sign_changes"] for record in records
        ),
        "maximum_binomial_reference_negative_axis_descartes_sign_changes": max(
            record["binomial_reference_negative_axis_descartes_sign_changes"]
            for record in records
        ),
        "records": records,
        "warning": (
            "Finite exact coefficient evidence. Descartes bounds candidate "
            "negative roots but does not determine whether their pencil "
            "parameters lie in (0,1)."
        ),
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
