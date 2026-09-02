#!/usr/bin/env python3
"""Universal exactly-three-attachment adjacent no-parent rank-seven G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_distributions_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_distributions_exact_rank7_g5_finish_20260831.json",
    "isolated_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_rank7_g5_finish.py",
    "isolated_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "same_nonisolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_all_nonisolated_n11_rank7_g5_finish.py",
    "same_nonisolated_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_all_nonisolated_n11_exact_rank7_g5_finish_20260831.json",
    "split_nonisolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_all_nonisolated_n11_rank7_g5_finish.py",
    "split_nonisolated_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_all_nonisolated_n11_exact_rank7_g5_finish_20260831.json",
    "same_mixed_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_mixed_isolated_n11_rank7_g5_finish.py",
    "same_mixed_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_mixed_isolated_n11_exact_rank7_g5_finish_20260831.json",
    "split_linear_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_linear_mixed_isolated_rank7_g5_finish.py",
    "split_linear_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_linear_mixed_isolated_exact_rank7_g5_finish_20260831.json",
    "split_bilinear_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q1_mixed_isolated_n11_rank7_g5_finish.py",
    "split_bilinear_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q1_mixed_isolated_n11_exact_rank7_g5_finish_20260831.json",
    "split_p0q2_seam_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q2_finite_h7_rank7_g5_finish.py",
    "split_p0q2_seam_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q2_finite_h7_exact_rank7_g5_finish_20260831.json",
    "all_isolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_all_isolated_n11_rank7_g5_finish.py",
    "all_isolated_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_all_isolated_n11_exact_rank7_g5_finish_20260831.json",
    "same_padding_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_padding_rank7_g5_finish.py",
    "same_padding_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_padding_exact_rank7_g5_finish_20260831.json",
    "split_padding_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_padding_rank7_g5_finish.py",
    "split_padding_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split21_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "derive_source": "FF6C5D235514BB6C666E209EC81D3686EEF08C28CCA8D75AF634AEB71004E0B2",
    "derive_report": "D0E4E00568DA8C9AC448D80F005DF18019ED718AF3C1F9B670BEE7D51B5A9B00",
    "isolated_source": "9D46FCE74417CBDCAD1A26A0294F553ED8F1E7B07FB6F79106CBD0D105C9CF08",
    "isolated_report": "9BCB510FBD8C450A50B6905962E2464CF7B805887D0E3F0225A686EDF729E52F",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "same_nonisolated_source": "55469C402D8A3E2CAE03BA20983B8D6EF4D8C133F57C002298DF7307E96D6631",
    "same_nonisolated_report": "4DE51D8916F1BA848E9607B25385A0C04F09F01F6D0523CD0B4BC0287C5248FC",
    "split_nonisolated_source": "AAD4C8327699C81B5A8ADB934F690A6269D9F9DA616FA76E1619F6C6D1E4AA60",
    "split_nonisolated_report": "F58502A9EDD5806C057B757CC24F5B5DD7B508E12EE100B57B2C74CDC6DB1A86",
    "same_mixed_source": "919143D63B3DA19F147FB68656CCDDC3FCE62AF5AD752BB7737534CDBC518FCC",
    "same_mixed_report": "9252DAA2D0CFC855A6EA81D380F90C91BB5DE85765E984012AFB2D8E93B705D5",
    "split_linear_source": "2B7B97836841E9A62E69EF814C7B6D1DBFCB6490E2BC0C82A9296C89B001A48B",
    "split_linear_report": "A85EFFD35CC554E44A9C49C509B8BB2540FEBEE00C451FC94D7680380CCA361E",
    "split_bilinear_source": "D1968349FD3F93CA6C9345F597B98A2BCC290256978E8E54CC4C668DFF6759C6",
    "split_bilinear_report": "C969CF9B29CD5A877A1DC91F7FA0EE2E5C69992F8C7AE747059032AD1628D244",
    "split_p0q2_seam_source": "EC71B229C467EDF66A9ECF12A2370E72FCA543EA48FD00AB8CB89086D66BC9CF",
    "split_p0q2_seam_report": "449F5D97D57BD138721F0254EFDD60E5A7B92983118DED042AC9F86FA039D105",
    "all_isolated_source": "953972950F28737761B898395DB1737B35B6F1BFF512E96AE45A861475D3563C",
    "all_isolated_report": "5C6301C8E574EB5CB27B7A43E1AC8F2A86903F5EB76D44CA668F8A6C0C4FABB8",
    "same_padding_source": "37A440350CF496E68D9C5CA80470D94668D1B4147EA544EFAF1A4AC4C09A020F",
    "same_padding_report": "46576F9C208C2AA6F7D1B9CCD5800005F0B47914899283D9955B1F1FD566BBEA",
    "split_padding_source": "AF3E9512661E3D64FBEB8C797F1618B5C7EFA84D502641A85E3E4B4A65B79B84",
    "split_padding_report": "9B5975F0FF870DCA599F168259C34E90C1A564BAE7342E2FE414E76C9DCD8EF6",
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
    same_nonisolated = load("same_nonisolated_report")
    split_nonisolated = load("split_nonisolated_report")
    same_mixed = load("same_mixed_report")
    split_linear = load("split_linear_report")
    split_bilinear = load("split_bilinear_report")
    p0q2_seam = load("split_p0q2_seam_report")
    all_isolated = load("all_isolated_report")
    same_padding = load("same_padding_report")
    split_padding = load("split_padding_report")

    assert derive["same_mark_3plus0"]["linear_in_union_loss"] is True
    assert derive["split_mark_2plus1"]["bilinear_term_count"] == 10
    classifier = isolated["exhaustive_isolated_pattern_classifier"]
    assert classifier == {"all_nonisolated_pattern_separate": True, "same_mark_patterns": 3, "split_mark_patterns": 5}
    assert finite["negative_count"] == 0 and finite["orders"] == [2, 10]
    assert same_nonisolated["coverage_gap_within_stated_same_mark_all_nonisolated_isolatefree_branch"] is None
    assert split_nonisolated["coverage_gap_within_stated_split21_all_nonisolated_isolatefree_branch"] is None
    assert same_mixed["coverage_gap_within_stated_same_mark_mixed_isolated_isolatefree_H_branch"] is None
    assert split_linear["coverage_gap_within_stated_linear_mixed_isolated_isolatefree_H_patterns"] is None
    assert split_bilinear["coverage_gap_within_stated_p0q1_isolatefree_H_branch"] is None
    assert p0q2_seam["counts"]["negative_count"] == 0 and p0q2_seam["coverage_gap_within_p0q2_h7"] is None
    assert all_isolated["coverage_gap_within_stated_all_isolated_isolatefree_H_branch"] is None
    assert same_padding["coverage_gap_within_positive_order_same_mark_three_attachment_padding"] is None
    assert split_padding["coverage_gap_within_positive_order_split21_three_attachment_padding"] is None
    assert same_padding["aggregate"]["exact_newton_recomposition"] is True
    assert split_padding["aggregate"]["exact_newton_recomposition"] is True

    same_classes = [
        {"isolated_attachment_roots": 0, "core_H": "h<=8", "base": "finite n=h+2<=10", "extension": "same-mark padding"},
        {"isolated_attachment_roots": 0, "core_H": "h>=9", "base": "all-nonisolated n=h+2>=11 theorem", "extension": "same-mark padding"},
        {"isolated_attachment_roots": 1, "core_H": "h<=7", "base": "finite n=h+3<=10", "extension": "same-mark padding"},
        {"isolated_attachment_roots": 1, "core_H": "h>=8", "base": "mixed-isolated n=h+3>=11 theorem", "extension": "same-mark padding"},
        {"isolated_attachment_roots": 2, "core_H": "h<=6", "base": "finite n=h+4<=10", "extension": "same-mark padding"},
        {"isolated_attachment_roots": 2, "core_H": "h>=7", "base": "mixed-isolated n=h+4>=11 theorem", "extension": "same-mark padding"},
        {"isolated_attachment_roots": 3, "core_H": "empty or isolate-free 2<=h<=5", "base": "finite n=h+5<=10 (empty gives n=5)", "extension": "same-mark padding"},
        {"isolated_attachment_roots": 3, "core_H": "isolate-free h>=6", "base": "all-isolated n=h+5>=11 theorem", "extension": "same-mark padding"},
    ]
    split_classes = [
        {"pattern": "p0_q0", "core_H": "h<=8", "base": "finite n=h+2<=10", "extension": "split 2+1 padding"},
        {"pattern": "p0_q0", "core_H": "h>=9", "base": "all-nonisolated n=h+2>=11 theorem", "extension": "split 2+1 padding"},
        {"pattern": "p1_q0 or p0_q1", "core_H": "h<=7", "base": "finite n=h+3<=10", "extension": "split 2+1 padding"},
        {"pattern": "p1_q0", "core_H": "h>=8", "base": "linear mixed-isolated n=h+3>=11 theorem", "extension": "split 2+1 padding"},
        {"pattern": "p0_q1", "core_H": "h>=8", "base": "bilinear mixed-isolated n=h+3>=11 theorem", "extension": "split 2+1 padding"},
        {"pattern": "p1_q1", "core_H": "h<=6", "base": "finite n=h+4<=10", "extension": "split 2+1 padding"},
        {"pattern": "p1_q1", "core_H": "h>=7", "base": "linear mixed-isolated n=h+4>=11 theorem", "extension": "split 2+1 padding"},
        {"pattern": "p0_q2", "core_H": "h<=6", "base": "finite n=h+4<=10", "extension": "split 2+1 padding"},
        {"pattern": "p0_q2", "core_H": "h=7", "base": "complete finite n=11 seam", "extension": "split 2+1 padding"},
        {"pattern": "p0_q2", "core_H": "h>=8", "base": "linear mixed-isolated moment theorem", "extension": "split 2+1 padding"},
        {"pattern": "p1_q2", "core_H": "empty or isolate-free 2<=h<=5", "base": "finite n=h+5<=10 (empty gives n=5)", "extension": "split 2+1 padding"},
        {"pattern": "p1_q2", "core_H": "isolate-free h>=6", "base": "all-isolated n=h+5>=11 theorem", "extension": "split 2+1 padding"},
    ]
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with exactly three attachment components, rank-seven G3 is nonnegative for every forest and every order, for both 3+0 and 2+1 attachment distributions.",
        "fail_closed_partition": {
            "remove_only_unrelated_isolates": "The attachment roots remain in the core. Their isolated/nonisolated status is then classified exactly; H deletes isolated attachment roots only when applying a base theorem.",
            "same_mark_3plus0": same_classes,
            "split_mark_2plus1": split_classes,
            "positive_unrelated_isolate_count": "Each class is extended by its distribution-specific exact Newton-padding theorem; H0 is supplied by the listed base theorem.",
        },
        "bilinear_guard": "The split identity has all ten bilinear rooted-row terms; its base and padding certificates retain or sign-cap every one before promotion.",
        "coverage_gap_within_adjacent_no_parent_exactly_three_attachment_G3": None,
        "universal_adjacent_no_parent_guard": False,
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "Exactly-three attachments are now universal, but configurations with four or more attachments remain; therefore the adjacent no-parent symmetry cell is not decremented.",
        "remaining_adjacent_no_parent_scope": "Every configuration with four or more attachment components.",
        "dependencies_sha256": EXPECTED,
        "scope": "Universal only for adjacent no-parent exactly-three-attachment G3; >=4 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "same_mark_classes": len(same_classes),
        "split_mark_classes": len(split_classes),
        "coverage_gap_within_adjacent_no_parent_exactly_three_attachment_G3": None,
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "remaining_adjacent_no_parent_scope": report["remaining_adjacent_no_parent_scope"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
