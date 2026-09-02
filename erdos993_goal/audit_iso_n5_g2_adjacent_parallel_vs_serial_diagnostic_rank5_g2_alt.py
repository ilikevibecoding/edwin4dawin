#!/usr/bin/env python3
"""Compare every quarantined parallel adjacent-g2 record to serial replay 1.

This is a diagnostic audit, never a theorem dependency.  A completed report
records every field-level mismatch while explicitly refusing to admit any
parallel-only record, whether or not its sign happens to agree with serial.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n5_g2_adjacent_parallel_vs_serial_diagnostic_"
    "rank5_g2_alt_20260830.json"
)
MARKER = (
    "PASS_DIAGNOSTIC_ISO_N5_G2_ADJACENT_PARALLEL_VS_SERIAL_"
    "FULL_COMPARISON_RANK5_G2_ALT"
)
PROBE_MARKER = (
    "PROBE_EXACT_ISO_N5_G2_ADJACENT_ORDER_BOX_EDGE_BUDGET_"
    "FLINT_RANK5_G2_ALT"
)
PROBE_SOURCE = HERE / (
    "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
)
RANGES = ((0, 64), (64, 128), (128, 192), (192, 256))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(start: int, stop: int, kind: str) -> Path:
    if kind == "parallel":
        suffix = "parallel_untrusted"
    elif kind == "serial":
        suffix = "serial_replay1"
    else:
        raise ValueError(kind)
    return HERE / (
        f"iso_n5_g2_adjacent_order_box_edge_budget_large_{start}_{stop}_"
        f"{suffix}_rank5_g2_alt_20260830.json"
    )


def validate(report: dict, start: int, stop: int, source_hash: str) -> None:
    assert report["marker"] == PROBE_MARKER
    assert report["source_sha256"] == source_hash
    assert report["corner_pairs"] == stop - start == 64
    assert len(report["records"]) == 64
    expected = list(itertools.product(range(16), repeat=2))[start:stop]
    assert [(row["B_mask"], row["C_mask"]) for row in report["records"]] == expected
    digest = hashlib.sha256()
    for row in report["records"]:
        digest.update(json.dumps(row, separators=(",", ":"), sort_keys=True).encode())
    assert digest.hexdigest().upper() == report["ordered_record_sha256"]


def main() -> None:
    source_hash = sha256(PROBE_SOURCE)
    batches = []
    mismatches = []
    equal_records = 0
    sign_disagreements = 0

    for start, stop in RANGES:
        parallel_path = report_path(start, stop, "parallel")
        serial_path = report_path(start, stop, "serial")
        parallel = json.loads(parallel_path.read_text(encoding="utf-8"))
        serial = json.loads(serial_path.read_text(encoding="utf-8"))
        validate(parallel, start, stop, source_hash)
        validate(serial, start, stop, source_hash)
        batch_mismatches = 0
        for local_index, (parallel_row, serial_row) in enumerate(
            zip(parallel["records"], serial["records"])
        ):
            assert (parallel_row["B_mask"], parallel_row["C_mask"]) == (
                serial_row["B_mask"], serial_row["C_mask"]
            )
            if parallel_row == serial_row:
                equal_records += 1
                continue
            batch_mismatches += 1
            fields = sorted(
                key for key in set(parallel_row) | set(serial_row)
                if parallel_row.get(key) != serial_row.get(key)
            )
            parallel_negative = int(parallel_row["negative"])
            serial_negative = int(serial_row["negative"])
            if (parallel_negative > 0) != (serial_negative > 0):
                sign_disagreements += 1
            mismatches.append({
                "global_corner_index": start + local_index,
                "B_mask": serial_row["B_mask"],
                "C_mask": serial_row["C_mask"],
                "differing_fields": fields,
                "parallel_values": {key: parallel_row.get(key) for key in fields},
                "serial_values": {key: serial_row.get(key) for key in fields},
                "sign_disagreement": (parallel_negative > 0) != (serial_negative > 0),
            })
        batches.append({
            "range": [start, stop],
            "parallel_report": parallel_path.name,
            "parallel_report_sha256": sha256(parallel_path),
            "parallel_ordered_record_sha256": parallel["ordered_record_sha256"],
            "serial_report": serial_path.name,
            "serial_report_sha256": sha256(serial_path),
            "serial_ordered_record_sha256": serial["ordered_record_sha256"],
            "record_mismatches": batch_mismatches,
        })

    # itertools.product orders C fastest, so masks independently replay the index.
    for row in mismatches:
        assert row["global_corner_index"] == 16 * row["B_mask"] + row["C_mask"]

    assert equal_records + len(mismatches) == 256
    report = {
        "marker": MARKER,
        "purpose": (
            "Complete field-level comparison of quarantined parallel output "
            "against deterministic strict-serial replay 1."
        ),
        "probe_source_sha256": source_hash,
        "corner_pairs": 256,
        "equal_records": equal_records,
        "mismatching_records": len(mismatches),
        "sign_disagreements": sign_disagreements,
        "mismatches": mismatches,
        "batches": batches,
        "parallel_reports_admitted": False,
        "scope": "Diagnostic only; serial replay and its independent duplicate govern admission.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "corner_pairs": 256,
        "equal_records": equal_records,
        "mismatching_records": len(mismatches),
        "sign_disagreements": sign_disagreements,
        "parallel_reports_admitted": False,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
