#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.95."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA7_SOURCE8_COMPLETE_2026-08-20.md": "C97AEA776BF63343CE96F8EF0E643833868A092C6D5C881BFC416B572A348B59",
    "assemble_rank8_exceptional_first_crossing_alpha7_s8.py": "A3026551EDD8FFA3A805B99A0AD11AC469073671E80F8433F34C76748212116B",
    "rank8_exceptional_first_crossing_alpha7_s8_complete_exact_20260820.json": "4E5617FEF56238ACCAF48732D1BCC4BD13E2F8B3CCA116AA220CA601C4469E65",
    "audit_rank8_exceptional_first_crossing_alpha7_s8_assembly.py": "55D94ECF998D26150D0A9ADDB1FC82AA794C685319A53E88FE08263B622ED425",
    "rank8_exceptional_first_crossing_alpha7_s8_complete_audit_exact_20260820.json": "4CC095606ACB3F127D9D121FA0B522EAA1F588F428AF01DECC044786CFB2B4BC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }
    report = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha7_s8_complete_exact_20260820.json").read_text(encoding="utf-8"))
    audit = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha7_s8_complete_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCE8_COMPLETE"
    assert audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCE8_ASSEMBLY_AUDIT"
    assert audit["coverage"]["source_alpha"] == 8
    assert audit["coverage"]["terminal_alpha"] == 7
    assert audit["coverage"]["terminal_type_indices"] == [248, 947]
    assert audit["coverage"]["terminal_type_count"] == 700
    assert audit["coverage"]["gaps"] == audit["coverage"]["overlaps"] == 0
    aggregate = audit["aggregate"]
    assert aggregate["independently_enumerated_multisets"] == 2_037_000
    assert aggregate["canonical_check_keys"] == 1_684_101
    assert aggregate["distinct_shard_product_jets_sum"] == 1_587_475
    assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
    assert aggregate["minimum_Q8"] == 38_223_353
    assert aggregate["maximum_Q8"] == 2_458_842_500_208

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.95 Terminal-alpha-seven first crossings are closed at source alpha eight"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "exact raw-fiber formula is `2,209+2L`",
        "independently enumerated raw multisets      2,037,000",
        "canonical check keys                       1,684,101",
        "negative Q8                                        0",
        "zero Q8                                            0",
        "This closes only source alpha eight of terminal alpha seven",
        "Sources alpha\nnine through thirteen",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_95",
        "immutable_inputs": actual,
        "terminal_alpha": 7,
        "terminal_type_indices": [248, 947],
        "certified_source_alphas": [8],
        "raw_multisets": 2_037_000,
        "canonical_checks": 1_684_101,
        "negative_q8": 0,
        "zero_q8": 0,
        "terminal_alpha7_complete": False,
        "exceptional_first_crossing_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_95_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
