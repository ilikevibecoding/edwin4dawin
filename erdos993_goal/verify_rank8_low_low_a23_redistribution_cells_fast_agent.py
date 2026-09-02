#!/usr/bin/env python3
"""Hash-pinned checkpointed verifier using the audited polarized probe.

The fast checkpoint is separate from the original verifier.  On first use it
imports and validates every completed original row, then computes missing
expansion units with conservative subprocess parallelism.
"""

from __future__ import annotations

import argparse
import ast
import concurrent.futures
import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import (
    LABELS,
    required_positions,
)


ROOT = Path(__file__).resolve().parent
FAST_PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_bernstein_cell_fast_agent.py"
BASELINE_PROBE = ROOT / "probe_rank8_low_low_a23_redistribution_bernstein_cell_agent.py"
BASELINE_RUNNER = ROOT / "verify_rank8_low_low_a23_redistribution_cells_agent.py"
BASELINE_CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_cells_agent_checkpoint_20260822.json"
IDENTITY = ROOT / "rank8_low_low_a23_redistribution_identity_support_agent_20260822.json"
REPLAY = ROOT / "rank8_low_low_a23_probe_replay_agent_20260822.json"
EQUIVALENCE = ROOT / "rank8_low_low_a23_fast_equivalence_agent_20260822.json"
GAP0 = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json"
GAP0_AUDIT = ROOT / "rank8_low_low_suffix3_gap0_fast_full_face_root_audit_exact_20260822.json"
DENSE_FAST_OUTPUT = ROOT / "rank8_a23_fast_agent_1_1_probe.tmp"
CHECKPOINT = ROOT / "rank8_low_low_a23_redistribution_cells_fast_agent_checkpoint_20260822.json"
FAILURE = ROOT / "rank8_low_low_a23_redistribution_cells_fast_agent_first_failure_20260822.json"
REPORT = ROOT / "rank8_low_low_a23_redistribution_cells_fast_agent_exact_20260822.json"

EXPECTED = {
    FAST_PROBE.name: "9EF1B74971804AE64647D74F6F5C9FCC6F3082B3CC2A2780D7B6D761BDF6CD46",
    BASELINE_PROBE.name: "7C8E1703B6381789526B3421181D5148014874A3C6BDB45E95D908269EDCBEB1",
    BASELINE_RUNNER.name: "15919D393D8DB05AA3CBEB2AA6D0D569D126CA823F1E34377133B2B6390754D8",
    IDENTITY.name: "9B86F3473F0D2B13F67645696D8F990732912825C42514B5FDDB021E665EB041",
    REPLAY.name: "3E87855326EC347967856C8053A41404A782142F829C3CB762E5340BB47088CB",
    GAP0.name: "E63F12DCBFC9ACF7874A241A6DF48D7DD6CE4CE136F0AEF5413477F867F3EBFD",
    GAP0_AUDIT.name: "51EF34F786D4E472C2392766EDF5007EE5CCE5636C53EF81D2426B569D732A79",
    EQUIVALENCE.name: "5B86012EB36F5C007715736921A0B204802340AD37F7484BFD068EBAAF6D1617",
}
BASELINE_IMMUTABLE_INPUTS = {
    BASELINE_PROBE.name: EXPECTED[BASELINE_PROBE.name],
    IDENTITY.name: EXPECTED[IDENTITY.name],
}


def now_utc():
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def key(row):
    return row["p_exponent"], row["q_exponent"]


def position_key(row):
    return row["left_bernstein_index"], row["right_bernstein_index"]


def validate_statistics(statistics) -> None:
    assert statistics["negative"] == 0
    assert statistics["first_negative"] is None
    if statistics["terms"]:
        assert statistics["minimum"] > 0
        assert statistics["maximum"] >= statistics["minimum"]
    else:
        assert statistics["minimum"] is None
        assert statistics["maximum"] is None


def validate_row(row) -> None:
    p_exponent, q_exponent = key(row)
    assert 0 <= p_exponent <= 9 and 0 <= q_exponent <= 8
    assert p_exponent or q_exponent
    assert row["redistribution_degree"] == [2, 2]
    assert row["bernstein_scaling"] == 4
    expected_positions = required_positions(p_exponent, q_exponent)
    assert tuple(map(position_key, row["positions"])) == expected_positions
    assert row["position_count"] == len(expected_positions)
    assert row["pass"] is True
    assert row["elapsed_seconds"] >= 0
    assert row["engine"] in (
        "original_import", "cached_polarized", "dual_dense_match",
    )
    assert len(row["engine_sha256"]) == 64
    for position in row["positions"]:
        assert position["pass"] is True
        assert set(position["rows"]) == set(LABELS)
        for statistics in position["rows"].values():
            validate_statistics(statistics)


