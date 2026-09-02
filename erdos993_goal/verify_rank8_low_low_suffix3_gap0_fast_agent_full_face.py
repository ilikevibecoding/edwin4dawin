#!/usr/bin/env python3
"""Six-worker parent-only exact scan using the sealed fast-agent cell probe."""

from __future__ import annotations

import argparse
import ast
import concurrent.futures
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent_v3.py"
FACTORED = ROOT / "rank8_low_low_full_early_core_factored_amgm_exact_20260822.json"
IDENTITY = ROOT / "rank8_low_low_suffix3_gap0_factored_suffix_face_identity_exact_20260822.json"
SUFFIX = ROOT / "rank8_low_low_both_suffix3_a3_b3_cells_exact_20260821.json"
SEED = ROOT / "rank8_low_low_suffix3_gap0_factored_early_payment_cell_0_0_1_0_exact_20260822.json"
SYMBOLIC = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_symbolic_identity_audit_20260822.json"
STATS_AUDIT = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_stats_audit_20260822.json"
EQUIVALENCE = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_equivalence_exact_20260822.json"
ORIGINAL_DRIVER = ROOT / "verify_rank8_low_low_suffix3_gap0_factored_full_face.py"
PARALLEL_ORIGINAL_DRIVER = ROOT / "verify_rank8_low_low_suffix3_gap0_factored_full_face_parallel_root.py"
ORIGINAL_CHECKPOINT = ROOT / "rank8_low_low_suffix3_gap0_factored_full_face_checkpoint_20260822.json"
CHECKPOINT = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_full_face_checkpoint_20260822.json"
FAILURE = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_full_face_first_failure_20260822.json"
REPORT = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json"

