#!/usr/bin/env python3
"""Validate the six-thread Delta2/Delta3 scanner against a sealed serial orbit."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "verify_rank8_delta23_e3_cubic_mixed_newton_i256_threaded_root.exe"
SERIAL = ROOT / "rank8_delta23_e3_cubic_mixed_middle_branch_0_296693_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta23_e3_cubic_mixed_i256_threaded_serial_equivalence_root_20260823.json"
EXPECTED = {
    "verify_rank8_delta23_e3_cubic_mixed_newton_i256_thread_core_root.rs": "69F57D15D4DB28847DD48E0EDAD3FEC7BDCAC8AB5E5CD146445474A24D31AC25",
    "verify_rank8_delta23_e3_cubic_mixed_newton_i256_threaded_root.rs": "E40E69CB62E74364EE29C052D870774C282A1AAA0F5EC6E0DBC0B85039370B2E",
    "verify_rank8_delta23_e3_cubic_mixed_newton_i256_threaded_root.exe": "F5B662A2FE62BBA2A2280B233877A042F5CF7B5C6A62976305B92A811EE3A024",
    "rank8_delta23_e3_cubic_mixed_middle_branch_0_296693_exact_root_20260823.json": "50CB1F80E6CED2F1BAA3ECBBBC25B286012336081627B9118C2BDEF46A7E3D04",
    "rank8_delta23_e3_cubic_mixed_middle_branch_independent_audit_root_20260823.json": "1A3523030D559F4C10C8C54812EA4ED698E1B6D3C3F73FE2F6B9915DA818FF1A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    serial = json.loads(SERIAL.read_text(encoding="utf-8"))
    assert serial["status"] == "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_MIXED_NEWTON_CHUNK"
    assert serial["scope"] == {
        "root_location_orbit": "middle_branch", "start": 0, "stop": 296693,
        "processed": 296693, "full_orbit_universe": 296693,
    }
    completed = subprocess.run(
        [str(EXE), "middle_branch", "6"], cwd=ROOT, check=True,
        capture_output=True, text=True, timeout=600,
    )
    assert not completed.stderr
    threaded = json.loads(completed.stdout.strip())
    assert threaded["status"] == "PASS_EXACT_DELTA23_MIXED_NEWTON_I256_THREADED_FULL_UNIT"
    assert threaded["start"] == 0
    assert threaded["stop"] == threaded["processed"] == threaded["universe"] == 296693
    assert threaded["negative2"] == threaded["negative3"] == 0
    acceptance = serial["acceptance"]
    comparisons = {
        "negative2": threaded["negative2"] == acceptance["Delta2_negative_or_failed_rays"],
        "negative3": threaded["negative3"] == acceptance["Delta3_negative_or_failed_rays"],
        "zero_higher": threaded["zero_higher"] == acceptance["zero_higher_newton_coefficients"],
        "minimum_base2": threaded["minimum_base2"] == acceptance["minimum_Delta2_base"],
        "minimum_base3": threaded["minimum_base3"] == acceptance["minimum_Delta3_base"],
        "minimum_first2": threaded["minimum_first2"] == acceptance["minimum_Delta2_first_difference"],
        "minimum_first3": threaded["minimum_first3"] == acceptance["minimum_Delta3_first_difference"],
        "witness_base2": threaded["witness_base2"] == acceptance["witness_base2"],
        "witness_base3": threaded["witness_base3"] == acceptance["witness_base3"],
        "witness_first2": threaded["witness_first2"] == acceptance["witness_first2"],
        "witness_first3": threaded["witness_first3"] == acceptance["witness_first3"],
    }
    assert all(comparisons.values())
    ranges = threaded["worker_ranges"]
    assert len(ranges) == 6
    assert ranges[0]["start"] == 0 and ranges[-1]["stop"] == 296693
    assert sum(row["processed"] for row in ranges) == 296693
    assert all(ranges[index - 1]["stop"] == ranges[index]["start"] for index in range(1, 6))
    assert all(row["universe"] == 296693 for row in ranges)

    payload = {
        "schema": "rank8-delta23-e3-cubic-mixed-i256-threaded-serial-equivalence-root-v1",
        "status": "PASS_EXACT_DELTA23_I256_THREADED_SERIAL_EQUIVALENCE",
        "reference_orbit": "middle_branch",
        "reference_universe": 296693,
        "threads": 6,
        "exact_field_comparisons": comparisons,
        "worker_ranges": ranges,
        "range_partition_adjacent_no_gap_no_overlap": True,
        "threaded_runtime_seconds": threaded["runtime_seconds"],
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This validates threaded versus serial equivalence on a complete sealed orbit; each later full orbit remains separately audited after its exhaustive threaded scan.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
