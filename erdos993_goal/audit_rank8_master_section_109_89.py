#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.89."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA6_SOURCE12_COMPLETE_2026-08-20.md": "E93FC3081196C65A733899C2120C8718550D0453B7FE37C6911434DA77ED2FF2",
    "assemble_rank8_exceptional_first_crossing_alpha6_s12.py": "5EC9AE12A0A83B8E9464B19EDF54384F2ADCAA09A17748E6637CEB1289FF7166",
    "rank8_exceptional_first_crossing_alpha6_s12_complete_exact_20260820.json": "EF1CDF5CCEC98B8707B737ADB7767C8511F9B45E685CFF7AC01C439F860CCB60",
    "audit_rank8_exceptional_first_crossing_alpha6_s12_assembly.py": "4EF495824EEFEFCDDDC3B9729EA04DAD865B89EAF831C049324166ED240A6FF2",
    "rank8_exceptional_first_crossing_alpha6_s12_complete_audit_exact_20260820.json": "B17E099ED2B879D7BA4FA556EFC7E7CC82F03DCFD2AB7245920BDE0484A1228B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }
    audit = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha6_s12_complete_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA6_SOURCE12_ASSEMBLY_AUDIT"
    coverage = audit["coverage"]
    assert coverage["exact_union"] == [73, 247]
    assert len(coverage["shard_ranges"]) == 15
    assert coverage["shard_ranges"][0] == [73, 94]
    assert coverage["shard_ranges"][-1] == [247, 247]
    assert coverage["gaps"] == coverage["overlaps"] == 0
    aggregate = audit["aggregate"]
    assert aggregate["independently_enumerated_multisets"] == 10_146_500
    assert aggregate["canonical_checks"] == 7_443_922
    assert aggregate["distinct_shard_product_jets_sum"] == 7_280_065
    assert aggregate["multiset_to_key_collisions"] == 2_702_578
    assert aggregate["key_to_product_collisions_within_shards"] == 163_857
    assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
    assert aggregate["minimum_Q8"] == 1_242_957_726
    assert aggregate["maximum_Q8"] == 99_854_115_550_464

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.89 The complete source-alpha-twelve slice of terminal alpha six is closed"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "Fifteen consecutive fresh-process shards",
        "raw multisets                         10,146,500",
        "canonical check keys                   7,443,922",
        "minimum Q8                          1,242,957,726",
        "all 45 shard report/database/audit",
        "closes source alpha 12 only",
        "Source 13 is not complete",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_89",
        "immutable_inputs": actual,
        "source_alpha": 12,
        "terminal_alpha": 6,
        "terminal_type_indices": [73, 247],
        "canonical_checks": 7_443_922,
        "negative_q8": 0,
        "zero_q8": 0,
        "alpha6_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_89_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
