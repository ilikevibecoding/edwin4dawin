#!/usr/bin/env python3
"""Probe the two grouped tail kernels P and (J+1)P-Q separately."""

from __future__ import annotations

import json
from pathlib import Path

from probe_path_isolate_p4_affine_target_rows import (
    A,
    T,
    V,
    PolyDict,
    add,
    multiply,
    power,
    target_row,
)
from probe_path_isolate_p4_group_finite_kernel_target_cone import evaluate_kernel


def scale(source: PolyDict, scalar: int) -> PolyDict:
    return {key: scalar * value for key, value in source.items() if scalar * value}


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
            maximum = len(kernels) - 1
            for c_value, m_value, x_value in ((1, 3, 0), (1, 3, 4)):
                exponent_a = 2 * c_value + m_value + x_value - 3
                exponent_t = 2 * m_value + parity - 4
                for tail in range(21):
                    order = maximum + tail
                    target = m_value + order + (5 if coordinate == "m" else 4)
                    # Preserve the complete homogeneous row of total degree
                    # 2*target.  Capping each variable at `target` would keep
                    # only the central monomial and make the HCU audit vacuous.
                    cap = 2 * target
                    p_kernel: PolyDict = {}
                    base_kernel: PolyDict = {}
                    for kernel in kernels:
                        j = kernel["numerator_order"]
                        source = evaluate_kernel(
                            kernel, c_value, m_value, x_value, cap
                        )
                        source = multiply(
                            source, power(V, maximum - j, cap), cap
                        )
                        p_kernel = add(p_kernel, source)
                        base_kernel = add(
                            base_kernel, scale(source, maximum - j + 1)
                        )
                    combined_kernel = add(base_kernel, scale(p_kernel, tail))
                    for kind, source in (
                        ("P", p_kernel),
                        ("base", base_kernel),
                        ("combined", combined_kernel),
                    ):
                        for factor, exponent in (
                            (A, exponent_a),
                            (T, exponent_t),
                            (V, tail),
                        ):
                            source = multiply(
                                source, power(factor, exponent, cap), cap
                            )
                        result = target_row(source, target)
                        records.append(
                            {
                                "parity_epsilon": parity,
                                "coordinate": coordinate,
                                "kind": kind,
                                "c": c_value,
                                "m": m_value,
                                "x": x_value,
                                "tail": tail,
                                "newton_order": order,
                                **result,
                            }
                        )
    negative = [record for record in records if record["central_coefficient"] < 0]
    non_hcu = [record for record in records if not record["hcu_at_target"]]
    report = {
        "status": "PROBE",
        "identity": "S_(J+r)=V^r*(base+r*P)",
        "case_count": len(records),
        "negative_central_count": len(negative),
        "non_hcu_target_row_count": len(non_hcu),
        "counts_by_kind": {
            kind: {
                "cases": sum(1 for record in records if record["kind"] == kind),
                "negative_central": sum(
                    1
                    for record in records
                    if record["kind"] == kind and record["central_coefficient"] < 0
                ),
                "non_hcu_target_row": sum(
                    1
                    for record in records
                    if record["kind"] == kind and not record["hcu_at_target"]
                ),
            }
            for kind in ("P", "base", "combined")
        },
        "first_negative": negative[:30],
        "first_non_hcu": non_hcu[:30],
        "minimum_central_record": min(records, key=lambda item: item["central_coefficient"]),
        "minimum_schur_record": min(records, key=lambda item: item["minimum_schur_coefficient"]),
    }
    Path("path_isolate_p4_group_grouped_tail_cone_probe_20260801.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
