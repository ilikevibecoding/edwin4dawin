#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.111."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_LOW_LOW_FULL_EARLY_SUFFIX4_THEOREM_2026-08-22.md": "50326529668DD6099FB3E7E356EF06ED4BF82256F2AAF81E595532731EDFD118",
    "probe_rank8_low_low_full_early_suffix4_a4_b4_cell_flint.py": "D116602901A39024D304148BD1474CCF702FB325AC7BC2E9BDE1BD37515EE986",
    "verify_rank8_low_low_full_early_suffix4_a4_b4_cells.py": "080EAFAE4D8B325C037F4ADE447DA496AFDF9E06D5D5625CB12111024B8181DD",
    "rank8_low_low_full_early_suffix4_a4_b4_cells_exact_20260821.json": "7FE98FC820FFBEC01289AFDB7AE86913528D5C4E2DD90F3DEDD4B9F72803CA7E",
    "audit_rank8_low_low_full_early_suffix4_cells.py": "41AC5E5F56999BF7BD676AA00D673812FDF5E4C00F9FE5AFE80622CE049DC44F",
    "rank8_low_low_full_early_suffix4_audit_20260822.json": "BA51DD8EDDA7A7D0D6425A6C795BA18C1542F350AB4F1376A7EA38419BA73F78",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(
        (ROOT / "rank8_low_low_full_early_suffix4_a4_b4_cells_exact_20260821.json")
        .read_text(encoding="utf-8")
    )
    independent = json.loads(
        (ROOT / "rank8_low_low_full_early_suffix4_audit_20260822.json")
        .read_text(encoding="utf-8")
    )
    assert primary["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX4_CELLS"
    assert independent["status"] == "PASS_INDEPENDENT_STRUCTURAL_MASK_SAMPLE_AUDIT_SUFFIX4"
    assert primary["ordered_cells"] == independent["grid_cells"] == 132
    assert independent["non_origin_exact_coefficients"] == 84415365
    assert [primary["aggregates"][label]["minimum"] for label in (
        "curvature_middle_times_4", "curvature_far",
        "strong_middle_times_4", "strong_far",
    )] == [4, 1, 4, 1]
    assert all(row["negative"] == 0 for row in primary["aggregates"].values())

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.111 The full-early/suffix-4 low/low face is closed"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "a3=a5=b3=b5=0",
        "12*11=132",
        "84,415,365 exact coefficients",
        "zero negatives",
        "row minima `4,1,4,1`",
        "simultaneous\n`(a4,b4,a5,b5)` interaction",
        "Problem 993 remain open",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_111",
        "immutable_inputs": actual,
        "grid_cells": 132,
        "non_origin_exact_coefficients": 84415365,
        "negative_coefficients": 0,
        "row_minima": [4, 1, 4, 1],
        "full_low_low_complete": False,
        "remaining_join": "simultaneous a4,b4,a5,b5 then suffix index 3",
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_111_publication_audit_20260822.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
