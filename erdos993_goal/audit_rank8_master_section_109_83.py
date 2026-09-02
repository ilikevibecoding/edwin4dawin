#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.83."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_5_CUMULATIVE_2026-08-20.md":
        "7CF5FC31EEA0E1AFE7295729DFEE47EF11F53AB36D88A9F8304AF7F353E80CE5",
    "assemble_rank8_exceptional_first_crossing_alpha1_5.py":
        "DA3DF4C794E803544C7FC2A0E8FB87F460A3A67B805ED599DB2A26CF4F5E3213",
    "rank8_exceptional_first_crossing_alpha1_5_cumulative_exact_20260820.json":
        "13D2FEF2B889A8F85FDB7A2D8F38CDE7E0B9DA9A0C5C9EA249E632845E264EE7",
    "audit_rank8_exceptional_first_crossing_alpha1_5.py":
        "6243F1966D145BEE7685BF3D979A77026DBCFD58937DF5438CF90065975C647C",
    "rank8_exceptional_first_crossing_alpha1_5_cumulative_audit_exact_20260820.json":
        "95A777D45DB195DE88B0F6D6AD93DB35618F873093EF00E35197FBBD56452261",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED
        if EXPECTED[name] != actual[name]
    }
    report = json.loads(
        (ROOT / "rank8_exceptional_first_crossing_alpha1_5_cumulative_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    audit = json.loads(
        (ROOT / "rank8_exceptional_first_crossing_alpha1_5_cumulative_audit_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert report["status"] == "PASS_FAIL_CLOSED_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_5"
    assert audit["status"] == "PASS_INDEPENDENT_FAIL_CLOSED_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_5_AUDIT"
    assert report["coverage"]["terminal_alpha_range"] == [1, 5]
    assert report["coverage"]["terminal_component_type_indices"] == [1, 72]
    assert report["coverage"]["missing_cells"] == []
    assert report["coverage"]["duplicate_cells"] == []
    aggregate = report["aggregate"]
    assert aggregate == audit["aggregate"]
    assert aggregate["terminal_bands"] == 5
    assert aggregate["source_cells"] == 15
    assert aggregate["independently_enumerated_multisets"] == 3_688_718
    assert aggregate["canonical_check_keys"] == 2_747_704
    assert aggregate["distinct_cell_crossing_jets_sum"] == 2_141_645
    assert aggregate["multiset_to_canonical_key_collisions"] == 941_014
    assert aggregate["canonical_key_to_product_collisions"] == 606_059
    assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
    assert aggregate["minimum_Q8"] == 9_324_000
    assert aggregate["maximum_Q8"] == 105_099_639_472_256

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.83 Exceptional-only first crossings are closed through terminal alpha five"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "exact triangular set of 15 source cells",
        "independently enumerated multisets     3,688,718",
        "distinct cell product jets             2,141,645",
        "negative Q8                                    0",
        "Every canonical check is strictly positive",
        "Terminal alpha six\nthrough nine remain",
        "not prove full forest `Q8`",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_83",
        "immutable_inputs": actual,
        "terminal_alpha_range": [1, 5],
        "source_cells": 15,
        "distinct_cell_product_jets": 2_141_645,
        "negative_q8": 0,
        "zero_q8": 0,
        "exceptional_first_crossing_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_83_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
