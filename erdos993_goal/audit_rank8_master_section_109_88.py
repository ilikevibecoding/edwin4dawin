#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.88."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA6_SOURCE11_COMPLETE_2026-08-20.md": "0F9E9F80154D765CA947B2520F6D6C7113FBDD13AEF54FAB45649152E716A56E",
    "assemble_rank8_exceptional_first_crossing_alpha6_s11.py": "89A9E19CF9D4B8ED4CEE7990B9D23719D0772F8354F96CEABFDC1FD9F26525EE",
    "rank8_exceptional_first_crossing_alpha6_s11_complete_exact_20260820.json": "6E7EA517686D368427F150A7C120E641213E90E421F534EB302D54BA93B5EED6",
    "audit_rank8_exceptional_first_crossing_alpha6_s11_assembly.py": "B10B9F02D753FB10EE69BB9FFF47926321964792A36A9878523BF0F7D5FF9382",
    "rank8_exceptional_first_crossing_alpha6_s11_complete_audit_exact_20260820.json": "3DD34F9B0E2CB3C2A4D06AAC20D5D180DB0E1D82A5C7B0F3C34256E9E5A03F14",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }
    audit = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha6_s11_complete_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA6_SOURCE11_ASSEMBLY_AUDIT"
    coverage = audit["coverage"]
    assert coverage["exact_union"] == [73, 247]
    assert coverage["shard_ranges"] == [[73, 115], [116, 149], [150, 177], [178, 202], [203, 225], [226, 246], [247, 247]]
    assert coverage["gaps"] == coverage["overlaps"] == 0
    aggregate = audit["aggregate"]
    assert aggregate["independently_enumerated_multisets"] == 4_441_150
    assert aggregate["canonical_checks"] == 3_414_804
    assert aggregate["distinct_shard_product_jets_sum"] == 3_279_910
    assert aggregate["multiset_to_key_collisions"] == 1_026_346
    assert aggregate["key_to_product_collisions_within_shards"] == 134_894
    assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
    assert aggregate["minimum_Q8"] == 430_703_190
    assert aggregate["maximum_Q8"] == 32_598_866_127_960

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.88 The complete source-alpha-eleven slice of terminal alpha six is closed"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "Seven consecutive fresh-process shards",
        "raw multisets                         4,441,150",
        "canonical check keys                  3,414,804",
        "minimum Q8                           430,703,190",
        "no gap or overlap",
        "closes source alpha 11 only",
        "Sources 12 and 13 are not complete",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_88",
        "immutable_inputs": actual,
        "source_alpha": 11,
        "terminal_alpha": 6,
        "terminal_type_indices": [73, 247],
        "canonical_checks": 3_414_804,
        "negative_q8": 0,
        "zero_q8": 0,
        "alpha6_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_88_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
