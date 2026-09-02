#!/usr/bin/env python3
"""Forced byte-identical replay audit of all 56 ratio-floor shards."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path

from run_iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_matrix_root import (
    PRODUCER,
    cases,
    report_path,
    run_case,
    sha256,
)


HERE = Path(__file__).resolve().parent
MARKER = (
    "PASS_REPLAY_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
    "RATIO_FLOOR_MATRIX_ROOT"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_matrix_"
    "replay_exact_root_20260831.json"
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()
    assert 1 <= args.workers <= 4
    matrix_cases = cases()
    assert len(matrix_cases) == 56
    source_hash = sha256(PRODUCER)
    before = {case: sha256(report_path(case)) for case in matrix_cases}
    reports = {}
    after = {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(run_case, case, source_hash, True): case
            for case in matrix_cases
        }
        for future in as_completed(futures):
            case, disposition, report = future.result()
            assert disposition == "computed"
            reports[case] = report
            after[case] = sha256(report_path(case))
            assert after[case] == before[case]
            print(json.dumps({
                "case": case,
                "byte_identical": True,
                "minimum": report["ordinary_lower_certificate"]["minimum"],
                "report_sha256": after[case],
            }, sort_keys=True), flush=True)

    assert len(reports) == 56
    rows = [{
        "case": list(case),
        "report": report_path(case).name,
        "before_sha256": before[case],
        "after_sha256": after[case],
        "byte_identical": before[case] == after[case],
        "negative_lower_controls": reports[case]["negative_lower_controls"],
        "negative_sign_controls": reports[case]["negative_sign_controls"],
        "minimum": reports[case]["ordinary_lower_certificate"]["minimum"],
    } for case in matrix_cases]
    assert all(row["byte_identical"] for row in rows)
    assert all(row["negative_lower_controls"] == 0 for row in rows)
    assert all(row["negative_sign_controls"] == 0 for row in rows)
    report = {
        "marker": MARKER,
        "status": "PASS forced byte-identical replay of all 56 exact shards",
        "producer": PRODUCER.name,
        "producer_sha256": source_hash,
        "coverage": (
            "N>=19, ordered induced orders at least seven, both geometries, "
            "all exhaustive order/edge charts, all B2/C2 corners, and both D2 endpoints"
        ),
        "shards": len(rows),
        "byte_identical_shards": sum(row["byte_identical"] for row in rows),
        "negative_lower_controls": 0,
        "negative_sign_controls": 0,
        "rows": rows,
        "source_sha256": hashlib.sha256(
            Path(__file__).read_bytes()
        ).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "shards": 56,
        "byte_identical_shards": 56,
        "negative_lower_controls": 0,
        "negative_sign_controls": 0,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
