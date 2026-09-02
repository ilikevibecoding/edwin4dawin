#!/usr/bin/env python3
"""Complete all twenty split isolated-root patterns for isolate-free H, n>=12."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_isolated_rank7_g5_finish import CONFIG, MARKER as PROBE_MARKER
from prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_12pattern_n12_rank7_g5_finish import algebra_audit


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_20pattern_n12_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_ISOLATED_20PATTERN_N12_RANK7_G5_FINISH"
NEW_PATTERN = "32_ix3_iy2"
FILES = {
    "base_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_19pattern_n12_rank7_g5_finish.py",
    "base_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_19pattern_n12_exact_rank7_g5_finish_20260831.json",
    "classifier_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_patterns_rank7_g5_finish.py",
    "classifier_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_isolated_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_32_ix3_iy2_low_excess_h5_probe_rank7_g5_finish_20260831.json",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_32_ix3_iy2_high_excess_h5_probe_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "base_source": "435A13995E6483BB40F50587201A99CFE008A74448453752304CEE524447EC50",
    "base_report": "A5C8A21D22C61C9319C2C0D439FC78E4721F050E11937D9F71A01626F82F912C",
    "classifier_source": "A4736C06D1E5C20EC0FF2ADF3F3D984C3A2026D456D55D8C2F44520763610BEB",
    "classifier_report": "237A3CBFAAB75947BB3DBABCA4B53C896552C76AB8B9BD991A7B92D99CAAFD27",
    "probe_source": "FB70065863699E1C941C53ADA69167C0C5312D90583CA721F543F69A26FF2D10",
    "low_report": "303FE4F754C632ABC0F2F8B840EAA8CB4D2916B87C81CB6EC6A3CFE8E127B6D6",
    "high_report": "434CD230B73635E03C672C64D17B00C64BB4181E1FE12A2B86E60C71C73E9024",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    base = json.loads((HERE / FILES["base_report"]).read_text(encoding="utf-8"))
    classifier = json.loads((HERE / FILES["classifier_report"]).read_text(encoding="utf-8"))
    assert base["status"] == "proved exact" and len(base["all_promoted_patterns"]) == 19
    assert base["coverage_gap_within_each_listed_pattern_at_n_ge_12_isolatefree_H"] is None
    assert classifier["exhaustive_classifier"]["total_patterns_in_report"] == 20
    assert classifier["exhaustive_classifier"]["4+1_mixed_or_all_isolated_patterns"] == 9
    assert classifier["exhaustive_classifier"]["3+2_mixed_or_all_isolated_patterns"] == 11
    certificates = {}
    for short, chart in (("low", "low_excess"), ("high", "high_excess")):
        item = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
        assert item["marker"] == PROBE_MARKER and item["config"] == NEW_PATTERN
        assert item["configuration"] == CONFIG[NEW_PATTERN] and item["chart"] == chart
        assert item["kind"] == "base" and item["threshold_h"] == 5 and item["threshold_n"] == 12
        assert item["summary"]["negative_tail_scalar_coefficients"] == 0 and item["summary"]["first_negative"] == []
        assert int(item["summary"]["minimum_tail_scalar_coefficient"]) > 0
        assert item["sign_summaries"] == {}
        certificates[chart] = {
            "minimum_tail_scalar_coefficient": item["summary"]["minimum_tail_scalar_coefficient"],
            "ordered_stream_sha256": item["summary"]["ordered_stream_sha256"],
        }
    audit = algebra_audit(NEW_PATTERN)
    promoted = base["all_promoted_patterns"] + [NEW_PATTERN]
    assert len(promoted) == 20 and set(promoted) == set(CONFIG)
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "Every one of the twenty split exactly-five adjacent/no-parent G3 patterns having at least one isolated attachment root is nonnegative for isolate-free H from total order n=12 onward.",
        "base_nineteen_patterns": base["all_promoted_patterns"],
        "final_promoted_pattern": {NEW_PATTERN: CONFIG[NEW_PATTERN]},
        "final_chart_certificates": certificates,
        "final_safe_lower_audit": audit,
        "all_promoted_patterns": promoted,
        "exhaustive_classifier_counts": classifier["exhaustive_classifier"],
        "coverage_gap_within_all_twenty_classifier_patterns_at_n_ge_12_isolatefree_H": None,
        "finite_seam": "Total order n<=11 is separate.",
        "unrelated_isolate_padding_guard": False,
        "universal_split_five_attachment_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "All twenty split five-attachment patterns with at least one isolated attachment root, isolate-free H, n>=12; no unrelated-isolate padding, finite n<=11, all-nonisolated split branches, or >=6 attachments asserted here.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "final_promoted": NEW_PATTERN,
        "promoted_total": len(promoted),
        "coverage_gap_within_twenty_patterns_n_ge_12_isolatefree_H": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
