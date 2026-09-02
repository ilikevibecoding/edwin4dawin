#!/usr/bin/env python3
"""Universal exactly-four-attachment adjacent no-parent rank-seven G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "classifier_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_isolated_patterns_rank7_g5_finish.py",
    "classifier_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "same_universal_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_universal_rank7_g5_finish.py",
    "same_universal_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_same_mark_universal_exact_rank7_g5_finish_20260831.json",
    "split31_nonisolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split31_all_nonisolated_n11_rank7_g5_finish.py",
    "split31_nonisolated_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split31_all_nonisolated_n11_exact_rank7_g5_finish_20260831.json",
    "split22_nonisolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split22_all_nonisolated_n11_rank7_g5_finish.py",
    "split22_nonisolated_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split22_all_nonisolated_n11_exact_rank7_g5_finish_20260831.json",
    "linear_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_linear_mixed_isolated_rank7_g5_finish.py",
    "linear_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_linear_mixed_isolated_exact_rank7_g5_finish_20260831.json",
    "bilinear_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_bilinear_mixed_isolated_rank7_g5_finish.py",
    "bilinear_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_bilinear_mixed_isolated_exact_rank7_g5_finish_20260831.json",
    "all_isolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_all_isolated_n11_rank7_g5_finish.py",
    "all_isolated_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_all_isolated_n11_exact_rank7_g5_finish_20260831.json",
    "split31_padding_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split31_padding_rank7_g5_finish.py",
    "split31_padding_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split31_padding_exact_rank7_g5_finish_20260831.json",
    "split22_padding_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split22_padding_rank7_g5_finish.py",
    "split22_padding_report": "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split22_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "classifier_source": "06E88B0A55A9FF91B8FD5CD2940B37FF6948E193B1968FA931DEEA3BE09D5186",
    "classifier_report": "51FFA1836D05390B7A2065D1D1EADE5E23DF97800461E084080B0135FB865318",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "same_universal_source": "F380EA3B417AD3296543D93C59357DB9A9A6C2773DA9DBDD95AFDDC4720AB985",
    "same_universal_report": "8B19FD8A6527BE0993E034EF7C3EACBEC109C095D53A3DADFFCC4A9743310084",
    "split31_nonisolated_source": "B50A066A01A3912A4DBA02342F109334FF5AA2312FE05F364E6B129D8B3A6281",
    "split31_nonisolated_report": "8E43420E654E77DE31523509BCB3443329CEBD119E27D81409708B02E44308A1",
    "split22_nonisolated_source": "3F2FEB1844E4DDFE2AEF30069CC8182F6EF76A00BD8B646016C9D7E703587E69",
    "split22_nonisolated_report": "CD7C402892D39EAF7914A95457DE9B963CB38BCF9E58082256780589A9DFDF7E",
    "linear_source": "4D1B3822D0706413D6A67E8EB826E3529F7081348C4A605299FDDFDDD029E5FB",
    "linear_report": "ACBD271524171D7DD9D68E603BB4270D86AED7AB4B154CF9149EDA9D02287137",
    "bilinear_source": "F6D85AAB56A50475C9613C15AB06917FC01066D91C5AA6270F0055D4B09FFFA4",
    "bilinear_report": "19D091839BDAAEDD71E7F28BEEACA013FD23E31EE5D5DA0BF18F842EE7577190",
    "all_isolated_source": "6DA5C64F6C214082B5525BF8CF22C18BD41CDCAA9AF6C608FF5151AF1E615786",
    "all_isolated_report": "C03DEEAE66446203AEB5F989B41A786075BFC68087048DCB24D7BBA5EBB00A92",
    "split31_padding_source": "60A97031B5F358D0076F4F02CE39D565390162636C4A8A345707399F2E027CCD",
    "split31_padding_report": "741E1EAAC2E94C7A710AB93B2ADA91CA56F270B8E1C03238E846830BCAE799EC",
    "split22_padding_source": "94EA6463F9CDB9F8F56183D253981AB77ACB4C0C25F09F9B73FDD03DF9DC51A0",
    "split22_padding_report": "9DC7D85E8D4CE75B2594BA4D1BD2EB5C7A4AA70533E8310F9F1E0704E7631D59",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str) -> dict:
    return json.loads((HERE / FILES[key]).read_text(encoding="utf-8"))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    classifier = load("classifier_report")
    finite = load("finite_report")
    same = load("same_universal_report")
    split31_nonisolated = load("split31_nonisolated_report")
    split22_nonisolated = load("split22_nonisolated_report")
    linear = load("linear_report")
    bilinear = load("bilinear_report")
    all_isolated = load("all_isolated_report")
    padding31 = load("split31_padding_report")
    padding22 = load("split22_padding_report")

    classes = classifier["exhaustive_isolated_pattern_classifier"]
    assert classes == {"all_nonisolated_patterns_separate": True, "split22_raw_patterns": 8, "split22_symmetry_classes": 5, "split22_symmetry_pairs": [["p0_q1", "p1_q0"], ["p0_q2", "p2_q0"], ["p1_q2", "p2_q1"]], "split31_patterns": 7}
    assert finite["negative_count"] == 0 and finite["orders"] == [2, 10]
    assert same["coverage_gap_within_adjacent_no_parent_exactly_four_same_mark_attachment_G3"] is None
    assert split31_nonisolated["coverage_gap_within_stated_split31_all_nonisolated_isolatefree_branch"] is None
    assert split22_nonisolated["coverage_gap_within_stated_split22_all_nonisolated_isolatefree_branch"] is None
    assert linear["coverage_gap_within_stated_linear_mixed_isolated_isolatefree_H_patterns"] is None
    assert bilinear["coverage_gap_within_stated_bilinear_mixed_isolated_isolatefree_H_patterns"] is None
    assert all_isolated["coverage_gap_within_stated_split_all_isolated_isolatefree_H_branches"] is None
    assert padding31["coverage_gap_within_positive_order_split31_four_attachment_padding"] is None
    assert padding22["coverage_gap_within_positive_order_split22_four_attachment_padding"] is None
    assert padding31["aggregate"]["exact_newton_recomposition"] is True
    assert padding22["aggregate"]["exact_newton_recomposition"] is True

    split31_classes = [
        {"pattern": "p0_q0", "core_H": "h<=8", "base": "finite n=h+2<=10"},
        {"pattern": "p0_q0", "core_H": "h>=9", "base": "3+1 all-nonisolated n>=11 theorem"},
        {"pattern": "p1_q0 or p0_q1", "core_H": "h<=7", "base": "finite n=h+3<=10"},
        {"pattern": "p1_q0", "core_H": "h>=8", "base": "linear mixed theorem"},
        {"pattern": "p0_q1", "core_H": "h>=8", "base": "bilinear mixed theorem"},
        {"pattern": "p1_q1 or p0_q2", "core_H": "h<=6", "base": "finite n=h+4<=10"},
        {"pattern": "p1_q1", "core_H": "h>=7", "base": "linear mixed theorem"},
        {"pattern": "p0_q2", "core_H": "h>=7", "base": "bilinear mixed theorem"},
        {"pattern": "p1_q2 or p0_q3", "core_H": "h<=5", "base": "finite n=h+5<=10"},
        {"pattern": "p1_q2 or p0_q3", "core_H": "h>=6", "base": "linear mixed theorem"},
        {"pattern": "p1_q3", "core_H": "empty or isolate-free h<=4", "base": "finite n=h+6<=10"},
        {"pattern": "p1_q3", "core_H": "isolate-free h>=5", "base": "all-isolated theorem"},
    ]
    split22_classes = [
        {"pattern": "p0_q0", "core_H": "h<=8", "base": "finite n=h+2<=10"},
        {"pattern": "p0_q0", "core_H": "h>=9", "base": "2+2 all-nonisolated n>=11 theorem"},
        {"pattern": "p0_q1 or p1_q0", "core_H": "h<=7", "base": "finite n=h+3<=10"},
        {"pattern": "p0_q1 or p1_q0", "core_H": "h>=8", "base": "bilinear mixed theorem plus exact side-swap symmetry"},
        {"pattern": "p0_q2, p2_q0, or p1_q1", "core_H": "h<=6", "base": "finite n=h+4<=10"},
        {"pattern": "p0_q2 or p2_q0", "core_H": "h>=7", "base": "linear mixed theorem plus exact side-swap symmetry"},
        {"pattern": "p1_q1", "core_H": "h>=7", "base": "bilinear mixed theorem"},
        {"pattern": "p1_q2 or p2_q1", "core_H": "h<=5", "base": "finite n=h+5<=10"},
        {"pattern": "p1_q2 or p2_q1", "core_H": "h>=6", "base": "linear mixed theorem plus exact side-swap symmetry"},
        {"pattern": "p2_q2", "core_H": "empty or isolate-free h<=4", "base": "finite n=h+6<=10"},
        {"pattern": "p2_q2", "core_H": "isolate-free h>=5", "base": "all-isolated theorem"},
    ]
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with exactly four attachment components, rank-seven G3 is nonnegative for every forest and every order, for all 4+0, 3+1, and 2+2 distributions up to marked-side symmetry.",
        "fail_closed_partition": {
            "same_mark_4plus0": "Supplied by the independently assembled universal 4+0 theorem.",
            "split_3plus1": split31_classes,
            "split_2plus2": split22_classes,
            "remove_only_unrelated_isolates": "The four attachment roots remain in the core. After unrelated isolates are removed, isolated attachment roots are classified exactly and deleted only to define isolate-free H for a base theorem.",
            "positive_unrelated_isolate_count": "Each split class is extended by its distribution-specific exact Newton-padding theorem; H0 is supplied by the listed base theorem.",
        },
        "coverage_gap_within_adjacent_no_parent_exactly_four_attachment_G3": None,
        "universal_adjacent_no_parent_guard": False,
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "Exactly four attachments are now universal, but every configuration with five or more attachments remains; therefore the adjacent no-parent symmetry cell is not decremented.",
        "remaining_adjacent_no_parent_scope": "Every configuration with five or more attachment components.",
        "dependencies_sha256": EXPECTED,
        "scope": "Universal only for adjacent no-parent exactly-four-attachment G3; >=5 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "split31_classes": len(split31_classes), "split22_classes": len(split22_classes), "coverage_gap_within_adjacent_no_parent_exactly_four_attachment_G3": None, "rank7_G3_symmetry_reduced_cells_after": 18, "remaining_adjacent_no_parent_scope": report["remaining_adjacent_no_parent_scope"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
