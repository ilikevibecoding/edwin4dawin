#!/usr/bin/env python3
"""Fail-closed deterministic duplicate audit of adjacent-g2 large batches."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_adjacent_large_serial_determinism_audit_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_LARGE_SERIAL_DETERMINISM_AUDIT_RANK5_G2_ALT"
PROBE_MARKER = "PROBE_EXACT_ISO_N5_G2_ADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_RANK5_G2_ALT"
EVIDENCE_MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_EXCLUSIVE_SERIAL_SUBBATCH_EVIDENCE_RANK5_G2_ALT"
PROBE_SOURCE = HERE / "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
RUNNER_SOURCE = HERE / "run_iso_n5_g2_adjacent_large_serial_replay_rank5_g2_alt.py"
SUBBATCH_ASSEMBLY_SOURCE = HERE / "assemble_iso_n5_g2_adjacent_serial_subbatches_rank5_g2_alt.py"
RANGES = ((0, 64), (64, 128), (128, 192), (192, 256))
TRUSTED_REPLAYS = (3, 4)
REPLAY_CHUNK_COLUMNS = {"3": 4096, "4": 8192}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def replay_path(start: int, stop: int, replay: int) -> Path:
    return HERE / (
        f"iso_n5_g2_adjacent_order_box_edge_budget_large_{start}_{stop}_"
        f"serial_replay{replay}_rank5_g2_alt_20260830.json"
    )


def subbatch_path(start: int, stop: int, replay: int) -> Path:
    return HERE / (
        f"iso_n5_g2_adjacent_order_box_edge_budget_large_{start}_{stop}_"
        f"serial_replay{replay}_subbatch_rank5_g2_alt_20260830.json"
    )


def evidence_path(start: int, stop: int, replay: int) -> Path:
    return HERE / (
        f"iso_n5_g2_adjacent_large_{start}_{stop}_serial_replay{replay}_"
        "execution_evidence_rank5_g2_alt_20260830.json"
    )


def validate(report: dict, start: int, stop: int, source_hash: str) -> None:
    count = stop - start
    assert report["marker"] == PROBE_MARKER
    assert report["branch"] == "adjacent marks, ordered mB<=mC, mB,mC>=7"
    assert report["source_sha256"] == source_hash
    assert report["corner_pairs"] == count
    assert report["passing_corner_pairs"] == count
    assert report["failing_corner_pairs"] == 0
    assert [(row["B_mask"], row["C_mask"]) for row in report["records"]] == list(
        itertools.product(range(16), repeat=2)
    )[start:stop]
    digest = hashlib.sha256()
    for row in report["records"]:
        assert row["negative"] == 0
        digest.update(json.dumps(row, separators=(",", ":"), sort_keys=True).encode())
    assert digest.hexdigest().upper() == report["ordered_record_sha256"]


def main() -> None:
    source_hash = sha256(PROBE_SOURCE)
    rows = []
    execution_rows = []
    merged_digest = hashlib.sha256()
    for start, stop in RANGES:
        first_path = replay_path(start, stop, TRUSTED_REPLAYS[0])
        second_path = replay_path(start, stop, TRUSTED_REPLAYS[1])
        first = json.loads(first_path.read_text(encoding="utf-8"))
        second = json.loads(second_path.read_text(encoding="utf-8"))
        validate(first, start, stop, source_hash)
        validate(second, start, stop, source_hash)
        assert first == second
        assert sha256(first_path) == sha256(second_path)
        for substart in range(start, stop, 16):
            substop = substart + 16
            subreports = []
            evidence_pair = []
            for replay in TRUSTED_REPLAYS:
                subpath = subbatch_path(substart, substop, replay)
                subreport = json.loads(subpath.read_text(encoding="utf-8"))
                validate(subreport, substart, substop, source_hash)
                evidence_file = evidence_path(substart, substop, replay)
                evidence = json.loads(evidence_file.read_text(encoding="utf-8"))
                assert evidence["marker"] == EVIDENCE_MARKER
                assert evidence["replay"] == replay
                assert evidence["subrange"] == [substart, substop]
                assert evidence["chunk_columns"] == REPLAY_CHUNK_COLUMNS[str(replay)]
                assert evidence["probe_report"] == subpath.name
                assert evidence["probe_report_sha256"] == sha256(subpath)
                assert evidence["probe_source_sha256"] == source_hash
                assert evidence["lock_acquired_marker_count"] == 1
                assert evidence["lock_released_marker_count"] == 1
                assert evidence["post_batch_probe_worker_count"] == 0
                assert evidence["child_returncode"] == 0
                assert evidence["runner_source_sha256"] == sha256(RUNNER_SOURCE)
                subreports.append(subreport)
                evidence_pair.append({
                    "replay": replay,
                    "subbatch_report_sha256": sha256(subpath),
                    "execution_evidence_sha256": sha256(evidence_file),
                    "lock_acquired": True,
                    "lock_released": True,
                    "post_batch_probe_worker_count": 0,
                })
            assert subreports[0] == subreports[1]
            execution_rows.append({
                "subrange": [substart, substop],
                "record_identical_across_replays": True,
                "replays": evidence_pair,
            })
        for record in first["records"]:
            merged_digest.update(
                json.dumps(record, separators=(",", ":"), sort_keys=True).encode()
            )
        rows.append({
            "range": [start, stop],
            "corner_pairs": 64,
            "ordered_record_sha256": first["ordered_record_sha256"],
            f"replay{TRUSTED_REPLAYS[0]}_sha256": sha256(first_path),
            f"replay{TRUSTED_REPLAYS[1]}_sha256": sha256(second_path),
            "byte_identical": True,
        })

    report = {
        "marker": MARKER,
        "theorem": (
            "All 256 large-order adjacent-g2 corner streams were reproduced "
            "byte-for-byte in two strictly serial fresh-process replays using "
            "different exact matrix blockings."
        ),
        "probe_source_sha256": source_hash,
        "serial_procedure_sources_sha256": {
            RUNNER_SOURCE.name: sha256(RUNNER_SOURCE),
            SUBBATCH_ASSEMBLY_SOURCE.name: sha256(SUBBATCH_ASSEMBLY_SOURCE),
        },
        "batches": rows,
        "subbatch_execution_evidence": execution_rows,
        "subbatch_count": len(execution_rows),
        "corner_pairs": 256,
        "replay_chunk_columns": REPLAY_CHUNK_COLUMNS,
        "trusted_replays": list(TRUSTED_REPLAYS),
        "merged_ordered_record_sha256": merged_digest.hexdigest().upper(),
        "parallel_reports_admitted": False,
        "pre_reference_replays_admitted": False,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "corner_pairs": 256,
        "merged_ordered_record_sha256": report["merged_ordered_record_sha256"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
