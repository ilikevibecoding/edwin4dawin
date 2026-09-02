#!/usr/bin/env python3
"""Compute the last 112 small-order endpoint G2 shards in parallel."""

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
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "SMALL_ORDER_MATRIX_TAIL_ROOT"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_small_order_matrix_tail_"
    "exact_root_20260831.json"
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    assert 1 <= args.workers <= 4
    source_hash = sha256(PRODUCER)
    tail_cases = cases()[112:]
    assert len(tail_cases) == 112
    reports = {}
    dispositions = {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(run_case, case, source_hash, args.force): case
            for case in tail_cases
        }
        for future in as_completed(futures):
            case, disposition, report = future.result()
            reports[case] = report
            dispositions[case] = disposition
            print(json.dumps({
                "case": case,
                "disposition": disposition,
                "report_sha256": sha256(report_path(case)),
            }, sort_keys=True), flush=True)
    assert len(reports) == 112
    rows = [{
        "case": list(case),
        "disposition": dispositions[case],
        "report": report_path(case).name,
        "report_sha256": sha256(report_path(case)),
        "negative_controls": reports[case]["negative_controls"],
    } for case in tail_cases]
    assert all(row["negative_controls"] == 0 for row in rows)
    report = {
        "marker": MARKER,
        "status": "PASS exact last 112 shards; full 224-shard assembly separate",
        "producer": PRODUCER.name,
        "producer_sha256": source_hash,
        "case_indices": [112, 223],
        "shards": len(rows),
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
        "shards": 112,
        "negative_controls": 0,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
