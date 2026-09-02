#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.81."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIXED_FULL_COMPLETE_2026-08-20.md":
        "CCDC53E5EACC48D1D51100BAC19D6CA39F6D808530BBD1B2EE4D173EDCEE0B4C",
    "rank8_exceptional_tree_jets_exact_20260820.tsv":
        "B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A",
    "rank8_exceptional_tree_jets_exact_20260820.json":
        "BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4",
    "verify_rank8_exceptional_fixed_full.py":
        "6777296E01B957F426284B6F2C488ED8005030F1C8C14837DE028B35D1AF48BE",
    "assemble_rank8_exceptional_fixed_alpha9.py":
        "9ED7E07800CFFE1FCFB6AAC4E3EF1269EC35A61F1975DF575558BCC636B11B94",
    "rank8_exceptional_fixed_alpha9_independent_assembly_exact_20260820.json":
        "BB363406FFD84C24F325A388CA80D6077E2A349FAAF280D297465DC8F2C200C9",
    "audit_rank8_exceptional_fixed_alpha9_assembly.py":
        "B46DF6E1F233162BAD5767D28CED11CE3624A66C1E3DE273D363A6CC489B458D",
    "rank8_exceptional_fixed_alpha9_independent_audit_exact_20260820.json":
        "9E4D2B04061656A61BC6FB5224018DA8FB93AF7574A20DD8FF7EDF348B5A4249",
    "assemble_rank8_exceptional_fixed_complete.py":
        "DE38A44E859E742CC33DE7A6D1A486473B2517F8E6B312C111DF060569F1C89C",
    "rank8_exceptional_fixed_complete_independent_assembly_exact_20260820.json":
        "8AF12AD943826514C5385E9B3C292CB5F1B8EEBDCB45CDEFE466039C4FCCA1D7",
    "audit_rank8_exceptional_fixed_complete_assembly.py":
        "8ED3D2969DBC831B18F8E0AC62674835B7587C10C537E4D7170D698491016437",
    "rank8_exceptional_fixed_complete_independent_audit_exact_20260820.json":
        "7D1413892381A9E888884AAFC57FB8A12C68A7CFB0762206EF3C9B0D251703D2",
    "audit_rank8_forest_lift_fixed_complete.py":
        "77D7F237792BF82458885CB58F1D738129A6CDDE1A37275E219442DCE2407BCE",
    "rank8_forest_lift_fixed_full_complete_integration_exact_20260820.json":
        "591A2793682BF79D0E1241258DB1F0F385B94219577FDFC00C3705DA3FA6E2EF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED
        if EXPECTED[name] != actual[name]
    }
    assembly = load("rank8_exceptional_fixed_complete_independent_assembly_exact_20260820.json")
    audit = load("rank8_exceptional_fixed_complete_independent_audit_exact_20260820.json")
    integration = load("rank8_forest_lift_fixed_full_complete_integration_exact_20260820.json")
    assert "PASS" in assembly["status"] and "COMPLETE" in assembly["status"]
    assert audit["status"] == "PASS_INDEPENDENT_EXACT_NO_GAP_RANK8_EXCEPTIONAL_FIXED_FULL_DATABASE_COMPLETE"
    assert audit["coverage"]["database_indices"] == [1, 1215]
    assert audit["coverage"]["unique_exceptional_jets"] == 1215
    assert audit["coverage"]["negative_fixed_Q8_jets"] == 268
    assert audit["coverage"]["no_gaps_or_duplicates"] is True
    assert audit["totals"] == {
        "fixed_cone_cases": 2430,
        "maximum_peak_private_bytes": 223068160,
        "minimum_coefficient": 1,
        "negative_coefficients": 0,
        "symbolic_terms": 2648337930,
    }
    obligation = integration["fixed_full_obligation"]
    assert obligation["status"] == "COMPLETE"
    assert obligation["remaining_fixed_full_jets"] == 0
    assert obligation["database_indices"] == [1, 1215]

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.81 The exceptional fixed/full forest-lift obligation is complete"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "exactly 1,215 distinct",
        "remaining 268 alpha-eight/nine jets",
        "2,648,337,930",
        "zero\nnegative symbolic coefficients",
        "removed completely from the forest-lift obligation",
        "This completes only fixed/full preservation",
        "not a complete forest theorem",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_81",
        "immutable_inputs": actual,
        "exceptional_jets": 1215,
        "fixed_cone_cases": 2430,
        "symbolic_terms": 2_648_337_930,
        "negative_coefficients": 0,
        "fixed_full_obligation_complete": True,
        "forest_lift_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_81_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
