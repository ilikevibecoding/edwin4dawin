#!/usr/bin/env python3
"""Exact sign probe for a no-gap partition of the open tail>=19 cell."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np

from certify_rank8_e1_new_leaf_newton_cell import evaluator, transform_axis
from certify_rank8_e1_old_root_increment_ordered_near_cell import increment_value


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta3_e1_old_root_near0_trivariate_partition_probe_agent_20260825.json"
DEGREE = 26


def digest_array(values: np.ndarray) -> dict[str, object]:
    coefficients = [int(entry) for entry in values.flat]
    digest = hashlib.sha256()
    for index in np.ndindex(values.shape):
        digest.update((",".join(map(str, index)) + ":" + str(int(values[index])) + "\n").encode())
    return {
        "shape": list(values.shape),
        "coefficients": len(coefficients),
        "negative": sum(entry < 0 for entry in coefficients),
        "zero": sum(entry == 0 for entry in coefficients),
        "positive": sum(entry > 0 for entry in coefficients),
        "minimum": str(min(coefficients)),
        "ordered_sha256": digest.hexdigest().upper(),
    }


def cell(evaluate, extension: str, shifts: tuple[int, int, int], active: tuple[int, ...]) -> dict[str, object]:
    shape = (DEGREE + 1,) * len(active)
    values = np.empty(shape, dtype=object)
    for index in np.ndindex(shape):
        parameters = list(shifts)
        for axis, coordinate in enumerate(active):
            parameters[coordinate] += index[axis]
        values[index] = increment_value(evaluate, extension, 0, *parameters)
    minimum_sample = min(int(entry) for entry in values.flat)
    for axis in range(len(active)):
        transform_axis(values, axis)
    return {
        "shifts_tail_short_difference": list(shifts),
        "active_coordinates": [["tail", "short", "difference"][entry] for entry in active],
        "minimum_sampled_increment": str(minimum_sample),
        "newton": digest_array(values),
    }


def main() -> None:
    evaluate, _ = evaluator(3)
    rows = []
    for extension in ("root", "short", "long"):
        rows.append({"extension": extension, "region": "short>=5,difference>=0", **cell(evaluate, extension, (19, 5, 0), (0, 1, 2))})
        print(extension, "bulk", rows[-1]["newton"], flush=True)
        for short in range(5):
            rows.append({"extension": extension, "region": f"short={short},difference>=5", **cell(evaluate, extension, (19, short, 5), (0, 2))})
            print(extension, "short", short, "diff_tail", rows[-1]["newton"], flush=True)
            for difference in range(5):
                rows.append({"extension": extension, "region": f"short={short},difference={difference}", **cell(evaluate, extension, (19, short, difference), (0,))})
                print(extension, "short", short, "difference", difference, rows[-1]["newton"], flush=True)
    payload = {
        "schema": "rank8-delta3-e1-old-root-near0-trivariate-partition-probe-agent-v1",
        "status": "PASS_EXACT_NO_GAP_PARTITION" if all(row["newton"]["negative"] == 0 and int(row["minimum_sampled_increment"]) > 0 for row in rows) else "OPEN_MIXED_PARTITION",
        "partition": ["short>=5,difference>=0", "short=0..4,difference>=5", "short=0..4,difference=0..4"],
        "rows": rows,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])


if __name__ == "__main__":
    main()
