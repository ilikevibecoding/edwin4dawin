#!/usr/bin/env python3
"""Fail-closed deterministic audit of every nonadjacent-g2 cone branch."""

from __future__ import annotations

import hashlib
import itertools
import json
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_nonadjacent_serial_determinism_audit_rank5_g2_alt_20260830.json"
PROBE = HERE / "probe_iso_n5_g2_nonadjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
HELPER = HERE / "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
RUNNER = HERE / "run_iso_n5_g2_nonadjacent_serial_replay_rank5_g2_alt.py"
PROBE_MARKER = "PROBE_EXACT_ISO_N5_G2_NONADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_RANK5_G2_ALT"
EVIDENCE_MARKER = "PASS_EXACT_ISO_N5_G2_NONADJACENT_EXCLUSIVE_SERIAL_EVIDENCE_RANK5_G2_ALT"
MARKER = "PASS_EXACT_ISO_N5_G2_NONADJACENT_SERIAL_DETERMINISM_AUDIT_RANK5_G2_ALT"
GEOMETRIES = ("connected_long", "common_neighbor")
CHUNK_COLUMNS = {1: 4096, 2: 8192}
EXPECTED_HELPER_SHA256 = "A1F32B17DBF73589EB1E11C76FF0567EED379FB3EA0A16CB3C48A1303D0EB478"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def label(order: int | None) -> str:
    return "large" if order is None else f"small{order}"


def canonical(geometry: str, order: int | None) -> Path:
    return HERE / (
        "iso_n5_g2_nonadjacent_order_box_edge_budget_"
        f"{geometry}_coarse_{label(order)}_0_256_"
        "flint_probe_rank5_g2_alt_20260830.json"
    )


def frozen(
    geometry: str, order: int | None, start: int, stop: int,
    replay: int, subbatch: bool = False,
) -> Path:
    suffix = "_subbatch" if subbatch else ""
    return HERE / (
        "iso_n5_g2_nonadjacent_order_box_edge_budget_"
        f"{geometry}_coarse_{label(order)}_{start}_{stop}_"
        f"serial_replay{replay}{suffix}_rank5_g2_alt_20260830.json"
    )


def evidence_path(
    geometry: str, order: int | None, start: int, stop: int, replay: int,
) -> Path:
    return HERE / (
        f"iso_n5_g2_nonadjacent_{geometry}_coarse_{label(order)}_"
        f"{start}_{stop}_serial_replay{replay}_execution_evidence_"
        "rank5_g2_alt_20260830.json"
    )


def validate_report(
    report: dict, geometry: str, order: int | None, count: int, source_hash: str,
) -> None:
    assert report["marker"] == PROBE_MARKER
    assert report["geometry"] == geometry
    assert report["d_branch"] == "coarse"
    assert report["order_branch"] == (
        "ordered mB<=mC with mB,mC>=7"
        if order is None else f"mB={order}, N=13+q"
    )
    assert report["source_sha256"] == source_hash
    assert report["dependencies_sha256"] == {HELPER.name: EXPECTED_HELPER_SHA256}
    assert report["corner_pairs"] == count
    assert report["passing_corner_pairs"] == count
    assert report["failing_corner_pairs"] == 0
    assert len(report["records"]) == count
    assert all(row["negative"] == 0 for row in report["records"])
    digest = hashlib.sha256()
    for row in report["records"]:
        digest.update(json.dumps(row, separators=(",", ":"), sort_keys=True).encode())
    assert digest.hexdigest().upper() == report["ordered_record_sha256"]


def validate_evidence(
    path: Path, geometry: str, order: int | None, start: int, stop: int,
    replay: int, report_path: Path, probe_hash: str, runner_hash: str,
) -> dict:
    evidence = json.loads(path.read_text(encoding="utf-8"))
    assert evidence["marker"] == EVIDENCE_MARKER
    assert evidence["replay"] == replay
    assert evidence["geometry"] == geometry
    assert evidence["d_branch"] == "coarse"
    assert evidence["small_order"] == order
    assert evidence["subrange"] == [start, stop]
    assert evidence["chunk_columns"] == CHUNK_COLUMNS[replay]
    assert evidence["probe_report"] == report_path.name
    assert evidence["probe_report_sha256"] == sha256(report_path)
    assert evidence["probe_source_sha256"] == probe_hash
    assert evidence["runner_source_sha256"] == runner_hash
    assert evidence["lock_acquired_marker_count"] == 1
    assert evidence["lock_released_marker_count"] == 1
    assert evidence["post_batch_probe_worker_count"] == 0
    assert evidence["child_returncode"] == 0
    return {
        "replay": replay,
        "chunk_columns": CHUNK_COLUMNS[replay],
        "report_sha256": sha256(report_path),
        "evidence_sha256": sha256(path),
        "lock_acquired": True,
        "lock_released": True,
        "post_batch_probe_worker_count": 0,
    }


