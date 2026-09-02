#!/usr/bin/env python3
"""Try neighboring-order stable reserves on the 10 two-crossing cases."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_original_reserve_pencil_crossings import product, subtract
from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    nonzero_sign_word,
)
from analyze_wide_phase_polynomial_positivity import original_coefficients
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    aggregate,
)
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


SOURCE_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "symmetric_pascal_valley_location_stress_20260802.json"
)
CROSS_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "wide_target_reserve_nyquist_crossings_20260802.json"
)
OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "exceptional_target_neighbor_reserve_crossings_probe_20260802.json"
)


def multiply_binomial(values: list[int], power: int) -> list[int]:
    result = list(values)
    for _ in range(power):
        result = [
            (result[j] if j < len(result) else 0)
            + (result[j - 1] if j else 0)
            for j in range(len(result) + 1)
        ]
    return result


def cross_summary(target: list[int], reference: list[int]) -> dict:
    ce, co = target[0::2], target[1::2]
    re, ro = reference[0::2], reference[1::2]
    cross = subtract(product(ce, ro), product(co, re))
    reflected = [value if j % 2 == 0 else -value for j, value in enumerate(cross)]
    word = nonzero_sign_word(reflected)
    return {
        "reflected_nonzero_sign_word": word,
        "descartes_sign_changes": max(0, len(word) - 1),
        "negative_coefficient_count": sum(value < 0 for value in reflected),
    }


def key(record: dict) -> tuple:
    return (
        record["package"], int(record["parity"]), record["coordinate"],
        int(record.get("c") or 0), int(record["m"]), int(record["x"]),
        int(record["r"]),
    )


def audit(record: dict) -> dict:
    package, parity, coordinate, c_value, m_value, x_value, r = key(record)
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
    current_target = m_value + r + 5 + int(coordinate == "m")
    if package == "bottom":
        current_target -= 2
    tests = []
    for drop in range(7):
        reserve = aggregate(
            source, a, b, r - drop, current_target - drop,
            c_value, m_value, x_value,
        )
        reference = multiply_binomial(reserve, drop)
        tests.append({"order_drop": drop, **cross_summary(target_values, reference)})
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "minimum_descartes_sign_changes": min(
            test["descartes_sign_changes"] for test in tests
        ),
        "tests": tests,
    }


def main() -> None:
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    old = json.loads(CROSS_PATH.read_text(encoding="utf-8"))
    exceptional = {
        key(record) for record in old["records"]
        if record["descartes_sign_changes"] > 1
    }
    records = [audit(record) for record in source["records"] if key(record) in exceptional]
    report = {
        "status": "EXCEPTIONAL_TARGET_NEIGHBOR_RESERVE_CROSSING_PROBE",
        "case_count": len(records),
        "all_have_one_crossing_reference": all(
            record["minimum_descartes_sign_changes"] <= 1 for record in records
        ),
        "records": records,
        "warning": "Finite exact coefficient evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
