#!/usr/bin/env python3
"""Universal exactly-one-attachment subbranch of adjacent no-parent rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "partition_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_rooted_partition_rank7_g5_finish.py",
    "partition_report": "iso_n7_bundle_g3_adjacent_no_parent_rooted_partition_exact_rank7_g5_finish_20260831.json",
    "identity_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_root_rank7_g5_finish.py",
    "identity_report": "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_root_exact_rank7_g5_finish_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "nonisolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_isolatefree_n11_rank7_g5_finish.py",
    "nonisolated_report": "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_isolatefree_n11_exact_rank7_g5_finish_20260831.json",
    "xisolated_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_xisolated_n11_rank7_g5_finish.py",
    "xisolated_report": "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_xisolated_n11_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "partition_source": "755D99C5A7348990A3CE254C47BBAAF34D7EE9F9973644F97B36E8C608666AF5",
    "partition_report": "01DA8DA65E252C5BFA46D17021775EE0A168526A6CF164A325D2B84C01005F74",
    "identity_source": "6D32F95AED945C9B60D7EDD622377595DEF770C5111BC18965F5157891D1EE5F",
    "identity_report": "E7C3283625736D9F219F49671A41C463D362EE368346C375208797F907C05E21",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "nonisolated_source": "6829D71159E305B7484259C1A0188487F95A80CE40DEA9CDB436951BA63D2EA4",
    "nonisolated_report": "91DD6C040ED919A0DDDFDED0EB18FA37F2D9D59CE223FD0095510CDC15C81379",
    "xisolated_source": "82C6491624CF5DE0D2083A5AD45258B561C38DFBE9B06F78F442E57023ACD2DB",
    "xisolated_report": "F16FEA28BB03F06EAA08EA328356FBD3B7F4A681F9F3969F257C8D94128A7F40",
    "padding_source": "3299BE0CCD027F4CB2E3D9CD219D75FE418DB16AAF2CCD44E7A981EDCBD69D46",
    "padding_report": "2AB906BCB39BB3B21ACEBC64AE6297811FE6A0B30918BB7442466B13C02CA7BA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_report(key: str) -> dict:
    return json.loads((HERE / FILES[key]).read_text(encoding="utf-8"))


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key

    partition = load_report("partition_report")
    identity = load_report("identity_report")
    finite = load_report("finite_report")
    nonisolated = load_report("nonisolated_report")
    xisolated = load_report("xisolated_report")
    padding = load_report("padding_report")

    assert partition["marker"] == "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ROOTED_PARTITION_RANK7_G5_FINISH"
    assert partition["forest_compatibility_classifier"]["exhaustive"] is True
    assert partition["summary"]["mixed_S_T_second_derivatives"] == 20
    assert identity["marker"] == "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_ROOT_RANK7_G5_FINISH"
    assert identity["linearity_in_root_rows"] is True
    assert finite["negative_count"] == 0 and finite["orders"] == [2, 10]
    assert nonisolated["coverage_gap_within_stated_one_attachment_isolatefree_branch"] is None
    assert xisolated["coverage_gap_within_stated_one_attachment_xisolated_base"] is None
    assert padding["coverage_gap_within_positive_order_one_attachment_padding"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True
    assert padding["tiny_exact_audit"]["one_vertex_root_newton_coefficients"]["0"] == 0
    assert min(padding["tiny_exact_audit"]["one_vertex_root_newton_coefficients"].values()) >= 0

    # Removing all isolates other than the distinguished attachment x gives a
    # unique rooted base H.  The following mutually exclusive classes exhaust it.
    # The two seams are exact: |H|<=8 gives n=|H|+2<=10, whereas |H|>=9 gives n>=11.
    classes = [
        {
            "class": "x is nonisolated in W and rooted base H is isolate-free with 2<=|H|<=8",
            "base": "finite all-mode certificate at n=|H|+2<=10",
            "extension": "positive-order one-attachment isolate-padding theorem",
        },
        {
            "class": "x is nonisolated in W and rooted base H is isolate-free with |H|>=9",
            "base": "nonisolated large-order theorem at n=|H|+2>=11",
            "extension": "positive-order one-attachment isolate-padding theorem",
        },
        {
            "class": "x is isolated in W and the remaining isolate-free base K is nonempty with |H|=1+|K|<=8",
            "base": "finite all-mode certificate at n=|H|+2<=10",
            "extension": "positive-order one-attachment isolate-padding theorem",
        },
        {
            "class": "x is isolated in W and the remaining isolate-free base K has |K|>=8 (so |H|>=9)",
            "base": "x-isolated large-order theorem at n=|K|+3>=11",
            "extension": "positive-order one-attachment isolate-padding theorem",
        },
        {
            "class": "W is edgeless, so the rooted base is H={x}",
            "base": "exact one-vertex rooted value H0=0",
            "extension": "all higher one-vertex isolate-padding Newton coefficients are nonnegative (strictly positive for indices 1..8)",
        },
    ]
    assert 8 + 2 == 10 and 9 + 2 == 11 and 8 + 3 == 11

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks u,v in no-parent mode with exactly one mark-to-W attachment, rank-seven G3 is nonnegative for every forest and every order.",
        "mark_symmetry": "The cases X={x},Y=empty and X=empty,Y={x} are exchanged by u<->v.",
        "exhaustive_classes": classes,
        "coverage_gap_within_adjacent_no_parent_exactly_one_attachment_G3": None,
        "universal_adjacent_guard": False,
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "ledger_guard": "This is a strict subbranch of the adjacent no-parent cell; the residual ledger is not decremented.",
        "remaining_adjacent_no_parent_scope": "Two or more attachments, including same-mark and split-mark rooted-component couplings.",
        "dependencies_sha256": EXPECTED,
        "scope": "Universal only for adjacent no-parent exactly-one-attachment G3.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "exhaustive_classes": len(classes),
        "coverage_gap_within_adjacent_no_parent_exactly_one_attachment_G3": None,
        "rank7_G3_symmetry_reduced_cells_after": 18,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
