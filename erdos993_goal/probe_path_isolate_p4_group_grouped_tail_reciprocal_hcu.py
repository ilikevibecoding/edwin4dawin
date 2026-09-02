#!/usr/bin/env python3
"""Probe global HCU of reciprocals of the two grouped tail kernels."""

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
)
from probe_path_isolate_p4_group_finite_kernel_target_cone import evaluate_kernel


def scale(source: PolyDict, scalar: int) -> PolyDict:
    return {key: scalar * value for key, value in source.items() if scalar * value}


def global_hcu(source: PolyDict) -> dict:
    rows: dict[int, dict[int, int]] = {}
    first_failure = None
    minimum = None
    checks = 0
    for (pz, pw), coefficient in source.items():
        rows.setdefault(pz + pw, {})[pz] = coefficient
    for degree in sorted(rows):
        row = rows[degree]
        previous = 0
        for pz in range(degree // 2 + 1):
            current = row.get(pz, 0)
            difference = current - previous
            checks += 1
            record = {
                "degree": degree,
                "edge_index": pz,
                "difference": difference,
                "coefficient": current,
                "previous": previous,
            }
            if minimum is None or difference < minimum["difference"]:
                minimum = record
            if difference < 0 and first_failure is None:
                first_failure = record
            previous = current
    return {
        "hcu": first_failure is None,
        "checks": checks,
        "minimum": minimum,
        "first_failure": first_failure,
    }


def reciprocal(source: PolyDict) -> tuple[PolyDict, int]:
    degree_z = max(pz for pz, _ in source)
    degree_w = max(pw for _, pw in source)
    assert degree_z == degree_w
    degree = degree_z
    result = {(degree - pz, degree - pw): value for (pz, pw), value in source.items()}
    return result, degree


def main() -> None:
    data = json.loads(
        Path(
            "path_isolate_p4_group_coordinate_generating_numerators_20260801.json"
        ).read_text(encoding="utf-8")
    )
    records = []
    cap = 100
    for parity_item in data["parities"]:
        parity = parity_item["parity_epsilon"]
        for coordinate, package in parity_item["recurrences"].items():
            kernels = package["coefficients"]
            maximum = len(kernels) - 1
            for c_value, m_value, x_value in ((1, 3, 0), (1, 3, 4)):
                p_kernel: PolyDict = {}
                base_kernel: PolyDict = {}
                for kernel in kernels:
                    j = kernel["numerator_order"]
                    source = evaluate_kernel(kernel, c_value, m_value, x_value, cap)
                    source = multiply(source, power(V, maximum - j, cap), cap)
                    p_kernel = add(p_kernel, source)
                    base_kernel = add(base_kernel, scale(source, maximum - j + 1))
                exponent_a = 2 * c_value + m_value + x_value - 3
                exponent_t = 2 * m_value + parity - 4
                for kind, source in (("P", p_kernel), ("base", base_kernel)):
                    source = multiply(source, power(A, exponent_a, cap), cap)
                    source = multiply(source, power(T, exponent_t, cap), cap)
                    reversed_source, bidegree = reciprocal(source)
                    reciprocal_v = {(1, 0): 1, (0, 1): 1, (1, 1): 1}
                    for tail in range(21):
                        elevated = multiply(
                            reversed_source,
                            power(reciprocal_v, tail, cap),
                            cap,
                        )
                        result = global_hcu(elevated)
                        records.append(
                            {
                                "parity_epsilon": parity,
                                "coordinate": coordinate,
                                "kind": kind,
                                "c": c_value,
                                "m": m_value,
                                "x": x_value,
                                "tail": tail,
                                "bidegree": bidegree + tail,
                                **result,
                            }
                        )
    failures = [record for record in records if not record["hcu"]]
    report = {
        "status": "PROBE",
        "reciprocal_tail_identity": (
            "z^(D+r)w^(D+r)(V^r F)(1/z,1/w)=(z+w+zw)^r F^vee"
        ),
        "case_count": len(records),
        "hcu_count": len(records) - len(failures),
        "failure_count": len(failures),
        "first_failures": failures[:30],
        "minimum_record": min(records, key=lambda item: item["minimum"]["difference"]),
    }
    Path("path_isolate_p4_group_grouped_tail_reciprocal_hcu_probe_20260801.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
