#!/usr/bin/env python3
"""Compare parity leading-cancelled remainders with order-(r-2) reserves."""

from __future__ import annotations

from fractions import Fraction
import json
from pathlib import Path

from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    DEFAULT_PATHS,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_original_reserve_differential_module import (
    reconstruct,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import aggregate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


def leading_cancelled(original, reserve):
    result = [
        original[j] * reserve[-1] - reserve[j] * original[-1]
        for j in range(len(original))
    ]
    while result and result[-1] == 0:
        result.pop()
    return result


def proportional(left, right):
    if len(left) != len(right):
        return False
    pivot = next((j for j, value in enumerate(right) if value), None)
    if pivot is None or left[pivot] == 0:
        return False
    return all(
        left[j] * right[pivot] == right[j] * left[pivot]
        for j in range(len(left))
    )


def ratio_polynomial_degree(left, right, maximum_degree=12):
    if len(left) != len(right) or any(value == 0 for value in right):
        return None
    values = [Fraction(a, b) for a, b in zip(left, right)]
    for degree in range(maximum_degree + 1):
        if len(values) <= 1 or all(value == values[0] for value in values):
            return degree
        values = [values[j + 1] - values[j] for j in range(len(values) - 1)]
    return None


def audit(record, source):
    coefficient, reserve = reconstruct(record)
    package = record["package"]
    parity = int(record["parity"])
    coordinate = record["coordinate"]
    c_value = int(record.get("c") or 0)
    m_value = int(record["m"])
    x_value = int(record["x"])
    r = int(record["r"])
    _, reserve_source = reduced_sources(package, parity, coordinate)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    reduced_b = (
        2 * m_value + parity - 1
        if package == "group" else 2 * m_value + parity - 2
    )
    current_target = m_value + r + 5 + int(coordinate == "m")
    if package == "bottom":
        current_target -= 2
    neighbor_by_delta = {
        target_delta: aggregate(
            reserve_source, a, reduced_b, r - 2,
            current_target + target_delta,
            c_value, m_value, x_value,
        )
        for target_delta in (-2, 0)
    }
    parts = {}
    for parity_class in (0, 1):
        remainder = leading_cancelled(
            coefficient[parity_class::2], reserve[parity_class::2]
        )
        tests = []
        for target_delta, neighbor_full in neighbor_by_delta.items():
            neighbor = neighbor_full[parity_class::2]
            tests.append({
                "target_delta": target_delta,
                "neighbor_length": len(neighbor),
                "proportional": proportional(remainder, neighbor),
                "coefficient_ratio_polynomial_degree_at_most_12": (
                    ratio_polynomial_degree(remainder, neighbor)
                ),
            })
        parts[str(parity_class)] = {
            "remainder_length": len(remainder),
            "tests": tests,
        }
    return {
        "source": source,
        "package": package,
        "coordinate": coordinate,
        "m": m_value,
        "x": x_value,
        "r": r,
        "parts": parts,
    }


def main() -> None:
    available = []
    for path_string in DEFAULT_PATHS:
        path = Path(path_string)
        data = json.loads(path.read_text(encoding="utf-8"))
        candidates = [data["record"]] if "record" in data else data.get("records", [])
        available.extend(
            (record, path.name)
            for record in candidates
            if "ell_values" in record and "reserve_values" in record
        )
    selected = [available[index] for index in (1, 0, 2)]
    records = [audit(record, source) for record, source in selected]
    report = {
        "status": "LEADING_CANCELLED_NEIGHBOR_RESERVE_PROBE",
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "leading_cancelled_neighbor_reserve_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
