#!/usr/bin/env python3
"""Search positive-real target references with a fixed index-two quadratic."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_original_reserve_pencil_crossings import product
from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    nonzero_sign_word,
)
from analyze_wide_phase_polynomial_positivity import original_coefficients
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
    "wide_target_quadratic_defect_reserve_20260802.json"
)
QUADRATICS = {
    "1-t+t2": [1, -1, 1],
    "(1-t)^2": [1, -2, 1],
    "2-2t+t2": [2, -2, 1],
    "1-2t+2t2": [1, -2, 2],
    "1-t+2t2": [1, -1, 2],
    "2-t+t2": [2, -1, 1],
    "1-3t+3t2": [1, -3, 3],
    "3-3t+t2": [3, -3, 1],
}


def convolve(left: list[int], right: list[int]):
    values = [0] * (len(left) + len(right) - 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            values[i + j] += x * y
    return values


def reflect(values: list[int]):
    return [value if j % 2 == 0 else -value for j, value in enumerate(values)]


def real_numerator(left: list[int], right: list[int]):
    even = product(reflect(left[0::2]), reflect(right[0::2]))
    odd = product(reflect(left[1::2]), reflect(right[1::2]))
    return [
        (even[j] if j < len(even) else 0)
        + (odd[j - 1] if 0 <= j - 1 < len(odd) else 0)
        for j in range(max(len(even), len(odd) + 1))
    ]


def audit(record: dict):
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
    target = m_value + r + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2
    reserve = aggregate(
        source, a, b, r - 2, target - 2,
        c_value, m_value, x_value,
    )
    tests = []
    for name, quadratic in QUADRATICS.items():
        reference = convolve(reserve, quadratic)
        real = real_numerator(target_values, reference)
        tests.append({
            "quadratic": name,
            "real_nonzero_sign_word": nonzero_sign_word(real),
            "real_negative_coefficient_count": sum(value < 0 for value in real),
            "real_zero_coefficient_count": sum(value == 0 for value in real),
        })
    return {
        "package": package,
        "m": m_value,
        "x": x_value,
        "r": r,
        "tests": tests,
    }


def main() -> None:
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    records = [audit(record) for record in source["records"]]
    failures = {}
    for name in QUADRATICS:
        tests = [next(x for x in record["tests"] if x["quadratic"] == name) for record in records]
        failures[name] = sum(x["real_negative_coefficient_count"] > 0 for x in tests)
    universal = [name for name, count in failures.items() if count == 0]
    report = {
        "status": (
            "PASS_WIDE_TARGET_QUADRATIC_DEFECT_POSITIVE_REAL"
            if universal else "WIDE_TARGET_QUADRATIC_DEFECT_POSITIVE_REAL_FAILURE"
        ),
        "case_count": len(records),
        "universal_quadratics": universal,
        "negative_coefficient_failures": failures,
        "records": records,
        "warning": "Finite exact coefficient evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
