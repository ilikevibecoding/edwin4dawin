#!/usr/bin/env python3
"""Probe all nearby reserve shifts on the three fixed-drop-four failures."""

from __future__ import annotations

import json
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
DROP4_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "wide_target_drop4_reserve_nyquist_20260802.json"
)
OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "drop4_failures_all_neighbor_reserves_probe_20260802.json"
)


def probe(record: dict) -> dict:
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
    shifts = []
    for h in range(0, min(8, r) + 1):
        reserve = aggregate(
            source, a, b, r - h, diagonal_target - h,
            c_value, m_value, x_value,
        )
        reference = multiply_binomial(reserve, h)
        shifts.append({"h": h, **cross_summary(target_values, reference)})
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "shifts": shifts,
    }


def main() -> None:
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    drop4 = json.loads(DROP4_PATH.read_text(encoding="utf-8"))
    failed_keys = {
        (x["package"], x["parity"], x["coordinate"], x.get("c"), x["m"], x["x"], x["r"])
        for x in drop4["records"] if x["descartes_sign_changes"] > 1
    }
    selected = [
        x for x in source["records"]
        if (x["package"], x["parity"], x["coordinate"], x.get("c"), x["m"], x["x"], x["r"])
        in failed_keys
    ]
    report = {"case_count": len(selected), "records": [probe(x) for x in selected]}
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
