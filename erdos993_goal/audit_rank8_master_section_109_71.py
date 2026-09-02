#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.71."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "verify_rank8_delta013_all_root_path_faces.py":
        "33E1119097FA0FCFA572E600504F518E9C2003CBBBF101EFA19DD6FA0BF4E245",
    "rank8_delta013_all_root_path_faces_exact_20260820.json":
        "951CF842CEA1B6D6E6AED3D1EC940F582F489B53532899A1E7C3BF15A2118349",
    "audit_rank8_delta013_all_root_path_faces.py":
        "BF2AFE9DD2898CF4A33581148148D7B57E86F1879F0ADD17BAA51352271BE77B",
    "rank8_delta013_all_root_path_faces_independent_audit_20260820.json":
        "70F909F13A6E9510BC6F62860056C9C203D737F5099CDC487C9D1CF6B1F6F5FA",
    "RANK8_PATH_FACES_AND_E1_LITERAL_COUPLING_2026-08-20.md":
        "FDF246F4835C9EAD1986F37660D8E60181F99B27E53E09231CF8C6F3F4BAA6AA",
    "rank8_delta2_path_forcing_and_face_exact_20260820.json":
        "CDAC219760F73C37C7897B8564A28F0D5C473F294127B1E0ADDF742F5C340865",
    "rank8_delta2_path_forcing_and_face_independent_audit_exact_20260820.json":
        "5AC6C802B94D02B9EC69F7318804CDA2953E3CD4CB09B197C5EAF1B78AFFAD55",
    "assemble_rank8_connected_q8_integration_readonly.py":
        "05D9D26A8DA9D5B96210833C607CC45DC312D7AE6E1A1AFE16E9D52EA17087DE",
    "rank8_connected_q8_integration_readonly_20260820.json":
        "2DCC45BB2522C4F914F38FAE548C4E7EB9EA8905B41D09AE3138BA8C4F2029D0",
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

    theorem = load("rank8_delta013_all_root_path_faces_exact_20260820.json")
    audit = load("rank8_delta013_all_root_path_faces_independent_audit_20260820.json")
    d2 = load("rank8_delta2_path_forcing_and_face_exact_20260820.json")
    d2_audit = load("rank8_delta2_path_forcing_and_face_independent_audit_exact_20260820.json")
    integration = load("rank8_connected_q8_integration_readonly_20260820.json")

    assert theorem["status"] == "PASS_EXACT_RANK8_DELTA013_ALL_ROOT_PATH_FACES_N_GE_23"
    assert audit["status"] == "PASS_INDEPENDENT_EXACT_RANK8_DELTA013_PATH_FACE_AUDIT"
    assert audit["audited_source_sha256"] == EXPECTED["verify_rank8_delta013_all_root_path_faces.py"]
    assert audit["audited_report_sha256"] == EXPECTED["rank8_delta013_all_root_path_faces_exact_20260820.json"]
    assert set(theorem["Delta_results"]) == {"0", "1", "3"}
    for rank, row in theorem["Delta_results"].items():
        assert len(row["boundary_root_cases"]) == 6, rank
        assert len(row["interior_small_L_rows"]) == 5, rank
        assert all(int(item["L"]) == index for index, item in enumerate(row["interior_small_L_rows"]))
        assert all(item["n"] == "D+23" for item in row["interior_small_L_rows"])
        assert all(item["d"] == f"D+{10 - 2 * index}" for index, item in enumerate(row["interior_small_L_rows"]))
        assert all(Fraction(item["minimum_coefficient"]) > 0 for item in row["boundary_root_cases"])
        assert all(Fraction(item["minimum_coefficient"]) > 0 for item in row["interior_small_L_rows"])
        assert Fraction(row["interior_bulk_minimum_coefficient"]) > 0

    assert d2["status"] == "PASS_EXACT_RANK8_DELTA2_PATH_FACE_AND_DEGREE_SURPLUS_SPLIT"
    assert d2_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_PATH_FACE"
    assert integration["status"] == "PENDING_EXACT_RANK8_CONNECTED_Q8_INTEGRATION_DELTA0_3_N23_PLUS"
    assert integration["literal_path_family_closed_pending_ranks"] == [0, 1, 2, 3]
    assert integration["connected_Q8_complete"] is False

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.71 The path face is closed for all four remaining rank-eight coefficients"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        if name.startswith("assemble_") or name.startswith("rank8_connected_q8_integration"):
            continue
        assert name in section and digest in section, name
    assert "not yet an all-order theorem for subdivided claws" in section
    assert "Problem 993 remain open" in section

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_71",
        "immutable_inputs": actual,
        "path_ranks_closed": [0, 1, 2, 3],
        "scope": "all roots of P_n for n>=23 only",
        "connected_Q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_71_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
