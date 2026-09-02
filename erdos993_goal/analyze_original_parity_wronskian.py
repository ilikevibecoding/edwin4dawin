#!/usr/bin/env python3
"""Audit coefficient signs of the parity Wronskian on the negative axis."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    DEFAULT_PATHS,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_original_reserve_differential_module import (
    reconstruct,
)


def derivative(values: list[int]) -> list[int]:
    return [(j + 1) * values[j + 1] for j in range(len(values) - 1)]


def product(left: list[int], right: list[int]) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for j, a in enumerate(left):
        for k, b in enumerate(right):
            result[j + k] += a * b
    return result


def subtract(left: list[int], right: list[int]) -> list[int]:
    length = max(len(left), len(right))
    result = [0] * length
    for j in range(length):
        result[j] = (left[j] if j < len(left) else 0) - (
            right[j] if j < len(right) else 0
        )
    while result and result[-1] == 0:
        result.pop()
    return result


def word(values: list[int]) -> list[int]:
    result = []
    for value in values:
        current = 1 if value > 0 else -1 if value < 0 else 0
        if current and (not result or result[-1] != current):
            result.append(current)
    return result


def audit(record: dict, source: str) -> dict:
    coefficient, _ = reconstruct(record)
    order = len(coefficient) - 1
    ulc_failures = [
        j for j in range(1, order)
        if j * (order - j) * coefficient[j] ** 2
        < (j + 1) * (order - j + 1)
        * coefficient[j - 1] * coefficient[j + 1]
    ]
    even = coefficient[0::2]
    odd = coefficient[1::2]
    # W=E'O-EO'; its sign is immaterial, constancy on u<0 is the target.
    wronskian = subtract(product(derivative(even), odd), product(even, derivative(odd)))
    reflected = [value if j % 2 == 0 else -value for j, value in enumerate(wronskian)]
    even_odd = product(even, odd)
    phase = list(even_odd)
    if len(phase) < len(wronskian) + 1:
        phase.extend([0] * (len(wronskian) + 1 - len(phase)))
    for j, value in enumerate(wronskian):
        phase[j + 1] -= 2 * value
    while phase and phase[-1] == 0:
        phase.pop()
    reflected_phase = [
        value if j % 2 == 0 else -value
        for j, value in enumerate(phase)
    ]
    return {
        "source": source,
        "package": record.get("package"),
        "coordinate": record.get("coordinate"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": int(record["r"]),
        "original_signed_ulc_failure_count": len(ulc_failures),
        "original_signed_ulc_first_failures": ulc_failures[:10],
        "wronskian_degree": len(wronskian) - 1,
        "reflected_coefficient_sign_word": word(reflected),
        "reflected_nonzero_coefficients_same_sign": len(word(reflected)) <= 1,
        "reflected_zero_count": sum(value == 0 for value in reflected),
        "reflected_phase_coefficient_sign_word": word(reflected_phase),
        "reflected_phase_nonzero_coefficients_same_sign": (
            len(word(reflected_phase)) <= 1
        ),
        "reflected_phase_zero_count": sum(value == 0 for value in reflected_phase),
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
    report = {
        "status": (
            "PASS_REFLECTED_PHASE_COEFFICIENT_SIGN"
            if all(
                r["reflected_phase_nonzero_coefficients_same_sign"]
                for r in records
            )
            else "REFLECTED_PHASE_COEFFICIENT_SIGN_FAILS"
        ),
        "case_count": len(records),
        "records": records,
        "warning": "Finite saved cases only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_parity_wronskian_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
