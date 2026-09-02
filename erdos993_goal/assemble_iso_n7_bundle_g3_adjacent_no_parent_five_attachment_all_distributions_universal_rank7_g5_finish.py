#!/usr/bin/env python3
"""Universal all-distribution exactly-five adjacent/no-parent G3 assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_all_distributions_universal_assembled_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_ALL_DISTRIBUTIONS_UNIVERSAL_ASSEMBLED_RANK7_G5_FINISH"
FILES = {
    "same_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_universal_rank7_g5_finish.py",
    "same_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_universal_exact_rank7_g5_finish_20260831.json",
    "split_source": "assemble_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_universal_rank7_g5_finish.py",
    "split_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_universal_assembled_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "same_source": "92FF0D8F8D41290C844555ED284DCE253E6A11A381228DD4461B3B5623956B42",
    "same_report": "320FE7DA64B50EE83F0786A4FC24C16C50BB0ED2E749E288A4BE32E4D17D0E95",
    "split_source": "7C96814608159D5075A910064EC3771482F2936CE7CF2E2F5731CDBEB2CCACC2",
    "split_report": "1B980AD91885CAC8D7D94453769DCF367304A0B10A9CC83C24905F234D0A1516",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    same = json.loads((HERE / FILES["same_report"]).read_text(encoding="utf-8"))
    split = json.loads((HERE / FILES["split_report"]).read_text(encoding="utf-8"))
    assert same["status"] == "proved exact"
    assert same["coverage_gap_within_adjacent_no_parent_exactly_five_same_mark_attachment_G3"] is None
    assert split["status"] == "proved exact"
    assert split["coverage_gap_within_exactly_five_split_adjacent_no_parent_g3"] is None
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, G3 is nonnegative for every forest with exactly five attachment roots in distinct components, under every distribution between the marks, every root-isolation pattern, arbitrary unrelated isolates, and every feasible order.",
        "distribution_partition": {
            "5+0_or_0+5": "Pinned same-mark universal theorem (side symmetry identifies 0+5).",
            "4+1_or_1+4": "Pinned split universal theorem (side symmetry identifies 1+4).",
            "3+2_or_2+3": "Pinned split universal theorem (side symmetry identifies 2+3).",
        },
        "distribution_symmetry_representatives": ["5+0", "4+1", "3+2"],
        "coverage_gap_within_exactly_five_all_distributions_adjacent_no_parent_g3": None,
        "attachment_count_guard": "Attachment counts >=6 remain separate.",
        "universal_adjacent_no_parent_g3_guard": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Exactly five attachment roots in distinct components, adjacent marks, no-parent G3, all distributions/statuses/orders/padding; >=6 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "distributions": report["distribution_symmetry_representatives"], "coverage_gap": None}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
