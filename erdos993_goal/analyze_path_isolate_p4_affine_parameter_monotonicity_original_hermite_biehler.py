#!/usr/bin/env python3
"""Audit Hermite-Biehler geometry of saved original polynomials.

Write C(t)=E(t^2)+t O(t^2).  The saved cases suggest:

* E and O are fully real-rooted;
* their negative roots strictly interlace;
* each has at most two positive roots;
* all interlacing defects are confined to the positive axis.

Certified roots are isolated with Arb through python-flint.
"""

from __future__ import annotations

import json
from pathlib import Path

from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    DEFAULT_PATHS,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_original_reserve_differential_module import (
    reconstruct,
)


def real_roots(values: list[int]):
    roots = []
    nonreal = 0
    for root, multiplicity in fmpz_poly(values).complex_roots():
        if root.imag.is_zero():
            roots.extend([root.real] * multiplicity)
        else:
            nonreal += multiplicity
    return roots, nonreal


def merged_summary(even_roots, odd_roots, predicate) -> dict:
    merged = [(root, "E") for root in even_roots if predicate(root)]
    merged.extend((root, "O") for root in odd_roots if predicate(root))
    merged.sort(key=lambda item: float(item[0].mid()))
    labels = "".join(label for _, label in merged)
    runs = []
    for label in labels:
        if not runs or runs[-1]["label"] != label:
            runs.append({"label": label, "length": 1})
        else:
            runs[-1]["length"] += 1
    return {
        "even_count": sum(label == "E" for _, label in merged),
        "odd_count": sum(label == "O" for _, label in merged),
        "same_label_adjacency_count": sum(
            labels[j] == labels[j - 1] for j in range(1, len(labels))
        ),
        "maximum_same_part_run_length": max(
            (run["length"] for run in runs), default=0
        ),
        "first_labels": labels[:4],
        "last_labels": labels[-4:],
        "label_runs": runs,
    }


def audit(record: dict, source: str) -> dict:
    coefficient, _ = reconstruct(record)
    even_roots, even_nonreal = real_roots(coefficient[0::2])
    odd_roots, odd_nonreal = real_roots(coefficient[1::2])
    negative = merged_summary(even_roots, odd_roots, lambda root: root < 0)
    positive = merged_summary(even_roots, odd_roots, lambda root: root > 0)
    return {
        "source": source,
        "package": record.get("package"),
        "parity": record.get("parity"),
        "coordinate": record.get("coordinate"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": int(record["r"]),
        "even_degree": len(coefficient[0::2]) - 1,
        "odd_degree": len(coefficient[1::2]) - 1,
        "even_nonreal_root_count": even_nonreal,
        "odd_nonreal_root_count": odd_nonreal,
        "negative_root_interlacing": negative,
        "positive_root_interlacing": positive,
        "negative_roots_strictly_interlace": (
            negative["same_label_adjacency_count"] == 0
        ),
        "each_part_has_at_most_two_positive_roots": (
            positive["even_count"] <= 2 and positive["odd_count"] <= 2
        ),
    }


def main() -> None:
    ctx.prec = 100
    records = []
    for path_string in DEFAULT_PATHS:
        path = Path(path_string)
        data = json.loads(path.read_text(encoding="utf-8"))
        candidates = [data["record"]] if "record" in data else data.get("records", [])
        records.extend(
            audit(record, path.name)
            for record in candidates
            if "ell_values" in record and "reserve_values" in record
        )
    passed = all(
        not record["even_nonreal_root_count"]
        and not record["odd_nonreal_root_count"]
        and record["negative_roots_strictly_interlace"]
        and record["each_part_has_at_most_two_positive_roots"]
        for record in records
    )
    report = {
        "status": (
            "PASS_ORIGINAL_HERMITE_BIEHLER_GEOMETRY_ALL_SAVED_CASES"
            if passed else "ORIGINAL_HERMITE_BIEHLER_GEOMETRY_HAS_FAILURE"
        ),
        "case_count": len(records),
        "records": records,
        "warning": "Finite saved cases; roots are certified Arb isolations.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_hermite_biehler_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
