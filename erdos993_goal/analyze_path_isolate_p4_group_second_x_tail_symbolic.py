#!/usr/bin/env python3
"""Analyze grouped tails after a second strong x increment."""

from __future__ import annotations

import json
import math
from pathlib import Path

from analyze_path_isolate_p4_group_grouped_tail_symbolic import (
    Sparse,
    add,
    divisible_by_e1,
    divide_by_e1,
    hcu_audit,
    load_kernel,
    multiply_v,
    paired_cone_audit,
    reciprocal,
    shift_parameters,
)


def shift_x(source: Sparse) -> Sparse:
    result: Sparse = {}
    for (pz, pw, pc, pm, px), value in source.items():
        for new_x in range(px + 1):
            key = (pz, pw, pc, pm, new_x)
            result[key] = result.get(key, 0) + value * math.comb(px, new_x)
    return {key: value for key, value in result.items() if value}


def multiply_a(source: Sparse) -> Sparse:
    result: Sparse = {}
    for (pz, pw, pc, pm, px), value in source.items():
        for dz, dw in ((0, 0), (1, 0), (0, 1), (1, 1)):
            key = (pz + dz, pw + dw, pc, pm, px)
            result[key] = result.get(key, 0) + value
    return {key: value for key, value in result.items() if value}


def analyze(source: Sparse) -> dict:
    reversed_source, bidegree = reciprocal(source)
    shifted = shift_parameters(reversed_source, 1, 3)
    hcu = hcu_audit(shifted)
    e1 = divisible_by_e1(shifted)
    result = {
        "bidegree": bidegree,
        "term_count": len(shifted),
        "ordinary_negative_term_count": sum(
            1 for value in shifted.values() if value < 0
        ),
        "hcu": hcu,
        "divisible_by_e1": e1,
    }
    if e1:
        quotient = divide_by_e1(shifted)
        result["e1_quotient_hcu"] = hcu_audit(quotient)
        result["e1_quotient_paired_cone"] = paired_cone_audit(quotient)
    return result


def main() -> None:
    data = json.loads(
        Path(
            "path_isolate_p4_group_coordinate_generating_numerators_20260801.json"
        ).read_text(encoding="utf-8")
    )
    records = []
    for parity_item in data["parities"]:
        parity = parity_item["parity_epsilon"]
        for primary_coordinate, package in parity_item["recurrences"].items():
            kernels = package["coefficients"]
            maximum = len(kernels) - 1
            increment_kernels = []
            for record in kernels:
                source = load_kernel(record)
                increment_kernels.append((record["numerator_order"], source))
            for increment_depth in range(1, 5):
                increment_kernels = [
                    (
                        order,
                        add(multiply_a(shift_x(source)), source, -1),
                    )
                    for order, source in increment_kernels
                ]
                p_kernel: Sparse = {}
                base_kernel: Sparse = {}
                for order, source in increment_kernels:
                    value = multiply_v(source, maximum - order)
                    p_kernel = add(p_kernel, value)
                    base_kernel = add(
                        base_kernel, value, maximum - order + 1
                    )
                for kind, source in (("P", p_kernel), ("base", base_kernel)):
                    records.append(
                        {
                            "parity_epsilon": parity,
                            "primary_coordinate": primary_coordinate,
                            "secondary_coordinate": "x",
                            "increment_depth": increment_depth,
                            "kind": kind,
                            **analyze(source),
                        }
                    )
    report = {"status": "ANALYSIS", "records": records}
    Path(
        "path_isolate_p4_group_second_x_tail_symbolic_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
