#!/usr/bin/env python3
"""Probe interlacing between the reaggregated and reserve polynomials."""

from __future__ import annotations

import json
from pathlib import Path

from flint import ctx, fmpz_poly

from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import aggregate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


def real_roots(values: list[int]):
    result = []
    nonreal = 0
    for root, multiplicity in fmpz_poly(values).complex_roots():
        if root.imag.is_zero():
            result.extend([root.real] * multiplicity)
        else:
            nonreal += multiplicity
    return result, nonreal


def audit_case(
    package: str,
    parity: int,
    coordinate: str,
    c_value: int,
    m_value: int,
    x_value: int,
    r: int,
) -> dict:
    ell_source, reserve_source = reduced_sources(package, parity, coordinate)
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group"
        else m_value + x_value - 3
    )
    original_b = (
        2 * m_value + parity - 4
        if package == "group"
        else 2 * m_value + parity - 5
    )
    target = m_value + r + 5 + (coordinate == "m")
    reduced_target = target if package == "group" else target - 2
    reduced_b = original_b + 3
    ell_values = aggregate(
        ell_source, a, reduced_b, r + 1, reduced_target,
        c_value, m_value, x_value,
    )
    reserve_values = aggregate(
        reserve_source, a, reduced_b, r, reduced_target,
        c_value, m_value, x_value,
    )
    combined_values = [
        ell_values[j] + ((r + 1) * reserve_values[j] if j <= r else 0)
        for j in range(r + 2)
    ]
    combined_roots, combined_nonreal = real_roots(combined_values)
    reserve_roots, reserve_nonreal = real_roots(reserve_values)
    combined_negative = [root for root in combined_roots if root < 0]
    combined_positive = [root for root in combined_roots if root > 0]
    reserve_negative = [root for root in reserve_roots if root < 0]
    merged = [(root, "K") for root in combined_negative]
    merged.extend((root, "R") for root in reserve_negative)
    merged.sort(key=lambda item: float(item[0].mid()))
    strict_order = all(merged[index][0] < merged[index + 1][0] for index in range(len(merged) - 1))
    labels = "".join(label for _, label in merged)
    alternating = all(labels[index] != labels[index - 1] for index in range(1, len(labels)))
    runs = []
    for label in labels:
        if not runs or runs[-1]["label"] != label:
            runs.append({"label": label, "length": 1})
        else:
            runs[-1]["length"] += 1
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "r": r,
        "combined_degree": len(combined_values) - 1,
        "combined_negative_root_count": len(combined_negative),
        "combined_positive_root_count": len(combined_positive),
        "combined_nonreal_root_count": combined_nonreal,
        "reserve_degree": len(reserve_values) - 1,
        "reserve_negative_root_count": len(reserve_negative),
        "reserve_nonreal_root_count": reserve_nonreal,
        "negative_roots_strictly_interlace": strict_order and alternating,
        "interlacing_orientation": labels[:2] if alternating else None,
        "merged_negative_root_labels": labels,
        "same_label_adjacency_count": sum(
            labels[index] == labels[index - 1]
            for index in range(1, len(labels))
        ),
        "maximum_same_polynomial_run_length": max(
            (run["length"] for run in runs), default=0
        ),
        "label_runs": runs,
        "positive_root_balls": [str(root) for root in combined_positive],
        "positive_roots_above_one": sum(root > 1 for root in combined_positive),
        "ell_values": ell_values,
        "reserve_values": reserve_values,
        "combined_values": combined_values,
    }


def main() -> None:
    ctx.prec = 100
    cases = [
        ("group", 0, "m", 1, 16, 40, 25),
        ("bottom", 1, "x", 0, 20, 40, 26),
        ("group", 0, "m", 1, 90, 180, 120),
        ("bottom", 1, "x", 0, 120, 240, 180),
    ]
    records = []
    for case in cases:
        record = audit_case(*case)
        records.append(record)
        print(
            {key: value for key, value in record.items() if not key.endswith("_values")},
            flush=True,
        )
    report = {
        "status": "PASS_FINITE_REAGGREGATED_INTERLACING"
        if all(record["negative_roots_strictly_interlace"] for record in records)
        else "FAIL",
        "records": records,
        "warning": "Finite exact polynomials; root balls are certified by python-flint/Arb.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "interlacing_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
