#!/usr/bin/env python3
"""Probe each finite recurrence kernel separately in the moving target cone."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_affine_target_rows import (
    A,
    T,
    V,
    PolyDict,
    multiply,
    power,
    target_row,
)


def evaluate_kernel(record: dict, c: int, m: int, x: int, target: int) -> PolyDict:
    result: PolyDict = {}
    for item in record["terms"]:
        pz, pw, pc, pm, px = item["monomial_z_w_c_m_x"]
        if pz > target or pw > target or pz + pw > 2 * target:
            continue
        coefficient = int(item["coefficient"]) * c**pc * m**pm * x**px
        if coefficient:
            result[(pz, pw)] = result.get((pz, pw), 0) + coefficient
    return {key: value for key, value in result.items() if value}


def main() -> None:
    data = json.loads(
        Path(
            "path_isolate_p4_group_coordinate_generating_numerators_20260801.json"
        ).read_text(encoding="utf-8")
    )
    records = []
    for parity_item in data["parities"]:
        parity = parity_item["parity_epsilon"]
        for coordinate, package in parity_item["recurrences"].items():
            kernels = package["coefficients"]
            for c_value, m_value, x_value in ((1, 3, 0), (1, 3, 4)):
                exponent_a = 2 * c_value + m_value + x_value - 3
                exponent_t = 2 * m_value + parity - 4
                for order in range(21):
                    target = m_value + order + (5 if coordinate == "m" else 4)
                    for kernel in kernels:
                        numerator_order = kernel["numerator_order"]
                        if numerator_order > order:
                            continue
                        source = evaluate_kernel(
                            kernel, c_value, m_value, x_value, target
                        )
                        for factor, exponent in (
                            (A, exponent_a),
                            (T, exponent_t),
                            (V, order - numerator_order),
                        ):
                            source = multiply(
                                source, power(factor, exponent, target), target
                            )
                        result = target_row(source, target)
                        records.append(
                            {
                                "parity_epsilon": parity,
                                "coordinate": coordinate,
                                "c": c_value,
                                "m": m_value,
                                "x": x_value,
                                "newton_order": order,
                                "numerator_order": numerator_order,
                                **result,
                            }
                        )

    negative = [record for record in records if record["central_coefficient"] < 0]
    non_hcu = [record for record in records if not record["hcu_at_target"]]
    report = {
        "status": "PROBE",
        "case_count": len(records),
        "negative_central_count": len(negative),
        "non_hcu_target_row_count": len(non_hcu),
        "first_negative": negative[:30],
        "first_non_hcu": non_hcu[:30],
        "minimum_central_record": min(records, key=lambda item: item["central_coefficient"]),
        "minimum_schur_record": min(records, key=lambda item: item["minimum_schur_coefficient"]),
    }
    Path("path_isolate_p4_group_finite_kernel_target_cone_probe_20260801.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
