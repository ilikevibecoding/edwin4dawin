#!/usr/bin/env python3
"""Run exact oracle/fast comparisons and preserve timing and peak-memory data."""

from __future__ import annotations

import ast
import concurrent.futures
import ctypes
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ORIGINAL = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_flint.py"
FAST = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent_v3.py"
SEED = ROOT / "rank8_low_low_suffix3_gap0_factored_early_payment_cell_0_0_1_0_exact_20260822.json"
SYMBOLIC = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_symbolic_identity_audit_20260822.json"
OUTPUT = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_equivalence_exact_20260822.json"
EXPECTED = {
    ORIGINAL.name:
        "00288AAF49B4A002240AD1DB153DA9195FDC763B84AA8BDDBCA036F70A1A8870",
    FAST.name:
        "72149062A17FF2A0FEB427BE2D15AD66E532387DDB138CB9E3C3C150615B8F89",
    SEED.name:
        "EB62BF83E26F4F5E93B166829652D5E9996FBA13BF29731A644399B74A94529E",
    SYMBOLIC.name:
        "B3388F03E9AE5A535E4A354D861364C17B31F4F92F7F0E31F27154261D47AA0E",
}
SEED_TARGET = (0, 0, 1, 0)
BOUNDARY_TARGET = (0, 0, 0, 1)


class ProcessMemoryCounters(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.c_ulong),
        ("PageFaultCount", ctypes.c_ulong),
        ("PeakWorkingSetSize", ctypes.c_size_t),
        ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
        ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
    ]


def peak_working_set(process) -> int:
    counters = ProcessMemoryCounters()
    counters.cb = ctypes.sizeof(counters)
    success = ctypes.windll.psapi.GetProcessMemoryInfo(
        int(process._handle), ctypes.byref(counters), counters.cb,
    )
    assert success
    return int(counters.PeakWorkingSetSize)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def key(row):
    return (
        row["a3_exponent"], row["b3_exponent"],
        row["a0_exponent"], row["b0_exponent"],
    )


def run_probe(path: Path, target, profile=False):
    command = [
        sys.executable, str(path),
        "--a3", str(target[0]), "--b3", str(target[1]),
        "--a0", str(target[2]), "--b0", str(target[3]),
    ]
    if profile:
        command.append("--profile")
    started = time.perf_counter()
    process = subprocess.Popen(
        command, cwd=ROOT, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    peak_rss = 0
    while process.poll() is None:
        peak_rss = max(peak_rss, peak_working_set(process))
        time.sleep(0.2)
    peak_rss = max(peak_rss, peak_working_set(process))
    stdout, stderr = process.communicate()
    elapsed = time.perf_counter() - started
    assert process.returncode == 0, (path.name, process.returncode, stderr)
    lines = [line for line in stdout.splitlines() if line.strip()]
    assert len(lines) == 1
    row = ast.literal_eval(lines[0])
    assert key(row) == target
    profile_data = None
    if profile:
        error_lines = [line for line in stderr.splitlines() if line.strip()]
        assert len(error_lines) == 1
        profile_data = json.loads(error_lines[0])
    else:
        assert not stderr.strip()
    return {
        "probe": path.name,
        "row": row,
        "elapsed_seconds": elapsed,
        "peak_rss_bytes": peak_rss,
        "profile": profile_data,
    }


def seeded_oracle_row():
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    assert seed["status"] == "PASS_EXACT_FACTORED_EARLY_PAYMENT_CELL"
    assert tuple(seed["outer_cell"]) == SEED_TARGET
    return {
        "a3_exponent": SEED_TARGET[0],
        "b3_exponent": SEED_TARGET[1],
        "a0_exponent": SEED_TARGET[2],
        "b0_exponent": SEED_TARGET[3],
        "rows": seed["rows"],
        "pass": True,
    }


def main():
    actual = {
        path.name: sha256(path)
        for path in (ORIGINAL, FAST, SEED, SYMBOLIC)
    }
    assert actual == EXPECTED
    symbolic = json.loads(SYMBOLIC.read_text(encoding="utf-8"))
    assert symbolic["status"] == "PASS_EXACT_SYMBOLIC_CACHED_QUADRATIC_IDENTITY"

    fast_seed = run_probe(FAST, SEED_TARGET, profile=True)
    seed_oracle = seeded_oracle_row()
    assert fast_seed["row"] == seed_oracle

    # Pair the non-seed runs so both measurements see the same machine load.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        oracle_future = executor.submit(run_probe, ORIGINAL, BOUNDARY_TARGET, False)
        fast_future = executor.submit(run_probe, FAST, BOUNDARY_TARGET, True)
        oracle_boundary = oracle_future.result()
        fast_boundary = fast_future.result()
    assert fast_boundary["row"] == oracle_boundary["row"]
    speedup = oracle_boundary["elapsed_seconds"] / fast_boundary["elapsed_seconds"]

    report = {
        "schema": "rank8-low-low-suffix3-gap0-fast-agent-equivalence-v1",
        "status": "PASS_EXACT_FAST_AGENT_ORACLE_EQUIVALENCE",
        "seed": {
            "target": list(SEED_TARGET),
            "oracle": SEED.name,
            "full_row_dictionary_equal": True,
            "fast_measurement": fast_seed,
        },
        "paired_boundary": {
            "target": list(BOUNDARY_TARGET),
            "full_row_dictionary_equal": True,
            "oracle_measurement": oracle_boundary,
            "fast_measurement": fast_boundary,
            "wall_speedup": speedup,
            "wall_reduction_percent": 100 * (1 - 1 / speedup),
        },
        "symbolic_identity": {
            "report": SYMBOLIC.name,
            "sha256": EXPECTED[SYMBOLIC.name],
            "status": symbolic["status"],
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    main()
