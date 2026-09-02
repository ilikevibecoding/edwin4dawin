#!/usr/bin/env python3
"""Audit and quarantine the nondeterministic parallel (9,9) corner record."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_adjacent_parallel_anomaly_quarantine_audit_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_ADJACENT_PARALLEL_ANOMALY_QUARANTINE_RANK5_G2_ALT"
PROBE = HERE / "probe_iso_n5_g2_adjacent_order_box_edge_budget_flint_rank5_g2_alt.py"
BAD = HERE / (
    "iso_n5_g2_adjacent_order_box_edge_budget_large_128_192_"
    "parallel_untrusted_rank5_g2_alt_20260830.json"
)
GOOD_ONE = HERE / (
    "iso_n5_g2_adjacent_order_box_edge_budget_large_153_154_"
    "flint_probe_rank5_g2_alt_20260830.json"
)
GOOD_TWO = HERE / (
    "iso_n5_g2_adjacent_order_box_edge_budget_large_152_154_"
    "flint_probe_rank5_g2_alt_20260830.json"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    source_hash = sha256(PROBE)
    bad_report = json.loads(BAD.read_text(encoding="utf-8"))
    good_one_report = json.loads(GOOD_ONE.read_text(encoding="utf-8"))
    good_two_report = json.loads(GOOD_TWO.read_text(encoding="utf-8"))
    assert bad_report["source_sha256"] == source_hash
    assert good_one_report["source_sha256"] == source_hash
    assert good_two_report["source_sha256"] == source_hash
    bad = next(
        row for row in bad_report["records"]
        if (row["B_mask"], row["C_mask"]) == (9, 9)
    )
    good_one = good_one_report["records"][0]
    good_two = next(
        row for row in good_two_report["records"]
        if (row["B_mask"], row["C_mask"]) == (9, 9)
    )
    assert bad["negative"] == 1128 and bad["minimum"] == "-32"
    assert good_one == good_two
    assert good_one["negative"] == 0 and good_one["minimum"] == "0"
    assert good_one["coefficient_stream_sha256"] == (
        "721701BC7EE6D5C3F221D15CEFA67EE5A34C7FB4A557A73B7A8D3B2E5234F9C4"
    )
    assert bad["coefficient_stream_sha256"] != good_one["coefficient_stream_sha256"]
    report = {
        "marker": MARKER,
        "finding": (
            "The parallel-only (9,9) record is nondeterministic and is excluded. "
            "Two fresh serial records are exactly identical and nonnegative."
        ),
        "probe_source_sha256": source_hash,
        "bad_parallel_record": bad,
        "serial_record": good_one,
        "artifacts_sha256": {
            BAD.name: sha256(BAD),
            GOOD_ONE.name: sha256(GOOD_ONE),
            GOOD_TWO.name: sha256(GOOD_TWO),
        },
        "admission_policy": (
            "No parallel-only record is admitted to the theorem. The complete large "
            "certificate must be reproduced in two strictly serial fresh-process passes."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "bad_stream": bad["coefficient_stream_sha256"],
        "serial_stream": good_one["coefficient_stream_sha256"],
        "parallel_admitted": False,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
