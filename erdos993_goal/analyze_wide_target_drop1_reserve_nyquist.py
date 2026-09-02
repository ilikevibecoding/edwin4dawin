#!/usr/bin/env python3
"""Audit C_r against the fixed stable reference (1+t)^h R_{r-h}."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from analyze_wide_phase_polynomial_positivity import original_coefficients
from probe_exceptional_target_neighbor_reserve_crossings import (
    cross_summary,
    multiply_binomial,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import aggregate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


SOURCE_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "symmetric_pascal_valley_location_stress_20260802.json"
)
ORDER_DROP = int(sys.argv[1]) if len(sys.argv) > 1 else 1
OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    f"wide_target_drop{ORDER_DROP}_reserve_nyquist_20260802.json"
)


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
    reserve = aggregate(
        source, a, b, r - ORDER_DROP, diagonal_target - ORDER_DROP,
        c_value, m_value, x_value,
    )
    reference = multiply_binomial(reserve, ORDER_DROP)
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        **cross_summary(target_values, reference),
    }


def main() -> None:
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    records = [audit(record) for record in source["records"]]
    failures = [record for record in records if record["descartes_sign_changes"] > 1]
    histogram = {}
    for record in records:
        word = str(record["reflected_nonzero_sign_word"])
        histogram[word] = histogram.get(word, 0) + 1
    report = {
        "status": (
            f"PASS_WIDE_TARGET_DROP{ORDER_DROP}_RESERVE_ONE_CROSSING"
            if not failures else f"WIDE_TARGET_DROP{ORDER_DROP}_RESERVE_ONE_CROSSING_FAILURE"
        ),
        "case_count": len(records),
        "failure_count": len(failures),
        "sign_word_histogram": histogram,
        "records": records,
        "warning": "Finite exact coefficient evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
