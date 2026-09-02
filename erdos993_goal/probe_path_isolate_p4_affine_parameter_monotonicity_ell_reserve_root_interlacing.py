#!/usr/bin/env python3
"""Certified root audit for the common-order numerator and reserve sequences.

Strict discrete convexity of -L_j/R_j may have a shorter explanation if
the two positive-coefficient polynomials are real-rooted and interlace.
This script reuses the four saved exact coefficient arrays, so it does
not repeat the large symbolic extraction.
"""

from __future__ import annotations

import json
from pathlib import Path

from flint import ctx, fmpz_poly


def real_roots(values: list[int]):
    roots = []
    nonreal = 0
    for root, multiplicity in fmpz_poly(values).complex_roots():
        if root.imag.is_zero():
            roots.extend([root.real] * multiplicity)
        else:
            nonreal += multiplicity
    return roots, nonreal


def audit(record: dict) -> dict:
    numerator = [-value for value in record["ell_values"]]
    reserve = record["reserve_values"]
    numerator_roots, numerator_nonreal = real_roots(numerator)
    reserve_roots, reserve_nonreal = real_roots(reserve)
    numerator_negative = [root for root in numerator_roots if root < 0]
    numerator_positive = [root for root in numerator_roots if root > 0]
    reserve_negative = [root for root in reserve_roots if root < 0]
    reserve_positive = [root for root in reserve_roots if root > 0]
    merged = [(root, "L") for root in numerator_negative]
    merged.extend((root, "R") for root in reserve_negative)
    merged.sort(key=lambda item: float(item[0].mid()))
    labels = "".join(label for _, label in merged)
    strict = all(
        merged[index][0] < merged[index + 1][0]
        for index in range(len(merged) - 1)
    )
    alternating = all(
        labels[index] != labels[index - 1]
        for index in range(1, len(labels))
    )
    runs = []
    for label in labels:
        if not runs or runs[-1]["label"] != label:
            runs.append({"label": label, "length": 1})
        else:
            runs[-1]["length"] += 1
    return {
        "package": record["package"],
        "parity": record["parity"],
        "coordinate": record["coordinate"],
        "m": record["m"],
        "x": record["x"],
        "r": record["r"],
        "numerator_degree": len(numerator) - 1,
        "numerator_negative_root_count": len(numerator_negative),
        "numerator_positive_root_count": len(numerator_positive),
        "numerator_nonreal_root_count": numerator_nonreal,
        "reserve_degree": len(reserve) - 1,
        "reserve_negative_root_count": len(reserve_negative),
        "reserve_positive_root_count": len(reserve_positive),
        "reserve_nonreal_root_count": reserve_nonreal,
        "strict_negative_root_interlacing": strict and alternating,
        "merged_negative_root_labels": labels,
        "same_label_adjacency_count": sum(
            labels[index] == labels[index - 1]
            for index in range(1, len(labels))
        ),
        "maximum_same_polynomial_run_length": max(
            (run["length"] for run in runs), default=0
        ),
        "label_runs": runs,
    }


def main() -> None:
    ctx.prec = 100
    source = Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "reaggregated_v_interlacing_probe_20260802.json"
    )
    data = json.loads(source.read_text(encoding="utf-8"))
    records = [audit(record) for record in data["records"]]
    report = {
        "status": "CERTIFIED_ELL_RESERVE_ROOT_AUDIT",
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "ell_reserve_root_interlacing_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
