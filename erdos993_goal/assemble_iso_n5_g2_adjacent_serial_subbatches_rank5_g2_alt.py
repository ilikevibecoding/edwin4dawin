#!/usr/bin/env python3
"""Merge strictly serial adjacent-g2 subbatches into one canonical 64-corner report."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
PROBE = HERE / "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
MARKER = "PROBE_EXACT_ISO_N5_G2_ADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_RANK5_G2_ALT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(start: int, stop: int) -> Path:
    return HERE / (
        f"iso_n5_g2_adjacent_order_box_edge_budget_large_{start}_{stop}_"
        "flint_probe_rank5_g2_alt_20260830.json"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-start", type=int, choices=(0, 64, 128, 192), required=True)
    parser.add_argument("--subbatch-size", type=int, choices=(1, 2, 4, 8, 16, 32), default=16)
    args = parser.parse_args()
    batch_start = args.batch_start
    batch_stop = batch_start + 64
    assert 64 % args.subbatch_size == 0
    expected_pairs = list(itertools.product(range(16), repeat=2))
    source_hash = sha256(PROBE)
    records = []
    template = None
    for start in range(batch_start, batch_stop, args.subbatch_size):
        stop = start + args.subbatch_size
        report = json.loads(report_path(start, stop).read_text(encoding="utf-8"))
        assert report["marker"] == MARKER
        assert report["source_sha256"] == source_hash
        assert report["corner_pairs"] == args.subbatch_size
        assert report["passing_corner_pairs"] == args.subbatch_size
        assert report["failing_corner_pairs"] == 0
        assert [(row["B_mask"], row["C_mask"]) for row in report["records"]] == (
            expected_pairs[start:stop]
        )
        digest = hashlib.sha256()
        for row in report["records"]:
            assert row["negative"] == 0
            digest.update(json.dumps(row, separators=(",", ":"), sort_keys=True).encode())
        assert digest.hexdigest().upper() == report["ordered_record_sha256"]
        records.extend(report["records"])
        if template is None:
            template = report
    assert template is not None
    assert [(row["B_mask"], row["C_mask"]) for row in records] == expected_pairs[batch_start:batch_stop]
    digest = hashlib.sha256()
    for row in records:
        digest.update(json.dumps(row, separators=(",", ":"), sort_keys=True).encode())
    merged = {
        key: value for key, value in template.items()
        if key not in {
            "corner_pairs", "passing_corner_pairs", "failing_corner_pairs",
            "ordered_record_sha256", "records",
        }
    }
    merged.update({
        "corner_pairs": 64,
        "passing_corner_pairs": 64,
        "failing_corner_pairs": 0,
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
    })
    raw = json.dumps(merged, indent=2, sort_keys=True) + "\n"
    output = report_path(batch_start, batch_stop)
    output.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "range": [batch_start, batch_stop],
        "corner_pairs": 64,
        "ordered_record_sha256": merged["ordered_record_sha256"],
        "output_sha256": sha256(output),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
