#!/usr/bin/env python3
"""Inspect exact polynomial factors of the six grouped base kernels."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_group_grouped_tail_symbolic import (
    add,
    load_kernel,
    multiply_v,
    shift_parameters,
)


z, w, C, M, x = sp.symbols("z w C M x")


def to_expr(source: dict[tuple[int, int, int, int, int], int]) -> sp.Expr:
    return sp.Add(
        *(
            coefficient * z**pz * w**pw * C**pc * M**pm * x**px
            for (pz, pw, pc, pm, px), coefficient in source.items()
        )
    )


def main() -> None:
    data = json.loads(
        Path(
            "path_isolate_p4_group_coordinate_generating_numerators_20260801.json"
        ).read_text(encoding="utf-8")
    )
    records = []
    candidates = {
        "q": z * w,
        "e1": z + w,
        "p2": z**2 + w**2,
        "A": (1 + z) * (1 + w),
        "W": z + w + z * w,
        "S": z**2 + w**2 + z * w * (z + w),
        "1+e1": 1 + z + w,
    }
    for parity_item in data["parities"]:
        parity = parity_item["parity_epsilon"]
        for coordinate, package in parity_item["recurrences"].items():
            kernels = package["coefficients"]
            maximum = len(kernels) - 1
            base = {}
            for record in kernels:
                order = record["numerator_order"]
                value = multiply_v(load_kernel(record), maximum - order)
                base = add(base, value, maximum - order + 1)
            shifted = shift_parameters(base, 1, 3)
            expression = to_expr(shifted)
            poly = sp.Poly(expression, z, w, C, M, x)
            divisors = []
            for name, candidate in candidates.items():
                _, remainder = sp.div(
                    poly,
                    sp.Poly(candidate, z, w, C, M, x),
                )
                if remainder.is_zero:
                    divisors.append(name)
            content, primitive = sp.Poly(expression, z, w, C, M, x).primitive()
            records.append(
                {
                    "parity_epsilon": parity,
                    "coordinate": coordinate,
                    "term_count": len(poly.terms()),
                    "content": int(content),
                    "candidate_divisors": divisors,
                }
            )
            print(parity, coordinate, divisors, flush=True)
    report = {"status": "ANALYSIS", "records": records}
    Path("path_isolate_p4_group_base_factors_20260801.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
