#!/usr/bin/env python3
"""Persist and audit the complete strong-payment small-core induction grid."""

from __future__ import annotations

import csv
import hashlib
import json
import math
import subprocess
import time
from io import StringIO
from pathlib import Path

from verify_rank5_leaf_induction_reduction import rooted_payment


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "scan_rank5_ratio_payment_through28_small_core_grid_root.c"
BASE_SOURCE = HERE / "scan_rank5_ratio_payment_order28_small_cores_root.c"
EXECUTABLE = HERE / "scan_rank5_ratio_payment_through28_small_core_grid_root.exe"
OUTPUT = HERE / "rank5_ratio_payment_through28_small_core_grid_exact_root_20260826.json"
EXPECTED_COUNTS = [
    1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301,
    3159, 7741, 19320, 48629, 123867, 317955,
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def payment_margin(window):
    a, b, d, e, f = window
    return rooted_payment(a, b, d, e, f) - a * d * e * (a + d)


def main():
    started = time.perf_counter()
    completed = subprocess.run(
        [str(EXECUTABLE), "1:19"], cwd=HERE, check=True,
        text=True, capture_output=True,
    )
    lines = completed.stdout.splitlines()
    header_index = next(
        index for index, line in enumerate(lines)
        if line.startswith("core_order,siblings,total_order")
    )
    data_lines = []
    for line in lines[header_index + 1 :]:
        if line.startswith("TOTAL_ROWS"):
            break
        if line and line[0].isdigit():
            data_lines.append(line)
    reader = csv.DictReader(StringIO(lines[header_index] + "\n" + "\n".join(data_lines)))
    rows = []
    for parsed in reader:
        core_order = int(parsed["core_order"])
        siblings = int(parsed["siblings"])
        window = [int(parsed[name]) for name in ("a", "b", "d", "e", "f")]
        minimum = int(parsed["min_margin"])
        assert payment_margin(window) == minimum
        row = {
            "core_order": core_order,
            "sibling_isolates": siblings,
            "total_tree_order": int(parsed["total_order"]),
            "trees": int(parsed["trees"]),
            "rooted_cores": int(parsed["roots"]),
            "negative_margins": int(parsed["negative"]),
            "minimum_margin": str(minimum),
            "minimum_witness": {
                "tree_index": int(parsed["witness_tree"]),
                "root": int(parsed["witness_root"]),
                "window_a_b_d_e_f": window,
            },
        }
        rows.append(row)

    expected_pairs = [
        (core_order, siblings)
        for core_order in range(1, 20)
        for siblings in range(max(0, 10 - core_order), 27 - core_order)
    ]
    assert [(row["core_order"], row["sibling_isolates"]) for row in rows] == expected_pairs
    assert len(rows) == len(expected_pairs)
    assert all(row["total_tree_order"] == row["core_order"] + row["sibling_isolates"] + 2 for row in rows)
    assert all(12 <= row["total_tree_order"] <= 28 for row in rows)
    assert all(row["trees"] == EXPECTED_COUNTS[row["core_order"] - 1] for row in rows)
    assert all(row["rooted_cores"] == row["core_order"] * row["trees"] for row in rows)
    assert all(row["negative_margins"] == 0 for row in rows)
    assert all(int(row["minimum_margin"]) > 0 for row in rows)
    assert sum(row["trees"] for row in rows) == 4_524_868
    assert sum(row["rooted_cores"] for row in rows) == 82_439_257
    assert "PASS_EXACT_RANK5_RATIO_PAYMENT_THROUGH28_SMALL_CORE_GRID" in completed.stdout

    # Core order zero is exactly the star-center branch.  Check every total
    # order in the same induction range directly.
    star_rows = []
    for siblings in range(10, 27):
        d, e, f = (math.comb(siblings, rank) for rank in (3, 4, 5))
        a, b = e, f
        margin = payment_margin((a, b, d, e, f))
        assert margin > 0
        star_rows.append({
            "core_order": 0,
            "sibling_isolates": siblings,
            "total_tree_order": siblings + 2,
            "margin": str(margin),
        })

    payload = {
        "schema": "rank5-ratio-payment-through28-small-core-grid-root-v1",
        "status": "PASS_EXACT_RANK5_RATIO_PAYMENT_THROUGH28_SMALL_CORE_GRID",
        "theorem": (
            "For every terminal core C of order 0 through 19 and every sibling "
            "count producing a total tree order 12 through 28, "
            "M_s>=a_s*d_s*e_s*(a_s+d_s)."
        ),
        "coverage": {
            "total_tree_orders": [12, 28],
            "core_orders": [0, 19],
            "nonstar_core_sibling_cells": len(rows),
            "tree_rows": 4_524_868,
            "rooted_payment_rows": 82_439_257,
            "star_cells": len(star_rows),
            "negative_margins": 0,
        },
        "nonstar_cells": rows,
        "star_center_cells": star_rows,
        "witness_replay": (
            "Every nonstar stored minimum and every star margin is recomputed "
            "in Python from the exact rooted-payment identity."
        ),
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "artifacts": {
            SOURCE.name: sha256(SOURCE),
            BASE_SOURCE.name: sha256(BASE_SOURCE),
            EXECUTABLE.name: sha256(EXECUTABLE),
            "captured_stdout_sha256": hashlib.sha256(completed.stdout.encode()).hexdigest().upper(),
            "captured_stderr_sha256": hashlib.sha256(completed.stderr.encode()).hexdigest().upper(),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Core orders 20 through 26 require the separate analytic exact-tree cells."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(payload["status"])
    print("CELLS", payload["coverage"]["nonstar_core_sibling_cells"])
    print("ROOTED_ROWS", payload["coverage"]["rooted_payment_rows"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
