#!/usr/bin/env python3
"""Extend the pinned twelve-pattern theorem by three completed chart pairs."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_isolated_rank7_g5_finish import (
    CONFIG,
    MARKER as PROBE_MARKER,
)
from prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_12pattern_n12_rank7_g5_finish import (
    PATTERNS as BASE_PATTERNS,
    algebra_audit,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_15pattern_n12_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_ISOLATED_15PATTERN_N12_RANK7_G5_FINISH"
CHARTS = ("low_excess", "high_excess")
NEW_PATTERNS = ("32_ix1_iy1", "32_ix3_iy0", "41_ix3_iy0")
FILES = {
    "base_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_12pattern_n12_rank7_g5_finish.py",
    "base_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_12pattern_n12_exact_rank7_g5_finish_20260831.json",
    "probe_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_isolated_rank7_g5_finish.py",
}
EXPECTED = {
    "base_source": "901FB1909082B207E2AFDDBDDCD4075BE794B172476A90D1494D15A8D53054FF",
    "base_report": "BE76668F66D6F6E3814E88B774EC9CF091793397F01E3CC224294E744A96DFA8",
    "probe_source": "FB70065863699E1C941C53ADA69167C0C5312D90583CA721F543F69A26FF2D10",
}
REPORT_HASHES = {
    ("32_ix1_iy1", "low_excess"): "EC35236D1DEF1D9FFA146621A2273F00445CF36AADE183B2518F0B94AC540B86",
    ("32_ix1_iy1", "high_excess"): "C671219676397DF22C7CCE890B91296BEDD7E68C87AC6B5A72706EE1FCA700DA",
    ("32_ix3_iy0", "low_excess"): "FE0164A118CC5144F1C25D623EE4BEBC551A4438E45E917E5CF60CCC27047C76",
    ("32_ix3_iy0", "high_excess"): "172DFB03D3CDCE93C5F29089A1F435AC45A56E65CA43317CDD9A1EAEE7E0626D",
    ("41_ix3_iy0", "low_excess"): "396E4B90E8A86D96FA48013E9F88C65D080177542EB3E2F5CECF319ED8FC0F21",
    ("41_ix3_iy0", "high_excess"): "37A4E5823504F69C3A975EA69F3DE9D1111EE142AEEE4CBFBFCE01C4CABA90C0",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(config_key: str, chart: str) -> Path:
    threshold = CONFIG[config_key]["threshold_h"]
    return HERE / f"iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_{config_key}_{chart}_h{threshold}_probe_rank7_g5_finish_20260831.json"


def validate(config_key: str, chart: str) -> dict:
    path = report_path(config_key, chart)
    assert sha256(path) == REPORT_HASHES[(config_key, chart)]
    item = json.loads(path.read_text(encoding="utf-8"))
    assert item["marker"] == PROBE_MARKER
    assert item["config"] == config_key and item["configuration"] == CONFIG[config_key]
    assert item["chart"] == chart and item["threshold_n"] == 12
    assert item["summary"]["negative_tail_scalar_coefficients"] == 0
    assert item["summary"]["first_negative"] == []
    assert int(item["summary"]["minimum_tail_scalar_coefficient"]) > 0
    for nested in item["sign_summaries"].values():
        assert nested["negative_tail_scalar_coefficients"] == 0
        assert nested["first_negative"] == []
        assert int(nested["minimum_tail_scalar_coefficient"]) > 0
    return {
        "threshold_h": item["threshold_h"],
        "threshold_n": item["threshold_n"],
        "kind": item["kind"],
        "minimum_tail_scalar_coefficient": item["summary"]["minimum_tail_scalar_coefficient"],
        "ordered_stream_sha256": item["summary"]["ordered_stream_sha256"],
        "nested_streams": {key: value["ordered_stream_sha256"] for key, value in sorted(item["sign_summaries"].items())},
    }


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    base = json.loads((HERE / FILES["base_report"]).read_text(encoding="utf-8"))
    assert base["status"] == "proved exact"
    assert tuple(base["promoted_patterns"]) == BASE_PATTERNS
    assert base["coverage_gap_within_each_listed_pattern_at_n_ge_12_isolatefree_H"] is None
    certificates = {
        config_key: {chart: validate(config_key, chart) for chart in CHARTS}
        for config_key in NEW_PATTERNS
    }
    audits = {config_key: algebra_audit(config_key) for config_key in NEW_PATTERNS}
    promoted = tuple(BASE_PATTERNS) + NEW_PATTERNS
    remaining = sorted(set(CONFIG) - set(promoted))
    assert remaining == ["32_ix1_iy2", "32_ix3_iy1", "32_ix3_iy2", "41_ix3_iy1", "41_ix4_iy0"]
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "The fifteen listed split exactly-five adjacent/no-parent G3 isolated-attachment-root patterns are nonnegative for isolate-free H from total order n=12 onward.",
        "base_twelve_patterns": list(BASE_PATTERNS),
        "newly_promoted_patterns": {key: CONFIG[key] for key in NEW_PATTERNS},
        "new_chart_certificates": certificates,
        "new_safe_lower_audits": audits,
        "all_promoted_patterns": list(promoted),
        "coverage_gap_within_each_listed_pattern_at_n_ge_12_isolatefree_H": None,
        "unpromoted_classifier_patterns": remaining,
        "finite_seam": "Total order n<=11 is separate.",
        "unrelated_isolate_padding_guard": False,
        "universal_split_five_attachment_guard": False,
        "dependencies_sha256": EXPECTED | {
            f"report:{config_key}:{chart}": REPORT_HASHES[(config_key, chart)]
            for config_key in NEW_PATTERNS for chart in CHARTS
        },
        "scope": "Exactly the fifteen listed split five-attachment patterns, isolate-free H, n>=12; no unrelated-isolate padding, finite n<=11, other five patterns, or >=6 attachments asserted.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "newly_promoted": list(NEW_PATTERNS),
        "promoted_total": len(promoted),
        "remaining": remaining,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
