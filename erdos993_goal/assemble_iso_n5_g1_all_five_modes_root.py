#!/usr/bin/env python3
"""Fail-closed assembly of rank-five g1 in all five canonical modes."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_all_five_modes_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_ALL_FIVE_CANONICAL_MODES_ROOT"

PINS = {
    "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py":
        "9DDDB5A367BE06872D44615781CE32A069C8623FCB99C8965A845C1BCF873058",
    "iso_n5_bundle_g12_canonical_configuration_exact_g1_bernstein_20260829.json":
        "584D8FAA7DA29CAB3884A30173EA7C7C6CB63771902DD3EB284E74AED4068DCB",
    "assemble_iso_n5_g1_no_parent_k0_all_forest_root.py":
        "BCA8DA6F502730CC3FA520A697CF7E08AAB9A85EFCE00A90EB57E2DE12F2FC9E",
    "iso_n5_g1_no_parent_k0_all_forest_exact_root_20260830.json":
        "E930548B83BEE710A2F5C994D392D7A2B048AA45A71EF6EF4C28A84AFD31EC1D",
    "prove_iso_n5_g1_internal_endpoint_all_forest_root.py":
        "6AC88AE1DD91F9844A9E5E5D6782AD0FD8A566CE21F8BEB7BA0D2EF3E985319A",
    "iso_n5_g1_internal_endpoint_all_forest_exact_root_20260830.json":
        "8F30FB08E62709D3449B16F7E7B6DFC12241F7D810446D6CBBDD5BA439E0890E",
    "audit_iso_n5_g1_internal_endpoint_all_forest_independent_rank5_g2_alt.py":
        "4EDD7C1A3344E6F3BDED891C75F73879F531788F1695ED930722F7EB5494909A",
    "iso_n5_g1_internal_endpoint_all_forest_independent_audit_rank5_g2_alt_20260830.json":
        "FEAEF159A37BB5BBBBC90EDEEDEA711543595BBFF1A711E217FFC5233CE349C6",
    "assemble_iso_n5_g1_singleton_endpoint_all_placements_root.py":
        "E8FEF64AC34D59A045733E4E66BB4F2B680E440B52D304B371343CDF1088FE42",
    "iso_n5_g1_singleton_endpoint_all_placements_assembled_exact_root_20260830.json":
        "AE8035A52B0ED5B015768B90EB8F18AD5CC1411A940D59212B2A5A0A7BE8CE2B",
    "assemble_exact_iso_n5_bundle_g1_singleton_ordinary_all_forests_g1_bernstein.py":
        "26BD9106A43BB34D24B0D0F79DFA6BDB3A2D2407F3C0517C1327BE45F1DBF172",
    "iso_n5_bundle_g1_singleton_ordinary_all_forests_exact_g1_bernstein_20260830.json":
        "AE548CA6A14EEA4A16DED7F05B3F33A2CA7E9AB087E79476356773687EB0D5E9",
    "assemble_iso_n5_g1_internal_ordinary_all_forest_root.py":
        "729955E571A8EF1CAED62F2CC69A8A957FD6362E88AED4856441478E9BCCDD75",
    "iso_n5_g1_internal_ordinary_all_forest_exact_root_20260830.json":
        "F1FFF53C39F83270ADE03AEFCED02B23D4D55149575B3F9E76FA3E676CBC6640",
}

MODE_FILES = {
    "no_parent_k0": "iso_n5_g1_no_parent_k0_all_forest_exact_root_20260830.json",
    "singleton_endpoint": "iso_n5_g1_singleton_endpoint_all_placements_assembled_exact_root_20260830.json",
    "singleton_ordinary": "iso_n5_bundle_g1_singleton_ordinary_all_forests_exact_g1_bernstein_20260830.json",
    "internal_spine_broom_endpoint": "iso_n5_g1_internal_endpoint_all_forest_exact_root_20260830.json",
    "internal_spine_broom_ordinary": "iso_n5_g1_internal_ordinary_all_forest_exact_root_20260830.json",
}

MARKERS = {
    "no_parent_k0": "PASS_EXACT_ISO_N5_G1_NO_PARENT_K0_ALL_FOREST_ROOT",
    "singleton_endpoint": "PASS_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_ALL_PLACEMENTS_ROOT",
    "singleton_ordinary": "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_ALL_FORESTS_G1_BERNSTEIN",
    "internal_spine_broom_endpoint": "PASS_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_ALL_FOREST_ROOT",
    "internal_spine_broom_ordinary": "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_ALL_FOREST_ROOT",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINS} == PINS

    configuration = load(
        "iso_n5_bundle_g12_canonical_configuration_exact_g1_bernstein_20260829.json"
    )
    assert configuration["marker"] == (
        "PASS_EXACT_ISO_N5_BUNDLE_G12_CANONICAL_CONFIGURATION_G1_BERNSTEIN"
    )
    assert configuration["source_sha256"] == PINS[
        "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py"
    ]
    assert configuration["status"]["configuration_reduction"] == "proved"
    reduction_keys = {
        "no_parent_k0",
        "singleton_endpoint",
        "singleton_ordinary",
        "internal_endpoint",
        "internal_ordinary",
    }
    assert reduction_keys.issubset(configuration["canonical_row_reductions"])

    loaded = {mode: load(name) for mode, name in MODE_FILES.items()}
    assert set(loaded) == set(MARKERS) == {
        "no_parent_k0",
        "singleton_endpoint",
        "singleton_ordinary",
        "internal_spine_broom_endpoint",
        "internal_spine_broom_ordinary",
    }
    for mode, theorem in loaded.items():
        assert theorem["marker"] == MARKERS[mode]
        source_name = {
            "no_parent_k0": "assemble_iso_n5_g1_no_parent_k0_all_forest_root.py",
            "singleton_endpoint": "assemble_iso_n5_g1_singleton_endpoint_all_placements_root.py",
            "singleton_ordinary": "assemble_exact_iso_n5_bundle_g1_singleton_ordinary_all_forests_g1_bernstein.py",
            "internal_spine_broom_endpoint": "prove_iso_n5_g1_internal_endpoint_all_forest_root.py",
            "internal_spine_broom_ordinary": "assemble_iso_n5_g1_internal_ordinary_all_forest_root.py",
        }[mode]
        assert theorem["source_sha256"] == PINS[source_name]

    assert loaded["no_parent_k0"]["canonical_geometry"]["mode"] == "no_parent_k0"
    assert loaded["no_parent_k0"]["exact_identity"] == (
        "g1=S(C)+2*N4(C), where S=M5+3*C5"
    )

    endpoint_audit = load(
        "iso_n5_g1_internal_endpoint_all_forest_independent_audit_rank5_g2_alt_20260830.json"
    )
    assert endpoint_audit["marker"] == (
        "PASS_INDEPENDENT_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_ALL_FOREST_AUDIT_RANK5_G2_ALT"
    )
    assert endpoint_audit["audited_theorem"]["source_sha256"] == PINS[
        "prove_iso_n5_g1_internal_endpoint_all_forest_root.py"
    ]
    assert endpoint_audit["audited_theorem"]["report_sha256"] == PINS[
        "iso_n5_g1_internal_endpoint_all_forest_exact_root_20260830.json"
    ]
    assert endpoint_audit["coverage_audit"][
        "disjoint_and_exhaustive_for_all_integer_ell>=1_k>=0"
    ] is True

    assert loaded["singleton_endpoint"]["canonical_mode"]["name"] == "singleton_endpoint"
    assert loaded["singleton_endpoint"]["canonical_mode"]["orientation"].startswith(
        "Orient p=u"
    )
    assert loaded["singleton_endpoint"]["canonical_mode"]["endpoint_symmetry"][
        "g1_mark_swap_difference"
    ] == 0
    assert loaded["singleton_ordinary"]["replay"][
        "canonical_truth_table_disjoint_and_exhaustive"
    ] is True
    assert loaded["internal_spine_broom_ordinary"]["small_brooms"]["missing"] == []
    assert loaded["internal_spine_broom_ordinary"]["small_brooms"]["duplicates"] == 0
    assert loaded["internal_spine_broom_ordinary"]["large_brooms"]["missing"] == []

    coverage = {
        mode: {
            "marker": theorem["marker"],
            "source": next(
                name for name, digest in PINS.items()
                if digest == theorem["source_sha256"]
            ),
            "report": MODE_FILES[mode],
            "theorem": theorem["theorem"],
        }
        for mode, theorem in loaded.items()
    }
    assert len(coverage) == 5

    report = {
        "marker": MARKER,
        "theorem": (
            "The rank-five whole-bundle coefficient g1 is nonnegative in "
            "each of the five canonical deepest-support modes, for every "
            "finite forest and every allowed marked placement and broom parameter."
        ),
        "canonical_modes": list(MODE_FILES),
        "coverage": coverage,
        "coverage_count": len(coverage),
        "missing_modes": [],
        "duplicate_modes": 0,
        "configuration_reduction": {
            "marker": configuration["marker"],
            "status": configuration["status"]["configuration_reduction"],
            "row_reductions": configuration["canonical_row_reductions"],
        },
        "replay": {
            "all_dependency_hashes_matched": True,
            "all_five_mode_markers_matched": True,
            "internal_endpoint_independent_audit_matched": True,
            "internal_ordinary_small_large_coverage_complete": True,
        },
        "dependencies_sha256": PINS,
        "status": "exact all-order g1 theorem in all five canonical modes",
        "scope": (
            "This closes universal rank-five g1 across the exhaustive canonical "
            "mode list. It does not close the remaining g2 mode, perform the "
            "full N5 induction, prove forest independence-sequence unimodality, "
            "or resolve Erdos Problem 993 by itself."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "canonical_modes": report["canonical_modes"],
        "coverage_count": report["coverage_count"],
        "missing_modes": report["missing_modes"],
        "duplicate_modes": report["duplicate_modes"],
        "source_sha256": report["source_sha256"],
        "status": report["status"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
