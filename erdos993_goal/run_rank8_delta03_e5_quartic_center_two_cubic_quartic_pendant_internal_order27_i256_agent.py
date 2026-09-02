#!/usr/bin/env python3
"""Hash-pinned runner for the exact e=5, order-27 quartic-pendant-internal census."""

from __future__ import annotations

import ctypes
import hashlib
import json
import subprocess
import threading
import time
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXE = HERE / "verify_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_i256_agent.exe"
OUTPUT = HERE / "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_exact_agent_20260823.json"
EXPECTED = {
    "verify_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_i256_agent.rs":
        "0A8D0253E74C9A7D386B5328F96A9D13C3974DC5DFD17977CC1C4370AAA58AB2",
    "verify_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_i256_agent.exe":
        "A7C8C3E3FF11EA51E9CB26D3B6BC5D0634BCB33741ED5FDA2E9FBA00A1EBD2DD",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
}
PASS = "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_PENDANT_INTERNAL_ORDER27"
HARD_RSS_LIMIT = 500 * 1024 * 1024


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


class ProcessMemoryCounters(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.c_ulong),
        ("page_fault_count", ctypes.c_ulong),
        ("peak_working_set_size", ctypes.c_size_t),
        ("working_set_size", ctypes.c_size_t),
        ("quota_peak_paged_pool_usage", ctypes.c_size_t),
        ("quota_paged_pool_usage", ctypes.c_size_t),
        ("quota_peak_nonpaged_pool_usage", ctypes.c_size_t),
        ("quota_nonpaged_pool_usage", ctypes.c_size_t),
        ("pagefile_usage", ctypes.c_size_t),
        ("peak_pagefile_usage", ctypes.c_size_t),
    ]


def working_set(pid: int) -> int:
    handle = ctypes.windll.kernel32.OpenProcess(0x0400 | 0x0010, False, pid)
    if not handle:
        return 0
    counters = ProcessMemoryCounters()
    counters.cb = ctypes.sizeof(counters)
    ok = ctypes.windll.psapi.GetProcessMemoryInfo(handle, ctypes.byref(counters), counters.cb)
    ctypes.windll.kernel32.CloseHandle(handle)
    return int(counters.working_set_size) if ok else 0


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    started = time.perf_counter()
    process = subprocess.Popen(
        [str(EXE)], cwd=HERE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    stdout_parts: list[str] = []
    stderr_parts: list[str] = []
    stdout_thread = threading.Thread(
        target=lambda: stdout_parts.append(process.stdout.read()), daemon=True
    )
    stderr_thread = threading.Thread(
        target=lambda: stderr_parts.append(process.stderr.read()), daemon=True
    )
    stdout_thread.start()
    stderr_thread.start()
    peak = 0
    while process.poll() is None:
        peak = max(peak, working_set(process.pid))
        if peak >= HARD_RSS_LIMIT:
            process.kill()
            raise MemoryError(f"producer RSS {peak} reached hard limit {HARD_RSS_LIMIT}")
        time.sleep(0.01)
    stdout_thread.join()
    stderr_thread.join()
    runtime = time.perf_counter() - started
    stdout = "".join(stdout_parts)
    stderr = "".join(stderr_parts)
    assert process.returncode == 0, (process.returncode, stdout[-2000:], stderr[-2000:])
    lines = [line for line in stdout.splitlines() if line.strip()]
    assert len(lines) == 2, lines
    payload = json.loads(lines[0])
    assert lines[1] == payload["status"] == PASS
    assert payload["schema"] == "rank8-delta03-e5-quartic-center-two-cubic-quartic-pendant-internal-order27-i256-agent-v1"
    assert payload["order"] == 27 and payload["degree_surplus"] == 5
    assert payload["suppressed_skeleton"] == "quartic_center_two_cubic"
    assert payload["root_orbit"] == "quartic_pendant_internal"
    assert payload["rooted_automorphism_group_order"] == 8
    assert payload["suppressed_edges"] == 8
    assert payload["root_split_slots"] == 9
    assert payload["canonical_subdivisions"] == 191267
    assert payload["literal_root_checks"] == 191267
    assert payload["nonpositive"] == [0, 0, 0, 0]
    assert stderr == ""
    payload.update({
        "runtime_seconds": runtime,
        "peak_rss_bytes": peak,
        "hard_rss_limit_bytes": HARD_RSS_LIMIT,
        "runner_stderr": [],
        "compile_command": (
            "rustup run stable-x86_64-pc-windows-gnu rustc "
            "--target x86_64-pc-windows-gnu --edition=2021 -O "
            "-C overflow-checks=yes"
        ),
        "immutable_input_hashes": actual,
        "runner_source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Exactly e=5, n=27, suppressed skeleton quartic_center_two_cubic, "
            "root orbit quartic_pendant_internal, and Delta0..3. No other e=5 root orbit, "
            "order, forest-Q8, PGC, or Problem 993 claim."
        ),
    })
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CANONICAL", payload["canonical_subdivisions"], "ROOTS", payload["literal_root_checks"])
    print("PEAK", peak, "RUNTIME", runtime)
    print("SOURCE", payload["runner_source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()




