#!/usr/bin/env python3
"""Stress the proposed order induction proving reserve Hurwitz stability.

For each degree-r reserve R_r, form S_r=(1+t)R_{r-1}.  The original
certificate asked that

  K_r(x) = [E_r O_{S_r} - O_r E_{S_r}](-x)

have positive coefficients.  The corrected certificate permits one sign
transition in K_r and also checks coefficient positivity of the real-part
numerator.  Then every real-axis crossing of the ratio is on the positive
ray, so its winding number is still zero.
"""

from __future__ import annotations

import json
from pathlib import Path

from analyze_original_reserve_pencil_crossings import product, subtract
from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    nonzero_sign_word,
)
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
    "wide_reserve_order_nyquist_induction_20260802.json"
)


def multiply_one_plus_t(values: list[int]) -> list[int]:
    return [
        (values[j] if j < len(values) else 0)
        + (values[j - 1] if j else 0)
        for j in range(len(values) + 1)
    ]


def add(left: list[int], right: list[int]) -> list[int]:
    return [
        (left[j] if j < len(left) else 0)
        + (right[j] if j < len(right) else 0)
        for j in range(max(len(left), len(right)))
    ]


def reflect(values: list[int]) -> list[int]:
    return [value if j % 2 == 0 else -value for j, value in enumerate(values)]


def audit(record: dict) -> dict:
    package = record["package"]
    parity = int(record["parity"])
    coordinate = record["coordinate"]
    c_value = int(record.get("c") or 0)
    m_value = int(record["m"])
    x_value = int(record["x"])
    r = int(record["r"])
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
    current = aggregate(source, a, b, r, target, c_value, m_value, x_value)
    previous = aggregate(
        source, a, b, r - 1, target - 1,
        c_value, m_value, x_value,
    )
    reference = multiply_one_plus_t(previous)
    ce, co = current[0::2], current[1::2]
    re, ro = reference[0::2], reference[1::2]
    cross = subtract(product(ce, ro), product(co, re))
    reflected = reflect(cross)
    word = nonzero_sign_word(reflected)
    real_numerator = add(
        product(reflect(ce), reflect(re)),
        [0] + product(reflect(co), reflect(ro)),
    )
    real_word = nonzero_sign_word(real_numerator)
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "cross_degree": len(cross) - 1,
        "reflected_nonzero_sign_word": word,
        "reflected_negative_coefficient_count": sum(value < 0 for value in reflected),
        "reflected_zero_coefficient_count": sum(value == 0 for value in reflected),
        "reflected_strictly_coefficient_positive": all(value > 0 for value in reflected),
        "reflected_at_most_one_sign_transition": len(word) <= 2,
        "real_numerator_nonzero_sign_word": real_word,
        "real_numerator_negative_coefficient_count": sum(
            value < 0 for value in real_numerator
        ),
        "real_numerator_zero_coefficient_count": sum(
            value == 0 for value in real_numerator
        ),
        "real_numerator_strictly_coefficient_positive": all(
            value > 0 for value in real_numerator
        ),
        "positive_constant_endpoints": current[0] > 0 and reference[0] > 0,
        "positive_leading_endpoints": current[-1] > 0 and reference[-1] > 0,
    }


def main() -> None:
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    records = [audit(record) for record in source["records"]]
    failures = [
        record for record in records
        if not (
            record["reflected_at_most_one_sign_transition"]
            and record["real_numerator_strictly_coefficient_positive"]
            and record["positive_constant_endpoints"]
            and record["positive_leading_endpoints"]
        )
    ]
    report = {
        "status": (
            "PASS_WIDE_RESERVE_ORDER_ORIENTED_NYQUIST_INDUCTION"
            if not failures else "WIDE_RESERVE_ORDER_NYQUIST_INDUCTION_FAILURE"
        ),
        "case_count": len(records),
        "failure_count": len(failures),
        "records": records,
        "warning": "Finite exact coefficient evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
