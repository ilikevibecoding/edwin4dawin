#!/usr/bin/env python3
"""Locked fresh-process replays for all nonadjacent coarse-D g2 branches."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path
import shutil
import subprocess
import sys


HERE = Path(__file__).resolve().parent
PROBE = HERE / "probe_iso_n5_g2_nonadjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
PROBE_MARKER = "PROBE_EXACT_ISO_N5_G2_NONADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_RANK5_G2_ALT"
RUNNER_MARKER = "PASS_EXACT_ISO_N5_G2_NONADJACENT_STRICT_SERIAL_REPLAY_RUNNER_RANK5_G2_ALT"
EVIDENCE_MARKER = "PASS_EXACT_ISO_N5_G2_NONADJACENT_EXCLUSIVE_SERIAL_EVIDENCE_RANK5_G2_ALT"
LOCK_ACQUIRED_MARKER = "ISO_N5_G2_NONADJACENT_EXCLUSIVE_LOCK_ACQUIRED"
LOCK_RELEASED_MARKER = "ISO_N5_G2_NONADJACENT_EXCLUSIVE_LOCK_RELEASED"
GEOMETRIES = ("connected_long", "common_neighbor")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def label(small_order: int | None) -> str:
    return "large" if small_order is None else f"small{small_order}"


def canonical(geometry: str, small_order: int | None, start: int, stop: int) -> Path:
    return HERE / (
        "iso_n5_g2_nonadjacent_order_box_edge_budget_"
        f"{geometry}_coarse_{label(small_order)}_{start}_{stop}_"
        "flint_probe_rank5_g2_alt_20260830.json"
    )


def frozen(
    geometry: str, small_order: int | None, start: int, stop: int,
    replay: int, subbatch: bool = False,
) -> Path:
    suffix = "_subbatch" if subbatch else ""
    return HERE / (
        "iso_n5_g2_nonadjacent_order_box_edge_budget_"
        f"{geometry}_coarse_{label(small_order)}_{start}_{stop}_"
        f"serial_replay{replay}{suffix}_rank5_g2_alt_20260830.json"
    )


def evidence_path(
    geometry: str, small_order: int | None, start: int, stop: int, replay: int,
) -> Path:
    return HERE / (
        f"iso_n5_g2_nonadjacent_{geometry}_coarse_{label(small_order)}_"
        f"{start}_{stop}_serial_replay{replay}_execution_evidence_"
        "rank5_g2_alt_20260830.json"
    )


def post_probe_worker_count() -> int:
    command = (
        "$rows=@(Get-CimInstance Win32_Process | Where-Object { "
        "$_.Name -like 'python*' -and $_.CommandLine -like "
        f"'*{PROBE.name}*' }}); [Console]::Write($rows.Count)"
    )
    result = subprocess.run(
        ["pwsh", "-NoProfile", "-Command", command], cwd=HERE,
        text=True, capture_output=True, check=False,
    )
    assert result.returncode == 0, result.stderr
    return int(result.stdout.strip())


def validate(report: dict, geometry: str, small_order: int | None, count: int) -> None:
    assert report["marker"] == PROBE_MARKER
    assert report["geometry"] == geometry
    assert report["d_branch"] == "coarse"
    assert report["corner_pairs"] == count
    assert report["passing_corner_pairs"] == count
    assert report["failing_corner_pairs"] == 0
    assert len(report["records"]) == count
    assert all(row["negative"] == 0 for row in report["records"])
    expected_order = (
        "ordered mB<=mC with mB,mC>=7"
        if small_order is None else f"mB={small_order}, N=13+q"
    )
    assert report["order_branch"] == expected_order
    assert report["source_sha256"] == sha256(PROBE)


def run_child(
    geometry: str, small_order: int | None, start: int, count: int,
    replay: int, chunk_columns: int,
) -> tuple[dict, Path]:
    command = [
        sys.executable, PROBE.name, "--geometry", geometry,
        "--d-branch", "coarse", "--start-corner", str(start),
        "--max-corners", str(count), "--chunk-columns", str(chunk_columns),
    ]
    if small_order is not None:
        command.extend(["--small-order", str(small_order)])
    result = subprocess.run(
        command, cwd=HERE, text=True, capture_output=True, check=False
    )
    if result.returncode != 0 or PROBE_MARKER not in result.stdout:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        raise AssertionError((geometry, small_order, start, result.returncode))
    assert result.stdout.count(LOCK_ACQUIRED_MARKER) == 1
    assert result.stdout.count(LOCK_RELEASED_MARKER) == 1
    workers = post_probe_worker_count()
    assert workers == 0, (geometry, small_order, start, workers)
    stop = start + count
    path = canonical(geometry, small_order, start, stop)
    report = json.loads(path.read_text(encoding="utf-8"))
    validate(report, geometry, small_order, count)
    destination = frozen(
        geometry, small_order, start, stop, replay,
        subbatch=(small_order is None and count < 256),
    )
    shutil.copyfile(path, destination)
    evidence = {
        "marker": EVIDENCE_MARKER,
        "replay": replay,
        "geometry": geometry,
        "d_branch": "coarse",
        "order_branch": label(small_order),
        "small_order": small_order,
        "subrange": [start, stop],
        "chunk_columns": chunk_columns,
        "probe_report": destination.name,
        "probe_report_sha256": sha256(destination),
        "probe_source_sha256": sha256(PROBE),
        "lock_acquired_marker_count": 1,
        "lock_released_marker_count": 1,
        "post_batch_probe_worker_count": workers,
        "child_returncode": result.returncode,
        "runner_source_sha256": sha256(Path(__file__)),
    }
    evidence_file = evidence_path(geometry, small_order, start, stop, replay)
    evidence_file.write_text(
        json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "replay": replay, "geometry": geometry,
        "order_branch": label(small_order), "subrange": [start, stop],
        "chunk_columns": chunk_columns, "lock_acquired": True,
        "lock_released": True, "post_batch_probe_worker_count": workers,
        "ordered_record_sha256": report["ordered_record_sha256"],
        "report_sha256": sha256(destination),
    }, sort_keys=True), flush=True)
    return report, destination


def merge_large(geometry: str, reports: list[dict], replay: int) -> Path:
    records = [record for report in reports for record in report["records"]]
    assert len(records) == 256
    assert [(row["B_mask"], row["C_mask"]) for row in records] == list(
        itertools.product(range(16), repeat=2)
    )
    digest = hashlib.sha256()
    for row in records:
        digest.update(json.dumps(row, separators=(",", ":"), sort_keys=True).encode())
    merged = {
        key: value for key, value in reports[0].items()
        if key not in {
            "corner_pairs", "passing_corner_pairs", "failing_corner_pairs",
            "ordered_record_sha256", "records",
        }
    }
    merged.update({
        "corner_pairs": 256,
        "passing_corner_pairs": 256,
        "failing_corner_pairs": 0,
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
        "serial_subbatch_size": len(reports[0]["records"]),
        "serial_subbatch_count": len(reports),
    })
    raw = json.dumps(merged, indent=2, sort_keys=True) + "\n"
    canonical_path = canonical(geometry, None, 0, 256)
    canonical_path.write_text(raw, encoding="utf-8")
    destination = frozen(geometry, None, 0, 256, replay)
    shutil.copyfile(canonical_path, destination)
    print(json.dumps({
        "replay": replay, "geometry": geometry, "order_branch": "large",
        "frozen": destination.name,
        "ordered_record_sha256": merged["ordered_record_sha256"],
        "report_sha256": sha256(destination),
    }, sort_keys=True), flush=True)
    return destination


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--replay", type=int, choices=(1, 2), required=True)
    parser.add_argument("--chunk-columns", type=int, required=True)
    parser.add_argument("--geometries", nargs="+", choices=GEOMETRIES, default=list(GEOMETRIES))
    parser.add_argument(
        "--orders", nargs="+", default=["large", *map(str, range(7))],
        choices=("large", *map(str, range(7))),
    )
    parser.add_argument("--subbatch-size", type=int, choices=(8, 16, 32, 64), default=16)
    args = parser.parse_args()

    for geometry in args.geometries:
        for order_token in args.orders:
            if order_token == "large":
                reports = []
                for start in range(0, 256, args.subbatch_size):
                    report, _path = run_child(
                        geometry, None, start, args.subbatch_size,
                        args.replay, args.chunk_columns,
                    )
                    reports.append(report)
                merge_large(geometry, reports, args.replay)
            else:
                run_child(
                    geometry, int(order_token), 0, 256,
                    args.replay, args.chunk_columns,
                )
    print(RUNNER_MARKER)


if __name__ == "__main__":
    main()