def run_expansion(p_exponent, q_exponent):
    started = time.perf_counter()
    result = subprocess.run(
        [
            sys.executable, str(FAST_PROBE),
            "--p", str(p_exponent), "--q", str(q_exponent),
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
        timeout=7200,
    )
    if result.returncode != 0 or result.stderr:
        raise RuntimeError(
            f"expansion {(p_exponent, q_exponent)} failed "
            f"rc={result.returncode}; stderr={result.stderr!r}"
        )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    assert len(lines) == 1
    row = ast.literal_eval(lines[0])
    assert key(row) == (p_exponent, q_exponent)
    row["elapsed_seconds"] = time.perf_counter() - started
    row["engine"] = "cached_polarized"
    row["engine_sha256"] = EXPECTED[FAST_PROBE.name]
    if row["pass"] is not True:
        atomic_json(FAILURE, {
            "status": "FAIL_EXACT_A23_FAST_REDISTRIBUTION_CELL",
            "cell": [p_exponent, q_exponent],
            "probe_sha256": EXPECTED[FAST_PROBE.name],
            "row": row,
        })
        raise RuntimeError(
            f"negative Bernstein coefficient in {(p_exponent, q_exponent)}; "
            f"witness preserved at {FAILURE}"
        )
    validate_row(row)
    return row


def imported_baseline_rows():
    saved = json.loads(BASELINE_CHECKPOINT.read_text(encoding="utf-8"))
    assert saved["source_sha256"] == EXPECTED[BASELINE_RUNNER.name]
    assert saved["immutable_inputs"] == BASELINE_IMMUTABLE_INPUTS
    rows = []
    for original in saved["rows"]:
        row = dict(original)
        row["engine"] = "original_import"
        row["engine_sha256"] = EXPECTED[BASELINE_PROBE.name]
        validate_row(row)
        rows.append(row)
    assert len(rows) == len({key(row) for row in rows})
    return rows, sha256(BASELINE_CHECKPOINT)


def import_dual_dense_if_available(rows):
    """Import (1,1) only after original and fast certificate rows match."""
    if (1, 1) in {key(row) for row in rows}:
        return None
    if not DENSE_FAST_OUTPUT.exists():
        return None
    saved = json.loads(BASELINE_CHECKPOINT.read_text(encoding="utf-8"))
    assert saved["source_sha256"] == EXPECTED[BASELINE_RUNNER.name]
    assert saved["immutable_inputs"] == BASELINE_IMMUTABLE_INPUTS
    originals = [row for row in saved["rows"] if key(row) == (1, 1)]
    assert len(originals) == 1, "fast dense output exists before baseline dense row"
    candidate = ast.literal_eval(DENSE_FAST_OUTPUT.read_text(encoding="utf-8-sig"))
    reference = dict(originals[0])
    reference_without_runtime = dict(reference)
    reference_without_runtime.pop("elapsed_seconds")
    assert candidate == reference_without_runtime
    reference["engine"] = "dual_dense_match"
    reference["engine_sha256"] = EXPECTED[BASELINE_PROBE.name]
    reference["matched_fast_engine_sha256"] = EXPECTED[FAST_PROBE.name]
    reference["matched_fast_output_sha256"] = sha256(DENSE_FAST_OUTPUT)
    validate_row(reference)
    rows.append(reference)
    rows.sort(key=key)
    return {
        "cell": [1, 1],
        "baseline_checkpoint_sha256": sha256(BASELINE_CHECKPOINT),
        "baseline_probe_sha256": EXPECTED[BASELINE_PROBE.name],
        "fast_probe_sha256": EXPECTED[FAST_PROBE.name],
        "fast_output_sha256": sha256(DENSE_FAST_OUTPUT),
        "exact_parsed_certificate_row_match": True,
    }


def checkpoint_payload(rows, source_hash, created_utc, import_hash, dense_match):
    return {
        "status": "RUNNING_EXACT_A23_FAST_REDISTRIBUTION_CELLS_AGENT",
        "created_utc": created_utc,
        "updated_utc": now_utc(),
        "source_sha256": source_hash,
        "immutable_inputs": EXPECTED,
        "imported_baseline_checkpoint_sha256": import_hash,
        "dual_dense_match": dense_match,
        "completed_expansion_units": len(rows),
        "total_expansion_units": 89,
        "completed_position_cells": sum(row["position_count"] for row in rows),
        "total_position_cells": 521,
        "recorded_probe_seconds": sum(row["elapsed_seconds"] for row in rows),
        "rows": rows,
    }


def aggregate(items):
    nonempty = [item for item in items if item["terms"]]
    return {
        "terms": sum(item["terms"] for item in items),
        "negative": sum(item["negative"] for item in items),
        "minimum": min(item["minimum"] for item in nonempty) if nonempty else None,
        "maximum": max(item["maximum"] for item in nonempty) if nonempty else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-new-expansions", type=int, default=None)
    parser.add_argument("--workers", type=int, choices=(1, 2), default=1)
    parser.add_argument("--skip-inflight-dense", action="store_true")
    args = parser.parse_args()
    assert args.max_new_expansions is None or args.max_new_expansions >= 0
    observed = {
        path.name: sha256(path)
        for path in (
            FAST_PROBE, BASELINE_PROBE, BASELINE_RUNNER,
            IDENTITY, REPLAY, EQUIVALENCE, GAP0, GAP0_AUDIT,
        )
    }
    assert observed == EXPECTED
    identity = json.loads(IDENTITY.read_text(encoding="utf-8"))
    replay = json.loads(REPLAY.read_text(encoding="utf-8"))
    equivalence = json.loads(EQUIVALENCE.read_text(encoding="utf-8"))
    gap0 = json.loads(GAP0.read_text(encoding="utf-8"))
    gap0_audit = json.loads(GAP0_AUDIT.read_text(encoding="utf-8"))
    assert identity["status"] == "PASS_EXACT_A23_REDISTRIBUTION_IDENTITY_SUPPORT_AUDIT"
    assert replay["status"] == "PASS_INDEPENDENT_EXACT_A23_PROBE_REPLAY"
    assert equivalence["status"] == "PASS_EXACT_A23_FAST_PROBE_EQUIVALENCE_AUDIT"
    assert gap0["status"] == "PASS_EXACT_FAST_AGENT_SUFFIX3_GAP0_FULL_FACE"
    assert gap0_audit["status"] == "PASS_INDEPENDENT_EXACT_FAST_SUFFIX3_GAP0_FULL_FACE_AUDIT"
    assert gap0_audit["complete_target_universe"] == 558
    assert gap0_audit["total_disjoint_outer_cells"] == 648
    assert identity["compressed_cell_universe"]["FLINT_expansion_units"] == 89
    assert identity["compressed_cell_universe"]["new_Bernstein_position_cells"] == 521
    source_hash = sha256(Path(__file__))

    if CHECKPOINT.exists():
        saved = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
        assert saved["source_sha256"] == source_hash
        assert saved["immutable_inputs"] == EXPECTED
        rows = saved["rows"]
        created_utc = saved["created_utc"]
        import_hash = saved["imported_baseline_checkpoint_sha256"]
        dense_match = saved.get("dual_dense_match")
    else:
        rows, import_hash = imported_baseline_rows()
        created_utc = now_utc()
        dense_match = None
    new_dense_match = import_dual_dense_if_available(rows)
    if new_dense_match is not None:
        assert dense_match is None
        dense_match = new_dense_match
    for row in rows:
        validate_row(row)
    assert len(rows) == len({key(row) for row in rows})
    rows.sort(key=key)
    atomic_json(
        CHECKPOINT,
        checkpoint_payload(rows, source_hash, created_utc, import_hash, dense_match),
    )

    targets = {
        (p_exponent, q_exponent)
        for p_exponent in range(10) for q_exponent in range(9)
        if p_exponent or q_exponent
    }
    priority = [(9, 8), (9, 0), (0, 8), (8, 8), (9, 7), (1, 1), (1, 0), (0, 1)]
    order = priority + sorted(
        targets - set(priority),
        key=lambda item: (-sum(item), -item[0], -item[1]),
    )
    assert set(order) == targets and len(order) == 89
    complete = {key(row) for row in rows}
    missing = [target for target in order if target not in complete]
    if args.skip_inflight_dense:
        missing = [target for target in missing if target != (1, 1)]
    elif (1, 1) in missing:
        raise RuntimeError(
            "dense (1,1) cannot be recomputed by the bridge runner; preserve "
            "rank8_a23_fast_agent_1_1_probe.tmp and the matching baseline row"
        )
    if args.max_new_expansions is not None:
        missing = missing[:args.max_new_expansions]

    invocation_started = time.perf_counter()
    if missing:
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {
                executor.submit(run_expansion, *target): target
                for target in missing[:args.workers]
            }
            next_index = len(futures)
            while futures:
                done, _ = concurrent.futures.wait(
                    futures, return_when=concurrent.futures.FIRST_COMPLETED,
                )
                for future in done:
                    target = futures.pop(future)
                    row = future.result()
                    rows.append(row)
                    rows.sort(key=key)
                    complete.add(target)
                    atomic_json(
                        CHECKPOINT,
                        checkpoint_payload(
                            rows, source_hash, created_utc, import_hash, dense_match,
                        ),
                    )
                    print(
                        "PASS_FAST_EXPANSION", *target,
                        row["position_count"], "POSITIONS",
                        f"{row['elapsed_seconds']:.3f}s",
                        len(rows), "OF", 89,
                        flush=True,
                    )
                    if next_index < len(missing):
                        next_target = missing[next_index]
                        futures[executor.submit(run_expansion, *next_target)] = next_target
                        next_index += 1

    if complete != targets:
        print(
            "PAUSED_EXACT_A23_FAST_REDISTRIBUTION_CELLS_AGENT",
            len(rows), "OF", 89, "EXPANSIONS",
            sum(row["position_count"] for row in rows), "OF", 521, "POSITIONS",
            flush=True,
        )
        return

    assert len(rows) == 89
    assert sum(row["position_count"] for row in rows) == 521
    statistics = {label: [] for label in LABELS}
    by_position = {}
    for row in rows:
        for position in row["positions"]:
            position_name = ",".join(map(str, position_key(position)))
            by_position.setdefault(position_name, {label: [] for label in LABELS})
            for label in LABELS:
                item = position["rows"][label]
                statistics[label].append(item)
                by_position[position_name][label].append(item)
    global_aggregates = {
        label: aggregate(items) for label, items in statistics.items()
    }
    position_aggregates = {
        position: {
            label: aggregate(items) for label, items in rows_by_label.items()
        }
        for position, rows_by_label in by_position.items()
    }
    assert all(
        item["negative"] == 0
        and (item["terms"] == 0 or item["minimum"] > 0)
        for item in global_aggregates.values()
    )
    payload = {
        "schema": "rank8-low-low-a23-redistribution-cells-fast-agent-v1",
        "status": "PASS_EXACT_A23_REDISTRIBUTION_NEW_BERNSTEIN_CELLS",
        "meaning": (
            "All 521 genuinely new tensor Bernstein position cells in the "
            "P=a2+a3,Q=b2+b3 redistribution are coefficientwise nonnegative. "
            "Endpoint theorem verification is intentionally separate."
        ),
        "expansion_units": 89,
        "new_Bernstein_position_cells": 521,
        "rows": rows,
        "global_aggregates": global_aggregates,
        "position_aggregates": position_aggregates,
        "total_exact_coefficients": sum(
            item["terms"] for item in global_aggregates.values()
        ),
        "runtime": {
            "recorded_probe_seconds": sum(row["elapsed_seconds"] for row in rows),
            "this_invocation_wall_seconds": time.perf_counter() - invocation_started,
            "maximum_expansion_seconds": max(row["elapsed_seconds"] for row in rows),
            "original_import_expansions": sum(
                row["engine"] == "original_import" for row in rows
            ),
            "cached_polarized_expansions": sum(
                row["engine"] == "cached_polarized" for row in rows
            ),
            "dual_dense_match_expansions": sum(
                row["engine"] == "dual_dense_match" for row in rows
            ),
        },
        "immutable_inputs": EXPECTED,
        "source_sha256": source_hash,
        "imported_baseline_checkpoint_sha256": import_hash,
        "dual_dense_match": dense_match,
        "scope_warning": (
            "This report is the interior/axis certificate. The full theorem "
            "also requires the sealed full-early and a2=b2=0 endpoint faces."
        ),
    }
    atomic_json(REPORT, payload)
    print(payload["status"])
    print("TOTAL_EXACT_COEFFICIENTS", payload["total_exact_coefficients"])
    print("RECORDED_PROBE_SECONDS", payload["runtime"]["recorded_probe_seconds"])
    print("SOURCE", source_hash)
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
