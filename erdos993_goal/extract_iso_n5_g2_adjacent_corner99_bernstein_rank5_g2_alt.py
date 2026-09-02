#!/usr/bin/env python3
"""Extract exact negative Bernstein-control geometry for adjacent g2 corner 9,9."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from flint import fmpq, fmpq_mpoly_ctx

from probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt import (
    a_ratio_row,
    compactify,
    row_corner,
    scaled_a2,
    scaled_k2,
    scaled_l2,
)
from tensor_bernstein_flint_matrix_root import tensor_bernstein_from_flint_matrix


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_adjacent_corner99_bernstein_geometry_rank5_g2_alt_20260830.json"
MARKER = "EXTRACT_EXACT_ISO_N5_G2_ADJACENT_CORNER99_BERNSTEIN_RANK5_G2_ALT"


def main() -> None:
    source_context = fmpq_mpoly_ctx.get(
        ("s", "z", "r0", "r1", "r2", "r3", "p", "q"), "degrevlex"
    )
    s, z, r0, r1, r2, r3, p, q = source_context.gens()
    one = source_context.constant(1)
    mb = 7 + p
    mc = 7 + p + q
    overlap = mb * s
    n = mb + mc - overlap
    edges = overlap * z
    R1 = 2 * n * (n - 1) - 4 * edges
    budget = R1 - 3 * n
    T = budget * r0
    D4 = budget * (1 - r0) * r1
    D3 = budget * (1 - r0) * (1 - r1) * r2
    D2 = budget * (1 - r0) * (1 - r1) * (1 - r2) * r3
    R5 = T
    R4 = T + n + D4
    R3 = T + 2 * n + D4 + D3
    R2 = T + 3 * n + D4 + D3 + D2
    arow = a_ratio_row(n, (R1, R2, R3, R4, R5))
    brow = row_corner(mb, 9, one)
    crow = row_corner(mc, 9, one)
    source = (
        scaled_a2(arow, n) + scaled_l2(arow, brow, n)
        + scaled_l2(arow, crow, n) + scaled_k2(brow, crow, n)
    )
    target_context = fmpq_mpoly_ctx.get(
        ("s", "z", "r0", "r1", "r2", "r3", "P", "Q"), "degrevlex"
    )
    mapped, degree_p, degree_q, source_terms = compactify(source, target_context)
    degrees, coefficients, mapped_terms = tensor_bernstein_from_flint_matrix(
        mapped, 8, chunk_columns=8192
    )
    negatives = np.argwhere(np.vectorize(lambda value: value < 0)(coefficients))
    minimum = min(coefficients.flat)
    all_minimum_indices = np.argwhere(
        np.vectorize(lambda value: value == minimum)(coefficients)
    )
    minimum_indices = [
        tuple(map(int, index)) for index in all_minimum_indices[:100]
    ]
    axis_records = []
    for axis, degree in enumerate(degrees):
        values, counts = np.unique(negatives[:, axis], return_counts=True)
        axis_records.append({
            "axis": axis,
            "variable": ("s", "z", "r0", "r1", "r2", "r3", "P", "Q")[axis],
            "degree": int(degree),
            "negative_index_min": int(values.min()) if len(values) else None,
            "negative_index_max": int(values.max()) if len(values) else None,
            "negative_index_counts": {str(int(v)): int(c) for v, c in zip(values, counts)},
        })
    records = []
    for index in negatives[:100]:
        key = tuple(map(int, index))
        records.append({
            "index": list(key),
            "coefficient": str(coefficients[key]),
            "control_point": [f"{key[axis]}/{degrees[axis]}" for axis in range(8)],
        })
    report = {
        "marker": MARKER,
        "corner": {"B_mask": 9, "C_mask": 9},
        "source_terms": source_terms,
        "mapped_terms": mapped_terms,
        "compactification_degrees_p_q": [degree_p, degree_q],
        "bernstein_degrees": list(map(int, degrees)),
        "bernstein_coefficients": int(coefficients.size),
        "negative_coefficients": int(len(negatives)),
        "minimum": str(minimum),
        "minimum_coefficient_count": int(len(all_minimum_indices)),
        "minimum_indices": [list(index) for index in minimum_indices],
        "negative_axis_geometry": axis_records,
        "first_negative_records": records,
        "scope": (
            "Negative Bernstein control coefficients alone do not imply that the "
            "corner polynomial takes a negative value."
        ),
        "probe_source_sha256": hashlib.sha256(
            (HERE / "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py").read_bytes()
        ).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "negative_coefficients": len(negatives),
        "minimum": str(minimum),
        "minimum_indices": report["minimum_indices"],
        "negative_axis_geometry": axis_records,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
