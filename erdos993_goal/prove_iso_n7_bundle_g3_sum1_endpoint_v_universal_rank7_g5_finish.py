#!/usr/bin/env python3
"""Universal assembly for endpoint_v common0/sum1 rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_sum1_endpoint_v_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_V_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "xnonisolated_source": "prove_iso_n7_bundle_g3_sum1_endpoint_v_isolatefree_n11_rank7_g5_finish.py",
    "xnonisolated_report": "iso_n7_bundle_g3_sum1_endpoint_v_isolatefree_n11_exact_rank7_g5_finish_20260831.json",
    "xisolated_source": "prove_iso_n7_bundle_g3_sum1_endpoint_v_xisolated_n11_rank7_g5_finish.py",
    "xisolated_report": "iso_n7_bundle_g3_sum1_endpoint_v_xisolated_n11_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_sum1_endpoint_v_isolate_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_sum1_endpoint_v_isolate_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "xnonisolated_source": "CE19AEDAC3146BC1D80B6129383326CC859BD13171FFD37505838BCA4876C722",
    "xnonisolated_report": "3E384835CD8B2CCE422A28A2BDC02A5F0D61108ADBE36E3EFC4C20D2EDE5789B",
    "xisolated_source": "7824E5D2557883EC081F67A6CB01511D6E133C230952AAFDF425540AC06D5BEA",
    "xisolated_report": "A02F3F83293FB895EBF0A1319EC2E71976763DEB38F19D158325F3DA8B559C74",
    "padding_source": "26E26609777AE48B7839FA6FDB7ED346ED0B93AFC46C7F09B16FB11938FF8F64",
    "padding_report": "D51AB5245BF6CE7B7362AD86950CFB4EF1B912CBC24AB1421101089A68D9864B",
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
    assert xnonisolated["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_V_ISOLATEFREE_N11_RANK7_G5_FINISH"
    assert xnonisolated["coverage_gap_within_stated_endpoint_v_isolatefree_sum1_G3"] is None
    assert xisolated["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_V_XISOLATED_N11_RANK7_G5_FINISH"
    assert xisolated["coverage_gap_within_stated_endpoint_v_xisolated_sum1_base"] is None
    assert padding["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_V_ISOLATE_PADDING_RANK7_G5_FINISH"
    assert padding["coverage_gap_within_positive_order_endpoint_v_sum1_padding"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True
    assert min(padding["tiny_exact_audit"]["one_vertex_edgeless_newton_coefficients"].values()) >= 0
    assert 8+2 == 10 and 9+2 == 11 and 9-1 == 8

    classes = [
        {"class": "W internally edgeless", "core": "H={x}", "method": "direct exact H0..H8 Newton audit"},
        {"class": "x nonisolated, 2<=h<=8", "method": "finite n<=10 base plus padding"},
        {"class": "x nonisolated, h>=9", "method": "endpoint_v isolate-free n>=11 theorem plus padding"},
        {"class": "x isolated and W nonempty, 3<=h<=8", "method": "finite n<=10 base plus padding"},
        {"class": "x isolated and W nonempty, h>=9", "method": "endpoint_v x-isolated n>=11 theorem plus padding"},
    ]
    report = {
        "marker": MARKER, "status": "proved exact",
        "theorem": (
            "In endpoint_v mode, for every forest with nonadjacent marks, no common "
            "unmarked neighbour, and exactly one B-mark-to-unmarked edge, G3>=0."
        ),
        "relative_endpoint_guard": (
            "B is the active mark and endpoint_v is its endpoint mode. Mark exchange "
            "also covers the literal orientation with A active and endpoint_u. The "
            "inactive-endpoint relative cell remains separate."
        ),
        "exhaustive_classes": classes,
        "coverage_gap_within_endpoint_v_active_common0_sum1_G3": None,
        "rank7_G3_symmetry_reduced_cells_before": 20,
        "rank7_G3_symmetry_reduced_cells_after": 19,
        "universal_G3_claim": False,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Universal only for the active-endpoint relative common0/sum1 G3 cell. "
            "The inactive endpoint, ordinary parent masks, and other geometries remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    assert len(classes) == 5
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "exhaustive_core_classes": len(classes),
        "coverage_gap_within_endpoint_v_active_common0_sum1_G3": None,
        "rank7_G3_symmetry_reduced_cells_after": 19, "universal_G3_claim": False,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
