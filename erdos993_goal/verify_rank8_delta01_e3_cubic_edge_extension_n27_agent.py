#!/usr/bin/env python3
"""Seal the exact n=27 to n=28 cubic-skeleton edge-extension census."""

from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BASE = ROOT / "verify_rank8_delta01_e3_cubic_skeleton_order_agent.rs"
SOURCE = ROOT / "scout_rank8_delta01_e3_cubic_edge_extension_order_agent.rs"
EXECUTABLE = ROOT / "scout_rank8_delta01_e3_cubic_edge_extension_order_agent.exe"
OUTPUT = ROOT / "rank8_delta01_e3_cubic_edge_extension_n27_exact_agent_20260822.json"
EXPECTED = {
    BASE.name: "8C964E7AC0A760702AFED818481B8560EDCAAC865C9A81239FB0750772EBEA12",
    SOURCE.name: "3063B8D2A9459242F2A689011E058ADE56E84BF1E006A6A1A2BBE8EA3FA67CB2",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    compiler = subprocess.run(
        ["rustup", "run", "stable-x86_64-pc-windows-gnu", "rustc", "--version"],
        cwd=ROOT, text=True, capture_output=True, check=True,
    ).stdout.strip()
    subprocess.run(
        [
            "rustup", "run", "stable-x86_64-pc-windows-gnu", "rustc", "-O",
            str(SOURCE), "-o", str(EXECUTABLE),
        ],
        cwd=ROOT, check=True,
    )
    started = time.perf_counter()
    replay = subprocess.run(
        [str(EXECUTABLE), "27"], cwd=ROOT, text=True, capture_output=True, check=True
    )
    runtime = time.perf_counter() - started
    lines = [line for line in replay.stdout.splitlines() if line]
    assert len(lines) == 1
    row = json.loads(lines[0])
    assert row["source_order"] == 27
    assert row["trees"] == 28448
    assert row["old_root_comparisons"] == 28448 * 7 * 27 == 5376672
    assert row["inserted_roots"] == 28448 * 7 == 199136
    for key in (
        "negative_increment0", "negative_increment1",
        "negative_inserted0", "negative_inserted1",
    ):
        assert row[key] == 0
    for key in (
        "minimum_increment0", "minimum_increment1",
        "minimum_inserted0", "minimum_inserted1",
    ):
        assert int(row[key]) > 0
    payload = {
        "schema": "rank8-delta01-e3-cubic-edge-extension-n27-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_EDGE_EXTENSIONS_N27_TO_N28",
        "scope": (
            "every canonical order-27 cubic e=3 core, every one of its seven "
            "skeleton edges extended by one vertex, every old root, and the inserted root"
        ),
        "classification": "exact finite extension evidence; not an all-order induction theorem",
        "result": row,
        "runtime_seconds": runtime,
        "checked_arithmetic": "all integer additions, subtractions, and multiplications use checked i128",
        "compiler": compiler,
        "executable_sha256": sha256(EXECUTABLE),
        "stdout_sha256": hashlib.sha256(replay.stdout.encode("utf-8")).hexdigest().upper(),
        "immutable_sources": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "The extension signs are proved only for source order 27. This is pinned "
            "evidence for the proposed induction, not the symbolic induction step."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
