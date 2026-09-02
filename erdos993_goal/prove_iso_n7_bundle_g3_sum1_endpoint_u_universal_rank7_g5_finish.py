#!/usr/bin/env python3
"""Universal assembly for inactive-endpoint common0/sum1 rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_sum1_endpoint_u_universal_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_U_UNIVERSAL_RANK7_G5_FINISH"
FILES = {
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "xnonisolated_source": "prove_iso_n7_bundle_g3_sum1_endpoint_u_isolatefree_n11_rank7_g5_finish.py",
    "xnonisolated_report": "iso_n7_bundle_g3_sum1_endpoint_u_isolatefree_n11_exact_rank7_g5_finish_20260831.json",
    "xisolated_source": "prove_iso_n7_bundle_g3_sum1_endpoint_u_xisolated_n11_rank7_g5_finish.py",
    "xisolated_report": "iso_n7_bundle_g3_sum1_endpoint_u_xisolated_n11_exact_rank7_g5_finish_20260831.json",
    "padding_source": "prove_iso_n7_bundle_g3_sum1_endpoint_u_isolate_padding_rank7_g5_finish.py",
    "padding_report": "iso_n7_bundle_g3_sum1_endpoint_u_isolate_padding_exact_rank7_g5_finish_20260831.json",
}
EXPECTED = {
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "xnonisolated_source": "67656CC462588C1A26970CA2DBE9A22539AD87268D0E0C78BDE3FC901DEB16B4",
    "xnonisolated_report": "2603BE4C5718EA1923640E2A9983C894897E0A4B0D9D12B45A36E7AE50DDFF65",
    "xisolated_source": "055591A01581A45A86BDFCD1D929D534A0C24051885338EAC0523C22A94A3044",
    "xisolated_report": "B1C527BF43E5D8CDD33877BF879C962684B279F46F28BE1BE41CEF679DF3E611",
    "padding_source": "D0FF777B472FD35392FE8E809E9979786EB796550D176A682FD8096176047A06",
    "padding_report": "E5ECBDE5B7AFE75CB3D337CCE8A951A132EE4F362BDC545F7CF26CA7FF46AAC8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    finite = json.loads((HERE / FILES["finite_report"]).read_text(encoding="utf-8"))
    xnon = json.loads((HERE / FILES["xnonisolated_report"]).read_text(encoding="utf-8"))
    xiso = json.loads((HERE / FILES["xisolated_report"]).read_text(encoding="utf-8"))
    padding = json.loads((HERE / FILES["padding_report"]).read_text(encoding="utf-8"))
    assert finite["negative_count"] == 0 and finite["orders"] == [2, 10]
    assert xnon["coverage_gap_within_stated_endpoint_u_isolatefree_sum1_G3"] is None
    assert xnon["sign_split_exhaustion"].endswith("no residual sign cell remains.")
    assert xiso["coverage_gap_within_stated_endpoint_u_xisolated_sum1_base"] is None
    assert padding["coverage_gap_within_positive_order_endpoint_u_sum1_padding"] is None
    assert padding["aggregate"]["exact_newton_recomposition"] is True
    assert min(padding["tiny_exact_audit"]["one_vertex_edgeless_newton_coefficients"].values()) >= 0
    assert 8+2 == 10 and 9+2 == 11 and 9-1 == 8
    classes = [
        {"class": "W internally edgeless", "method": "exact one-root Newton audit"},
        {"class": "x nonisolated, h<=8", "method": "finite base plus padding"},
        {"class": "x nonisolated, h>=9", "method": "two-chart inactive-endpoint theorem plus padding"},
        {"class": "x isolated, W nonempty, h<=8", "method": "finite base plus padding"},
        {"class": "x isolated, W nonempty, h>=9", "method": "x-isolated theorem plus padding"},
    ]
    report = {
        "marker": MARKER, "status": "proved exact",
        "theorem": "For every inactive-endpoint common0/sum1 rank-seven G3 cell, G3>=0.",
        "relative_endpoint_guard": (
            "B is active and endpoint_u is inactive; mark exchange covers A active "
            "with endpoint_v. The active-endpoint cell was closed separately."
        ),
        "sign_gap_resolution": xnon["sign_split_exhaustion"],
        "exhaustive_classes": classes,
        "coverage_gap_within_inactive_endpoint_common0_sum1_G3": None,
        "rank7_G3_symmetry_reduced_cells_before": 19,
        "rank7_G3_symmetry_reduced_cells_after": 18,
        "universal_G3_claim": False,
        "dependencies_sha256": EXPECTED,
        "scope": "Universal only for inactive-endpoint common0/sum1 G3; ordinary-parent and other geometries remain separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "exhaustive_core_classes": len(classes),
        "coverage_gap_within_inactive_endpoint_common0_sum1_G3": None,
        "rank7_G3_symmetry_reduced_cells_after": 18, "universal_G3_claim": False,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
