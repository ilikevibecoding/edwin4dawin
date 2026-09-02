#!/usr/bin/env python3
"""Fail-closed universal assembly for the exactly-five 3+2 all-nonisolated cell.

The two large-order inputs are exact rational Bernstein certificates on the
low- and high-excess forest-moment charts.  Their shifted threshold is m=12.
The only two smaller feasible orders, m=10,11, are discharged by the pinned
complete rooted/side audit.  (Five nonisolated roots in distinct components
force m>=10.)
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_32_all_nonisolated_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_32_ALL_NONISOLATED_UNIVERSAL_RANK7_G5_FINISH"

FILES = {
    "base_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_all_nonisolated_rank7_g5_finish.py",
    "low_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_32_low_threshold12_rank7_g5_finish.py",
    "low_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_32_low_excess_m12_probe_rank7_g5_finish_20260831.json",
    "high_source": "probe_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_32_high_threshold12_rank7_g5_finish.py",
    "high_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_32_high_excess_m12_probe_rank7_g5_finish_20260831.json",
    "finite_source": "audit_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_all_nonisolated_m10_11_rank7_g5_finish.py",
    "finite_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_all_nonisolated_m10_11_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "base_source": "3F8A89D6FEB3F07589BCF08C92EBEFC123EBDED21F2E92DCDB1A8F0478503ECD",
    "low_source": "D0B1656EBF64505BB360AEBA21868A0E3CB6F32FC110B8B8875E4CCBB14B18A6",
    "low_report": "04679E0CF6981170117F0C033BBD32F50A0118677E4762A9D7CF83DB5E585962",
    "high_source": "E2638061ADE2E1DCCE02EEAE044754558064F59BEAD6A29F9A1BA8F2E6BE7B50",
    "high_report": "0864C7FD4B8FFD7FD3CC62308A30924684B8D0B84D67FCCDEC43BE0AB0E557B1",
    "finite_source": "B4D3A3BA522A901972FFC50345F9A27E9B7E5BDE32361F08B82711CEC353E830",
    "finite_report": "CB06FE3D73871C31D96A17BB31309E33CF66C47FAFE5C39DA4AF86D16C7D6E79",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def validate_chart(short: str, chart: str) -> dict:
    report = json.loads((HERE / FILES[f"{short}_report"]).read_text(encoding="utf-8"))
    assert report["marker"] == (
        f"PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_"
        f"FIVE_ATTACHMENT_32_{short.upper()}_THRESHOLD12_RANK7_G5_FINISH"
    )
    assert report["distribution"] == "3+2"
    assert report["chart"] == chart
    assert report["threshold_m"] == 12 and report["threshold_n"] == 14
    assert report["finite_seam_left_by_shift"] == "m=10,11 (n=12,13)"
    assert report["base_source_sha256"] == EXPECTED["base_source"]
    assert report["source_sha256"] == EXPECTED[f"{short}_source"]
    summary = report["summary"]
    assert summary["negative_tail_scalar_coefficients"] == 0
    assert summary["first_negative"] == []
    assert int(summary["minimum_tail_scalar_coefficient"]) > 0
    assert summary["bernstein_controls"] > 0
    assert summary["tail_scalar_coefficients"] > 0
    assert summary["positive_denominator"] == "1"
    nested = report["nested_negative_summaries"]
    assert set(nested) == {"P", "Q"}
    for item in nested.values():
        assert item["negative_tail_scalar_coefficients"] == 0
        assert item["first_negative"] == []
        assert int(item["minimum_tail_scalar_coefficient"]) > 0
    assert report["positive_denominator"] == "80640*(edge_parameter*tail + 2*edge_parameter + tail + 12)**2"
    return {
        "chart": chart,
        "threshold_m": report["threshold_m"],
        "bernstein_controls": summary["bernstein_controls"],
        "tail_scalar_coefficients": summary["tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "ordered_stream_sha256": summary["ordered_stream_sha256"],
        "nested_ordered_stream_sha256": {
            label: item["ordered_stream_sha256"] for label, item in sorted(nested.items())
        },
        "positive_denominator": report["positive_denominator"],
    }


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key

    finite = json.loads((HERE / FILES["finite_report"]).read_text(encoding="utf-8"))
    assert finite["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_ALL_NONISOLATED_M10_11_RANK7_G5_FINISH"
    assert finite["status"] == "proved exact"
    assert finite["source_sha256"] == EXPECTED["finite_source"]
    assert finite["aggregate"] == {
        "rooted_side_instances": 1280,
        "negative_count": 0,
        "global_minimum": 1261392,
        "ordered_stream_sha256": "1A45200CC9ADDF28C7429A0D5F05FA8CFEE5D15F70CF4F29A124EC0F5CDF1EB7",
    }
    assert all(f"m{m}_32" in finite["case_reports"] for m in (10, 11))
    assert finite["coverage_gap_within_stated_m10_11_all_nonisolated_five_attachment_branch"] is None

    charts = {
        "low_excess": validate_chart("low", "low_excess"),
        "high_excess": validate_chart("high", "high_excess"),
    }
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent no-parent G3 with exactly five attachments distributed 3+2 among the marks, all five roots nonisolated in distinct components of isolate-free W, G3 is nonnegative at every feasible order n>=12.",
        "exact_partition": {
            "feasible_order_floor": "m>=10 (n>=12), since five distinct nontrivial components need at least ten vertices",
            "finite_seam": "m=10,11 (n=12,13): complete rooted/side audit",
            "large_order": "m>=12 (n>=14): exact low/high excess Bernstein charts",
            "chart_exhaustion": "low_excess and high_excess are the exhaustive forest-moment split used by the pinned producer",
        },
        "chart_certificates": charts,
        "finite_certificate": {
            "orders_m": [10, 11],
            "rooted_side_instances_all_distributions": 1280,
            "global_minimum_all_distributions": 1261392,
            "ordered_stream_sha256": finite["aggregate"]["ordered_stream_sha256"],
        },
        "coverage_gap_within_stated_32_all_nonisolated_branch": None,
        "universal_adjacent_cell_guard": False,
        "residual_adjacent_no_parent_g3": "Exactly-five split distributions with at least one isolated attachment root, and all configurations with at least six attachments remain separate.",
        "dependencies_sha256": EXPECTED,
        "scope": "Exactly five 3+2 attachments, all roots nonisolated in distinct components, W isolate-free, every feasible n>=12; no other isolated-root or attachment-count cell is asserted.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "charts": sorted(charts),
        "finite_orders_m": [10, 11],
        "coverage_gap_within_stated_branch": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
