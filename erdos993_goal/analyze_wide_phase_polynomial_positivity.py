#!/usr/bin/env python3
"""Certify half-line positivity of the phase polynomial on wide-grid failures."""

from __future__ import annotations

import json
import math
from fractions import Fraction
from pathlib import Path

from flint import ctx

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
OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "wide_phase_polynomial_positivity_20260802.json"
)


def original_coefficients(record: dict) -> list[int]:
    package = record["package"]
    parity = record["parity"]
    coordinate = record["coordinate"]
    c_value = record["c"] if package == "group" else 0
    m_value, x_value, r = record["m"], record["x"], record["r"]
    ell_source, reserve_source = reduced_sources(package, parity, coordinate)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    original_b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    reduced_b = original_b + 3
    target = m_value + r + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2
    ell = aggregate(
        ell_source, a, reduced_b, r + 1, target,
        c_value, m_value, x_value,
    )
    reserve = aggregate(
        reserve_source, a, reduced_b, r, target,
        c_value, m_value, x_value,
    )
    numerator = [
        Fraction(-ell[j], math.comb(r + 1, j))
        + Fraction(-ell[j + 1], math.comb(r + 1, j + 1))
        for j in range(r + 1)
    ]
    reserve_unweighted = [
        Fraction(reserve[j], math.comb(r, j)) for j in range(r + 1)
    ]
    original = [
        math.comb(r, j)
        * ((r + 1) * reserve_unweighted[j] - numerator[j])
        for j in range(r + 1)
    ]
    assert all(value.denominator == 1 for value in original)
    return [int(value) for value in original]


def product(left: list[int], right: list[int]) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for j, left_value in enumerate(left):
        for k, right_value in enumerate(right):
            result[j + k] += left_value * right_value
    return result


def phase_polynomial(values: list[int]) -> list[int]:
    even, odd = values[0::2], values[1::2]
    even_prime = [(j + 1) * even[j + 1] for j in range(len(even) - 1)]
    odd_prime = [(j + 1) * odd[j + 1] for j in range(len(odd) - 1)]
    base = product(even, odd)
    left, right = product(even_prime, odd), product(even, odd_prime)
    result = base + [0] * max(0, len(left) + 1 - len(base))
    for j in range(max(len(left), len(right))):
        wronskian = (
            (left[j] if j < len(left) else 0)
            - (right[j] if j < len(right) else 0)
        )
        result[j + 1] -= 2 * wronskian
    while result and result[-1] == 0:
        result.pop()
    return [value if j % 2 == 0 else -value for j, value in enumerate(result)]


def audit(record: dict) -> dict:
    phase = phase_polynomial(original_coefficients(record))
    multiplied = list(phase)
    polya_degree = 0 if all(value > 0 for value in multiplied) else None
    for power in range(1, 10001):
        multiplied = [
            (multiplied[j] if j < len(multiplied) else 0)
            + (multiplied[j - 1] if j else 0)
            for j in range(len(multiplied) + 1)
        ]
        if all(value > 0 for value in multiplied):
            polya_degree = power
            break
    return {
        "package": record["package"],
        "m": record["m"],
        "x": record["x"],
        "r": record["r"],
        "degree": len(phase) - 1,
        "constant_sign": 1 if phase[0] > 0 else -1 if phase[0] < 0 else 0,
        "leading_sign": 1 if phase[-1] > 0 else -1 if phase[-1] < 0 else 0,
        "negative_coefficient_count": sum(value < 0 for value in phase),
        "least_found_one_plus_x_multiplier_degree": polya_degree,
        "strictly_positive_on_nonnegative_half_line": (
            polya_degree is not None
        ),
    }


def main() -> None:
    ctx.prec = 100
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    failures = [
        record for record in source["records"]
        if not record["parity_phase_numerator"][
            "strictly_coefficient_positive"
        ]
    ]
    records = [audit(record) for record in failures]
    report = {
        "status": (
            "PASS_WIDE_PHASE_POLYNOMIAL_HALF_LINE_POSITIVITY"
            if all(
                record["strictly_positive_on_nonnegative_half_line"]
                for record in records
            )
            else "WIDE_PHASE_POLYNOMIAL_HALF_LINE_POSITIVITY_FAILURE"
        ),
        "case_count": len(records),
        "records": records,
        "warning": "Finite Arb-certified root evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
