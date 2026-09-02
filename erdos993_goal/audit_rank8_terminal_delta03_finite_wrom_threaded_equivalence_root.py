#!/usr/bin/env python3
"""Compare the threaded WROM engine with the sealed serial order-23 census."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "verify_rank8_terminal_delta03_finite_wrom_threaded_root.exe"
SERIAL = ROOT / "rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json"
OUTPUT = ROOT / "rank8_terminal_delta03_finite_wrom_threaded_equivalence_root_20260823.json"
EXPECTED = {
    "verify_rank8_terminal_delta03_finite_wrom_threaded_root.rs": "D72084ED90E55501B881179DDA73148D64FCB29431102ADF5674E018380D2F89",
    "verify_rank8_terminal_delta03_finite_wrom_threaded_root.exe": "DC711B103514AF1DA5B303C8234F89A06FC61C19A5153D717164BF879AB37C47",
    "verify_rank8_terminal_delta5_finite.rs": "2C76D7E7C9312331F799AB252FC806056D0201BE25AFA18446B218515F2EE2D6",
    "verify_rank8_terminal_delta03_finite_n23.rs": "04637D9DAC26F23C0A7839C57D6BC3D7243D2A3D06240D17A5A18B84AE09788E",
    "rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json": "6161599896A4E9991B9D6E0B131D4075EC3C4230B9DB0A038CAF6108747427F4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    reference = json.loads(SERIAL.read_text(encoding="utf-8"))
    assert reference["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N23"
    primary = reference["primary"]
    completed = subprocess.run(
        [str(EXE), "23", "6"], cwd=ROOT, check=True,
        capture_output=True, text=True, timeout=1800,
    )
    assert not completed.stderr
    threaded = json.loads(completed.stdout.strip())
    assert threaded["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA03_FINITE_WROM_THREADED"
    comparisons = {
        "order": threaded["order"] == 23,
        "trees": threaded["trees"] == primary["trees"] == 14_828_074,
        "roots": threaded["roots"] == primary["roots"] == 341_045_702,
        "active": threaded["active"] == primary["active_roots"] == 341_045_702,
        "minima": threaded["minima"] == primary["minima"],
        "active_minima": threaded["active_minima"] == primary["active_minima"],
        "negative_counts": threaded["negative_counts"] == primary["negative_counts"] == [0, 0, 0, 0],
        "path_minimum_values": threaded["minima"] == primary["path_endpoint_witness"]["values"],
    }
    assert all(comparisons.values())
    ranges = threaded["worker_ranges"]
    assert len(ranges) == 6
    assert ranges[0]["start"] == 0 and ranges[-1]["stop"] == 14_828_074
    assert sum(row["processed"] for row in ranges) == 14_828_074
    assert all(ranges[index - 1]["stop"] == ranges[index]["start"] for index in range(1, 6))
    assert all(row["seen_prefix"] == row["stop"] for row in ranges)

    payload = {
        "schema": "rank8-terminal-delta03-finite-wrom-threaded-equivalence-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_THREADED_WROM_SERIAL_EQUIVALENCE_N23",
        "reference_order": 23,
        "reference_serial_report": SERIAL.name,
        "comparisons": comparisons,
        "threaded_worker_ranges": ranges,
        "threaded_minimum_witnesses": threaded["minimum_witnesses"],
        "threaded_runtime_seconds": threaded["runtime_seconds"],
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This proves engine equivalence on the complete order-23 universe. The order-27 census is a separate full run and requires its own literal-witness audit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
