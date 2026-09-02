#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.96."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA7_SOURCE9_COMPLETE_2026-08-20.md": "0C55A359F00B329FC5A3C521888238589E9B945288FE9F37F38CDBADC1DAF9F8",
    "assemble_rank8_exceptional_first_crossing_alpha7_s9.py": "7D3735FF04F4063A6C02E5DBF7CD373CFD144FC250004964C371515A12EF3351",
    "rank8_exceptional_first_crossing_alpha7_s9_complete_exact_20260820.json": "61C3A98C6486A0D3CCD9F28C0FC6C935851FD4463A23C74CD7B4A184D137276B",
    "audit_rank8_exceptional_first_crossing_alpha7_s9_assembly.py": "801DD884B862966FC88018059DF05535A1FFC6E30B99110F88E99C82CDDB7136",
    "rank8_exceptional_first_crossing_alpha7_s9_complete_audit_exact_20260820.json": "D8671293CD872F676BD3DFA36B8BFB628D4B6B61747493016342F49C5C9DE414",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }
    report = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha7_s9_complete_exact_20260820.json").read_text(encoding="utf-8"))
    audit = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha7_s9_complete_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCE9_COMPLETE"
    assert audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCE9_ASSEMBLY_AUDIT"
    assert audit["coverage"]["source_alpha"] == 9
    assert audit["coverage"]["terminal_alpha"] == 7
    assert audit["coverage"]["terminal_type_indices"] == [248, 947]
    assert audit["coverage"]["terminal_type_count"] == 700
    assert audit["coverage"]["gaps"] == audit["coverage"]["overlaps"] == 0
    aggregate = audit["aggregate"]
    assert aggregate["independently_enumerated_multisets"] == 5_032_650
    assert aggregate["canonical_check_keys"] == 4_137_272
    assert aggregate["distinct_shard_product_jets_sum"] == 4_023_777
    assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
    assert aggregate["minimum_Q8"] == 134_309_004
    assert aggregate["maximum_Q8"] == 9_241_161_551_766

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.96 Terminal-alpha-seven first crossings are closed at source alpha nine"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "raw-fiber formula is `5,437+5L`",
        "independently enumerated raw multisets      5,032,650",
        "canonical check keys                       4,137,272",
        "negative Q8                                        0",
        "zero Q8                                            0",
        "This closes only source alpha nine of terminal alpha seven",
        "Sources alpha ten\nthrough thirteen",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_96",
        "immutable_inputs": actual,
        "terminal_alpha": 7,
        "terminal_type_indices": [248, 947],
        "certified_source_alphas": [9],
        "raw_multisets": 5_032_650,
        "canonical_checks": 4_137_272,
        "negative_q8": 0,
        "zero_q8": 0,
        "terminal_alpha7_complete": False,
        "exceptional_first_crossing_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_96_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
