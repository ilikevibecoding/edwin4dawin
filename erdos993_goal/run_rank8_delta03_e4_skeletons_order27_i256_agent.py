#!/usr/bin/env python3
"""Hash-pinned runner for the exact e=4 order-27 checked-i256 census."""

from __future__ import annotations

import hashlib
import json
import ctypes
import subprocess
import threading
import time
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXE = HERE / "verify_rank8_delta03_e4_skeletons_order27_i256_agent.exe"
OUTPUT = HERE / "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json"
EXPECTED = {
    "verify_rank8_delta03_e4_skeletons_order27_i256_agent.rs": "5C80FB8E23AF04BFFC7F4B6BCDAACC1A6A2F8071E7E7A65C56262B058149D1CB",
    "verify_rank8_delta03_e4_skeletons_order27_i256_agent.exe": "B4CD42C7F15D8B115FB50D0891A35CB5891E47BFC485BA283B4CB010E7F1F239",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


class ProcessMemoryCounters(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.c_ulong), ("page_fault_count", ctypes.c_ulong),
        ("peak_working_set_size", ctypes.c_size_t), ("working_set_size", ctypes.c_size_t),
        ("quota_peak_paged_pool_usage", ctypes.c_size_t), ("quota_paged_pool_usage", ctypes.c_size_t),
        ("quota_peak_nonpaged_pool_usage", ctypes.c_size_t), ("quota_nonpaged_pool_usage", ctypes.c_size_t),
        ("pagefile_usage", ctypes.c_size_t), ("peak_pagefile_usage", ctypes.c_size_t),
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
    assert actual == EXPECTED
    started = time.perf_counter()
    process = subprocess.Popen([str(EXE)], cwd=HERE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout_parts: list[str] = []
    stderr_parts: list[str] = []
    stdout_thread = threading.Thread(target=lambda: stdout_parts.append(process.stdout.read()), daemon=True)
    stderr_thread = threading.Thread(target=lambda: stderr_parts.append(process.stderr.read()), daemon=True)
    stdout_thread.start()
    stderr_thread.start()
    peak = 0
    while process.poll() is None:
        peak = max(peak, working_set(process.pid))
        time.sleep(0.1)
    stdout_thread.join()
    stderr_thread.join()
    stdout = "".join(stdout_parts)
    stderr = "".join(stderr_parts)
    assert process.returncode == 0, (process.returncode, stdout[-2000:], stderr[-2000:])
    lines = [line for line in stdout.splitlines() if line.strip()]
    assert len(lines) == 2
    payload = json.loads(lines[0])
    assert lines[1] == payload["status"] == "PASS_EXACT_RANK8_DELTA03_E4_SKELETONS_ALL_ROOTS_ORDER27"
    assert payload["order"] == 27 and len(payload["skeletons"]) == 3
    assert sum(len(row["root_orbits"]) for row in payload["skeletons"]) == 20
    assert all(value == 0 for skeleton in payload["skeletons"] for orbit in skeleton["root_orbits"] for value in orbit["nonpositive"])
    assert peak < 500 * 1024 * 1024
    payload.update({
        "runtime_seconds": time.perf_counter() - started,
        "peak_rss_bytes": peak,
        "runner_stderr": stderr.splitlines(),
        "immutable_input_hashes": actual,
        "runner_source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exact finite order-27 e=4 theorem only. The n>=28 extension, all-order cells, e>=5, forests, and Problem 993 remain separate.",
    })
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TREES", payload["canonical_subdivisions"], "ROOTS", payload["literal_root_checks"])
    print("PEAK", peak, "RUNTIME", payload["runtime_seconds"])
    print("SOURCE", payload["runner_source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
