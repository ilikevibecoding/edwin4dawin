#!/usr/bin/env python3
"""Universal same-mark two-attachment branch with both roots nonisolated."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_both_nonisolated_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SAME_MARK_BOTH_NONISOLATED_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_exact_rank7_g5_finish_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "seam_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_both_nonisolated_finite_n11_rank7_g5_finish.py",
    "seam_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_both_nonisolated_finite_n11_exact_rank7_g5_finish_20260831.json",
    "large_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_both_nonisolated_n12_rank7_g5_finish.py",
    "large_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_both_nonisolated_n12_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "derive_source": "AB5B8B1C5A3A9792C0656A390A5018D154F5C220B5233992AE6D239CA8C0283D",
    "derive_report": "46B51E942EB3E86CB2B1F39A6E90BE0B5E67E5E40EF9989337825E65B59B1C6D",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "seam_source": "8A86ED1E37F210A532E1407A0A44F385AE3AA551733E7625DF83E0FA28B75647",
    "seam_report": "4634CEA345F92831C1AFA74DC3CBE9ABC520D744204CF81EB9ED71CDB1EC0DA5",
    "large_source": "8C6A81CF2EF11CBB963A8C0E9A62254AB85B72DCBF75158679FAF33E1A4E1D36",
    "large_report": "93CE6694E88052C91CF394AABF6926A495D2AEA0CC059783B63738E78265D0E9",
    "padding_source": "B724A230D6E59594A680896321DF3DB953480B91A484272DC5C5672B40EF8048",
    "padding_report": "D1D88B37906E1508D944C6907081A0AD2ECBF774DE1E72AE7CFD31354AB36BE8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str) -> dict:
    return json.loads((HERE / FILES[key]).read_text(encoding="utf-8"))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    derive = load("derive_report")
    finite = load("finite_report")
    seam = load("seam_report")
    large = load("large_report")
    padding = load("padding_report")
    assert derive["structural_partition"]["exhaustive_up_to_mark_symmetry"] is True
    assert finite["negative_count"] == 0 and finite["orders"] == [2, 10]
    assert seam["coverage_gap_within_same_mark_both_nonisolated_n11"] is None
    assert large["coverage_gap_within_stated_same_mark_both_nonisolated_branch"] is None
    assert padding["coverage_gap_within_positive_order_same_mark_two_attachment_padding"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True
    assert 8+2 == 10 and 9+2 == 11 and 10+2 == 12
    classes = [
        {"core": "isolate-free H with both roots nonisolated and 4<=h<=8", "base": "finite all-mode n=h+2<=10 certificate", "isolates": "same-mark two-attachment padding theorem"},
        {"core": "isolate-free H with both roots nonisolated and h=9", "base": "complete cross-component rooted-pair census at n=11", "isolates": "same-mark two-attachment padding theorem"},
        {"core": "isolate-free H with both roots nonisolated and h>=10", "base": "intersected tau large theorem at n=h+2>=12", "isolates": "same-mark two-attachment padding theorem"},
    ]
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with exactly two attachments at the same mark, if both attachment roots are nonisolated in W, rank-seven G3 is nonnegative for every forest and every order.",
        "isolate_stripping": "Removing all isolated W-vertices (neither can be an attachment root here) leaves a unique isolate-free core H; the three base-size classes are exhaustive and padding restores every removed isolate.",
        "exhaustive_classes": classes,
        "coverage_gap_within_same_mark_both_nonisolated_two_attachment_G3": None,
        "universal_same_mark_guard": False,
        "universal_two_attachment_guard": False,
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "This is a strict subbranch of the adjacent no-parent cell; the residual ledger is not decremented.",
        "remaining_exactly_two_attachment_scope": "Same-mark with one or two isolated attachment roots, and every split-mark case.",
        "dependencies_sha256": EXPECTED,
        "scope": "Universal only for same-mark exactly-two-attachment G3 with both roots nonisolated.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "exhaustive_classes": len(classes), "coverage_gap_within_same_mark_both_nonisolated_two_attachment_G3": None, "rank7_G3_symmetry_reduced_cells_after": 18}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
