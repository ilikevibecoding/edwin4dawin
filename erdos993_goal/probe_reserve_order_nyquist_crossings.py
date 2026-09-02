#!/usr/bin/env python3
"""Compare each reserve to neighboring-order stable-reference candidates.

The degree-r reserve is compared with (1+t)^h R_{r-h}.  The reflected
parity cross polynomial controls real-axis crossings of their Nyquist ratio.
Few or no sign changes would support an induction on r for reserve stability.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from analyze_original_reserve_pencil_crossings import product, subtract
from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    DEFAULT_PATHS,
    nonzero_sign_word,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_reserve_order_quasi_orthogonality import (
    reserve_orders,
)


OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "reserve_order_nyquist_crossings_probe_20260802.json"
)


def multiply_binomial(values: list[int], power: int) -> list[int]:
    result = list(values)
    for _ in range(power):
        result = [
            (result[j] if j < len(result) else 0)
            + (result[j - 1] if j else 0)
            for j in range(len(result) + 1)
        ]
    return result


def cross_summary(left: list[int], right: list[int]) -> dict:
    le, lo = left[0::2], left[1::2]
    re, ro = right[0::2], right[1::2]
    cross = subtract(product(le, ro), product(lo, re))
    reflected = [value if j % 2 == 0 else -value for j, value in enumerate(cross)]
    word = nonzero_sign_word(reflected)
    return {
        "degree": len(cross) - 1,
        "reflected_sign_word": word,
        "descartes_sign_changes": max(0, len(word) - 1),
        "zero_polynomial": not cross,
    }


def audit(record: dict, source: str) -> dict:
    current = [int(value) for value in record["reserve_values"]]
    orders = reserve_orders(record, min(4, int(record["r"])))
    tests = []
    for drop in range(1, len(orders)):
        reference = multiply_binomial(orders[drop], drop)
        assert len(reference) == len(current)
        tests.append({"order_drop": drop, **cross_summary(current, reference)})
    return {
        "source": source,
        "package": record["package"],
        "parity": record["parity"],
        "coordinate": record["coordinate"],
        "m": record["m"],
        "x": record["x"],
        "r": record["r"],
        "tests": tests,
    }


def main() -> None:
    records = []
    seen = set()
    for path_string in DEFAULT_PATHS:
        path = Path(path_string)
        data = json.loads(path.read_text(encoding="utf-8"))
        candidates = [data["record"]] if "record" in data else data.get("records", [])
        for record in candidates:
            if "reserve_values" not in record:
                continue
            key = (
                record.get("package"), record.get("parity"), record.get("coordinate"),
                record.get("m"), record.get("x"), record.get("r"),
            )
            if key in seen:
                continue
            seen.add(key)
            records.append(audit(record, path.name))
    report = {
        "status": "RESERVE_ORDER_NYQUIST_CROSSING_PROBE",
        "case_count": len(records),
        "maximum_descartes_sign_changes": max(
            test["descartes_sign_changes"]
            for record in records for test in record["tests"]
        ),
        "records": records,
        "warning": "Finite exact coefficient evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
