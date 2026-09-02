#!/usr/bin/env python3
"""Extend the pinned eighteen-pattern theorem by 41_ix4_iy0."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_isolated_rank7_g5_finish import CONFIG, MARKER as PROBE_MARKER
from prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_12pattern_n12_rank7_g5_finish import algebra_audit


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_19pattern_n12_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_ISOLATED_19PATTERN_N12_RANK7_G5_FINISH"
NEW_PATTERN = "41_ix4_iy0"
FILES = {
    "base_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_18pattern_n12_rank7_g5_finish.py",
    "base_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_18pattern_n12_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_isolated_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_41_ix4_iy0_low_excess_h6_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_41_ix4_iy0_high_excess_h6_probe_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "base_source": "54468E3F85BB65E71B21387F8D639E44452175FDC08A37630F8329172DC551C5",
    "base_report": "9BA4F26FF64F93704BCD09700A7DB720C13C9EBC525294EF4A5BEF2F69169C4F",
    "probe_source": "FB70065863699E1C941C53ADA69167C0C5312D90583CA721F543F69A26FF2D10",
    "low_report": "C49CC548763C4303C3A4C1347A8D52242F1F17C74E27B71929C3A3DB2577F44E",
    "high_report": "0DB29090703202F5344A12DE35E7CBA4235F8F36B02E733B98C8B25E8A5119FC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    base = json.loads((HERE / FILES["base_report"]).read_text(encoding="utf-8"))
    assert base["status"] == "proved exact" and len(base["all_promoted_patterns"]) == 18
    assert base["coverage_gap_within_each_listed_pattern_at_n_ge_12_isolatefree_H"] is None
    certificates = {}
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        item = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert item["marker"] == PROBE_MARKER and item["config"] == NEW_PATTERN
        assert item["configuration"] == CONFIG[NEW_PATTERN] and item["chart"] == chart
        assert item["threshold_h"] == 6 and item["threshold_n"] == 12
        assert item["summary"]["negative_tail_scalar_coefficients"] == 0 and item["summary"]["first_negative"] == []
        assert int(item["summary"]["minimum_tail_scalar_coefficient"]) > 0
        for nested in item["sign_summaries"].values():
            assert nested["negative_tail_scalar_coefficients"] == 0 and nested["first_negative"] == []
            assert int(nested["minimum_tail_scalar_coefficient"]) > 0
        certificates[chart] = {
            "minimum_tail_scalar_coefficient": item["summary"]["minimum_tail_scalar_coefficient"],
            "ordered_stream_sha256": item["summary"]["ordered_stream_sha256"],
            "nested_streams": {key: value["ordered_stream_sha256"] for key, value in sorted(item["sign_summaries"].items())},
        }
    audit = algebra_audit(NEW_PATTERN)
    promoted = base["all_promoted_patterns"] + [NEW_PATTERN]
    remaining = sorted(set(CONFIG) - set(promoted))
    assert remaining == ["32_ix3_iy2"]
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "The nineteen listed split exactly-five adjacent/no-parent G3 isolated-attachment-root patterns are nonnegative for isolate-free H from total order n=12 onward.",
        "base_eighteen_patterns": base["all_promoted_patterns"],
        "newly_promoted_pattern": {NEW_PATTERN: CONFIG[NEW_PATTERN]},
        "new_chart_certificates": certificates,
        "new_safe_lower_audit": audit,
        "all_promoted_patterns": promoted,
        "coverage_gap_within_each_listed_pattern_at_n_ge_12_isolatefree_H": None,
        "unpromoted_classifier_patterns": remaining,
        "finite_seam": "Total order n<=11 is separate.",
        "unrelated_isolate_padding_guard": False,
        "universal_split_five_attachment_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Exactly the nineteen listed split five-attachment patterns, isolate-free H, n>=12; no unrelated-isolate padding, finite n<=11, final all-isolated 3+2 pattern, or >=6 attachments asserted.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "newly_promoted": NEW_PATTERN, "promoted_total": 19, "remaining": remaining}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
