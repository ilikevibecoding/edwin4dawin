#!/usr/bin/env python3
"""Exhaust and seal all seven all-short cubic Delta2/Delta3 root orbits."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXE = ROOT / "probe_rank8_delta23_e3_cubic_all_short_i256_root.exe"
AUDIT_REPORT = ROOT / "rank8_delta23_e3_cubic_all_short_i256_root_independent_audit_20260823.json"
CHECKPOINT = ROOT / "rank8_delta23_e3_cubic_all_short_i256_checkpoint_root_20260823.json"
REPORT = ROOT / "rank8_delta23_e3_cubic_all_short_complete_exact_root_20260823.json"
COUNTS = {
    "outer_branch": 80_652,
    "middle_branch": 40_553,
    "outer_leaf": 182_356,
    "middle_leaf": 53_218,
    "outer_pendant_internal": 2_349_983,
    "middle_pendant_internal": 676_950,
    "spine_internal": 1_286_834,
}
EXPECTED = {
    "probe_rank8_delta23_e3_cubic_all_short_i256_root.rs": "D5E11C6D8CE0A5532BA62F440CFA9C3B643BC455A65A114C699096230CF2D690",
    "probe_rank8_delta23_e3_cubic_all_short_i256_root.exe": "E6F59896151D0FFC90572202F5EEA630307DFFE738746FD1C3B04FE2A2624AA2",
    "rank8_delta03_e3_cubic_exact_i256_core_root.rs": "7502104CEE850E1B621EF35B88B56530D35195703372306F94AF8671A040AD1F",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "audit_rank8_delta23_e3_cubic_all_short_i256_root.py": "180D227F86C2F3B8A40A906576FF27EF2ED013889315721F426021398259510B",
    "rank8_delta23_e3_cubic_all_short_i256_root_independent_audit_20260823.json": "08505386C2E5E988C641C28FA76C62DA35527211763B6727A47B23A3F50645E8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def validate_row(root: str, row: dict) -> None:
    assert row["status"] == "PASS_EXACT_DELTA23_ALL_SHORT_I256_CHUNK"
    assert row["root"] == root
    assert row["start"] == 0 and row["stop"] == COUNTS[root]
    assert row["processed"] == row["universe"] == COUNTS[root]
    assert row["negative2"] == row["negative3"] == 0
    assert int(row["minimum2"]) > 0 and int(row["minimum3"]) > 0


def checkpoint(rows: dict, immutable_inputs: dict, source_hash: str) -> dict:
    return {
        "schema": "rank8-delta23-e3-cubic-all-short-i256-checkpoint-root-v1",
        "status": "RUNNING_EXACT_DELTA23_E3_CUBIC_ALL_SHORT",
        "completed_root_orbits": len(rows),
        "total_root_orbits": len(COUNTS),
        "completed_patterns": sum(COUNTS[root] for root in rows),
        "total_patterns": sum(COUNTS.values()),
        "rows": rows,
        "immutable_inputs": immutable_inputs,
        "source_sha256": source_hash,
    }


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    route_audit = json.loads(AUDIT_REPORT.read_text(encoding="utf-8"))
    assert route_audit["status"] == "PASS_INDEPENDENT_LITERAL_TREE_DELTA23_ALL_SHORT_I256_ROUTE_AUDIT"
    source_hash = sha256(Path(__file__))
    rows: dict[str, dict] = {}
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["immutable_inputs"] == actual
        assert saved["source_sha256"] == source_hash
        rows = saved["rows"]
        for root, row in rows.items():
            validate_row(root, row)
    atomic_json(CHECKPOINT, checkpoint(rows, actual, source_hash))

    for root, count in COUNTS.items():
        if root in rows:
            continue
        started = time.perf_counter()
        completed = subprocess.run(
            [str(EXE), root, "0", str(count)],
            cwd=ROOT, check=True, capture_output=True, text=True, timeout=14_400,
        )
        assert not completed.stderr, completed.stderr
        row = json.loads(completed.stdout.strip().splitlines()[-1])
        validate_row(root, row)
        row["wall_seconds"] = time.perf_counter() - started
        rows[root] = row
        atomic_json(CHECKPOINT, checkpoint(rows, actual, source_hash))
        print("PASS", root, count, f"{row['wall_seconds']:.3f}s", flush=True)

    assert set(rows) == set(COUNTS)
    payload = {
        "schema": "rank8-delta23-e3-cubic-all-short-complete-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_ALL_SHORT_COMPLETE_N37_PLUS",
        "theorem": "For every rooted all-short cubic e=3 subdivision core of order n>=37, Delta2>0 and Delta3>0.",
        "coverage": {
            "root_orbits": len(rows),
            "patterns": sum(COUNTS.values()),
            "negative_or_zero_Delta2": sum(row["negative2"] for row in rows.values()),
            "negative_or_zero_Delta3": sum(row["negative3"] for row in rows.values()),
        },
        "rows": rows,
        "checked_arithmetic": "checked i128 matching vectors and checked signed i256 residual arithmetic",
        "independent_route_audit_sha256": EXPECTED[AUDIT_REPORT.name],
        "immutable_inputs": actual,
        "source_sha256": source_hash,
        "scope_warning": "This closes only the all-short n>=37 cubic Delta2/Delta3 sector. Orders n=27..36, all-long cells, mixed rays, the quartic-star e=3 skeleton, higher-surplus connected cores, forest Q8, PGC, and Problem 993 remain separately gated.",
    }
    atomic_json(REPORT, payload)
    complete = checkpoint(rows, actual, source_hash)
    complete["status"] = "COMPLETE_EXACT_DELTA23_E3_CUBIC_ALL_SHORT"
    complete["report_sha256"] = sha256(REPORT)
    atomic_json(CHECKPOINT, complete)
    print(payload["status"])
    print("SOURCE", source_hash)
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
