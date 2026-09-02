#!/usr/bin/env python3
"""Fail-closed duplicate audit of all seven adjacent-g2 small branches."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_adjacent_small_serial_determinism_audit_rank5_g2_alt_20260830.json"
PROBE = HERE / "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
RUNNER = HERE / "run_iso_n5_g2_adjacent_small_serial_replay_rank5_g2_alt.py"
PROBE_MARKER = "PROBE_EXACT_ISO_N5_G2_ADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_RANK5_G2_ALT"
EVIDENCE_MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_SMALL_EXCLUSIVE_SERIAL_EVIDENCE_RANK5_G2_ALT"
MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_SMALL_SERIAL_DETERMINISM_AUDIT_RANK5_G2_ALT"
CHUNK_COLUMNS = {1: 4096, 2: 8192}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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


def validate_report(report: dict, order: int, source_hash: str) -> None:
    assert report["marker"] == PROBE_MARKER
    assert report["branch"] == f"adjacent marks, mB={order}, mC>=7, |A|>=13"
    assert report["source_sha256"] == source_hash
    assert report["corner_pairs"] == 256
    assert report["passing_corner_pairs"] == 256
    assert report["failing_corner_pairs"] == 0
    assert len(report["records"]) == 256
    assert all(row["negative"] == 0 for row in report["records"])
    digest = hashlib.sha256()
    for branch_index, row in enumerate(report["records"]):
        assert (row["B_mask"], row["C_mask"]) == divmod(branch_index, 16)
        digest.update(json.dumps(row, separators=(",", ":"), sort_keys=True).encode())
    assert digest.hexdigest().upper() == report["ordered_record_sha256"]


def main() -> None:
    source_hash = sha256(PROBE)
    runner_hash = sha256(RUNNER)
    rows = []
    for order in range(7):
        reports = []
        replay_rows = []
        for replay in (1, 2):
            path = frozen(order, replay)
            report = json.loads(path.read_text(encoding="utf-8"))
            validate_report(report, order, source_hash)
            reports.append(report)
            evidence_file = evidence_path(order, replay)
            evidence = json.loads(evidence_file.read_text(encoding="utf-8"))
            assert evidence["marker"] == EVIDENCE_MARKER
            assert evidence["replay"] == replay
            assert evidence["order"] == order
            assert evidence["chunk_columns"] == CHUNK_COLUMNS[replay]
            assert evidence["probe_report"] == path.name
            assert evidence["probe_report_sha256"] == sha256(path)
            assert evidence["probe_source_sha256"] == source_hash
            assert evidence["runner_source_sha256"] == runner_hash
            assert evidence["lock_acquired_marker_count"] == 1
            assert evidence["lock_released_marker_count"] == 1
            assert evidence["post_batch_probe_worker_count"] == 0
            assert evidence["child_returncode"] == 0
            replay_rows.append({
                "replay": replay,
                "chunk_columns": CHUNK_COLUMNS[replay],
                "report_sha256": sha256(path),
                "evidence_sha256": sha256(evidence_file),
            })
        assert reports[0] == reports[1]
        rows.append({
            "small_order": order,
            "record_identical_across_replays": True,
            "ordered_record_sha256": reports[0]["ordered_record_sha256"],
            "minimum": str(min(
                Fraction(row["minimum"]) for row in reports[0]["records"]
            )),
            "replays": replay_rows,
        })

    report = {
        "marker": MARKER,
        "theorem_grade_claim": (
            "All seven small-order branches and all 256 B,C corners per branch "
            "were reproduced record-for-record in locked fresh processes at two "
            "different Bernstein chunk sizes."
        ),
        "small_orders": list(range(7)),
        "corner_pairs_per_order": 256,
        "total_corner_pairs": 7 * 256,
        "all_coefficients_nonnegative": True,
        "replay_chunk_columns": {str(key): value for key, value in CHUNK_COLUMNS.items()},
        "probe_source_sha256": source_hash,
        "runner_source_sha256": runner_hash,
        "orders": rows,
        "parallel_reports_admitted": False,
        "pre_lock_reports_admitted": False,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "orders": 7,
        "total_corner_pairs": 7 * 256,
        "all_coefficients_nonnegative": True,
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
