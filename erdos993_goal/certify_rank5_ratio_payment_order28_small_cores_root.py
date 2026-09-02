#!/usr/bin/env python3
"""Run, validate, and persist the exact small-core order-28 payment census."""

from __future__ import annotations

import csv
import hashlib
import json
import subprocess
import time
from io import StringIO
from pathlib import Path

from verify_rank5_leaf_induction_reduction import rooted_payment


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "scan_rank5_ratio_payment_order28_small_cores_root.c"
EXECUTABLE = HERE / "scan_rank5_ratio_payment_order28_small_cores_root.exe"
OUTPUT = HERE / "rank5_ratio_payment_order28_small_cores_exact_root_20260826.json"
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
        [str(EXECUTABLE), "1:19"],
        cwd=HERE,
        check=True,
        text=True,
        capture_output=True,
    )
    lines = completed.stdout.splitlines()
    header_index = next(
        index for index, line in enumerate(lines)
        if line.startswith("order,siblings,trees")
    )
    data_lines = []
    for line in lines[header_index + 1 :]:
        if line.startswith("TOTAL"):
            break
        if line and line[0].isdigit():
            data_lines.append(line)
    reader = csv.DictReader(StringIO(lines[header_index] + "\n" + "\n".join(data_lines)))
    rows = []
    for parsed in reader:
        order = int(parsed["order"])
        window = [int(parsed[name]) for name in ("a", "b", "d", "e", "f")]
        minimum = int(parsed["min_margin"])
        assert payment_margin(window) == minimum
        row = {
            "core_order": order,
            "sibling_isolates": int(parsed["siblings"]),
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
    assert len(rows) == 19
    assert [row["core_order"] for row in rows] == list(range(1, 20))
    assert [row["trees"] for row in rows] == EXPECTED_COUNTS
    assert all(row["sibling_isolates"] == 26 - row["core_order"] for row in rows)
    assert all(row["rooted_cores"] == row["core_order"] * row["trees"] for row in rows)
    assert all(row["negative_margins"] == 0 for row in rows)
    assert all(int(row["minimum_margin"]) > 0 for row in rows)
    assert sum(row["trees"] for row in rows) == 522_959
    assert sum(row["rooted_cores"] for row in rows) == 9_594_824
    assert "PASS_EXACT_RANK5_RATIO_PAYMENT_ORDER28_SMALL_CORES" in completed.stdout

    payload = {
        "schema": "rank5-ratio-payment-order28-small-cores-root-v1",
        "status": "PASS_EXACT_RANK5_RATIO_PAYMENT_ORDER28_SMALL_CORES",
        "theorem": (
            "For every rooted tree core C of order 1 through 19, with the "
            "unique order-28 sibling count s=26-|C|, the exact payment satisfies "
            "M_s>=a_s*d_s*e_s*(a_s+d_s)."
        ),
        "coverage": {
            "core_orders": [1, 19],
            "unlabeled_trees": 522_959,
            "rooted_cores": 9_594_824,
            "negative_margins": 0,
            "generator": "official nauty gentreeg 2.9.3 OUTPROC callback",
        },
        "per_order": rows,
        "witness_replay": (
            "Every stored minimum is recomputed in Python from its exact "
            "(a,b,d,e,f) window using the independently imported rooted-payment formula."
        ),
        "resources": {"elapsed_seconds": time.perf_counter() - started},
        "artifacts": {
            SOURCE.name: sha256(SOURCE),
            EXECUTABLE.name: sha256(EXECUTABLE),
            "captured_stdout_sha256": hashlib.sha256(completed.stdout.encode()).hexdigest().upper(),
            "captured_stderr_sha256": hashlib.sha256(completed.stderr.encode()).hexdigest().upper(),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "The core-order-zero star branch and core orders 20 through 26 are "
            "separate exact proof cells."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(payload["status"])
    print("TREES", payload["coverage"]["unlabeled_trees"])
    print("ROOTED", payload["coverage"]["rooted_cores"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
