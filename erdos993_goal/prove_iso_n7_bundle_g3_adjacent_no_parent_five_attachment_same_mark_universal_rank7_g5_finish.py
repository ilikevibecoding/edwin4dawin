#!/usr/bin/env python3
"""Universal exactly-five same-mark adjacent no-parent rank-seven G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SAME_MARK_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "classifier_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_isolated_patterns_rank7_g5_finish.py",
    "classifier_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "all_nonisolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_50_all_nonisolated_n12_rank7_g5_finish.py",
    "all_nonisolated_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_50_all_nonisolated_n12_exact_rank7_g5_finish_20260831.json",
    "mixed_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_mixed_isolated_n11_rank7_g5_finish.py",
    "mixed_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_mixed_isolated_n11_exact_rank7_g5_finish_20260831.json",
    "mixed_shard_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_mixed_isolated_shard_rank7_g5_finish.py",
    **{f"mixed_z{isolated}_audit": f"iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_mixed_isolated_z{isolated}_exact_rank7_g5_finish_20260831.json" for isolated in range(1, 5)},
    "all_isolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_all_isolated_h4_rank7_g5_finish.py",
    "all_isolated_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_all_isolated_h4_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_same_mark_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "classifier_source": "201D903A576B4A93058E8117154A2B8BDCC3F0ACEDD673E9D606DF36A0E42BA7",
    "classifier_report": "39A01A35A0C3E521608604F8F72BDC01293D5BDBA1B91E4E6B911F25451D86F7",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "all_nonisolated_source": "663C403ED22B2CCAF03E4C66948B09D8196B1C550854266C111A6ADBC0454643",
    "all_nonisolated_report": "51C9324E965D8FBB927ABF0F84766FD7BA8E40CE4AF95DD8270638D695A03A64",
    "mixed_source": "03EA02FC5C6C86FEE93E8F509F398203270B9DBD49DAD7D5DAEA11FAC8114BD3",
    "mixed_report": "FDE542BAAC0BD9AAED7C16F93312CA8B9B8175F4124F8298FDA643C25DC6FB89",
    "mixed_shard_source": "3F8C87A93AB0300A61AD870CF6E75FCD12D954184A088DB9C0FE4DA89FC9B2A7",
    "mixed_z1_audit": "FDA72F2F9AA72AA268AAA65D5524CEC58877215FE755520A00937525F44F3893",
    "mixed_z2_audit": "C5E9FD48416BB53FE35E77609DF5A2D93205B79A067195BCC703654BADC60307",
    "mixed_z3_audit": "C12085746186502BAFA61AC9C2B67FF5A1A7C15EA574663E6C85A062D011ED89",
    "mixed_z4_audit": "4046D8A0E887E17A8705553CFD8B8A9409478CAD258AEDA2FC2B02C6CAA32413",
    "all_isolated_source": "3160D67A63B95039B38B760D7FE9A254572C3E9D6B398C75328CB7CF81728B3D",
    "all_isolated_report": "C8DE82FB1A660A80015A58CD01EBD6315114A1E13A0EDF563F8FD159A02E8B20",
    "padding_source": "C72F2E14CA321072889CAE7D5DBF6D6DCF2B48E7CDE99788AAA082C18DBB2B54",
    "padding_report": "B8E5D6CAAF6E2DB97DD18F294F5EC1AB5B9F6EC0A458AEB659AA8E0182D2D9FA",
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
    all_nonisolated = load("all_nonisolated_report")
    mixed = load("mixed_report")
    all_isolated = load("all_isolated_report")
    padding = load("padding_report")
    assert classifier["exhaustive_isolated_pattern_classifier"] == {
        "same_mark_patterns": 5,
        "all_nonisolated_pattern_separate": True,
    }
    assert sorted(map(int, classifier["same_mark_5plus0"])) == [1, 2, 3, 4, 5]
    assert finite["negative_count"] == 0 and finite["orders"] == [2, 10]
    assert all_nonisolated["coverage_gap_within_stated_50_all_nonisolated_branch"] is None
    assert mixed["coverage_gap_within_stated_same_mark_five_attachment_mixed_isolated_branch"] is None
    for isolated in range(1, 5):
        shard = load(f"mixed_z{isolated}_audit")
        assert shard["isolated_roots"] == isolated
        assert shard["coverage_gap_within_stated_pattern"] is None
    assert all_isolated["coverage_gap_within_stated_all_isolated_H_branch"] is None
    assert padding["coverage_gap_within_positive_order_same_mark_five_attachment_padding"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True

    classes = [
        {
            "isolated_attachment_roots": 0,
            "core_H": "isolate-free h>=10 (five nonisolated roots in distinct components force this)",
            "base": "5+0 all-nonisolated n=h+2>=12 theorem",
            "extension": "exactly-five same-mark padding",
        },
        {
            "isolated_attachment_roots": 1,
            "core_H": "isolate-free h>=8 (four nonisolated roots force this)",
            "base": "mixed-isolated n=h+3>=11 theorem",
            "extension": "exactly-five same-mark padding",
        },
        {
            "isolated_attachment_roots": 2,
            "core_H": "h=6",
            "base": "finite n=h+4=10 theorem",
            "extension": "exactly-five same-mark padding",
        },
        {
            "isolated_attachment_roots": 2,
            "core_H": "isolate-free h>=7",
            "base": "mixed-isolated n=h+4>=11 theorem",
            "extension": "exactly-five same-mark padding",
        },
        {
            "isolated_attachment_roots": 3,
            "core_H": "isolate-free h=4,5",
            "base": "finite n=h+5<=10 theorem",
            "extension": "exactly-five same-mark padding",
        },
        {
            "isolated_attachment_roots": 3,
            "core_H": "isolate-free h>=6",
            "base": "mixed-isolated n=h+5>=11 theorem",
            "extension": "exactly-five same-mark padding",
        },
        {
            "isolated_attachment_roots": 4,
            "core_H": "isolate-free h=2,3,4",
            "base": "finite n=h+6<=10 theorem",
            "extension": "exactly-five same-mark padding",
        },
        {
            "isolated_attachment_roots": 4,
            "core_H": "isolate-free h>=5",
            "base": "mixed-isolated n=h+6>=11 theorem",
            "extension": "exactly-five same-mark padding",
        },
        {
            "isolated_attachment_roots": 5,
            "core_H": "empty h=0 or isolate-free h=2,3 (h=1 impossible)",
            "base": "finite n=h+7<=10 theorem",
            "extension": "exactly-five same-mark padding",
        },
        {
            "isolated_attachment_roots": 5,
            "core_H": "isolate-free h>=4",
            "base": "all-isolated n=h+7>=11 theorem",
            "extension": "exactly-five same-mark padding",
        },
    ]
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with exactly five same-mark attachment components, rank-seven G3 is nonnegative for every forest and every order.",
        "fail_closed_partition": {
            "remove_only_unrelated_isolates": "All five attachment roots remain in the core until isolated-root classification; H then deletes only isolated attachment roots for the base theorem.",
            "classes": classes,
            "positive_unrelated_isolate_count": "Every class extends by the exact H1..H8 Newton-padding theorem; H0 is the listed base theorem.",
            "impossible_seams": [
                "With z isolated roots, each of the 5-z surviving roots lies in a distinct nontrivial component, so h>=2(5-z).",
                "A nonempty isolate-free forest cannot have h=1.",
            ],
        },
        "coverage_gap_within_adjacent_no_parent_exactly_five_same_mark_attachment_G3": None,
        "universal_adjacent_no_parent_guard": False,
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "The exactly-five same-mark subbranch is universal, but split exactly-five cases with isolated roots and every >=6-attachment configuration remain; the adjacent no-parent symmetry cell is not decremented.",
        "remaining_adjacent_no_parent_scope": "Exactly-five split distributions 4+1 and 3+2 with at least one isolated attachment root, plus every configuration with six or more attachment components. (The 4+1 all-nonisolated subbranch is already frozen; 3+2 all-nonisolated is separate.)",
        "dependencies_sha256": EXPECTED,
        "scope": "Universal only for adjacent no-parent exactly-five same-mark (5+0) attachment G3; split exactly-five and >=6 attachments separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
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
