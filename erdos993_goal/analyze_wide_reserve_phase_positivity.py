#!/usr/bin/env python3
"""Audit imaginary-axis phase monotonicity of the positive reserve.

For R(t)=E(t^2)+tO(t^2), the reflected phase numerator

  M_R(x) = M(-x),  M(u)=EO-2u(E'O-EO'),

satisfies d arg R(iw)/dw=M_R(w^2)/|R(iw)|^2.  Positive coefficients
of M_R give an exact no-imaginary-axis-root certificate.  This is not,
by itself, a Hurwitz certificate; it is intended for a later homotopy.
"""

from __future__ import annotations

import json
from pathlib import Path

from analyze_wide_phase_polynomial_positivity import phase_polynomial
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
    "wide_reserve_phase_positivity_20260802.json"
)


def audit(record: dict) -> dict:
    package = record["package"]
    parity = int(record["parity"])
    coordinate = record["coordinate"]
    c_value = int(record["c"] or 0)
    m_value = int(record["m"])
    x_value = int(record["x"])
    r = int(record["r"])
    _, reserve_source = reduced_sources(package, parity, coordinate)
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
    reserve = aggregate(
        reserve_source, a, reduced_b, r, target,
        c_value, m_value, x_value,
    )
    phase = phase_polynomial(reserve)
    return {
        "grid": record.get("grid"),
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "reserve_degree": len(reserve) - 1,
        "phase_degree": len(phase) - 1,
        "phase_negative_coefficient_count": sum(value < 0 for value in phase),
        "phase_zero_coefficient_count": sum(value == 0 for value in phase),
        "phase_strictly_coefficient_positive": all(value > 0 for value in phase),
    }


def main() -> None:
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    records = [audit(record) for record in source["records"]]
    failures = [
        record for record in records
        if not record["phase_strictly_coefficient_positive"]
    ]
    report = {
        "status": (
            "PASS_WIDE_RESERVE_PHASE_COEFFICIENT_POSITIVITY"
            if not failures else "WIDE_RESERVE_PHASE_COEFFICIENT_FAILURE"
        ),
        "case_count": len(records),
        "failure_count": len(failures),
        "records": records,
        "warning": (
            "Finite exact coefficient evidence. Phase positivity excludes "
            "imaginary roots but requires a homotopy base to prove index zero."
        ),
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
