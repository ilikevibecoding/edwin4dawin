#!/usr/bin/env python3
"""Run adjacent-g2 small-order branches in locked fresh processes.

Each order is one complete 256-corner process.  The probe's OS lock, the
console lock markers, and a post-process worker census are frozen alongside
the exact report so that an interrupted wrapper cannot silently leave a
worker behind.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys


HERE = Path(__file__).resolve().parent
PROBE = HERE / "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
PROBE_MARKER = "PROBE_EXACT_ISO_N5_G2_ADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_RANK5_G2_ALT"
RUNNER_MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_SMALL_STRICT_SERIAL_REPLAY_RUNNER_RANK5_G2_ALT"
EVIDENCE_MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_SMALL_EXCLUSIVE_SERIAL_EVIDENCE_RANK5_G2_ALT"
LOCK_ACQUIRED_MARKER = "ISO_N5_G2_ADJACENT_EXCLUSIVE_LOCK_ACQUIRED"
LOCK_RELEASED_MARKER = "ISO_N5_G2_ADJACENT_EXCLUSIVE_LOCK_RELEASED"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical(order: int) -> Path:
    return HERE / (
        f"iso_n5_g2_adjacent_order_box_edge_budget_small{order}_0_256_"
        "flint_probe_rank5_g2_alt_20260830.json"
    )


def frozen(order: int, replay: int) -> Path:
    return HERE / (
        f"iso_n5_g2_adjacent_order_box_edge_budget_small{order}_0_256_"
        f"serial_replay{replay}_rank5_g2_alt_20260830.json"
    )


def evidence_path(order: int, replay: int) -> Path:
    return HERE / (
        f"iso_n5_g2_adjacent_small{order}_serial_replay{replay}_"
        "execution_evidence_rank5_g2_alt_20260830.json"
    )


def post_batch_probe_worker_count() -> int:
    command = (
        "$rows=@(Get-CimInstance Win32_Process | Where-Object { "
        "$_.Name -like 'python*' -and $_.CommandLine -like "
        f"'*{PROBE.name}*' }}); [Console]::Write($rows.Count)"
    )
    result = subprocess.run(
        ["pwsh", "-NoProfile", "-Command", command],
        cwd=HERE, text=True, capture_output=True, check=False,
    )
    assert result.returncode == 0, result.stderr
    return int(result.stdout.strip())


def validate(report: dict, order: int) -> None:
    assert report["marker"] == PROBE_MARKER
    assert report["branch"] == (
        f"adjacent marks, mB={order}, mC>=7, |A|>=13"
    )
    assert report["corner_pairs"] == 256
    assert report["passing_corner_pairs"] == 256
    assert report["failing_corner_pairs"] == 0
    assert [(row["B_mask"], row["C_mask"]) for row in report["records"]] == [
        (bmask, cmask) for bmask in range(16) for cmask in range(16)
    ]
    assert all(row["negative"] == 0 for row in report["records"])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--replay", type=int, choices=(1, 2), required=True)
    parser.add_argument(
        "--orders", type=int, nargs="+", choices=range(7), required=True
    )
    parser.add_argument("--chunk-columns", type=int, required=True)
    args = parser.parse_args()

    for order in args.orders:
        command = [
            sys.executable, PROBE.name, "--small-order", str(order),
            "--chunk-columns", str(args.chunk_columns),
        ]
        result = subprocess.run(
            command, cwd=HERE, text=True, capture_output=True, check=False
        )
        if result.returncode != 0 or PROBE_MARKER not in result.stdout:
            print(result.stdout)
            print(result.stderr, file=sys.stderr)
            raise AssertionError((order, result.returncode))
        assert result.stdout.count(LOCK_ACQUIRED_MARKER) == 1
        assert result.stdout.count(LOCK_RELEASED_MARKER) == 1
        workers = post_batch_probe_worker_count()
        assert workers == 0, (order, workers)

        report_path = canonical(order)
        report = json.loads(report_path.read_text(encoding="utf-8"))
        validate(report, order)
        destination = frozen(order, args.replay)
        shutil.copyfile(report_path, destination)
        evidence = {
            "marker": EVIDENCE_MARKER,
            "replay": args.replay,
            "order": order,
            "chunk_columns": args.chunk_columns,
            "probe_report": destination.name,
            "probe_report_sha256": sha256(destination),
            "probe_source_sha256": report["source_sha256"],
            "lock_acquired_marker_count": 1,
            "lock_released_marker_count": 1,
            "post_batch_probe_worker_count": workers,
            "child_returncode": result.returncode,
            "runner_source_sha256": sha256(Path(__file__)),
        }
        evidence_path(order, args.replay).write_text(
            json.dumps(evidence, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        print(json.dumps({
            "replay": args.replay,
            "order": order,
            "chunk_columns": args.chunk_columns,
            "ordered_record_sha256": report["ordered_record_sha256"],
            "report_sha256": sha256(destination),
            "lock_acquired": True,
            "lock_released": True,
            "post_batch_probe_worker_count": workers,
        }, sort_keys=True), flush=True)
    print(RUNNER_MARKER)


if __name__ == "__main__":
    main()
