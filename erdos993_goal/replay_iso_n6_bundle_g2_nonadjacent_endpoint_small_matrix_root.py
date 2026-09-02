#!/usr/bin/env python3
"""Forced byte-identical replay of all 224 small-order endpoint shards."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path

from run_iso_n6_bundle_g2_nonadjacent_endpoint_small_matrix_root import (
    PRODUCER,
    cases,
    report_path,
    run_case,
    sha256,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_small_order_matrix_"
    "replay_exact_root_20260831.json"
)
MARKER = (
    "PASS_REPLAY_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "SMALL_ORDER_MATRIX_ROOT"
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    assert 1 <= args.workers <= 4
    matrix_cases = cases()
    assert len(matrix_cases) == 224
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
                "report_sha256": after[case],
            }, sort_keys=True), flush=True)
    rows = [{
        "case": list(case),
        "report": report_path(case).name,
        "before_sha256": before[case],
        "after_sha256": after[case],
        "byte_identical": before[case] == after[case],
        "negative_controls": reports[case]["negative_controls"],
    } for case in matrix_cases]
    assert len(rows) == 224
    assert all(row["byte_identical"] for row in rows)
    assert all(row["negative_controls"] == 0 for row in rows)
    report = {
        "marker": MARKER,
        "status": "PASS forced byte-identical replay of all 224 exact shards",
        "producer": PRODUCER.name,
        "producer_sha256": source_hash,
        "coverage": (
            "N>=19, smaller induced order 0..6, both nonadjacent geometries, "
            "both endpoint orientations, and all B2/C2/D2 corners"
        ),
        "shards": len(rows),
        "byte_identical_shards": sum(row["byte_identical"] for row in rows),
        "negative_controls": 0,
        "rows": rows,
        "source_sha256": hashlib.sha256(
            Path(__file__).read_bytes()
        ).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "shards": 224,
        "byte_identical_shards": 224,
        "negative_controls": 0,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
