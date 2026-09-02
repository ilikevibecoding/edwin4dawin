#!/usr/bin/env python3
"""Fail-closed universal theorem for rank-five g1 in no_parent_k0.

The canonical configuration theorem gives D=C in this mode.  The compact
identity then reads

    g1 = S(C) + 2*N4(C),  S=M5+3*C5.

Both summands are nonnegative by pinned all-forest theorems.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_no_parent_k0_all_forest_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_NO_PARENT_K0_ALL_FOREST_ROOT"

PINS = {
    "assemble_iso_n5_s_all_marked_forests_root.py":
        "E56AA4AD8AF3FE936DAF8354A6D7BAD1BAC5AFDCCD6C4436FB198A0FC76D479E",
    "iso_n5_s_all_marked_forests_exact_root_20260830.json":
        "E4FDD1215C0924A40E2B6D47BAC9CF5BB54830686AAB6E5F1188D8F25F386CBE",
    "derive_iso_n5_bundle_g1_no_mark_root_compact_root.py":
        "39243EEEB2C22ABE711401959804C839C5AFE3A7882691EB9FA8FC91CBE7E3E7",
    "iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json":
        "9954176009C063BC69511A8DA6FF90B0E0B6ADC02BF007045E8ADF168014088B",
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
    "iso_n5_bundle_g12_canonical_configuration_exact_g1_bernstein_20260829.json":
        "584D8FAA7DA29CAB3884A30173EA7C7C6CB63771902DD3EB284E74AED4068DCB",
    "assemble_iso_all_forest_n4_bundle_induction_root.py":
        "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
    "iso_all_forest_n4_bundle_induction_exact_root_20260829.json":
        "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
    "audit_iso_all_forest_n4_bundle_induction_independent_bundle_g12.py":
        "E656BEE9BC8412B99ABB93CBFB484985C9B2EBEFB5FC575437385B7AD2B8B29B",
    "iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json":
        "0D341C165A35835F08DE48852540FBD3B83BC133CB0871F9930B862D0C3B1B21",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINS} == PINS

    scalar = load("iso_n5_s_all_marked_forests_exact_root_20260830.json")
    identity = load("iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json")
    configuration = load(
        "iso_n5_bundle_g12_canonical_configuration_exact_g1_bernstein_20260829.json"
    )
    n4 = load("iso_all_forest_n4_bundle_induction_exact_root_20260829.json")
    n4_audit = load(
        "iso_all_forest_n4_bundle_induction_independent_audit_bundle_g12_20260829.json"
    )

    assert scalar["marker"] == "PASS_EXACT_ISO_N5_S_ALL_MARKED_FORESTS_ROOT"
    assert scalar["theorem"] == (
        "For every finite forest G and every pair of distinct marked vertices u,v, "
        "the rank-five scalar reserve S=M5+3*C5 is nonnegative."
    )

    assert identity["marker"] == (
        "PASS_EXACT_ISO_N5_BUNDLE_G1_NO_MARK_ROOT_COMPACT_IDENTITY_ROOT"
    )
    assert identity["rank_five_identity"] == "g1(no-mark-root)=M5+3*C5+2*N4"

    assert configuration["marker"] == (
        "PASS_EXACT_ISO_N5_BUNDLE_G12_CANONICAL_CONFIGURATION_G1_BERNSTEIN"
    )
    assert configuration["canonical_row_reductions"]["no_parent_k0"] == "D=C"
    assert configuration["status"]["configuration_reduction"] == "proved"

    theorem = "N4(B;u,v)>=0 for every finite forest B and every pair of distinct marked vertices u,v."
    assert n4["marker"] == "PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT"
    assert n4["theorem"] == theorem
    assert n4_audit["marker"] == (
        "PASS_INDEPENDENT_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_AUDIT_BUNDLE_G12"
    )
    assert n4_audit["theorem"] == theorem

    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest C with distinct marked vertices u,v, the rank-five "
            "bundle coefficient g1 is nonnegative in the canonical no_parent_k0 mode."
        ),
        "canonical_geometry": {
            "mode": "no_parent_k0",
            "row_relation": "D=C",
            "reason": (
                "The support is the root of a markless star component.  After its leaf "
                "bundle is removed, deleting the support and its closed neighborhood "
                "leaves the same marked remainder row C."
            ),
        },
        "exact_identity": "g1=S(C)+2*N4(C), where S=M5+3*C5",
        "sign_payment": {
            "S": "nonnegative for every finite marked forest by the universal scalar theorem",
            "N4": (
                "nonnegative for every finite marked forest by the all-order rank-four "
                "theorem and its independent audit"
            ),
            "conclusion": "g1=S+2*N4>=0",
        },
        "dependencies_sha256": PINS,
        "scope": (
            "This closes exactly the no_parent_k0 canonical g1 mode.  The four D!=C "
            "g1 modes, every unresolved g2 mode, all N5, and Erdos Problem 993 remain "
            "separate obligations."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "mode": "no_parent_k0",
        "identity": report["exact_identity"],
        "theorem": report["theorem"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
