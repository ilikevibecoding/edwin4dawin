#!/usr/bin/env python3
"""Assemble all isolate-free, all-nonisolated exactly-five G3 distributions."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_"
    "all_nonisolated_isolate_free_assembled_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_"
    "ALL_NONISOLATED_ISOLATE_FREE_ROOT"
)
PINS = {
    "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_50_all_nonisolated_n12_rank7_g5_finish.py":
        "663C403ED22B2CCAF03E4C66948B09D8196B1C550854266C111A6ADBC0454643",
    "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_50_all_nonisolated_n12_exact_rank7_g5_finish_20260831.json":
        "51C9324E965D8FBB927ABF0F84766FD7BA8E40CE4AF95DD8270638D695A03A64",
    "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_41_all_nonisolated_n12_rank7_g5_finish.py":
        "3AC2898F09311DDBAC68C36464FB32F30A9DE17E72D83BC6635ACC59FA8BE9B2",
    "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_41_all_nonisolated_n12_exact_rank7_g5_finish_20260831.json":
        "BA6AB47A261349FE9697A684D5B40AA436D65D4F0616CAE05CE26971CA7886F6",
    "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_32_all_nonisolated_universal_rank7_g5_finish.py":
        "AC1190383F406653465DFE48110EC1228F94D76F616E2B6D05BBAB58DF2CEF00",
    "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_32_all_nonisolated_universal_exact_rank7_g5_finish_20260831.json":
        "8390D340DD2B55C779E9F554743C2EFED74610A65CA76C593DDC1CA449F04666",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    observed = {name: sha256(HERE / name) for name in PINS}
    assert observed == PINS, (observed, PINS)

    r50 = load(
        "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_"
        "50_all_nonisolated_n12_exact_rank7_g5_finish_20260831.json"
    )
    r41 = load(
        "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_"
        "41_all_nonisolated_n12_exact_rank7_g5_finish_20260831.json"
    )
    r32 = load(
        "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_"
        "32_all_nonisolated_universal_exact_rank7_g5_finish_20260831.json"
    )

    assert r50["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_"
        "50_ALL_NONISOLATED_N12_RANK7_G5_FINISH"
    )
    assert r41["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_"
        "41_ALL_NONISOLATED_N12_RANK7_G5_FINISH"
    )
    assert r32["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_"
        "32_ALL_NONISOLATED_UNIVERSAL_RANK7_G5_FINISH"
    )
    assert r50["source_sha256"] == PINS[
        "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_50_all_nonisolated_n12_rank7_g5_finish.py"
    ]
    assert r41["source_sha256"] == PINS[
        "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_41_all_nonisolated_n12_rank7_g5_finish.py"
    ]
    assert r32["source_sha256"] == PINS[
        "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_32_all_nonisolated_universal_rank7_g5_finish.py"
    ]
    for report in (r50, r41, r32):
        assert "W isolate-free" in report["scope"]
        assert "n>=12" in report["scope"]

    canonical_distributions = [(5, 0), (4, 1), (3, 2)]
    generated = sorted(
        {(max(k, 5 - k), min(k, 5 - k)) for k in range(6)},
        reverse=True,
    )
    assert generated == canonical_distributions

    report = {
        "schema": "iso-n7-g3-five-all-nonisolated-isolate-free-assembly-v1",
        "date": "2026-08-31",
        "marker": MARKER,
        "theorem": (
            "For adjacent marked vertices in the rank-seven no-parent G3 cell, "
            "if there are exactly five attachment components, all five roots "
            "are nonisolated in distinct components, and W is isolate-free, "
            "then G3 is nonnegative at every feasible order n>=12, for every "
            "distribution of the five attachments between the two marks."
        ),
        "symmetry_reduced_distribution_partition": [
            {"distribution": [5, 0], "certificate": r50["marker"]},
            {"distribution": [4, 1], "certificate": r41["marker"]},
            {"distribution": [3, 2], "certificate": r32["marker"]},
        ],
        "coverage_gap_within_stated_isolate_free_all_nonisolated_branch": None,
        "feasible_order_floor": 12,
        "remaining_adjacent_no_parent_G3": [
            "unrelated-isolate padding for split 4+1 and 3+2 all-nonisolated cases",
            "split exactly-five cases with at least one isolated attachment root, including padding",
            "all configurations with at least six attachment components",
        ],
        "scope_guard": (
            "This assembly is restricted to isolate-free W and all five "
            "attachment roots nonisolated in distinct components. It does not "
            "supply unrelated-isolate padding, isolated-root split cases, six "
            "or more attachments, the global rank-seven G3 cell, Gate 5, or "
            "Erdos Problem 993."
        ),
        "pins": PINS,
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print("DISTRIBUTIONS", canonical_distributions)


if __name__ == "__main__":
    main()
