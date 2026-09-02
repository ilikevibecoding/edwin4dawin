#!/usr/bin/env python3
"""Exhaust the suffix-3/gap-zero face under the factored AM-GM payment."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROBE = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_flint.py"
FACTORED = ROOT / "rank8_low_low_full_early_core_factored_amgm_exact_20260822.json"
IDENTITY = ROOT / "rank8_low_low_suffix3_gap0_factored_suffix_face_identity_exact_20260822.json"
SUFFIX = ROOT / "rank8_low_low_both_suffix3_a3_b3_cells_exact_20260821.json"
SEED = ROOT / "rank8_low_low_suffix3_gap0_factored_early_payment_cell_0_0_1_0_exact_20260822.json"
CHECKPOINT = ROOT / "rank8_low_low_suffix3_gap0_factored_full_face_checkpoint_20260822.json"
FAILURE = ROOT / "rank8_low_low_suffix3_gap0_factored_full_face_first_failure_20260822.json"
REPORT = ROOT / "rank8_low_low_suffix3_gap0_factored_full_face_exact_20260822.json"
EXPECTED = {
    PROBE.name: "00288AAF49B4A002240AD1DB153DA9195FDC763B84AA8BDDBCA036F70A1A8870",
    FACTORED.name: "36673C44864659E3DAB2CC99071DAE2C306830B8B672A8C7F3E41ED5A2AFCFF6",
    IDENTITY.name: "B851B069B42BE5646B5101CDE471D937C8A4D033E3A99DAB44BACAD50A380574",
    SUFFIX.name: "0D3D1EA8951F355B33EE5EC0563FC06BF20BEE54652D8F50BF88E1130161452F",
    SEED.name: "EB62BF83E26F4F5E93B166829652D5E9996FBA13BF29731A644399B74A94529E",
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


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return (
        row["a3_exponent"], row["b3_exponent"],
        row["a0_exponent"], row["b0_exponent"],
    )


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


def run_cell(a3, b3, a0, b0):
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable, str(PROBE),
            "--a3", str(a3), "--b3", str(b3),
            "--a0", str(a0), "--b0", str(b0),
        ],
        cwd=ROOT, text=True, capture_output=True, check=False, timeout=7200,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"cell {(a3, b3, a0, b0)} process failure rc={result.returncode}; "
            f"stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    assert len(lines) == 1
    row = ast.literal_eval(lines[0])
    assert key(row) == (a3, b3, a0, b0)
    row["elapsed_seconds"] = time.perf_counter() - started
    if row["pass"] is not True:
        atomic_json(FAILURE, {
            "status": "FAIL_EXACT_FACTORED_SUFFIX3_GAP0_CELL",
            "cell": [a3, b3, a0, b0],
            "row": row,
            "probe_sha256": EXPECTED[PROBE.name],
        })
        raise RuntimeError(
            f"negative factored residual in {(a3, b3, a0, b0)}; "
            f"preserved at {FAILURE}"
        )
    validate_row(row)
    return row


def aggregate(items):
    nonempty = [item for item in items if item["terms"]]
    return {
        "terms": sum(item["terms"] for item in items),
        "negative": sum(item["negative"] for item in items),
        "minimum": min(item["minimum"] for item in nonempty) if nonempty else None,
        "maximum": max(item["maximum"] for item in nonempty) if nonempty else None,
    }


def checkpoint(rows, source_hash):
    return {
        "status": "RUNNING_EXACT_FACTORED_SUFFIX3_GAP0_FULL_FACE",
        "source_sha256": source_hash,
        "immutable_inputs": EXPECTED,
        "computed_cells": len(rows),
        "computed_cells_total": 558,
        "rows": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-new-cells", type=int, default=None)
    args = parser.parse_args()
    assert args.max_new_cells is None or args.max_new_cells >= 0
    assert {
        path.name: sha256(path)
        for path in (PROBE, FACTORED, IDENTITY, SUFFIX, SEED)
    } == EXPECTED
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
    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        if saved["source_sha256"] == source_hash:
            assert saved["immutable_inputs"] == EXPECTED
            rows = saved["rows"]
        else:
            assert saved["rows"] == []
            rows = []
    else:
        rows = []
    if not rows:
        seed = json.loads(SEED.read_text(encoding="utf-8"))
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
            "seed_report": SEED.name,
        }]
    for row in rows:
        validate_row(row)
    assert len(rows) == len({key(row) for row in rows})
    assert {key(row) for row in rows} <= targets
    rows.sort(key=key)
    atomic_json(CHECKPOINT, checkpoint(rows, source_hash))

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
    complete = {key(row) for row in rows}
    new_count = 0
    for target in order:
        if target in complete:
            continue
        if args.max_new_cells is not None and new_count >= args.max_new_cells:
            print("PAUSED", len(rows), "OF", len(targets), flush=True)
            return
        row = run_cell(*target)
        rows.append(row)
        rows.sort(key=key)
        complete.add(target)
        new_count += 1
        atomic_json(CHECKPOINT, checkpoint(rows, source_hash))
        print(
            "PASS_CELL", *target,
            {label: row["rows"][label]["terms"] for label in LABELS},
            f"{row['elapsed_seconds']:.3f}s", len(rows), "OF", len(targets),
            flush=True,
        )

    assert complete == targets and len(rows) == 558
    all_stats = {label: [] for label in LABELS}
    for row in rows:
        for label in LABELS:
            all_stats[label].append(row["rows"][label])
    for outer, row in suffix_rows.items():
        assert row["pass"] is True
        for label, suffix_label in SUFFIX_LABELS.items():
            statistics = row["rows"][suffix_label]
            validate_stats(statistics)
            all_stats[label].append(statistics)
    global_aggregates = {
        label: aggregate(items) for label, items in all_stats.items()
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
        "rows": rows,
        "global_aggregates": global_aggregates,
        "total_exact_coefficients": sum(
            item["terms"] for item in global_aggregates.values()
        ),
        "immutable_inputs": EXPECTED,
        "source_sha256": source_hash,
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("TOTAL_EXACT_COEFFICIENTS", payload["total_exact_coefficients"])
    print("SOURCE", source_hash)
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
