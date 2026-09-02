#!/usr/bin/env python3
"""Fail-closed assembly of the universal rank-five scalar reserve S.

For distinct marks in a forest, exactly one of the following holds:
the marks are adjacent, nonadjacent in one component, or in different
components.  The first pinned theorem proves S=M5+3*C5 directly.  The
other two pinned theorems prove M5>=0, and the universal C5 theorem gives
C5>=0.  Thus S>=0 in every marked forest state.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_s_all_marked_forests_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_S_ALL_MARKED_FORESTS_ROOT"

PINS = {
    "assemble_iso_n5_g1_adjacent_all_forest_root.py":
        "82CAC2BCCF6D33CF6B4B17FC2521AFC6D74FD4025B9C1F5DC4A555F842D72A6A",
    "iso_n5_g1_adjacent_all_forest_assembled_exact_root_20260830.json":
        "3AD4CDDCF61B0B14A5C9A1AE41102844D33D06CD51466CBE52B3A87C8BA02FE3",
    "assemble_iso_n5_g1_connected_nonadjacent_m5_all_forest_g1_bernstein.py":
        "EE6E63DC73F774C834B971DDEFCA5C2C0230F3ACD28A7C7CCE33885E46557CBE",
    "iso_n5_g1_connected_nonadjacent_m5_all_forest_assembled_g1_bernstein_20260830.json":
        "F670F975FAFBA5398824075E55D7A7E23D3AC6D209C8B00E4A61B93745D2F104",
    "prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent.py":
        "FCA5115C5D303352DBBC001B305207D583219335326BC48D0C4BFEEE90FB5C1B",
    "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json":
        "27E70D94ED97F659E62D63527365906D33123EFDB4E6F8168951061B83BFCCA1",
    "assemble_iso_n5_c5_all_marked_forests_root.py":
        "9C6E4B5C145378DDE7615A476158F4546F0687CCA910172B4735E2A62443FECA",
    "iso_n5_c5_all_marked_forests_exact_root_20260830.json":
        "F341C659D1B2DEC584D00AE4D86DA9BBCCA75EA91001179A95B30EB6CD584C02",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINS} == PINS

    adjacent = load("iso_n5_g1_adjacent_all_forest_assembled_exact_root_20260830.json")
    connected = load(
        "iso_n5_g1_connected_nonadjacent_m5_all_forest_assembled_g1_bernstein_20260830.json"
    )
    disconnected = load(
        "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json"
    )
    c5 = load("iso_n5_c5_all_marked_forests_exact_root_20260830.json")

    assert adjacent["marker"] == "PASS_EXACT_ISO_N5_G1_ADJACENT_ALL_FOREST_ROOT"
    assert adjacent["theorem"] == (
        "For every finite adjacent-mark forest state, the rank-five residual "
        "S=M5+3*C5 is nonnegative."
    )
    assert adjacent["finite_certificate"]["negative"] == 0
    assert adjacent["finite_certificate"]["deletion_states"] == 3_804_017
    assert all(
        branch["negative"] == 0 and Fraction(branch["minimum"]) > 0
        for branch in adjacent["large_order_certificate"]["branches"].values()
    )

    assert connected["marker"] == (
        "PASS_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_ALL_FOREST_G1_BERNSTEIN"
    )
    assert "M5=2[z^4w^5]N is nonnegative" in connected["theorems"]["M5"]
    assert "M5+3*C5 is nonnegative" in connected["theorems"]["S"]
    assert connected["finite_certificate"]["M5_negative"] == 0
    assert connected["analytic_certificate"]["total_homogeneous_coefficients"] == 105_071_040
    assert connected["analytic_certificate"]["all_coefficients_strictly_positive"] is True

    assert disconnected["marker"] == (
        "PASS_EXACT_ISO_N5_DISCONNECTED_M5_ALL_COMPONENTWISE_G1_NONADJACENT"
    )
    assert disconnected["theorem"] == (
        "For every forest whose two marks lie in distinct components, "
        "the disconnected-mark block M5 is nonnegative."
    )
    assert disconnected["coverage"].startswith("All 16 distinct Psi interval sums")

    assert c5["marker"] == "PASS_EXACT_ISO_N5_C5_ALL_MARKED_FORESTS_ROOT"
    assert c5["partition_is_disjoint_and_exhaustive"] is True
    assert c5["theorem"] == (
        "For every finite forest G and every pair of distinct vertices u,v, "
        "C5=[z^4w^4]R(E,U,V,W)-[z^3w^5]R(E,U,V,W) is nonnegative."
    )

    cases = [
        {
            "case": "adjacent",
            "predicate": "u and v lie in one component and uv is an edge",
            "payment": "the adjacent theorem proves S=M5+3*C5>=0 directly",
        },
        {
            "case": "connected_nonadjacent",
            "predicate": "u and v lie in one component and uv is not an edge",
            "payment": "the connected theorem proves M5>=0 and the universal theorem proves C5>=0",
        },
        {
            "case": "different_components",
            "predicate": "u and v lie in different components",
            "payment": "the disconnected theorem proves M5>=0 and the universal theorem proves C5>=0",
        },
    ]
    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest G and every pair of distinct marked vertices u,v, "
            "the rank-five scalar reserve S=M5+3*C5 is nonnegative."
        ),
        "disjoint_exhaustive_mark_placement_partition": cases,
        "logic": (
            "Adjacency is defined only inside a component.  Hence the three displayed "
            "predicates are pairwise disjoint and exhaustive.  The pinned certificates "
            "prove S directly in the adjacent case and prove M5>=0,C5>=0 separately "
            "in each nonadjacent case."
        ),
        "certificate_totals": {
            "adjacent_finite_deletion_states": 3_804_017,
            "connected_nonadjacent_homogeneous_coefficients": 105_071_040,
            "disconnected_finite_reduced_patterns": 75_549,
            "disconnected_finite_newton_checks": 2_644_215,
            "disconnected_large_branches": 70,
            "disconnected_homogeneous_coefficients": 1_020_209,
        },
        "dependencies_sha256": PINS,
        "scope": (
            "Universal scalar S=M5+3*C5 only.  The no-parent g1 consequence is a "
            "separate assembly; D!=C canonical g1 modes, g2, all N5, and Erdos "
            "Problem 993 are not asserted here."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "cases": [row["case"] for row in cases],
        "theorem": report["theorem"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
