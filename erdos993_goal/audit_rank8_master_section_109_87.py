#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.87."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA6_SOURCE10_COMPLETE_2026-08-20.md": "94E4021185C7617307C6EF3B1133A800734304EA37772C6D34E5E9DF656204D5",
    "assemble_rank8_exceptional_first_crossing_alpha6_s10.py": "862F047D6639FC1A8C0B00A7C42FF18B978B2D82A6DD3B0D74D55D395DC309B8",
    "rank8_exceptional_first_crossing_alpha6_s10_complete_exact_20260820.json": "3F8CB1ECCCACAB493B58BF558D21529CF2449A1FBCCECF941053462F9941698B",
    "audit_rank8_exceptional_first_crossing_alpha6_s10_assembly.py": "3CEFE46E75039F24515D28D9FC92D40C27614CAAF022C73419B9986BA84A4CB9",
    "rank8_exceptional_first_crossing_alpha6_s10_complete_audit_exact_20260820.json": "DB6AEFC73EF103E8CF119471D085BA65F2542830CCCB32052988B1FBBDC04AD1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }
    audit = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha6_s10_complete_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA6_SOURCE10_ASSEMBLY_AUDIT"
    coverage = audit["coverage"]
    assert coverage["exact_union"] == [73, 247]
    assert coverage["shard_ranges"] == [[73, 156], [157, 219], [220, 247]]
    assert coverage["gaps"] == coverage["overlaps"] == 0
    aggregate = audit["aggregate"]
    assert aggregate["independently_enumerated_multisets"] == 1_864_450
    assert aggregate["canonical_checks"] == 1_496_190
    assert aggregate["distinct_shard_product_jets_sum"] == 1_368_629
    assert aggregate["multiset_to_key_collisions"] == 368_260
    assert aggregate["key_to_product_collisions_within_shards"] == 127_561
    assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
    assert aggregate["minimum_Q8"] == 133_044_600
    assert aggregate["maximum_Q8"] == 9_698_003_143_200

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.87 The complete source-alpha-ten slice of terminal alpha six is closed"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "three consecutive fresh-process shards: `73..156`, `157..219`, and\n`220..247`",
        "raw multisets                         1,864,450",
        "canonical check keys                  1,496,190",
        "minimum Q8                           133,044,600",
        "not cross-shard global\ndeduplication",
        "closes source alpha 10 only",
        "Sources 11 through 13 are not complete",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_87",
        "immutable_inputs": actual,
        "source_alpha": 10,
        "terminal_alpha": 6,
        "terminal_type_indices": [73, 247],
        "canonical_checks": 1_496_190,
        "negative_q8": 0,
        "zero_q8": 0,
        "alpha6_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_87_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
