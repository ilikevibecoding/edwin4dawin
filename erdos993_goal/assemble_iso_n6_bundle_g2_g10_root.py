#!/usr/bin/env python3
"""Assemble the universal rank-six bundle coefficients g2 through g10.

This is deliberately a dependency-pinned assembly.  It does not prove the
remaining coefficient g1 or perform the subsequent bundle induction.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_g10_assembled_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_G10_ROOT"

PINS = {
    "assemble_iso_n6_bundle_top_g5_g10_root.py":
        "22642D68B0FD0A5EE53C80C6244E46950B5093E071E41E3BFD925F254F0801EE",
    "iso_n6_bundle_top_g5_g10_assembled_exact_root_20260830.json":
        "C26D5A80AD4617461971F8AA09ADC2E4C1AEE24BB592D71112992AAD2FA09AF7",
    "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py":
        "6B3106BCEE7F7ECA68C4C5B6861EF018E7E2023DFD8BA091CDAC1EA1FB0085A6",
    "iso_n6_bundle_g4_marked_edge_bernstein_exact_g1_bernstein_20260830.json":
        "664BEF48E70853EEE3C277590385F412CBAA262E424E52E2B4D184AA507B82E3",
    "prove_iso_n6_bundle_g3_marked_edge_bernstein_g1_nonadjacent.py":
        "F38C1BDA7F3404B26D1F1085E02C1F54B02E256DB5ACBB1E0F91D107067CE46D",
    "iso_n6_bundle_g3_marked_edge_bernstein_exact_g1_nonadjacent_20260831.json":
        "C34717BA42B978C93B01FFDA524609DDA212909832339E790A7761C33FC8ECA5",
    "assemble_iso_n6_bundle_g2_all_geometries_all_parent_modes_root.py":
        "730DA2BDBF3C3FFA16C7009FEE02952B96455CF6B356413521D1C10F5BD1CEB3",
    "iso_n6_bundle_g2_all_geometries_all_parent_modes_assembled_exact_root_20260831.json":
        "775797AE5909BA103E25AF15EF48F9235CF7F46ADF3C1FDE8A2F9DC643333645",
    "audit_iso_n6_bundle_g2_complete_independent_root.py":
        "A730FE39BED5DAADBB7011899D7F4D3EEF6D0FFA9BE1C5F3F8ED7379111B02E6",
    "iso_n6_bundle_g2_complete_independent_audit_exact_root_20260831.json":
        "139408F0ACA2F7E6BC605AF245A335B8136D233EC8310737A70FFD8F8F771D70",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    observed = {name: sha256(HERE / name) for name in PINS}
    assert observed == PINS, (observed, PINS)

    top = load("iso_n6_bundle_top_g5_g10_assembled_exact_root_20260830.json")
    g4 = load(
        "iso_n6_bundle_g4_marked_edge_bernstein_exact_"
        "g1_bernstein_20260830.json"
    )
    g3 = load(
        "iso_n6_bundle_g3_marked_edge_bernstein_exact_"
        "g1_nonadjacent_20260831.json"
    )
    g2 = load(
        "iso_n6_bundle_g2_all_geometries_all_parent_modes_"
        "assembled_exact_root_20260831.json"
    )
    g2_audit = load(
        "iso_n6_bundle_g2_complete_independent_audit_exact_root_20260831.json"
    )

    assert top["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_TOP_G5_G10_ROOT"
    assert top["closed_coefficients"] == [5, 6, 7, 8, 9, 10]
    assert top["source_sha256"] == PINS[
        "assemble_iso_n6_bundle_top_g5_g10_root.py"
    ]
    assert g4["marker"] == (
        "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G4_"
        "MARKED_EDGE_BERNSTEIN_G1_BERNSTEIN"
    )
    assert g4["coefficient"] == "g4"
    assert g4["source_sha256"] == PINS[
        "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py"
    ]
    assert g3["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G3_MARKED_EDGE_"
        "BERNSTEIN_G1_NONADJACENT"
    )
    assert g3["coefficient"] == "g3"
    assert g3["source_sha256"] == PINS[
        "prove_iso_n6_bundle_g3_marked_edge_bernstein_g1_nonadjacent.py"
    ]
    assert g2["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_ALL_GEOMETRIES_"
        "ALL_PARENT_MODES_ROOT"
    )
    assert g2["coverage_gap_within_rank_six_G2"] is None
    assert g2["source_sha256"] == PINS[
        "assemble_iso_n6_bundle_g2_all_geometries_all_parent_modes_root.py"
    ]
    assert g2_audit["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_COMPLETE_INDEPENDENT_AUDIT_ROOT"
    )
    assert g2_audit["assembly_sha256"] == PINS[
        "iso_n6_bundle_g2_all_geometries_all_parent_modes_"
        "assembled_exact_root_20260831.json"
    ]
    assert g2_audit["coverage_gap_within_rank_six_G2"] is None
    assert g2_audit["mark_geometries"] == 2
    assert g2_audit["parent_modes_per_geometry"] == 5

    report = {
        "schema": "iso-n6-bundle-g2-g10-assembly-v1",
        "date": "2026-08-31",
        "marker": MARKER,
        "rank": 6,
        "theorem": (
            "For every canonical marked rank-six sibling-bundle cell over a "
            "finite forest with two distinct marks, each exact binomial-basis "
            "coefficient g2,g3,...,g10 in Gamma_M=sum_j g_j*binom(M,j) is "
            "nonnegative."
        ),
        "closed_coefficients": list(range(2, 11)),
        "coefficient_certificates": {
            "g2": {
                "producer": g2["marker"],
                "independent_assembly_audit": g2_audit["marker"],
                "geometry_partition": g2["exhaustive_mark_geometry_partition"],
            },
            "g3": g3["marker"],
            "g4": g4["marker"],
            "g5_through_g10": top["marker"],
        },
        "coverage": {
            "rank": 6,
            "mark_geometry": "every ordered pair of distinct marks",
            "bundle_cells": "every canonical forest-realizable sibling-bundle cell",
            "coefficients": "g2 through g10, without a coefficient gap",
        },
        "remaining_exact_frontier": {
            "bundle_coefficients": [1],
            "terminal_N6": "open outside already pinned terminal families",
            "all_N6_induction_assembly": "open until g1 and terminal scope close",
            "rank_seven_propagation": "separate",
        },
        "scope_guard": (
            "This closes only rank-six whole-bundle coefficients g2 through "
            "g10. It does not assert g1, complete terminal N6, the all-N6 "
            "induction, rank-seven propagation, the Newton-tail bridge, or "
            "Erdos Problem 993."
        ),
        "pins": PINS,
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print("CLOSED_COEFFICIENTS", report["closed_coefficients"])
    print("REMAINING_BUNDLE_COEFFICIENTS", report["remaining_exact_frontier"]["bundle_coefficients"])


if __name__ == "__main__":
    main()
