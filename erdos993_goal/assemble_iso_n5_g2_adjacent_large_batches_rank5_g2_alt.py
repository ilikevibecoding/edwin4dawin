#!/usr/bin/env python3
"""Fail-closed merger for the four exact adjacent-g2 large-order batches."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
OUTPUT = HERE / "iso_n5_g2_adjacent_order_box_edge_budget_flint_probe_rank5_g2_alt_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G2_ADJACENT_ORDER_BOX_EDGE_BUDGET_FLINT_RANK5_G2_ALT"
BATCH_RANGES = ((0, 64), (64, 128), (128, 192), (192, 256))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    source_hash = sha256(SOURCE)
    records: list[dict] = []
    batch_hashes: dict[str, str] = {}
    template = None
    expected_pairs = list(itertools.product(range(16), repeat=2))

    for start, stop in BATCH_RANGES:
        path = HERE / (
            f"iso_n5_g2_adjacent_order_box_edge_budget_large_{start}_{stop}_"
            "flint_probe_rank5_g2_alt_20260830.json"
        )
        report = json.loads(path.read_text(encoding="utf-8"))
        assert report["marker"] == MARKER
        assert report["branch"] == "adjacent marks, ordered mB<=mC, mB,mC>=7"
        assert report["source_sha256"] == source_hash
        assert report["corner_pairs"] == stop - start == 64
        assert report["passing_corner_pairs"] == 64
        assert report["failing_corner_pairs"] == 0
        batch_records = report["records"]
        assert [(row["B_mask"], row["C_mask"]) for row in batch_records] == expected_pairs[start:stop]
        digest = hashlib.sha256()
        for row in batch_records:
            assert row["negative"] == 0
            digest.update(json.dumps(row, separators=(",", ":"), sort_keys=True).encode())
        assert digest.hexdigest().upper() == report["ordered_record_sha256"]
        batch_hashes[path.name] = sha256(path)
        records.extend(batch_records)
        if template is None:
            template = report

    assert template is not None
    assert [(row["B_mask"], row["C_mask"]) for row in records] == expected_pairs
    digest = hashlib.sha256()
    for row in records:
        digest.update(json.dumps(row, separators=(",", ":"), sort_keys=True).encode())

    report = {
        key: value for key, value in template.items()
        if key not in {
            "corner_pairs", "passing_corner_pairs", "failing_corner_pairs",
            "ordered_record_sha256", "records", "scope",
        }
    }
    report.update({
        "corner_pairs": 256,
        "passing_corner_pairs": 256,
        "failing_corner_pairs": 0,
        "ordered_record_sha256": digest.hexdigest().upper(),
        "records": records,
        "batch_reports_sha256": batch_hashes,
        "batch_assembly_source_sha256": sha256(Path(__file__)),
        "scope": (
            "Exact complete large-order relaxation probe assembled from four disjoint "
            "64-corner batches. This is not a theorem without the small-order, finite, "
            "and all-order assembly certificates."
        ),
    })
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "corner_pairs": 256,
        "passing_corner_pairs": 256,
        "failing_corner_pairs": 0,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
