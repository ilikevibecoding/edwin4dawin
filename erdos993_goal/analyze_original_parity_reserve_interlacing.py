#!/usr/bin/env python3
"""Audit interlacing of each original parity part with the stable reserve part."""

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
    real = []
    nonreal = 0
    for root, multiplicity in fmpz_poly(values).complex_roots():
        if root.imag.is_zero():
            real.extend([root.real] * multiplicity)
        else:
            nonreal += multiplicity
    return real, nonreal


def merge(original, reserve, predicate):
    values = [(root, "C") for root in original if predicate(root)]
    values.extend((root, "R") for root in reserve if predicate(root))
    values.sort(key=lambda item: float(item[0].mid()))
    labels = "".join(label for _, label in values)
    runs = []
    for label in labels:
        if not runs or runs[-1][0] != label:
            runs.append([label, 1])
        else:
            runs[-1][1] += 1
    return {
        "original_count": labels.count("C"),
        "reserve_count": labels.count("R"),
        "same_label_adjacency_count": sum(
            labels[j] == labels[j - 1] for j in range(1, len(labels))
        ),
        "maximum_run": max((length for _, length in runs), default=0),
        "first_labels": labels[:8],
        "last_labels": labels[-8:],
        "runs": [{"label": label, "length": length} for label, length in runs],
    }


def audit_part(original: list[int], reserve: list[int]) -> dict:
    original_roots, original_nonreal = real_roots(original)
    reserve_roots, reserve_nonreal = real_roots(reserve)
    remainder = [
        original[j] * reserve[-1] - reserve[j] * original[-1]
        for j in range(len(original))
    ]
    while remainder and remainder[-1] == 0:
        remainder.pop()
    remainder_roots, remainder_nonreal = real_roots(remainder)
    remainder_sign_word = []
    for value in remainder:
        current = 1 if value > 0 else -1 if value < 0 else 0
        if current and (
            not remainder_sign_word or remainder_sign_word[-1] != current
        ):
            remainder_sign_word.append(current)
    return {
        "original_nonreal_count": original_nonreal,
        "reserve_nonreal_count": reserve_nonreal,
        "negative_merge": merge(
            original_roots, reserve_roots, lambda root: root < 0
        ),
        "positive_merge": merge(
            original_roots, reserve_roots, lambda root: root > 0
        ),
        "leading_cancelled_remainder_degree": len(remainder) - 1,
        "leading_cancelled_remainder_nonreal_count": remainder_nonreal,
        "leading_cancelled_remainder_coefficient_sign_word": (
            remainder_sign_word
        ),
        "remainder_reserve_negative_merge": merge(
            remainder_roots, reserve_roots, lambda root: root < 0
        ),
        "remainder_positive_root_count": sum(
            root > 0 for root in remainder_roots
        ),
    }


def audit(record, source):
    coefficient, reserve = reconstruct(record)
    return {
        "source": source,
        "package": record.get("package"),
        "coordinate": record.get("coordinate"),
        "m": record.get("m"),
        "x": record.get("x"),
        "r": int(record["r"]),
        "even": audit_part(coefficient[0::2], reserve[0::2]),
        "odd": audit_part(coefficient[1::2], reserve[1::2]),
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
    report = {
        "status": "ORIGINAL_PARITY_RESERVE_INTERLACING_AUDIT",
        "case_count": len(records),
        "records": records,
        "warning": "Finite saved cases; Arb-certified roots.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_parity_reserve_interlacing_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "records": [
            {
                "m": r["m"], "r": r["r"],
                "even_negative": r["even"]["negative_merge"],
                "odd_negative": r["odd"]["negative_merge"],
            }
            for r in records
        ],
    }, indent=2))


if __name__ == "__main__":
    main()
