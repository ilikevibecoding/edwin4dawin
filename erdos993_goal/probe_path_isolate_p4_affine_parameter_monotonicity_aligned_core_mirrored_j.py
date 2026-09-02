#!/usr/bin/env python3
"""Check whether the mirrored V-layer split removes two-axis obstructions."""

from __future__ import annotations

import json
import math
from pathlib import Path

from probe_path_isolate_p4_affine_parameter_monotonicity_aligned_core_layer_positivity import (
    aligned_core,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_r2m_original_layer_positivity import (
    add_weighted,
    one_plus_power,
    quadrant_negatives,
    shifted,
)
from probe_path_isolate_p4_affine_target_rows import A, T, multiply, power


def audit(record):
    case = tuple(record["case"])
    package, parity, coordinate, c_value, m_value, x_value = case
    direction = record["ambient_direction"]
    a = record["a"]
    b = record["b"]
    r = record["r"]
    full_degree = record["full_degree"]
    lower = record["quadrant_lower"]
    core = aligned_core(case, direction, 40)
    at_power = multiply(power(A, a, full_degree), power(T, b, full_degree), full_degree)
    mirror_negative_positions = set()
    mirror_negative_layer_coefficients = 0
    mirror_total = {}
    for j in range(r + 1):
        factor = shifted(one_plus_power(r - j, 0), 0, j)
        factor = multiply(at_power, factor, full_degree)
        layer = multiply(core, factor, full_degree)
        negatives = quadrant_negatives(layer, lower)
        mirror_negative_layer_coefficients += len(negatives)
        mirror_negative_positions.update(negatives)
        add_weighted(mirror_total, layer, math.comb(r, j))
    prior_both = {
        (lower + item[0], lower + item[1])
        for item in record["both_axis_obstruction_offsets"]
    }
    all_three = prior_both & mirror_negative_positions
    total_negatives = quadrant_negatives(mirror_total, lower)
    return {
        "case": list(case),
        "ambient_direction": direction,
        "total_negative_count": len(total_negatives),
        "prior_two_axis_obstruction_count": len(prior_both),
        "mirrored_j_negative_layer_coefficient_count": mirror_negative_layer_coefficients,
        "mirrored_j_position_with_negative_layer_count": len(mirror_negative_positions),
        "position_obstructed_on_all_three_axes_count": len(all_three),
        "all_three_obstruction_offsets": [
            [i - lower, j - lower] for i, j in sorted(all_three)
        ],
    }


def main():
    source = json.loads(Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "aligned_core_layer_positivity_probe_20260802.json"
    ).read_text(encoding="utf-8"))
    records = []
    for prior in source["records"]:
        record = audit(prior)
        records.append(record)
        print(json.dumps(record, indent=2), flush=True)
    report = {"status": "PROBE", "records": records}
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "aligned_core_mirrored_j_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
