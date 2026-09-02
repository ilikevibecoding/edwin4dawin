#!/usr/bin/env python3
"""Shifted-tail repair for the 3+2 high-excess five-attachment cone."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_all_nonisolated_rank7_g5_finish import (
    build_value,
    sha256,
    summarize,
)


HERE = Path(__file__).resolve().parent
BASE_SOURCE = HERE / "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_all_nonisolated_rank7_g5_finish.py"
BASE_SOURCE_SHA = "3F8A89D6FEB3F07589BCF08C92EBEFC123EBDED21F2E92DCDB1A8F0478503ECD"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_32_high_excess_m12_probe_rank7_g5_finish_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_32_HIGH_THRESHOLD12_RANK7_G5_FINISH"


def main() -> None:
    assert sha256(BASE_SOURCE) == BASE_SOURCE_SHA
    values = build_value("3+2", "high_excess")
    summary, denominator = summarize(values["value"], values["variables"], values["m"], threshold=12)
    nested_summaries = {}
    for label, expression in values["nested_values"].items():
        nested_summaries[label], _ = summarize(-expression, values["sign_variables"], values["m"], threshold=12)
    report = {
        "marker": MARKER,
        "status": "exact shifted-tail diagnostic; no theorem asserted",
        "distribution": "3+2",
        "chart": "high_excess",
        "threshold_m": 12,
        "threshold_n": 14,
        "summary": summary,
        "nested_negative_summaries": nested_summaries,
        "positive_denominator": denominator,
        "finite_seam_left_by_shift": "m=10,11 (n=12,13)",
        "base_source_sha256": BASE_SOURCE_SHA,
        "source_sha256": sha256(Path(__file__)),
        "scope": "Exactly five 3+2 attachments, all roots nonisolated in distinct components, isolate-free W, high-excess chart, m>=12.",
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "main_negatives": summary["negative_tail_scalar_coefficients"],
        "minimum": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
        "nested_negatives": {label: item["negative_tail_scalar_coefficients"] for label, item in nested_summaries.items()},
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
