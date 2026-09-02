#!/usr/bin/env python3
"""Fail-closed assembly of rank-five g2 across all canonical deepest modes."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_all_canonical_modes_assembled_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_ALL_CANONICAL_MODES_RANK5_G2_ALT"
PINS = {
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
    "iso_n5_bundle_g12_canonical_configuration_exact_g1_bernstein_20260829.json":
        "584D8FAA7DA29CAB3884A30173EA7C7C6CB63771902DD3EB284E74AED4068DCB",
    "prove_iso_n5_g2_no_parent_k0_all_forest_rank5_g2_alt.py":
        "A8B04ACED34B1A9C5E2B504FE292FEC9F950EB4E22C68AEBFEE38D436DEEFB7F",
    "iso_n5_g2_no_parent_k0_all_forest_exact_rank5_g2_alt_20260830.json":
        "F1573D4E391CB51DFBCBE3A78A14EFA22264D46EE64046E8D2C66C7B88F385BF",
    "assemble_iso_n5_g2_singleton_ordinary_all_forest_rank5_g2_alt.py":
        "5ED6ED9A02F34F2A9AC9DC65807104C0A64AA84390E7C901D7BCB95ED38288ED",
    "iso_n5_g2_singleton_ordinary_all_forest_assembled_exact_rank5_g2_alt_20260830.json":
        "06EC7B3CA6CEDA9CFD1AE4ADEDFF6A0A26C584DC7B8B6BEF252CF9792600934F",
    "assemble_iso_n5_g2_singleton_endpoint_all_forest_rank5_g2_alt.py":
        "1E8494EBC450B1750644A8B6C75FA91EE3BA46659979F02BF393A6281A15B5CE",
    "iso_n5_g2_singleton_endpoint_all_forest_assembled_exact_rank5_g2_alt_20260830.json":
        "577E3ECB64138663D9A31FD682F963E07B9BC08EBAB6F2D61E49635BE9E24228",
    "prove_iso_n5_g2_internal_endpoint_all_forest_rank5_g2_alt.py":
        "778755532BD939DE641833B042FD9F02F05A557D4C24B0EFA98BCC37979695C4",
    "iso_n5_g2_internal_endpoint_all_forest_exact_rank5_g2_alt_20260830.json":
        "7666FB915C394C5D954CDF1196325149C32EFA9D044F3DEA2176DBF16908368D",
    "assemble_iso_n5_g2_internal_ordinary_all_forest_rank5_g2_alt.py":
        "D9745284B389BC287DF7E978A5BF7E5B9A1393530AFB39662021FB49AD9FB569",
    "iso_n5_g2_internal_ordinary_all_forest_assembled_exact_rank5_g2_alt_20260830.json":
        "D86F36CF6EAA83D63E50260C208C4E1384B2F9C3DE496C67F22C333DAAF9E936",
}

EXPECTED = {
    "no_parent_k0": (
        "iso_n5_g2_no_parent_k0_all_forest_exact_rank5_g2_alt_20260830.json",
        "PASS_EXACT_ISO_N5_G2_NO_PARENT_K0_ALL_FOREST_RANK5_G2_ALT",
    ),
    "singleton_ordinary": (
        "iso_n5_g2_singleton_ordinary_all_forest_assembled_exact_rank5_g2_alt_20260830.json",
        "PASS_EXACT_ISO_N5_G2_SINGLETON_ORDINARY_ALL_FOREST_RANK5_G2_ALT",
    ),
    "singleton_endpoint_p_equals_u": (
        "iso_n5_g2_singleton_endpoint_all_forest_assembled_exact_rank5_g2_alt_20260830.json",
        "PASS_EXACT_ISO_N5_G2_SINGLETON_ENDPOINT_ALL_FOREST_RANK5_G2_ALT",
    ),
    "internal_spine_broom_endpoint": (
        "iso_n5_g2_internal_endpoint_all_forest_exact_rank5_g2_alt_20260830.json",
        "PASS_EXACT_ISO_N5_G2_INTERNAL_ENDPOINT_ALL_FOREST_RANK5_G2_ALT",
    ),
    "internal_spine_broom_ordinary": (
        "iso_n5_g2_internal_ordinary_all_forest_assembled_exact_rank5_g2_alt_20260830.json",
        "PASS_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ALL_FOREST_RANK5_G2_ALT",
    ),
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def load(name):
    return json.loads((HERE / name).read_text())


def main():
    assert {name: sha256(HERE / name) for name in PINS} == PINS
    configuration = load(
        "iso_n5_bundle_g12_canonical_configuration_exact_g1_bernstein_20260829.json"
    )
    assert configuration["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G12_CANONICAL_CONFIGURATION_G1_BERNSTEIN"
    reductions = configuration["canonical_row_reductions"]
    assert set(reductions) == {
        "no_parent_k0", "singleton_ordinary", "singleton_endpoint",
        "internal_endpoint", "internal_ordinary", "broom_factors",
    }

    modes = []
    for mode, (filename, marker) in EXPECTED.items():
        theorem = load(filename)
        assert theorem["marker"] == marker
        if mode == "internal_spine_broom_ordinary":
            assert theorem["coverage_is_disjoint_and_exhaustive"] is True
            assert theorem["large_order_cell_partition"]["small_total"] == 42
            assert theorem["large_order_cell_partition"]["stable_total"] == 21
        modes.append({
            "mode": mode, "theorem_marker": marker,
            "source_report": filename, "report_sha256": PINS[filename],
        })
    assert len(modes) == len(EXPECTED) == 5
    assert {row["mode"] for row in modes} == set(EXPECTED)

    report = {
        "marker": MARKER,
        "theorem": (
            "The exact rank-five whole-bundle coefficient g2 is nonnegative in "
            "each of the five canonical deepest-support modes, for every finite "
            "forest and every allowed ordered placement of the marked vertices."
        ),
        "canonical_configuration_marker": configuration["marker"],
        "canonical_modes": modes,
        "canonical_mode_count": 5,
        "coverage": {
            "no_parent_k0": reductions["no_parent_k0"],
            "singleton_ordinary": reductions["singleton_ordinary"],
            "singleton_endpoint_p_equals_u": reductions["singleton_endpoint"],
            "internal_spine_broom_endpoint": reductions["internal_endpoint"],
            "internal_spine_broom_ordinary": reductions["internal_ordinary"],
            "broom_parameter_domain": reductions["broom_factors"],
        },
        "coverage_is_disjoint_and_exhaustive": True,
        "all_mode_markers_pass": True,
        "dependencies_sha256": PINS,
        "scope": (
            "Exactly rank-five g2 in the five canonical deepest-support modes. "
            "Other rank-five coefficients, the whole N5 block, higher rank, and "
            "Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "canonical_mode_count": 5,
        "all_mode_markers_pass": True, "unresolved_modes": 0,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
