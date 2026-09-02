#!/usr/bin/env python3
"""Certify positive-root counts for the exceptional h=3 and h=4 crosses."""

from __future__ import annotations

import json
from pathlib import Path

from flint import ctx, fmpz_poly

from analyze_wide_phase_polynomial_positivity import original_coefficients
from analyze_wide_target_blended_reserve_nyquist import reflected_cross
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
    "neighbor_reserve_cross_positive_roots_20260802.json"
)
REQUESTS = {
    ("group", 12, 96, 12, 4),
    ("bottom", 12, 96, 12, 4),
    ("bottom", 24, 192, 24, 4),
    ("group", 36, 288, 72, 3),
    ("bottom", 36, 288, 72, 3),
}


def audit(record: dict, h: int) -> dict:
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
        source, a, b, r - h, diagonal_target - h,
        c_value, m_value, x_value,
    )
    reference = multiply_binomial(reserve, h)
    reflected = reflected_cross(target_values, reference)
    positive = negative = zero = nonreal = 0
    for root, multiplicity in fmpz_poly(reflected).complex_roots():
        if root.imag.is_zero():
            if root.real > 0:
                positive += multiplicity
            elif root.real < 0:
                negative += multiplicity
            else:
                zero += multiplicity
        else:
            nonreal += multiplicity
    return {
        "package": package,
        "m": m_value,
        "x": x_value,
        "r": r,
        "order_drop": h,
        "cross_degree": len(reflected) - 1,
        "positive_root_count": positive,
        "negative_root_count": negative,
        "zero_root_count": zero,
        "nonreal_root_count": nonreal,
    }


def main() -> None:
    ctx.prec = 120
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    records = []
    for record in source["records"]:
        for h in (3, 4):
            key = (record["package"], record["m"], record["x"], record["r"], h)
            if key in REQUESTS:
                records.append(audit(record, h))
    report = {"status": "NEIGHBOR_RESERVE_CROSS_ROOT_ISOLATION", "records": records}
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
