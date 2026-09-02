#!/usr/bin/env python3
"""Universal assembly for no-parent common0/sum1 rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_sum1_no_parent_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "xnonisolated_source": "prove_iso_n7_bundle_g3_sum1_no_parent_isolatefree_n11_rank7_g5_finish.py",
    "xnonisolated_report": "iso_n7_bundle_g3_sum1_no_parent_isolatefree_n11_exact_rank7_g5_finish_20260831.json",
    "xisolated_source": "prove_iso_n7_bundle_g3_sum1_no_parent_xisolated_n11_rank7_g5_finish.py",
    "xisolated_report": "iso_n7_bundle_g3_sum1_no_parent_xisolated_n11_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_sum1_no_parent_isolate_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_sum1_no_parent_isolate_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "xnonisolated_source": "FF0A6C0BCBE809A5AE0ED1B3A75AC1D4946DAC846A94E6038497B9D1F83E12E2",
    "xnonisolated_report": "C1FCD2097AFB7C62187EF2D1C6D7F5D0662A624F5134E29D68FECAA1904BB6DB",
    "xisolated_source": "FB3B0CE968208BB7207CD8A2BD8C7315396A21398B7C34AFB1F9BB4CEBFFA347",
    "xisolated_report": "37144685360DA4E0D0592A2CA7F64CB0E53D29FC5BF6E79098C759989AA048F9",
    "padding_source": "675B21FA420828BE850A35AFB61B3C2EA0D5D51749068CAE88C3FA54385B1D94",
    "padding_report": "CF31DA4E40E63249030B6A367FE178DC1C5F509631ED4717B7CD04DF9EC2AECE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key

    finite = json.loads((HERE / FILES["finite_report"]).read_text(encoding="utf-8"))
    xnonisolated = json.loads((HERE / FILES["xnonisolated_report"]).read_text(encoding="utf-8"))
    xisolated = json.loads((HERE / FILES["xisolated_report"]).read_text(encoding="utf-8"))
    padding = json.loads((HERE / FILES["padding_report"]).read_text(encoding="utf-8"))

    assert finite["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N2_10_ASSEMBLED_RANK7_G4_PIECEWISE"
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0
    assert xnonisolated["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_ISOLATEFREE_N11_RANK7_G5_FINISH"
    assert xnonisolated["coverage"]["orders"] == "n>=11"
    assert xnonisolated["coverage"]["unmarked_orders"] == "m>=9"
    assert xnonisolated["coverage_gap_within_stated_isolatefree_sum1_no_parent_G3"] is None
    assert xisolated["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_XISOLATED_N11_RANK7_G5_FINISH"
    assert xisolated["coverage"]["base_orders"] == "n>=11"
    assert xisolated["coverage"]["core_orders"] == "|K|>=8"
    assert xisolated["coverage_gap_within_stated_xisolated_sum1_no_parent_base"] is None
    assert padding["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_ISOLATE_PADDING_RANK7_G5_FINISH"
    assert padding["coverage_gap_within_positive_order_no_parent_sum1_padding"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True
    assert padding["aggregate"]["exact_power_inversion"] is True
    assert padding["tiny_exact_audit"]["one_vertex_edgeless_newton_coefficients"] == {
        "0": 0, "1": 8, "2": 369, "3": 3211, "4": 11735,
        "5": 21739, "6": 21528, "7": 10882, "8": 2208,
    }

    # The cutoff seams are exact: base order is h+2, hence h<=8 is finite
    # n<=10 and h>=9 is large-order n>=11.  If x is isolated while W has an
    # edge, H=K+x has h>=3 and |K|=h-1>=8 precisely when h>=9.
    assert 8 + 2 == 10 and 9 + 2 == 11
    assert 9 - 1 == 8

    exhaustive_classes = [
        {
            "class": "W has no internal edge",
            "core": "H={x}, h=1",
            "method": "direct exact Newton row H0..H8 for {x}+sK1",
        },
        {
            "class": "W has an internal edge, x nonisolated, 2<=h<=8",
            "base_order": "4<=n_base=h+2<=10",
            "method": "finite all-forest certificate plus isolate-padding transfer",
        },
        {
            "class": "W has an internal edge, x nonisolated, h>=9",
            "base_order": "n_base=h+2>=11",
            "method": "x-nonisolated intersected-tau moment theorem plus isolate-padding transfer",
        },
        {
            "class": "W has an internal edge, x isolated, 3<=h<=8",
            "base_order": "5<=n_base=h+2<=10",
            "method": "finite all-forest certificate plus isolate-padding transfer",
        },
        {
            "class": "W has an internal edge, x isolated, h>=9",
            "base_order": "n_base=h+2>=11, |K|=h-1>=8",
            "method": "x-isolated intersected-tau moment theorem plus isolate-padding transfer",
        },
    ]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every forest with distinct nonadjacent marks u,v, no common "
            "unmarked neighbour, and exactly one mark-to-unmarked edge, in no-parent "
            "mode the exact rank-seven bundle coefficient G3 is nonnegative."
        ),
        "symmetry_guard": (
            "The unique mark-to-unmarked edge is written u-x; exchanging u and v "
            "covers the other literal orientation and changes no G3 value."
        ),
        "core_decomposition": (
            "Strip all isolated vertices except the distinguished neighbour x. "
            "If W has an edge, the remaining rooted core is either isolate-free "
            "with x nonisolated or K+x with K nonempty isolate-free and x isolated."
        ),
        "exhaustive_classes": exhaustive_classes,
        "evidence": {
            "xnonisolated_bernstein_controls": sum(
                certificate["bernstein_coefficients"]
                for certificate in xnonisolated["moment_charts"]["certificates"].values()
            ),
            "xisolated_bernstein_controls": sum(
                certificate["bernstein_coefficients"]
                for certificate in xisolated["moment_charts"]["certificates"].values()
            ),
            "padding_newton_coefficients": padding["aggregate"]["newton_coefficients"],
            "padding_bernstein_controls": padding["aggregate"]["bernstein_controls"],
            "padding_tail_power_coefficients": padding["aggregate"]["tail_power_coefficients"],
            "padding_minimum": padding["aggregate"]["minimum_tail_power_coefficient"],
        },
        "coverage_gap_within_no_parent_common0_sum1_G3": None,
        "rank7_G3_symmetry_reduced_cells_before": 21,
        "rank7_G3_symmetry_reduced_cells_after": 20,
        "universal_G3_claim": False,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Universal only for rank-seven G3 in no-parent nonadjacent/common0/sum1. "
            "Other parent modes and marked geometries remain separate; universal "
            "G3 across all cells is not claimed."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    assert len(exhaustive_classes) == 5
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "exhaustive_core_classes": len(exhaustive_classes),
        "coverage_gap_within_no_parent_common0_sum1_G3": None,
        "rank7_G3_symmetry_reduced_cells_after": 20,
        "universal_G3_claim": False,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
