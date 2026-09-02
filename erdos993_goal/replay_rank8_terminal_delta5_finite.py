#!/usr/bin/env python3
"""Compile, replay, and package the exact WROM Delta5 census through order 20."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import subprocess


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "verify_rank8_terminal_delta5_finite.rs"
EXECUTABLE = ROOT / "verify_rank8_terminal_delta5_finite.exe"
OUTPUT = ROOT / "rank8_terminal_delta5_finite_n1_n20_exact_20260817.json"
EXPECTED = [0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741, 19320, 48629, 123867, 317955, 823065]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    compile_run = subprocess.run(
        [
            "rustc",
            "-O",
            "--target",
            "x86_64-pc-windows-gnu",
            str(SOURCE),
            "-o",
            str(EXECUTABLE),
        ],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if compile_run.returncode != 0:
        raise RuntimeError(compile_run.stdout)
    run = subprocess.run(
        [str(EXECUTABLE), "1", "20"],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    marker = "PASS_EXACT_RANK8_TERMINAL_DELTA5_ALL_ROOTED_CORES_N1_THROUGH_N20"
    if run.returncode != 0 or marker not in run.stdout:
        raise RuntimeError(run.stdout)
    pattern = re.compile(
        r"core_n=(\d+) trees=(\d+) roots=(\d+) active=(\d+) "
        r"delta5_min=(-?\d+) active_min=(NA|-?\d+) negative=0"
    )
    rows = []
    for line in run.stdout.splitlines():
        match = pattern.fullmatch(line)
        if not match:
            continue
        order, trees, roots, active, minimum, active_minimum = match.groups()
        row = {
            "order": int(order),
            "free_trees": int(trees),
            "rooted_cores": int(roots),
            "active_rooted_cores": int(active),
            "Delta5_minimum": int(minimum),
            "Delta5_active_minimum": None if active_minimum == "NA" else int(active_minimum),
        }
        rows.append(row)
    assert [row["order"] for row in rows] == list(range(1, 21))
    for row in rows:
        order = row["order"]
        assert row["free_trees"] == EXPECTED[order]
        assert row["rooted_cores"] == order * EXPECTED[order]
        assert row["Delta5_minimum"] >= 0
        if row["Delta5_active_minimum"] is not None:
            assert row["Delta5_active_minimum"] > 0
    totals = {
        "free_trees": sum(row["free_trees"] for row in rows),
        "rooted_cores": sum(row["rooted_cores"] for row in rows),
        "active_rooted_cores": sum(row["active_rooted_cores"] for row in rows),
    }
    assert totals == {
        "free_trees": 1346024,
        "rooted_cores": 26056124,
        "active_rooted_cores": 26053352,
    }
    payload = {
        "schema": "rank8-terminal-delta5-finite-wrom-v1",
        "status": marker,
        "scope": "every vertex root of every WROM free tree of orders 1 through 20",
        "arithmetic": "exact i128",
        "build": "rustc -O --target x86_64-pc-windows-gnu",
        "rows": rows,
        "totals": totals,
        "artifacts_sha256": {
            SOURCE.name: sha256(SOURCE),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(marker)
    print(OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())



