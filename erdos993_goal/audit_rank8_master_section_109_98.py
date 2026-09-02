#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.98."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA7_SOURCE10_COMPLETE_2026-08-20.md": "4DD8BB4B4D0A0F23CC97A923F8E9322E92A7A385FEA633D83F2BD31634B59EB7",
    "assemble_rank8_exceptional_first_crossing_alpha7_s10.py": "2E2F50D07744EF4E1300160746DA8879310A47081D77C1FE569FEEB6777D5456",
    "rank8_exceptional_first_crossing_alpha7_s10_complete_exact_20260820.json": "20AE9E9D9C68AA33B3FB890BDDDF0897B0EBA89ACB4A33950C7AFC09EB17D444",
    "audit_rank8_exceptional_first_crossing_alpha7_s10_assembly.py": "4BBC86759A79FE7141002D0E0FECD0C7A1D29603BE2C239E1F98F6E7722C5F49",
    "rank8_exceptional_first_crossing_alpha7_s10_complete_audit_exact_20260820.json": "AC6B079B1BF0F26909A1822FC1E172675A6112AB421E3F599D93D6034483968A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }
    report = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha7_s10_complete_exact_20260820.json").read_text(encoding="utf-8"))
    audit = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha7_s10_complete_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCE10_COMPLETE"
    assert audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCE10_ASSEMBLY_AUDIT"
    assert audit["coverage"]["source_alpha"] == 10
    assert audit["coverage"]["terminal_alpha"] == 7
    assert audit["coverage"]["terminal_type_indices"] == [248, 947]
    assert audit["coverage"]["terminal_type_count"] == 700
    assert audit["coverage"]["shards"] == 25
    assert audit["coverage"]["gaps"] == audit["coverage"]["overlaps"] == 0
    aggregate = audit["aggregate"]
    assert aggregate["independently_enumerated_multisets"] == 13_022_450
    assert aggregate["canonical_check_keys"] == 10_466_184
    assert aggregate["distinct_shard_product_jets_sum"] == 10_294_042
    assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
    assert aggregate["minimum_Q8"] == 429_455_000
    assert aggregate["maximum_Q8"] == 31_127_566_208_700

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.98 Terminal-alpha-seven first crossings are closed at source alpha ten"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "raw-fiber formula is `14,047+13L`",
        "independently enumerated raw multisets     13,022,450",
        "canonical check keys                      10,466,184",
        "negative Q8                                        0",
        "zero Q8                                            0",
        "This closes only source alpha ten of terminal alpha seven",
        "Sources alpha\neleven through thirteen",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_98",
        "immutable_inputs": actual,
        "terminal_alpha": 7,
        "terminal_type_indices": [248, 947],
        "certified_source_alphas": [10],
        "shards": 25,
        "raw_multisets": 13_022_450,
        "canonical_checks": 10_466_184,
        "negative_q8": 0,
        "zero_q8": 0,
        "terminal_alpha7_complete": False,
        "exceptional_first_crossing_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_98_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
