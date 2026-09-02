#!/usr/bin/env python3
"""Gapless finite n<=11 assembly for split isolated-root five attachments."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_finite_n2_11_assembled_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_ISOLATED_FINITE_N2_11_ASSEMBLED_RANK7_G5_FINISH"
FILES = {
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "n11_source": "audit_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_n11_all_padding_rank7_g5_finish.py",
    "n11_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_n11_all_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "n11_source": "0D2BEE1A2F014A90FC91CA5640F22F127906096A5B98F0A7F4EDE3D087F500DC",
    "n11_report": "9F5527A4A0A221550BFB95D5BF732EEB345101B2420EEA2BEE8B84942E7EE198",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    finite = json.loads((HERE / FILES["finite_report"]).read_text(encoding="utf-8"))
    n11 = json.loads((HERE / FILES["n11_report"]).read_text(encoding="utf-8"))
    assert finite["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N2_10_ASSEMBLED_RANK7_G4_PIECEWISE"
    assert finite["status"] == "proved exact finite exhaustion"
    assert finite["orders"] == [2, 10] and "G3" in finite["coefficients"]
    assert finite["negative_count"] == 0
    assert n11["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_ISOLATED_N11_ALL_PADDING_RANK7_G5_FINISH"
    assert n11["status"] == "proved exact"
    assert len(n11["pattern_reports"]) == 20
    assert n11["aggregate"]["instances"] == 949
    assert n11["aggregate"]["negative_count"] == 0
    assert n11["aggregate"]["global_minimum"] == 500432
    assert n11["coverage_gap_within_split_isolated_root_n11_all_unrelated_padding"] is None
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "Every feasible split exactly-five adjacent/no-parent G3 pattern with at least one isolated attachment root is nonnegative at every finite order 2<=n<=11, including every unrelated-isolate count at n=11.",
        "exact_partition": {
            "n2_through_n10": "Pinned complete rank-seven G1/G2/G3 finite bundle census across all modes and geometries.",
            "n11": "All twenty split isolated-root patterns; all canonical isolate-free cores, unrelated-isolate counts, distinct root components, root vertices, and side unions.",
        },
        "n11_audit": n11["aggregate"],
        "coverage_gap_within_stated_finite_n2_11_branch": None,
        "large_order_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Finite 2<=n<=11 split exactly-five adjacent/no-parent G3 with at least one isolated attachment root; n>=12 and >=6 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "orders": [2, 11], "patterns_at_n11": 20, "coverage_gap": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
