#!/usr/bin/env python3
"""Universal 4+0 same-mark adjacent no-parent rank-seven G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SAME_MARK_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json",
    "isolated_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_isolated_patterns_rank7_g5_finish.py",
    "isolated_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "all_nonisolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_all_nonisolated_n11_rank7_g5_finish.py",
    "all_nonisolated_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_all_nonisolated_n11_exact_rank7_g5_finish_20260831.json",
    "mixed_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_mixed_isolated_n11_rank7_g5_finish.py",
    "mixed_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_mixed_isolated_n11_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "derive_source": "441AE5CB4936CB8F84AC0B064D07338AAAF708435A5F5032AB8A8820F667688A",
    "derive_report": "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699",
    "isolated_source": "645334FB485113CDD5C3F25BA34CE3544AD1425813E6CD4C239710CE6DE536E7",
    "isolated_report": "E7849A23C45A9A182A32F831DB628FDD4AFFD978843612F7D50A0C1EEF850F1C",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "all_nonisolated_source": "34D58EB4FFBF4DC302A92600D7F359D42D86A7ED4E5529A24307C04BB6DA6CE7",
    "all_nonisolated_report": "0709DF3800C12BAF4952DD778BC46EA31BD7358E0DE9FD4C3B1867BB7F58B418",
    "mixed_source": "A2DAAAF13006C3305CB7E67CA2484DC80745DB51F7875481D6D77959B7A3EC3F",
    "mixed_report": "C05CD29A89AAF5BB2B339E25AE0FC74AE9BAA18596A622E595F38F97015F15FB",
    "padding_source": "0413D62319F20B07A7277A97DEBA70C3F6F1100859A725F8D28F53A3EEBEA0F7",
    "padding_report": "EA876DF354CB8B5AB39568EAE8F15D08A621C7A4152402105EBE60634DD2938A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str) -> dict:
    return json.loads((HERE / FILES[key]).read_text(encoding="utf-8"))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    derive = load("derive_report")
    isolated = load("isolated_report")
    finite = load("finite_report")
    all_nonisolated = load("all_nonisolated_report")
    mixed = load("mixed_report")
    padding = load("padding_report")

    assert derive["bilinear_term_count"] == 10
    assert derive["semantics"]["structural"] == "X,Y disjoint and each W-component contains at most one vertex of X union Y"
    classifier = isolated["exhaustive_isolated_pattern_classifier"]
    assert classifier == {"all_nonisolated_pattern_separate": True, "same_mark_patterns": 4}
    assert sorted(map(int, isolated["same_mark_4plus0"])) == [1, 2, 3, 4]
    assert finite["negative_count"] == 0 and finite["orders"] == [2, 10]
    assert all_nonisolated["coverage_gap_within_stated_same_mark_four_attachment_all_nonisolated_isolatefree_branch"] is None
    assert mixed["coverage_gap_within_stated_same_mark_four_attachment_mixed_isolated_isolatefree_H_branch"] is None
    assert padding["coverage_gap_within_positive_order_same_mark_four_attachment_padding"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True

    classes = [
        {"isolated_attachment_roots": 0, "core_H": "h<=8", "base": "finite n=h+2<=10", "extension": "4+0 padding"},
        {"isolated_attachment_roots": 0, "core_H": "h>=9", "base": "all-nonisolated n=h+2>=11 theorem", "extension": "4+0 padding"},
        {"isolated_attachment_roots": 1, "core_H": "h<=7", "base": "finite n=h+3<=10", "extension": "4+0 padding"},
        {"isolated_attachment_roots": 1, "core_H": "h>=8", "base": "mixed-isolated n=h+3>=11 theorem", "extension": "4+0 padding"},
        {"isolated_attachment_roots": 2, "core_H": "h<=6", "base": "finite n=h+4<=10", "extension": "4+0 padding"},
        {"isolated_attachment_roots": 2, "core_H": "h>=7", "base": "mixed-isolated n=h+4>=11 theorem", "extension": "4+0 padding"},
        {"isolated_attachment_roots": 3, "core_H": "h<=5", "base": "finite n=h+5<=10", "extension": "4+0 padding"},
        {"isolated_attachment_roots": 3, "core_H": "h>=6", "base": "mixed-isolated n=h+5>=11 theorem", "extension": "4+0 padding"},
        {"isolated_attachment_roots": 4, "core_H": "empty or isolate-free h<=4", "base": "finite n=h+6<=10 (empty gives n=6)", "extension": "4+0 padding"},
        {"isolated_attachment_roots": 4, "core_H": "isolate-free h>=5", "base": "mixed-isolated n=h+6>=11 theorem", "extension": "4+0 padding"},
    ]
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with exactly four same-mark attachment components, rank-seven G3 is nonnegative for every forest and every order.",
        "fail_closed_partition": {
            "remove_only_unrelated_isolates": "The four attachment roots remain in the core. Their isolated/nonisolated status is classified exactly; H deletes isolated attachment roots only when applying a base theorem.",
            "classes": classes,
            "positive_unrelated_isolate_count": "Every class is extended by the exact 4+0 Newton-padding theorem; H0 is supplied by the listed base theorem.",
        },
        "coverage_gap_within_adjacent_no_parent_exactly_four_same_mark_attachment_G3": None,
        "universal_adjacent_no_parent_guard": False,
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "The 4+0 subbranch is universal, but 3+1, 2+2, and every >=5-attachment configuration remain; the adjacent no-parent symmetry cell is not decremented.",
        "remaining_adjacent_no_parent_scope": "Exactly-four split distributions 3+1 and 2+2, and every configuration with five or more attachment components.",
        "dependencies_sha256": EXPECTED,
        "scope": "Universal only for adjacent no-parent exactly-four same-mark (4+0) attachment G3; split distributions and >=5 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "fail_closed_classes": len(classes),
        "coverage_gap_within_stated_branch": None,
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "remaining_adjacent_no_parent_scope": report["remaining_adjacent_no_parent_scope"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
