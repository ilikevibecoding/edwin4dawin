#!/usr/bin/env python3
"""Parallel, checkpointed driver for the exact 558-cell factored face scan.

The mathematical cell oracle is the hash-pinned serial verifier's immutable
probe.  Only orchestration is parallel: every worker is a separate exact FLINT
process, and only this parent process writes the checkpoint/report.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
from pathlib import Path

import verify_rank8_low_low_suffix3_gap0_factored_full_face as serial


ROOT = Path(__file__).resolve().parent
SERIAL = ROOT / "verify_rank8_low_low_suffix3_gap0_factored_full_face.py"
EXPECTED_SERIAL = "D69E82977383005D981A72A711FC998116B6A43C86A1EB3D5861A5D1D8F35D8A"
PARALLEL_FAILURE = (
    ROOT / "rank8_low_low_suffix3_gap0_factored_full_face_parallel_failure_20260822.json"
)


def load_rows(source_hash: str):
    assert serial.sha256(SERIAL) == EXPECTED_SERIAL
    assert {
        path.name: serial.sha256(path)
        for path in (
            serial.PROBE, serial.FACTORED, serial.IDENTITY,
            serial.SUFFIX, serial.SEED,
        )
    } == serial.EXPECTED
    if serial.CHECKPOINT.exists():
        saved = json.loads(serial.CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["immutable_inputs"] == serial.EXPECTED
        rows = saved["rows"]
    else:
        rows = []
    if not rows:
        seed = json.loads(serial.SEED.read_text(encoding="utf-8"))
        assert seed["status"] == "PASS_EXACT_FACTORED_EARLY_PAYMENT_CELL"
        assert seed["outer_cell"] == [0, 0, 1, 0]
        rows = [{
            "a3_exponent": 0,
            "b3_exponent": 0,
            "a0_exponent": 1,
            "b0_exponent": 0,
            "rows": seed["rows"],
            "pass": True,
            "elapsed_seconds": 0.0,
            "seed_report": serial.SEED.name,
        }]
    for row in rows:
        serial.validate_row(row)
    assert len(rows) == len({serial.key(row) for row in rows})
    rows.sort(key=serial.key)
    serial.atomic_json(serial.CHECKPOINT, {
        **serial.checkpoint(rows, source_hash),
        "status": "RUNNING_EXACT_FACTORED_SUFFIX3_GAP0_FULL_FACE_PARALLEL",
        "serial_oracle_sha256": EXPECTED_SERIAL,
    })
    return rows


def ordered_targets(suffix_rows):
    targets = {
        (a3, b3, a0, b0)
        for a0 in range(3) for a3 in range(10 - a0)
        for b0 in range(3) for b3 in range(9 - b0)
        if (a0, b0) != (0, 0)
    }
    assert len(targets) == 558
    density = {
        outer: sum(item["terms"] for item in row["rows"].values())
        for outer, row in suffix_rows.items()
    }
    order = sorted(
        targets,
        key=lambda target: (
            0 if target[:2] == (0, 0) else 1,
            -density[target[:2]],
            target[2] + target[3],
            target,
        ),
    )
    return targets, order


def write_checkpoint(rows, source_hash, workers):
    rows.sort(key=serial.key)
    serial.atomic_json(serial.CHECKPOINT, {
        **serial.checkpoint(rows, source_hash),
        "status": "RUNNING_EXACT_FACTORED_SUFFIX3_GAP0_FULL_FACE_PARALLEL",
        "serial_oracle_sha256": EXPECTED_SERIAL,
        "parallel_workers": workers,
    })


def write_final(rows, suffix_rows, source_hash, workers):
    assert len(rows) == 558
    all_stats = {label: [] for label in serial.LABELS}
    for row in rows:
        serial.validate_row(row)
        for label in serial.LABELS:
            all_stats[label].append(row["rows"][label])
    for row in suffix_rows.values():
        assert row["pass"] is True
        for label, suffix_label in serial.SUFFIX_LABELS.items():
            statistics = row["rows"][suffix_label]
            serial.validate_stats(statistics)
            all_stats[label].append(statistics)
    global_aggregates = {
        label: serial.aggregate(items) for label, items in all_stats.items()
    }
    assert all(
        item["negative"] == 0
        and (item["terms"] == 0 or item["minimum"] > 0)
        for item in global_aggregates.values()
    )
    payload = {
        "schema": "rank8-low-low-suffix3-gap0-factored-full-face-v1",
        "status": "PASS_EXACT_FACTORED_SUFFIX3_GAP0_FULL_FACE",
        "theorem": (
            "The four factored paid low/low auxiliaries are coefficientwise "
            "nonnegative on the complete a2=b2=0 suffix-3/gap-zero face. "
            "Together with the factored AM-GM theorem, this proves the raw "
            "auxiliaries nonnegative on that face."
        ),
        "support": {
            "a0": [0, 2], "b0": [0, 2],
            "a0_plus_a3": [0, 9], "b0_plus_b3": [0, 8],
        },
        "inherited_suffix_cells": 90,
        "computed_positive_early_support_cells": 558,
        "seeded_cells": 1,
        "total_disjoint_outer_cells": 648,
        "rows": sorted(rows, key=serial.key),
        "global_aggregates": global_aggregates,
        "total_exact_coefficients": sum(
            item["terms"] for item in global_aggregates.values()
        ),
        "immutable_inputs": serial.EXPECTED,
        "serial_oracle_sha256": EXPECTED_SERIAL,
        "parallel_workers": workers,
        "source_sha256": source_hash,
    }
    serial.atomic_json(serial.REPORT, payload)
    print(payload["status"], flush=True)
    print("TOTAL_EXACT_COEFFICIENTS", payload["total_exact_coefficients"], flush=True)
    print("SOURCE", source_hash, flush=True)
    print("REPORT", serial.sha256(serial.REPORT), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--max-new-cells", type=int, default=None)
    args = parser.parse_args()
    assert 1 <= args.workers <= 12
    assert args.max_new_cells is None or args.max_new_cells >= 0
    source_hash = serial.sha256(Path(__file__))
    rows = load_rows(source_hash)
    suffix = json.loads(serial.SUFFIX.read_text(encoding="utf-8"))
    suffix_rows = {
        (row["a3_exponent"], row["b3_exponent"]): row
        for row in suffix["rows"]
    }
    assert len(suffix_rows) == 90
    targets, order = ordered_targets(suffix_rows)
    complete = {serial.key(row) for row in rows}
    assert complete <= targets
    pending = [target for target in order if target not in complete]
    if args.max_new_cells is not None:
        pending = pending[:args.max_new_cells]
    if not pending:
        if complete == targets:
            write_final(rows, suffix_rows, source_hash, args.workers)
        else:
            print("PAUSED", len(rows), "OF", len(targets), flush=True)
        return

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            future_to_target = {
                pool.submit(serial.run_cell, *target): target for target in pending
            }
            failure = None
            for future in concurrent.futures.as_completed(future_to_target):
                target = future_to_target[future]
                try:
                    row = future.result()
                except BaseException as exc:
                    failure = exc
                    for other in future_to_target:
                        other.cancel()
                    break
                assert serial.key(row) == target and target not in complete
                rows.append(row)
                complete.add(target)
                write_checkpoint(rows, source_hash, args.workers)
                print(
                    "PASS_CELL", *target,
                    {label: row["rows"][label]["terms"] for label in serial.LABELS},
                    f"{row['elapsed_seconds']:.3f}s", len(rows), "OF", len(targets),
                    flush=True,
                )
            if failure is not None:
                raise failure
    except BaseException as exc:
        serial.atomic_json(PARALLEL_FAILURE, {
            "status": "FAIL_PARALLEL_ORCHESTRATION",
            "error_type": type(exc).__name__,
            "error": str(exc),
            "computed_cells": len(rows),
            "source_sha256": source_hash,
            "serial_oracle_sha256": EXPECTED_SERIAL,
        })
        raise

    if complete == targets:
        write_final(rows, suffix_rows, source_hash, args.workers)
    else:
        print("PAUSED", len(rows), "OF", len(targets), flush=True)


if __name__ == "__main__":
    main()
