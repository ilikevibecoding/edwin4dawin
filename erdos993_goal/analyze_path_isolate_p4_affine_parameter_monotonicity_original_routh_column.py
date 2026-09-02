#!/usr/bin/env python3
"""Inspect the Routh first column of saved original coefficient polynomials.

The number of sign changes in the Routh first column equals the number
of open-right-half-plane zeros when there are no imaginary-axis
degeneracies.  Rows are rescaled by positive constants at every step;
this preserves all first-column signs and avoids enormous intermediates.
The computation is high-precision diagnostic evidence, not an exact
symbolic Routh certificate.
"""

from __future__ import annotations

import json
from pathlib import Path

import mpmath as mp

from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    DEFAULT_PATHS,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_original_reserve_differential_module import (
    reconstruct,
)


def normalize(row):
    scale = max((abs(value) for value in row), default=mp.mpf(1))
    return [value / scale for value in row] if scale else row


def sign_word(signs: list[int]) -> list[dict]:
    result = []
    for index, sign in enumerate(signs):
        if not result or result[-1]["sign"] != sign:
            result.append({"sign": sign, "start": index, "end": index})
        else:
            result[-1]["end"] = index
    return result


def routh_first_column(values: list[int]):
    descending = [mp.mpf(value) for value in reversed(values)]
    width = (len(descending) + 1) // 2
    upper = descending[0::2] + [mp.mpf(0)] * width
    lower = descending[1::2] + [mp.mpf(0)] * width
    upper = normalize(upper[:width])
    lower = normalize(lower[:width])
    first = [upper[0], lower[0]]
    zero_pivots = []
    for row_index in range(2, len(descending)):
        pivot = lower[0]
        if not pivot:
            zero_pivots.append(row_index - 1)
            pivot = mp.mpf(10) ** (-(mp.mp.dps // 2))
        new = [
            (pivot * upper[j + 1] - upper[0] * lower[j + 1]) / pivot
            for j in range(width - 1)
        ] + [mp.mpf(0)]
        new = normalize(new)
        first.append(new[0])
        upper, lower = lower, new
    signs = [1 if value > 0 else -1 if value < 0 else 0 for value in first]
    changes = sum(
        signs[j] and signs[j - 1] and signs[j] != signs[j - 1]
        for j in range(1, len(signs))
    )
    return {
        "first_column_sign_blocks": sign_word(signs),
        "sign_change_count": changes,
        "zero_pivot_rows": zero_pivots,
        "smallest_absolute_normalized_pivot": float(min(abs(value) for value in first)),
        "first_normalized_values": [float(value) for value in first[:12]],
        "last_normalized_values": [float(value) for value in first[-12:]],
    }


def main() -> None:
    mp.mp.dps = 200
    records = []
    for path_string in DEFAULT_PATHS:
        path = Path(path_string)
        data = json.loads(path.read_text(encoding="utf-8"))
        candidates = [data["record"]] if "record" in data else data.get("records", [])
        for record in candidates:
            if "ell_values" not in record or "reserve_values" not in record:
                continue
            coefficient, _ = reconstruct(record)
            audit = routh_first_column(coefficient)
            item = {
                "source": path.name,
                "package": record.get("package"),
                "parity": record.get("parity"),
                "coordinate": record.get("coordinate"),
                "m": record.get("m"),
                "x": record.get("x"),
                "r": record.get("r"),
                **audit,
            }
            records.append(item)
            print(
                item["package"], item["m"], item["x"], item["r"],
                item["first_column_sign_blocks"], item["zero_pivot_rows"],
                flush=True,
            )
    report = {
        "status": (
            "PASS_ROUTH_AT_MOST_TWO_SIGN_CHANGES_SAVED_CASES"
            if all(record["sign_change_count"] <= 2 for record in records)
            else "ROUTH_SAVED_CASE_HAS_MORE_THAN_TWO_SIGN_CHANGES"
        ),
        "case_count": len(records),
        "records": records,
        "warning": "200-digit rescaled numerical diagnostic, not exact symbolic signs.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_routh_column_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