def main() -> None:
    probe_hash, runner_hash = sha256(PROBE), sha256(RUNNER)
    assert sha256(HELPER) == EXPECTED_HELPER_SHA256
    branches = []
    evidence_rows = []
    global_digest = hashlib.sha256()

    for geometry in GEOMETRIES:
        for order in (None, *range(7)):
            reports = []
            replay_rows = []
            for replay in (1, 2):
                full_path = frozen(geometry, order, 0, 256, replay)
                full = json.loads(full_path.read_text(encoding="utf-8"))
                validate_report(full, geometry, order, 256, probe_hash)
                assert [
                    (row["B_mask"], row["C_mask"]) for row in full["records"]
                ] == list(itertools.product(range(16), repeat=2))
                reports.append(full)
                if order is None:
                    subrows = []
                    for start in range(0, 256, 16):
                        stop = start + 16
                        subpath = frozen(
                            geometry, order, start, stop, replay, subbatch=True
                        )
                        subreport = json.loads(subpath.read_text(encoding="utf-8"))
                        validate_report(subreport, geometry, order, 16, probe_hash)
                        expected_pairs = list(itertools.product(range(16), repeat=2))[start:stop]
                        assert [
                            (row["B_mask"], row["C_mask"])
                            for row in subreport["records"]
                        ] == expected_pairs
                        subrows.append(validate_evidence(
                            evidence_path(geometry, order, start, stop, replay),
                            geometry, order, start, stop, replay, subpath,
                            probe_hash, runner_hash,
                        ))
                    replay_rows.append({
                        "replay": replay,
                        "full_report_sha256": sha256(full_path),
                        "subbatches": subrows,
                    })
                else:
                    evidence = validate_evidence(
                        evidence_path(geometry, order, 0, 256, replay),
                        geometry, order, 0, 256, replay, full_path,
                        probe_hash, runner_hash,
                    )
                    replay_rows.append({
                        "replay": replay,
                        "full_report_sha256": sha256(full_path),
                        "execution": evidence,
                    })
            assert reports[0] == reports[1]
            canonical_report = json.loads(canonical(geometry, order).read_text(encoding="utf-8"))
            assert canonical_report == reports[1]
            global_digest.update(
                f"{geometry}|{label(order)}|{reports[0]['ordered_record_sha256']};".encode()
            )
            row = {
                "geometry": geometry,
                "order_branch": label(order),
                "corner_pairs": 256,
                "record_identical_across_replays": True,
                "ordered_record_sha256": reports[0]["ordered_record_sha256"],
                "minimum": str(min(
                    Fraction(record["minimum"]) for record in reports[0]["records"]
                )),
                "replays": replay_rows,
            }
            branches.append(row)
            evidence_rows.extend(replay_rows)

    assert len(branches) == 16
    assert sum(row["corner_pairs"] for row in branches) == 4096
    report = {
        "marker": MARKER,
        "claim": (
            "All 16 nonadjacent coarse-D order branches and all 256 B,C corners "
            "per branch were reproduced record-for-record in two locked serial "
            "replays using distinct Bernstein chunk sizes."
        ),
        "geometries": list(GEOMETRIES),
        "order_branches_per_geometry": ["large", *[f"small{order}" for order in range(7)]],
        "branch_count": len(branches),
        "corner_pairs": 4096,
        "all_coefficients_nonnegative": True,
        "replay_chunk_columns": {str(key): value for key, value in CHUNK_COLUMNS.items()},
        "probe_source_sha256": probe_hash,
        "runner_source_sha256": runner_hash,
        "helper_source_sha256": EXPECTED_HELPER_SHA256,
        "ordered_branch_stream_sha256": global_digest.hexdigest().upper(),
        "branches": branches,
        "large_subbatch_pairs": 2 * 16,
        "large_execution_evidence_records": 2 * 2 * 16,
        "small_execution_evidence_records": 2 * 2 * 7,
        "parallel_reports_admitted": False,
        "pre_lock_reports_admitted": False,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "branches": len(branches),
        "corner_pairs": 4096,
        "all_coefficients_nonnegative": True,
        "ordered_branch_stream_sha256": report["ordered_branch_stream_sha256"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