EXPECTED = {
    PROBE.name: "72149062A17FF2A0FEB427BE2D15AD66E532387DDB138CB9E3C3C150615B8F89",
    FACTORED.name: "36673C44864659E3DAB2CC99071DAE2C306830B8B672A8C7F3E41ED5A2AFCFF6",
    IDENTITY.name: "B851B069B42BE5646B5101CDE471D937C8A4D033E3A99DAB44BACAD50A380574",
    SUFFIX.name: "0D3D1EA8951F355B33EE5EC0563FC06BF20BEE54652D8F50BF88E1130161452F",
    SEED.name: "EB62BF83E26F4F5E93B166829652D5E9996FBA13BF29731A644399B74A94529E",
    SYMBOLIC.name: "B3388F03E9AE5A535E4A354D861364C17B31F4F92F7F0E31F27154261D47AA0E",
    STATS_AUDIT.name: "873F614E422095C78F7F3D314A4BBE235FB1464BA9AB7EEBC1E9B42642FDE752",
    EQUIVALENCE.name: "BE61D408243103741D40C466DC38DA6661BDC744CCDF8AA2DACE37E26B100601",
    ORIGINAL_DRIVER.name: "D69E82977383005D981A72A711FC998116B6A43C86A1EB3D5861A5D1D8F35D8A",
    PARALLEL_ORIGINAL_DRIVER.name:
        "DA75F8278A5FF1BDA08BB05AF179CB94188C2E451219FECF2962C6437D21E003",
}
ORIGINAL_INPUTS = {
    "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_flint.py":
        "00288AAF49B4A002240AD1DB153DA9195FDC763B84AA8BDDBCA036F70A1A8870",
    FACTORED.name: EXPECTED[FACTORED.name],
    IDENTITY.name: EXPECTED[IDENTITY.name],
    SUFFIX.name: EXPECTED[SUFFIX.name],
    SEED.name: EXPECTED[SEED.name],
}
LABELS = (
    "curvature_middle_times_4", "curvature_far",
    "strong_middle_times_4", "strong_far",
)
SUFFIX_LABELS = {
    "curvature_middle_times_4": "curvature_middle",
    "curvature_far": "curvature_far",
    "strong_middle_times_4": "strong_middle",
    "strong_far": "strong_far",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def bytes_sha256(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return (
        row["a3_exponent"], row["b3_exponent"],
        row["a0_exponent"], row["b0_exponent"],
    )


def row_certificate(row):
    return {
        "a3_exponent": row["a3_exponent"],
        "b3_exponent": row["b3_exponent"],
        "a0_exponent": row["a0_exponent"],
        "b0_exponent": row["b0_exponent"],
        "rows": row["rows"],
        "pass": row["pass"],
    }


def validate_stats(statistics) -> None:
    assert statistics["negative"] == 0
    assert statistics["first_negative"] is None
    if statistics["terms"]:
        assert statistics["minimum"] > 0
        assert statistics["maximum"] >= statistics["minimum"]
    else:
        assert statistics["minimum"] is None
        assert statistics["maximum"] is None


def validate_row(row) -> None:
    a3, b3, a0, b0 = key(row)
    assert 0 <= a0 <= 2 and 0 <= b0 <= 2
    assert 0 <= a3 and a0 + a3 <= 9
    assert 0 <= b3 and b0 + b3 <= 8
    assert (a0, b0) != (0, 0)
    assert row["pass"] is True
    assert set(row["rows"]) == set(LABELS)
    for statistics in row["rows"].values():
        validate_stats(statistics)


def run_cell(target):
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable, str(PROBE),
            "--a3", str(target[0]), "--b3", str(target[1]),
            "--a0", str(target[2]), "--b0", str(target[3]),
        ],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=7200,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {target} process failure rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    assert len(lines) == 1
    row = ast.literal_eval(lines[0])
    assert key(row) == target
    row["elapsed_seconds"] = time.perf_counter() - started
    if row["pass"] is not True:
        return row, False
    validate_row(row)
    return row, True


def aggregate(items):
    nonempty = [item for item in items if item["terms"]]
    return {
        "terms": sum(item["terms"] for item in items),
        "negative": sum(item["negative"] for item in items),
        "minimum": min(item["minimum"] for item in nonempty) if nonempty else None,
        "maximum": max(item["maximum"] for item in nonempty) if nonempty else None,
    }


def checkpoint(rows, source_hash, imported_keys, fast_keys, snapshots):
    return {
        "status": "RUNNING_EXACT_FAST_AGENT_SUFFIX3_GAP0_FULL_FACE",
        "source_sha256": source_hash,
        "immutable_inputs": EXPECTED,
        "workers": 6,
        "computed_cells": len(rows),
        "computed_cells_total": 558,
        "imported_original_oracle_cells": len(imported_keys),
        "fast_agent_cells": len(fast_keys),
        "imported_original_keys": [list(item) for item in sorted(imported_keys)],
        "fast_agent_keys": [list(item) for item in sorted(fast_keys)],
        "oracle_snapshots": snapshots,
        "rows": sorted(rows, key=key),
    }


def import_original_snapshot(rows_by_key, imported_keys, snapshots):
    if not ORIGINAL_CHECKPOINT.exists():
        return
    payload = ORIGINAL_CHECKPOINT.read_bytes()
    saved = json.loads(payload.decode("utf-8"))
    if saved["status"] == "RUNNING_EXACT_FACTORED_SUFFIX3_GAP0_FULL_FACE":
        expected_source = EXPECTED[ORIGINAL_DRIVER.name]
    else:
        assert saved["status"] == "RUNNING_EXACT_FACTORED_SUFFIX3_GAP0_FULL_FACE_PARALLEL"
        expected_source = EXPECTED[PARALLEL_ORIGINAL_DRIVER.name]
        assert saved["serial_oracle_sha256"] == EXPECTED[ORIGINAL_DRIVER.name]
    assert saved["source_sha256"] == expected_source
    assert saved["immutable_inputs"] == ORIGINAL_INPUTS
    imported_now = 0
    for row in saved["rows"]:
        validate_row(row)
        row_key = key(row)
        if row_key in rows_by_key:
            assert row_certificate(rows_by_key[row_key]) == row_certificate(row)
        else:
            rows_by_key[row_key] = row
            imported_now += 1
        imported_keys.add(row_key)
    snapshot = {
        "checkpoint": ORIGINAL_CHECKPOINT.name,
        "checkpoint_sha256": bytes_sha256(payload),
        "rows_seen": len(saved["rows"]),
        "rows_newly_imported": imported_now,
        "original_driver_sha256": saved["source_sha256"],
        "serial_oracle_sha256": EXPECTED[ORIGINAL_DRIVER.name],
    }
    if not snapshots or snapshots[-1]["checkpoint_sha256"] != snapshot["checkpoint_sha256"]:
        snapshots.append(snapshot)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=6, choices=range(1, 7))
    parser.add_argument("--max-new-cells", type=int, default=None)
    args = parser.parse_args()
    assert args.max_new_cells is None or args.max_new_cells >= 0
    actual = {
        path.name: sha256(path)
        for path in (
            PROBE, FACTORED, IDENTITY, SUFFIX, SEED, SYMBOLIC,
            STATS_AUDIT, EQUIVALENCE, ORIGINAL_DRIVER,
            PARALLEL_ORIGINAL_DRIVER,
        )
    }
    assert actual == EXPECTED
    assert json.loads(SYMBOLIC.read_text(encoding="utf-8"))["status"] \
        == "PASS_EXACT_SYMBOLIC_CACHED_QUADRATIC_IDENTITY"
    assert json.loads(STATS_AUDIT.read_text(encoding="utf-8"))["status"] \
        == "PASS_EXACT_FAST_STATS_EQUIVALENCE"
    assert json.loads(EQUIVALENCE.read_text(encoding="utf-8"))["status"] \
        == "PASS_EXACT_FAST_AGENT_ORACLE_EQUIVALENCE"
    source_hash = sha256(Path(__file__))

    suffix = json.loads(SUFFIX.read_text(encoding="utf-8"))
    suffix_rows = {
        (row["a3_exponent"], row["b3_exponent"]): row
        for row in suffix["rows"]
    }
    assert len(suffix_rows) == 90
    targets = {
        (a3, b3, a0, b0)
        for a0 in range(3) for a3 in range(10 - a0)
        for b0 in range(3) for b3 in range(9 - b0)
        if (a0, b0) != (0, 0)
    }
    assert len(targets) == 558

    rows_by_key = {}
    imported_keys = set()
    fast_keys = set()
    snapshots = []
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["source_sha256"] == source_hash
        assert saved["immutable_inputs"] == EXPECTED
        for row in saved["rows"]:
            validate_row(row)
            rows_by_key[key(row)] = row
        imported_keys = {tuple(item) for item in saved["imported_original_keys"]}
        fast_keys = {tuple(item) for item in saved["fast_agent_keys"]}
        snapshots = saved["oracle_snapshots"]
    import_original_snapshot(rows_by_key, imported_keys, snapshots)
    assert set(rows_by_key) <= targets
    assert imported_keys | fast_keys == set(rows_by_key)
    atomic_json(
        CHECKPOINT,
        checkpoint(
            list(rows_by_key.values()), source_hash,
            imported_keys, fast_keys, snapshots,
        ),
    )

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
    pending = [target for target in order if target not in rows_by_key]
    if args.max_new_cells is not None:
        pending = pending[:args.max_new_cells]
    pending_iterator = iter(pending)
    submitted = completed_new = 0
    running = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        while len(running) < args.workers:
            try:
                target = next(pending_iterator)
            except StopIteration:
                break
            running[executor.submit(run_cell, target)] = target
            submitted += 1
        while running:
            done, _ = concurrent.futures.wait(
                running, return_when=concurrent.futures.FIRST_COMPLETED,
            )
            for future in done:
                target = running.pop(future)
                row, passed = future.result()
                if not passed:
                    atomic_json(FAILURE, {
                        "status": "FAIL_EXACT_FAST_AGENT_SUFFIX3_GAP0_CELL",
                        "cell": list(target),
                        "row": row,
                        "probe_sha256": EXPECTED[PROBE.name],
                    })
                    raise RuntimeError(f"negative fast residual in {target}")
                rows_by_key[target] = row
                fast_keys.add(target)
                completed_new += 1
                atomic_json(
                    CHECKPOINT,
                    checkpoint(
                        list(rows_by_key.values()), source_hash,
                        imported_keys, fast_keys, snapshots,
                    ),
                )
                print(
                    "PASS_FAST_CELL", *target,
                    f"{row['elapsed_seconds']:.3f}s",
                    len(rows_by_key), "OF", len(targets),
                    flush=True,
                )
            while len(running) < args.workers:
                try:
                    target = next(pending_iterator)
                except StopIteration:
                    break
                running[executor.submit(run_cell, target)] = target
                submitted += 1
    assert submitted == completed_new == len(pending)

    if set(rows_by_key) != targets:
        print("PAUSED", len(rows_by_key), "OF", len(targets), flush=True)
        return
    rows = sorted(rows_by_key.values(), key=key)
    all_stats = {label: [] for label in LABELS}
    for row in rows:
        for label in LABELS:
            all_stats[label].append(row["rows"][label])
    for row in suffix_rows.values():
        assert row["pass"] is True
        for label, suffix_label in SUFFIX_LABELS.items():
            statistics = row["rows"][suffix_label]
            validate_stats(statistics)
            all_stats[label].append(statistics)
    global_aggregates = {
        label: aggregate(items) for label, items in all_stats.items()
    }
    payload = {
        "schema": "rank8-low-low-suffix3-gap0-fast-agent-full-face-v1",
        "status": "PASS_EXACT_FAST_AGENT_SUFFIX3_GAP0_FULL_FACE",
        "theorem": (
            "The four factored paid low/low auxiliaries are coefficientwise "
            "nonnegative on the complete a2=b2=0 suffix-3/gap-zero face."
        ),
        "support": {
            "a0": [0, 2], "b0": [0, 2],
            "a0_plus_a3": [0, 9], "b0_plus_b3": [0, 8],
        },
        "inherited_suffix_cells": 90,
        "computed_positive_early_support_cells": 558,
        "imported_original_oracle_cells": len(imported_keys),
        "fast_agent_cells": len(fast_keys),
        "total_disjoint_outer_cells": 648,
        "rows": rows,
        "global_aggregates": global_aggregates,
        "total_exact_coefficients": sum(
            item["terms"] for item in global_aggregates.values()
        ),
        "oracle_snapshots": snapshots,
        "immutable_inputs": EXPECTED,
        "source_sha256": source_hash,
    }
    atomic_json(REPORT, payload)
    print(payload["status"], flush=True)
    print("TOTAL_EXACT_COEFFICIENTS", payload["total_exact_coefficients"], flush=True)
    print("SOURCE", source_hash, flush=True)
    print("REPORT", sha256(REPORT), flush=True)


if __name__ == "__main__":
    main()
