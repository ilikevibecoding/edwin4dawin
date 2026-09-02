#!/usr/bin/env python3
"""Universal same-mark exactly-two-attachment adjacent no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SAME_MARK_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_exact_rank7_g5_finish_20260831.json",
    "isolated_derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_isolated_roots_rank7_g5_finish.py",
    "isolated_derive_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_isolated_roots_exact_rank7_g5_finish_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "nonisolated_universal_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_both_nonisolated_universal_rank7_g5_finish.py",
    "nonisolated_universal_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_both_nonisolated_universal_exact_rank7_g5_finish_20260831.json",
    "one_isolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_one_isolated_n11_rank7_g5_finish.py",
    "one_isolated_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_one_isolated_n11_exact_rank7_g5_finish_20260831.json",
    "both_isolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_both_isolated_n11_rank7_g5_finish.py",
    "both_isolated_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_both_isolated_n11_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "derive_source": "AB5B8B1C5A3A9792C0656A390A5018D154F5C220B5233992AE6D239CA8C0283D",
    "derive_report": "46B51E942EB3E86CB2B1F39A6E90BE0B5E67E5E40EF9989337825E65B59B1C6D",
    "isolated_derive_source": "0AB4D47640BFFA18147EA914692AAFA3656AFFA305A863700FB63843ED73CB53",
    "isolated_derive_report": "6D65C7B29BC34F91907D627A8C99DB5BED9594C276966002851A90E1BA58A456",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "nonisolated_universal_source": "AD3D13EEDB76F4FCF6393EAB05BAFC6564AA9D07AFFD6144BB29FE5DC0BAE7AA",
    "nonisolated_universal_report": "EACA7D7E72356E7099762777E6058E6CEDFAF699BEE76014B709E720B7610525",
    "one_isolated_source": "5B971EC6E6F46BA0D70B28548892719BA4D96B722156071E19C9DEA03363C98C",
    "one_isolated_report": "19B47A12C7968DB7F35D900C965AF34DFC1BC8563D8BD8CF72EDB13BE20143E2",
    "both_isolated_source": "E0EC6A7E6539DBD9CC1363D6631081F8ADF2374A5063BB5D5F6BE6E3870B353B",
    "both_isolated_report": "5B42206DE83B9D27D8C5575AFDFE80AEB9D6C08B5D96CD64E4D15637825A3EF2",
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
    nonisolated = load("nonisolated_universal_report")
    one = load("one_isolated_report")
    both = load("both_isolated_report")
    padding = load("padding_report")
    assert derive["structural_partition"]["exhaustive_up_to_mark_symmetry"] is True
    assert finite["negative_count"] == 0 and finite["orders"] == [2, 10]
    assert nonisolated["coverage_gap_within_same_mark_both_nonisolated_two_attachment_G3"] is None
    assert one["coverage_gap_within_stated_same_mark_one_isolated_large_branch"] is None
    assert both["coverage_gap_within_stated_same_mark_both_isolated_large_branch"] is None
    assert padding["coverage_gap_within_positive_order_same_mark_two_attachment_padding"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True
    assert 7+3 == 10 and 8+3 == 11 and 6+4 == 10 and 7+4 == 11
    classes = [
        {"root_pattern": "both roots nonisolated", "method": "previous universal core-size partition plus padding"},
        {"root_pattern": "exactly one root isolated, isolate-free H has 2<=h<=7", "method": "finite base n=h+3<=10 plus padding"},
        {"root_pattern": "exactly one root isolated, isolate-free H has h>=8", "method": "large nested-shadow theorem n=h+3>=11 plus padding"},
        {"root_pattern": "both roots isolated and remaining isolate-free K is empty or has 2<=q<=6", "method": "finite base n=q+4<=10 plus padding"},
        {"root_pattern": "both roots isolated and remaining isolate-free K has q>=7", "method": "large moment theorem n=q+4>=11 plus padding"},
    ]
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode with exactly two attachments at the same mark, rank-seven G3 is nonnegative for every forest and every order.",
        "root_isolation_partition": "Because the two attachment roots lie in distinct W-components, exactly 0, 1, or 2 of them are isolated. After deleting all other isolates, the five classes below are mutually exclusive and exhaustive.",
        "exhaustive_classes": classes,
        "coverage_gap_within_adjacent_no_parent_same_mark_exactly_two_attachment_G3": None,
        "universal_two_attachment_guard": False,
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "The split-mark two-attachment case and >=3 attachments remain, so the adjacent no-parent cell is not yet decremented.",
        "remaining_adjacent_no_parent_scope": "Exactly two split-mark attachments and every configuration with three or more attachments.",
        "dependencies_sha256": EXPECTED,
        "scope": "Universal only for adjacent no-parent same-mark exactly-two-attachment G3.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "exhaustive_classes": len(classes), "coverage_gap_within_adjacent_no_parent_same_mark_exactly_two_attachment_G3": None, "rank7_G3_symmetry_reduced_cells_after": 18}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
