#!/usr/bin/env python3
"""Audit target against positive blends of drop-three and drop-four reserves."""

from __future__ import annotations

from fractions import Fraction
import json
from pathlib import Path

from analyze_original_reserve_pencil_crossings import product, subtract
from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    nonzero_sign_word,
)
from analyze_wide_phase_polynomial_positivity import original_coefficients
from probe_exceptional_target_neighbor_reserve_crossings import multiply_binomial
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import aggregate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


SOURCE_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "symmetric_pascal_valley_location_stress_20260802.json"
)
OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "wide_target_blended_reserve_nyquist_20260802.json"
)
WEIGHTS = [
    Fraction(1, 16), Fraction(1, 8), Fraction(1, 4), Fraction(1, 2),
    Fraction(1), Fraction(2), Fraction(4), Fraction(8), Fraction(16),
]


def reflected_cross(target: list[int], reference: list[int]) -> list[int]:
    ce, co = target[0::2], target[1::2]
    re, ro = reference[0::2], reference[1::2]
    cross = subtract(product(ce, ro), product(co, re))
    return [value if j % 2 == 0 else -value for j, value in enumerate(cross)]


def sign_summary(values) -> dict:
    word = nonzero_sign_word(values)
    return {
        "reflected_nonzero_sign_word": word,
        "descartes_sign_changes": max(0, len(word) - 1),
        "negative_coefficient_count": sum(value < 0 for value in values),
    }


def audit(record: dict) -> dict:
    package = record["package"]
    parity = int(record["parity"])
    coordinate = record["coordinate"]
    c_value = int(record.get("c") or 0)
    m_value = int(record["m"])
    x_value = int(record["x"])
    r = int(record["r"])
    target_values = original_coefficients(record)
    _, source = reduced_sources(package, parity, coordinate)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 1
        if package == "group" else 2 * m_value + parity - 2
    )
    diagonal_target = m_value + r + 5 + int(coordinate == "m")
    if package == "bottom":
        diagonal_target -= 2
    references = {}
    crosses = {}
    for h in (3, 4):
        reserve = aggregate(
            source, a, b, r - h, diagonal_target - h,
            c_value, m_value, x_value,
        )
        references[h] = multiply_binomial(reserve, h)
        crosses[h] = reflected_cross(target_values, references[h])
    tests = []
    for weight in WEIGHTS:
        common_denominator = weight.denominator
        combined = [
            common_denominator * (crosses[3][j] if j < len(crosses[3]) else 0)
            + weight.numerator * (crosses[4][j] if j < len(crosses[4]) else 0)
            for j in range(max(len(crosses[3]), len(crosses[4])))
        ]
        tests.append({
            "drop4_weight": str(weight),
            **sign_summary(combined),
        })
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "tests": tests,
    }


def main() -> None:
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    records = [audit(record) for record in source["records"]]
    failures_by_weight = {}
    histograms_by_weight = {}
    for weight in WEIGHTS:
        label = str(weight)
        tests = [next(x for x in record["tests"] if x["drop4_weight"] == label) for record in records]
        failures_by_weight[label] = sum(x["descartes_sign_changes"] > 1 for x in tests)
        histogram = {}
        for test in tests:
            word = str(test["reflected_nonzero_sign_word"])
            histogram[word] = histogram.get(word, 0) + 1
        histograms_by_weight[label] = histogram
    universal = [label for label, count in failures_by_weight.items() if count == 0]
    report = {
        "status": (
            "PASS_WIDE_TARGET_BLENDED_RESERVE_ONE_CROSSING"
            if universal else "WIDE_TARGET_BLENDED_RESERVE_ONE_CROSSING_FAILURE"
        ),
        "case_count": len(records),
        "universal_weights": universal,
        "failures_by_weight": failures_by_weight,
        "histograms_by_weight": histograms_by_weight,
        "records": records,
        "warning": "Finite exact coefficient evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
