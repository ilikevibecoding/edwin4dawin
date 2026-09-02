#!/usr/bin/env python3
"""Test h=k+j layer positivity in the r=2m half-reserve quadrant."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_parameter_monotonicity_r2m_original_layer_positivity import (
    add_weighted,
    one_plus_power,
    quadrant_negatives,
    shifted,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
)
from probe_path_isolate_p4_affine_target_rows import multiply
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


def audit(case):
    package, parity, coordinate, c_value, m_value, x_value = case
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group" else bottom_increment(parity, coordinate)
    )
    source = to_sparse(d_expression + m_value * reserve_expression)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    r = 2 * m_value
    source_degree = max(max(monomial[0], monomial[1]) for monomial in source)
    full_degree = a + 2 * b + r + source_degree
    lower = 3 * m_value + 5 + int(coordinate == "m")
    numeric_source = evaluate(source, c_value, m_value, x_value, full_degree)

    total = {}
    negative_positions = set()
    negative_layer_coefficients = 0
    layer_records = []
    for h in range(b + r + 1):
        factor = {}
        common_w = one_plus_power(a + b + r - h, 1)
        for k in range(max(0, h - r), min(b, h) + 1):
            j = h - k
            term = multiply(one_plus_power(a + k, 0), common_w, full_degree)
            term = shifted(term, h, b - k)
            add_weighted(factor, term, math.comb(b, k) * math.comb(r, j))
        layer = multiply(numeric_source, factor, full_degree)
        negatives = quadrant_negatives(layer, lower)
        negative_layer_coefficients += len(negatives)
        negative_positions.update(negatives)
        add_weighted(total, layer, 1)
        layer_records.append({"h": h, "negative_count": len(negatives)})
        print(package, "h", h, len(negatives), flush=True)
    total_negatives = quadrant_negatives(total, lower)
    return {
        "case": list(case),
        "a": a,
        "b": b,
        "r": r,
        "source_degree": source_degree,
        "full_degree": full_degree,
        "quadrant_lower": lower,
        "total_negative_count": len(total_negatives),
        "h_negative_layer_coefficient_count": negative_layer_coefficients,
        "h_position_with_negative_layer_count": len(negative_positions),
        "h_negative_position_offsets": [
            [i - lower, j - lower] for i, j in sorted(negative_positions)
        ],
        "layer_records": layer_records,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--m9-only", action="store_true")
    args = parser.parse_args()
    cases = [
        ("group", 0, "m", 1, 9, 18),
        ("bottom", 1, "x", 0, 9, 18),
    ]
    if not args.m9_only:
        cases.extend([
            ("group", 0, "m", 1, 12, 24),
            ("bottom", 1, "x", 0, 12, 24),
        ])
    records = []
    for case in cases:
        record = audit(case)
        records.append(record)
        print(json.dumps(record, indent=2), flush=True)
    report = {"status": "PROBE", "records": records}
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_r2m_"
        "h_layer_positivity_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
