#!/usr/bin/env python3
"""Compile and replay the exact Delta5 WROM complement at orders 21 and 22."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import subprocess


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "verify_rank8_terminal_delta5_finite.rs"
EXECUTABLE = ROOT / "verify_rank8_terminal_delta5_finite_n22.exe"
REPORT = ROOT / "rank8_terminal_delta5_finite_n21_n22_exact_20260817.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    expected = json.loads(REPORT.read_text(encoding="utf-8"))
    compile_run = subprocess.run(
        ["rustc", "-O", "--target", "x86_64-pc-windows-gnu", str(SOURCE), "-o", str(EXECUTABLE)],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if compile_run.returncode:
        raise RuntimeError(compile_run.stdout)
    run = subprocess.run(
        [str(EXECUTABLE), "21", "22"],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    marker = "PASS_EXACT_RANK8_TERMINAL_DELTA5_ALL_ROOTED_CORES_N21_THROUGH_N22"
    if run.returncode or marker not in run.stdout:
        raise RuntimeError(run.stdout)
    pattern = re.compile(
        r"core_n=(\d+) trees=(\d+) roots=(\d+) active=(\d+) "
        r"delta5_min=(-?\d+) active_min=(-?\d+) negative=0"
    )
    rows = []
    for line in run.stdout.splitlines():
        match = pattern.fullmatch(line)
        if match:
            order, trees, roots, active, minimum, active_minimum = map(int, match.groups())
            rows.append(
                {
                    "order": order,
                    "free_trees": trees,
                    "rooted_cores": roots,
                    "active_rooted_cores": active,
                    "Delta5_minimum": minimum,
                    "Delta5_active_minimum": active_minimum,
                }
            )
    assert rows == expected["rows"]
    assert sha256(SOURCE) == expected["artifacts_sha256"][SOURCE.name]
    print(marker)
    print("REPORT_SHA256", sha256(REPORT).upper())
    print("RANK8_TERMINAL_DELTA5_FINITE_N21_N22_REPLAY_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
