#!/usr/bin/env python3
"""Universal assembly for exactly-five split adjacent/no-parent G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_universal_assembled_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_UNIVERSAL_ASSEMBLED_RANK7_G5_FINISH"
FILES = {
    "41_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_41_all_nonisolated_n12_rank7_g5_finish.py",
    "41_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_41_all_nonisolated_n12_exact_rank7_g5_finish_20260831.json",
    "32_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_32_all_nonisolated_universal_rank7_g5_finish.py",
    "32_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_32_all_nonisolated_universal_exact_rank7_g5_finish_20260831.json",
    "isolated_large_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_20pattern_n12_rank7_g5_finish.py",
    "isolated_large_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_20pattern_n12_exact_rank7_g5_finish_20260831.json",
    "isolated_finite_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_finite_n2_11_rank7_g5_finish.py",
    "isolated_finite_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_finite_n2_11_assembled_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_padding_increment_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_padding_increment_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "41_source": "3AC2898F09311DDBAC68C36464FB32F30A9DE17E72D83BC6635ACC59FA8BE9B2",
    "41_report": "BA6AB47A261349FE9697A684D5B40AA436D65D4F0616CAE05CE26971CA7886F6",
    "32_source": "AC1190383F406653465DFE48110EC1228F94D76F616E2B6D05BBAB58DF2CEF00",
    "32_report": "8390D340DD2B55C779E9F554743C2EFED74610A65CA76C593DDC1CA449F04666",
    "isolated_large_source": "7AB1B4E13F4B898FA6877E7E6D0473646FD6C918E0D69BD75A95EB648D81EF2A",
    "isolated_large_report": "F8DC1FCA6240402F569C1358864A6A674A4A5F248C4617AF29F16EBAA80F72FE",
    "isolated_finite_source": "77B59E895F99D62C72342130069703FE77DF90D31015A2A973A7D2BF51C88580",
    "isolated_finite_report": "D46D225E84742E3B54311A608958E45F6676AB8AFD9A9B0D177749B312192DDD",
    "padding_source": "3B31CC9833F13E6FA7EB5CA71E9B749D9CEA33F7D6F8287E7363F0174014C423",
    "padding_report": "E432731E5885AFDD4E31665976D28099BC47D5A5F2E0AFED6FCA3372D684DCA5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str) -> dict:
    return json.loads((HERE / FILES[key]).read_text(encoding="utf-8"))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    branch41, branch32 = load("41_report"), load("32_report")
    isolated_large, isolated_finite, padding = load("isolated_large_report"), load("isolated_finite_report"), load("padding_report")
    assert branch41["status"] == "proved exact"
    assert branch41["coverage_gap_within_stated_41_all_nonisolated_branch"] is None
    assert branch41["coverage"]["distribution"] == "split_4plus1"
    assert branch41["coverage"]["orders"] == "n>=12"
    assert branch32["status"] == "proved exact"
    assert branch32["coverage_gap_within_stated_32_all_nonisolated_branch"] is None
    assert branch32["exact_partition"]["feasible_order_floor"].startswith("m>=10")
    assert isolated_large["status"] == "proved exact"
    assert len(isolated_large["all_promoted_patterns"]) == 20
    assert isolated_large["coverage_gap_within_all_twenty_classifier_patterns_at_n_ge_12_isolatefree_H"] is None
    assert isolated_finite["status"] == "proved exact"
    assert isolated_finite["coverage_gap_within_stated_finite_n2_11_branch"] is None
    assert padding["status"] == "proved exact"
    assert set(padding["certificates"]) == {"41", "32"}
    assert padding["coverage_gap_within_split_unrelated_isolate_padding_operator"] is None
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, G3 is nonnegative for every forest having exactly five attachment roots in distinct components and split 4+1 or 3+2 between the two marks, at every order and with arbitrary unrelated isolated vertices.",
        "fail_closed_partition": {
            "remove_unrelated_isolates": "Delete all isolates that are not among the five attachment roots, producing the canonical unpadded base W0.",
            "all_five_roots_nonisolated": {
                "base": "W0 is isolate-free; the 4+1 and 3+2 all-nonisolated theorems cover every feasible base order n0>=12.",
                "padding": "The exact one-isolate increment lifts W0 to the original W for every deleted-isolate count.",
            },
            "at_least_one_attachment_root_isolated": {
                "base_n0_le_11": "The exact finite n2..11 assembly covers all twenty patterns; the n=11 audit already includes every finite unrelated-isolate seam.",
                "base_n0_ge_12": "After deleting isolated attachment roots, the remaining core H is isolate-free; the exhaustive twenty-pattern theorem applies.",
                "padding": "The same exact one-isolate increment lifts either base to the original W.",
            },
            "distributions": ["4+1", "3+2"],
            "root_statuses": ["all nonisolated", "at least one isolated"],
            "orders": "all feasible orders",
        },
        "padding_operator": {
            "strict_safe_lower_minimum": {key: value["minimum_tail_power_coefficient"] for key, value in padding["certificates"].items()},
            "induction": padding["inductive_corollary"],
        },
        "coverage_gap_within_exactly_five_split_adjacent_no_parent_g3": None,
        "same_mark_guard": "The 5+0 distribution is separately frozen and is not asserted by this split assembler.",
        "attachment_count_guard": "Configurations with >=6 attachment roots are separate.",
        "universal_adjacent_no_parent_g3_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Exactly five split 4+1 or 3+2 attachment roots in distinct components, adjacent marks, no-parent G3, all root-isolation patterns, arbitrary unrelated isolates, every feasible order; 5+0 and >=6 separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "distributions": report["fail_closed_partition"]["distributions"],
        "orders": report["fail_closed_partition"]["orders"],
        "coverage_gap_within_exactly_five_split": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
