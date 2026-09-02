#!/usr/bin/env python3
"""Run selected adjacent-g2 large batches strictly serially and freeze a replay."""

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
SUBBATCH_ASSEMBLER = HERE / "assemble_iso_n5_g2_adjacent_serial_subbatches_rank5_g2_alt.py"
MARKER = "PROBE_EXACT_ISO_N5_G2_ADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_RANK5_G2_ALT"
RUNNER_MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_LARGE_STRICT_SERIAL_REPLAY_RUNNER_RANK5_G2_ALT"
LOCK_ACQUIRED_MARKER = "ISO_N5_G2_ADJACENT_EXCLUSIVE_LOCK_ACQUIRED"
LOCK_RELEASED_MARKER = "ISO_N5_G2_ADJACENT_EXCLUSIVE_LOCK_RELEASED"
EVIDENCE_MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_EXCLUSIVE_SERIAL_SUBBATCH_EVIDENCE_RANK5_G2_ALT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical(start: int, stop: int) -> Path:
    return HERE / (
        f"iso_n5_g2_adjacent_order_box_edge_budget_large_{start}_{stop}_"
        "flint_probe_rank5_g2_alt_20260830.json"
    )


def frozen(start: int, stop: int, replay: int) -> Path:
    return HERE / (
        f"iso_n5_g2_adjacent_order_box_edge_budget_large_{start}_{stop}_"
        f"serial_replay{replay}_rank5_g2_alt_20260830.json"
    )


def frozen_subbatch(start: int, stop: int, replay: int) -> Path:
    return HERE / (
        f"iso_n5_g2_adjacent_order_box_edge_budget_large_{start}_{stop}_"
        f"serial_replay{replay}_subbatch_rank5_g2_alt_20260830.json"
    )


def evidence_path(start: int, stop: int, replay: int) -> Path:
    return HERE / (
        f"iso_n5_g2_adjacent_large_{start}_{stop}_serial_replay{replay}_"
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--replay", type=int, choices=(1, 2, 3, 4), required=True)
    parser.add_argument(
        "--starts", type=int, nargs="+", choices=(0, 64, 128, 192), required=True
    )
    parser.add_argument("--chunk-columns", type=int, default=8192)
    parser.add_argument("--subbatch-size", type=int, choices=(1, 2, 4, 8, 16, 32, 64), default=16)
    args = parser.parse_args()
    for start in args.starts:
        stop = start + 64
        assert 64 % args.subbatch_size == 0
        for substart in range(start, stop, args.subbatch_size):
            command = [
                sys.executable, PROBE.name, "--start-corner", str(substart),
                "--max-corners", str(args.subbatch_size),
                "--chunk-columns", str(args.chunk_columns),
            ]
            result = subprocess.run(
                command, cwd=HERE, text=True, capture_output=True, check=False
            )
            if result.returncode != 0 or MARKER not in result.stdout:
                print(result.stdout)
                print(result.stderr, file=sys.stderr)
                raise AssertionError((substart, result.returncode))
            assert result.stdout.count(LOCK_ACQUIRED_MARKER) == 1
            assert result.stdout.count(LOCK_RELEASED_MARKER) == 1
            workers = post_batch_probe_worker_count()
            assert workers == 0, (substart, workers)
            substop = substart + args.subbatch_size
            subreport_path = canonical(substart, substop)
            subreport = json.loads(subreport_path.read_text(encoding="utf-8"))
            assert subreport["marker"] == MARKER
            assert subreport["corner_pairs"] == args.subbatch_size
            assert subreport["passing_corner_pairs"] == args.subbatch_size
            assert subreport["failing_corner_pairs"] == 0
            subdestination = frozen_subbatch(substart, substop, args.replay)
            shutil.copyfile(subreport_path, subdestination)
            evidence = {
                "marker": EVIDENCE_MARKER,
                "replay": args.replay,
                "subrange": [substart, substop],
                "chunk_columns": args.chunk_columns,
                "probe_report": subdestination.name,
                "probe_report_sha256": sha256(subdestination),
                "probe_source_sha256": subreport["source_sha256"],
                "lock_acquired_marker_count": 1,
                "lock_released_marker_count": 1,
                "post_batch_probe_worker_count": workers,
                "child_returncode": result.returncode,
                "runner_source_sha256": sha256(Path(__file__)),
            }
            evidence_raw = json.dumps(evidence, indent=2, sort_keys=True) + "\n"
            evidence_path(substart, substop, args.replay).write_text(
                evidence_raw, encoding="utf-8"
            )
            print(json.dumps({
                "replay": args.replay,
                "subrange": [substart, substart + args.subbatch_size],
                "chunk_columns": args.chunk_columns,
                "lock_acquired": True,
                "lock_released": True,
                "post_batch_probe_worker_count": workers,
                "execution_evidence": evidence_path(
                    substart, substop, args.replay
                ).name,
            }, sort_keys=True), flush=True)
        if args.subbatch_size < 64:
            result = subprocess.run(
                [
                    sys.executable, SUBBATCH_ASSEMBLER.name,
                    "--batch-start", str(start),
                    "--subbatch-size", str(args.subbatch_size),
                ],
                cwd=HERE, text=True, capture_output=True, check=False,
            )
            if result.returncode != 0 or MARKER not in result.stdout:
                print(result.stdout)
                print(result.stderr, file=sys.stderr)
                raise AssertionError(("assemble", start, result.returncode))
        report = json.loads(canonical(start, stop).read_text(encoding="utf-8"))
        assert report["marker"] == MARKER
        assert report["corner_pairs"] == 64
        assert report["passing_corner_pairs"] == 64
        assert report["failing_corner_pairs"] == 0
        destination = frozen(start, stop, args.replay)
        shutil.copyfile(canonical(start, stop), destination)
        print(json.dumps({
            "replay": args.replay,
            "range": [start, stop],
            "chunk_columns": args.chunk_columns,
            "subbatch_size": args.subbatch_size,
            "ordered_record_sha256": report["ordered_record_sha256"],
            "frozen": destination.name,
        }, sort_keys=True), flush=True)
    print(RUNNER_MARKER)


if __name__ == "__main__":
    main()
