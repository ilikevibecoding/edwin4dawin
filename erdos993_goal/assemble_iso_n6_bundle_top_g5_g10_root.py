#!/usr/bin/env python3
"""Assemble the independently audited universal rank-six top coefficients.

This fail-closed wrapper pins the exact rank-six bundle algebra, the completed
all-N5 lower payment, and independent producer/audit pairs proving universal
nonnegativity of g5,...,g10.  It asserts no sign for g1,...,g4 and no all-N6
theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_top_g5_g10_assembled_exact_root_20260830.json"

PINS = {
    "algebra_source": (
        "derive_iso_n6_bundle_polynomial_root.py",
        "BB229E377F89B59767D402609FC11B2B9EE0A78D97090DA33316D93C7A3C8444",
    ),
    "algebra_report": (
        "iso_n6_whole_bundle_binomial_symbolic_root_20260830.json",
        "F0E06EF479C77D1990ECBC180824107A83D88A03FDE5364FFC8BBA086AA4F780",
    ),
    "all_n5_source": (
        "assemble_iso_all_forest_n5_bundle_induction_g2_structure_nonadjacent.py",
        "9906E66E28717A80F1215DBCF75ADE913AFC5EE1911D1A08FD08317F6589AC38",
    ),
    "all_n5_report": (
        "iso_all_forest_n5_bundle_induction_exact_g2_structure_nonadjacent_20260830.json",
        "7F2845A77504828349E100371FEE2591CFDE70AF87E2504A91EE5D121357B3CB",
    ),
    "all_n5_audit_source": (
        "audit_iso_all_forest_n5_bundle_induction_g2_transfer_audit.py",
        "4484285A467773D4C800C91D0E47542072AF6A71AC2C5BA15677BD9BC7EFD363",
    ),
    "all_n5_audit_report": (
        "iso_all_forest_n5_bundle_induction_independent_audit_g2_transfer_audit_20260830.json",
        "761A6AEA3C4ED2E16178DA1B5B5CC41ABAD4DFAFD1F993463E1682FC19456C87",
    ),
    "g5_source": (
        "prove_iso_n6_bundle_g5_root.py",
        "FFB710731946FD1C47E656EC52953A66E3F423960C95763F838AFC1159AB62FF",
    ),
    "g5_report": (
        "iso_n6_bundle_g5_exact_root_20260830.json",
        "5A66101180056A9B18F974E172D0699C02865FCBD3AF0F3A43D9D99C8B4D405E",
    ),
    "g5_audit_source": (
        "audit_iso_n6_bundle_g5_g2_transfer_audit.py",
        "C708E5D86DDB34884A940B4CD959D1060CF0F850091AAF8008B0C9E8360FD78B",
    ),
    "g5_audit_report": (
        "iso_n6_bundle_g5_independent_audit_exact_g2_transfer_audit_20260830.json",
        "FD86881A55C87D9376594C714907A87E50CE6EA76F99F3414B689DD96E2A2080",
    ),
    "g6_source": (
        "prove_iso_n6_bundle_g6_root.py",
        "2ECF76862B1FB6C6C84DBD393C41601369F31506DA2AA4A44267FE37FC2594BD",
    ),
    "g6_report": (
        "iso_n6_bundle_g6_exact_root_20260830.json",
        "2304848451FB6A2E6740EDCFA080452141A70692939AC2E2477520786574B77A",
    ),
    "g6_audit_source": (
        "audit_iso_n6_bundle_g6_g2_transfer_audit.py",
        "A7C471704255D1705B5908D8940AF8DE0E9CB99EE74F9ED06E850A5F91C0783C",
    ),
    "g6_audit_report": (
        "iso_n6_bundle_g6_independent_audit_exact_g2_transfer_audit_20260830.json",
        "1284A8D96FB8F5E4A619EE5C60C5BD93DA67A06BB15F52DB4298B13D0C1E3F3A",
    ),
    "g7_source": (
        "prove_iso_n6_bundle_g7_root.py",
        "047016067AD2E941AA488F248CC6F0A450A5BDB8776E9357F891812EAF5FF198",
    ),
    "g7_report": (
        "iso_n6_bundle_g7_exact_root_20260830.json",
        "7C457382F29BA910D68282CD34ECA8CF770515C3447DC27C341D33485669D830",
    ),
    "g7_audit_source": (
        "audit_iso_n6_bundle_g7_g2_transfer_audit.py",
        "1340B33DF04DD30F127D23CB213F3F71E1A927C6E463C1230A0ACF21C8660D49",
    ),
    "g7_audit_report": (
        "iso_n6_bundle_g7_independent_audit_exact_g2_transfer_audit_20260830.json",
        "FA52C732E4A38828E5EFBD6E57B086772C864102DC02BE80A2BA0CA554BF382C",
    ),
    "top_source": (
        "prove_iso_n6_bundle_top_coefficients_root.py",
        "D66274CD4E4F1D7B681662DDAA68B97985E2684B16588234C287B4115D12A970",
    ),
    "top_report": (
        "iso_n6_bundle_top_coefficients_exact_root_20260830.json",
        "628BFD655335BF703C031687B73F32824D368466E57241E745FD48C6E82FC4BF",
    ),
    "top_audit_source": (
        "audit_iso_n6_bundle_top_coefficients_independent_g2_structure_nonadjacent.py",
        "C4C39BA1BD0EF0FC55DD5CBFE5038F79A3259D8327D9C825B22CB29780F4E903",
    ),
    "top_audit_report": (
        "iso_n6_bundle_top_coefficients_independent_audit_exact_g2_structure_nonadjacent_20260830.json",
        "ACCC9C7339E4DFBC1DB3083AB0754F1B888952C7CAC7B8EA75E5F8321F2CB918",
    ),
    "finite_source": (
        "probe_iso_n6_bundle_finite_root.py",
        "042119774A5F343A60924D9E46A5F5C7B07722AB355733179F16F23C4DEA2DFC",
    ),
    "finite_report": (
        "iso_n6_bundle_finite_probe_root_20260830.json",
        "8E2E59B418ADF242A8A884C1E3DB3A0EC323AABC2406755AA098A492B8810216",
    ),
    "finite_audit_source": (
        "audit_iso_n6_bundle_algebra_finite_g2_transfer_audit.py",
        "443271843C72AE45D7CB3594664034DE64507D500017AA958EEDE6AD03F792B2",
    ),
    "finite_audit_report": (
        "iso_n6_bundle_algebra_finite_independent_audit_exact_g2_transfer_audit_20260830.json",
        "C08ED6BB86ADCB6F4F49726C7F1C2E436DCCBDFF1343FA12EFD1EA399613BEEC",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str) -> dict:
    return json.loads((HERE / PINS[key][0]).read_text(encoding="utf-8"))


def main() -> None:
    for name, expected in PINS.values():
        assert sha256(HERE / name) == expected, name

    algebra = load("algebra_report")
    all_n5 = load("all_n5_report")
    all_n5_audit = load("all_n5_audit_report")
    g5 = load("g5_report")
    g5_audit = load("g5_audit_report")
    g6 = load("g6_report")
    g6_audit = load("g6_audit_report")
    g7 = load("g7_report")
    g7_audit = load("g7_audit_report")
    top = load("top_report")
    top_audit = load("top_audit_report")
    finite = load("finite_report")
    finite_audit = load("finite_audit_report")

    assert algebra["marker"] == "DERIVED_EXACT_ISO_N6_BUNDLE_BINOMIAL_POLYNOMIAL_ROOT"
    assert algebra["degree_in_M"] == 10
    assert all_n5["marker"] == (
        "PASS_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_STRUCTURE_NONADJACENT"
    )
    assert all_n5_audit["marker"] == (
        "PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N5_BUNDLE_INDUCTION_G2_TRANSFER_AUDIT"
    )
    assert g5["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G5_ROOT"
    assert g5_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G5_G2_TRANSFER_AUDIT"
    assert g6["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G6_ROOT"
    assert g6_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G6_G2_TRANSFER_AUDIT"
    assert g7["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G7_ROOT"
    assert g7_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G7_G2_TRANSFER_AUDIT"
    assert top["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_TOP_COEFFICIENTS_ROOT"
    assert top_audit["marker"] == (
        "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_TOP_COEFFICIENTS_G2_STRUCTURE_NONADJACENT"
    )
    assert finite["marker"] == "PROBE_EXACT_ISO_N6_BUNDLE_FINITE_ROOT"
    assert finite_audit["marker"] == (
        "PASS_INDEPENDENT_DIAGNOSTIC_EXACT_ISO_N6_BUNDLE_ALGEBRA_FINITE_G2_TRANSFER_AUDIT"
    )

    report = {
        "marker": "PASS_EXACT_ISO_N6_BUNDLE_TOP_G5_G10_ROOT",
        "theorem": (
            "For every genuine marked rank-six sibling-bundle cell over a finite "
            "forest with distinct marks, the exact coefficients g5,g6,g7,g8,g9,g10 "
            "in Gamma_M=sum_j g_j*binom(M,j) are nonnegative."
        ),
        "rank": 6,
        "closed_coefficients": [5, 6, 7, 8, 9, 10],
        "coefficient_certificates": {
            "g5": {
                "n_equals_2": g5["n_equals_2"],
                "n_at_least_3_lower_bound": g5["n_at_least_3"]["strict_lower_bound"],
                "independent_audit": g5_audit["marker"],
            },
            "g6": {
                "n_equals_2": g6["n_equals_2"],
                "n_at_least_3_lower_bound": g6["n_at_least_3"]["strict_lower_bound"],
                "independent_audit": g6_audit["marker"],
            },
            "g7": {
                "strict_lower_bound": g7["strict_lower_bound"],
                "independent_audit": g7_audit["marker"],
            },
            "g8": {
                "lower_bound": top["proved_top_coefficients"]["g8_lower_bound"],
                "independent_audit": top_audit["marker"],
            },
            "g9": top["proved_top_coefficients"]["g9"],
            "g10": top["proved_top_coefficients"]["g10"],
        },
        "lower_payment": {
            "status": "closed",
            "theorem": all_n5["theorem"],
            "primary": all_n5["marker"],
            "independent": all_n5_audit["marker"],
        },
        "independent_finite_diagnostic": {
            "marked_cells": finite["marked_cells_including_fixtures"],
            "bundle_cells": finite["bundle_cells"],
            "negative_g1_through_g10": finite["negative_count"],
            "audit": finite_audit["marker"],
            "role": "diagnostic only; it is not used to prove universal signs",
        },
        "remaining_exact_frontier": {
            "bundle_coefficients": [1, 2, 3, 4],
            "terminal_N6": "open",
            "all_N6_induction_assembly": "open",
        },
        "pins": {
            key: {"file": value[0], "sha256": value[1]}
            for key, value in PINS.items()
        },
        "scope": (
            "Universal exact rank-six bundle theorem only for g5,...,g10, with "
            "the all-N5 lower payment separately pinned. It does not assert g1,...,g4, "
            "terminal N6, all-N6, rank seven, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": report["marker"],
                "closed_coefficients": report["closed_coefficients"],
                "remaining_exact_frontier": report["remaining_exact_frontier"],
            },
            indent=2,
            sort_keys=True,
        )
    )
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
