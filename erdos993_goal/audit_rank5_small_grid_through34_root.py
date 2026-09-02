#!/usr/bin/env python3
"""Clean two-pass reroot audit of the exact small-core grid through order 34."""

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
EXECUTABLE = HERE / "audit_rank5_ratio_payment_through34_small_core_grid_root.exe"
C_SOURCE = HERE / "audit_rank5_ratio_payment_through34_small_core_grid_root.c"
AUDIT_BASE_SOURCE = HERE / "audit_rank5_ratio_payment_through28_small_core_grid_root.c"
PRIMARY = HERE / "rank5_ratio_payment_through34_small_core_grid_exact_root_20260826.json"
OUTPUT = HERE / "rank5_small_grid_through34_independent_audit_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
        cwd=HERE,
        check=True,
        capture_output=True,
        text=True,
    )
    lines = completed.stdout.splitlines()
    assert lines[-1] == "PASS_INDEPENDENT_RANK5_SMALL_CORE_GRID_THROUGH34_AUDIT"
    header = next(line for line in lines if line.startswith("GRID,core_order"))
    data = [
        line for line in lines
        if line.startswith("GRID,") and not line.startswith("GRID,core_order")
    ]
    reader = csv.DictReader(StringIO(header + "\n" + "\n".join(data)))
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

    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK5_RATIO_PAYMENT_THROUGH34_SMALL_CORE_GRID"
    assert audit_rows == primary["nonstar_cells"]
    assert len(audit_rows) == 392
    assert all(row["negative_margins"] == 0 for row in audit_rows)
    assert sum(row["trees"] for row in audit_rows) == primary["coverage"]["tree_rows"]
    assert sum(row["rooted_cores"] for row in audit_rows) == primary["coverage"]["rooted_payment_rows"]

    star_rows = []
    for siblings in range(10, 33):
        d, e, f = (math.comb(siblings, rank) for rank in (3, 4, 5))
        star_rows.append({
            "core_order": 0,
            "sibling_isolates": siblings,
            "total_tree_order": siblings + 2,
            "margin": str(payment_margin(e, f, d, e, f)),
        })
    assert star_rows == primary["star_center_cells"]

    payload = {
        "schema": "rank5-small-grid-through34-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK5_SMALL_CORE_GRID_THROUGH34_AUDIT",
        "method": (
            "Official nauty gentreeg parent arrays are evaluated by a clean "
            "two-pass downward/outward reroot dynamic program. Every one of "
            "392 cell minima, witnesses, row counts, and all rooted-payment "
            "counts agree exactly with the separate memoized-edge producer."
        ),
        "coverage": {
            "nonstar_cells": len(audit_rows),
            "tree_rows": sum(row["trees"] for row in audit_rows),
            "rooted_payment_rows": sum(row["rooted_cores"] for row in audit_rows),
            "negative_margins": 0,
            "matching_rows": len(audit_rows),
            "star_cells": len(star_rows),
        },
        "agreement": {
            "all_nonstar_rows_field_for_field": True,
            "all_star_rows_field_for_field": True,
        },
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "artifacts": {
            C_SOURCE.name: sha256(C_SOURCE),
            AUDIT_BASE_SOURCE.name: sha256(AUDIT_BASE_SOURCE),
            EXECUTABLE.name: sha256(EXECUTABLE),
            PRIMARY.name: sha256(PRIMARY),
            "captured_stdout_sha256": hashlib.sha256(completed.stdout.encode()).hexdigest().upper(),
            "captured_stderr_sha256": hashlib.sha256(completed.stderr.encode()).hexdigest().upper(),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Large core orders 20 through 32 require their separate analytic audit.",
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("ROOTED_ROWS", payload["coverage"]["rooted_payment_rows"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
