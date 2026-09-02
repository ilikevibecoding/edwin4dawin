#!/usr/bin/env python3
"""Clean-room audit of the order-11 base and the complete small-core grid."""

from __future__ import annotations

import csv
import hashlib
import json
import math
import os
import subprocess
import time
from io import StringIO
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXECUTABLE = HERE / "audit_rank5_ratio_payment_through28_small_core_grid_root.exe"
C_SOURCE = HERE / "audit_rank5_ratio_payment_through28_small_core_grid_root.c"
PRIMARY_BASE = HERE / "rank5_strong_q5_order11_base_exact_root_20260826.json"
PRIMARY_GRID = HERE / "rank5_ratio_payment_through28_small_core_grid_exact_root_20260826.json"
OUTPUT = HERE / "rank5_strong_q5_base_small_grid_independent_audit_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def reserve(coefficients):
    i4, i5, i6 = coefficients[4:7]
    return 5 * (10 * i5 * i5 - i4 * i5 - 12 * i4 * i6) - i4 * i5


def payment_margin(a, b, d, e, f):
    q4 = 8 * e * e - d * e - 10 * d * f
    mismatch = b * d - a * e
    payment = (
        6 * a * (a + d) * q4
        + a * d * e * (a + d + 2 * e)
        + 2 * a * a * e * e
        - 50 * mismatch * mismatch
    )
    return payment - a * d * e * (a + d)


def main() -> int:
    started = time.perf_counter()
    completed = subprocess.run(
        [str(EXECUTABLE), "-q", "1:19"],
        cwd=HERE, check=True, capture_output=True, text=True,
    )
    lines = completed.stdout.splitlines()
    assert lines[-1] == "PASS_INDEPENDENT_RANK5_BASE_AND_SMALL_CORE_GRID_AUDIT"

    base_line = next(line for line in lines if line.startswith("BASE,") and not line.startswith("BASE,trees"))
    base_fields = base_line.split(",")
    assert len(base_fields) == 12
    base_trees = int(base_fields[1])
    base_negative = int(base_fields[2])
    base_minimum = int(base_fields[3])
    base_coefficients = [int(value) for value in base_fields[5:12]]
    assert reserve(base_coefficients) == base_minimum

    grid_header = next(line for line in lines if line.startswith("GRID,core_order"))
    grid_data = [line for line in lines if line.startswith("GRID,") and not line.startswith("GRID,core_order")]
    reader = csv.DictReader(StringIO(grid_header + "\n" + "\n".join(grid_data)))
    audit_rows = []
    for row in reader:
        window = [int(row[name]) for name in ("a", "b", "d", "e", "f")]
        minimum = int(row["minimum"])
        assert payment_margin(*window) == minimum
        audit_rows.append({
            "core_order": int(row["core_order"]),
            "sibling_isolates": int(row["siblings"]),
            "total_tree_order": int(row["total_order"]),
            "trees": int(row["trees"]),
            "rooted_cores": int(row["roots"]),
            "negative_margins": int(row["negative"]),
            "minimum_margin": str(minimum),
            "minimum_witness": {
                "tree_index": int(row["witness_tree"]),
                "root": int(row["witness_root"]),
                "window_a_b_d_e_f": window,
            },
        })

    base = json.loads(PRIMARY_BASE.read_text(encoding="utf-8"))
    grid = json.loads(PRIMARY_GRID.read_text(encoding="utf-8"))
    assert base_trees == base["unlabeled_trees"] == 235
    assert base_negative == base["negative_reserves"] == 0
    assert str(base_minimum) == base["minimum_five_Q5_minus_i4_i5"] == "4320"
    assert audit_rows == grid["nonstar_cells"]
    assert len(audit_rows) == 278
    assert sum(row["trees"] for row in audit_rows) == 4_524_868
    assert sum(row["rooted_cores"] for row in audit_rows) == 82_439_257
    assert all(row["negative_margins"] == 0 for row in audit_rows)

    star_rows = []
    for siblings in range(10, 27):
        d, e, f = (math.comb(siblings, rank) for rank in (3, 4, 5))
        margin = payment_margin(e, f, d, e, f)
        star_rows.append({
            "core_order": 0,
            "sibling_isolates": siblings,
            "total_tree_order": siblings + 2,
            "margin": str(margin),
        })
    assert star_rows == grid["star_center_cells"]

    payload = {
        "schema": "rank5-strong-q5-base-small-grid-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK5_STRONG_Q5_BASE_AND_SMALL_CORE_GRID_AUDIT",
        "method": (
            "Official nauty gentreeg parent arrays are evaluated by a clean "
            "two-pass downward/outward reroot dynamic program. This differs "
            "from the primary memoized directed-edge recursion. Every one of "
            "278 cell minima, witnesses, row counts, and all 82,439,257 rooted "
            "payment counts agree exactly with the primary report."
        ),
        "base": {
            "trees": base_trees,
            "negative_reserves": base_negative,
            "minimum_five_Q5_minus_i4_i5": str(base_minimum),
            "minimum_coefficients_i0_to_i6": base_coefficients,
        },
        "grid": {
            "nonstar_cells": len(audit_rows),
            "tree_rows": sum(row["trees"] for row in audit_rows),
            "rooted_payment_rows": sum(row["rooted_cores"] for row in audit_rows),
            "negative_margins": 0,
            "matching_rows": len(audit_rows),
            "star_cells": len(star_rows),
        },
        "agreement": {
            "base_minimum": True,
            "all_nonstar_rows_field_for_field": True,
            "all_star_rows_field_for_field": True,
        },
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "artifacts": {
            C_SOURCE.name: sha256(C_SOURCE),
            EXECUTABLE.name: sha256(EXECUTABLE),
            PRIMARY_BASE.name: sha256(PRIMARY_BASE),
            PRIMARY_GRID.name: sha256(PRIMARY_GRID),
            "captured_stdout_sha256": hashlib.sha256(completed.stdout.encode()).hexdigest().upper(),
            "captured_stderr_sha256": hashlib.sha256(completed.stderr.encode()).hexdigest().upper(),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Large core orders 20 through 26 require their separate analytic audit."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("ROOTED_ROWS", payload["grid"]["rooted_payment_rows"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
