#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.85."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA6_S8_TYPES73_247_2026-08-20.md": "603BBD665A563E043E3773ECABB9813AEF66A939D52678ED58B8594A1228FD89",
    "probe_rank8_exceptional_first_crossing_alpha6_s8_types73_247_exact.py": "EE7107652BEBC52C6B1D7237E76F579D28D12894E510AB50ECA32AA0804560F6",
    "rank8_exceptional_first_crossing_alpha6_s8_types73_247_exact_20260820.json": "7EB4EB1FCAA4C12A86F25FE48EC210F27569FB1187A458FFB38188DD222413EA",
    "rank8_exceptional_first_crossing_alpha6_s8_types73_247_keys_exact_20260820.sqlite3": "B8FC7A8A77BCBBA1D243DBF09991B905523CAC8E492C1C63E69E624F3252070D",
    "audit_rank8_exceptional_first_crossing_alpha6_s8_types73_247.py": "C19C6453700AFFC23780A22BB6E972085C01F916816D187208FB819E3D5F25D5",
    "rank8_exceptional_first_crossing_alpha6_s8_types73_247_audit_exact_20260820.json": "98E94B82733EE2F04A978141E56F6225E8FC6DF0930DF865C0837743DFA198CB",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }
    audit = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha6_s8_types73_247_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert audit["status"] == "PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA6_S8_TYPES73_247_AUDIT"
    shard = audit["shard"]
    assert (shard["source_alpha"], shard["terminal_alpha"], shard["total_alpha"]) == (8, 6, 14)
    assert shard["independently_enumerated_multisets"] == 310_450
    assert shard["canonical_check_keys"] == 264_124
    assert shard["distinct_crossing_jets"] == 220_234
    assert shard["multiset_to_canonical_key_collisions"] == 46_326
    assert shard["canonical_key_to_product_collisions"] == 43_890
    assert shard["negative_Q8"] == shard["zero_Q8"] == 0
    assert shard["minimum_Q8"] == 9_399_272
    assert shard["maximum_Q8"] == 603_568_797_696
    assert len(shard["per_terminal_type"]) == 175
    assert shard["per_terminal_type"][0]["terminal_type_index"] == 73
    assert shard["per_terminal_type"][-1]["terminal_type_index"] == 247
    assert audit["resources"]["peak_private_bytes"] == 85_340_160

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.85 The complete source-alpha-eight slice of terminal alpha six is closed"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "every one of\nthe 175 terminal-alpha-six component types",
        "raw multisets                 310,450",
        "distinct product jets         220,234",
        "minimum Q8                   9,399,272",
        "bidirectional SQLite equality",
        "closes exactly the source-alpha-eight slice",
        "Sources 9 through 13 are\nnot certified as complete",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_85",
        "immutable_inputs": actual,
        "source_alpha": 8,
        "terminal_alpha": 6,
        "terminal_type_indices": [73, 247],
        "canonical_check_keys": 264_124,
        "distinct_product_jets": 220_234,
        "negative_q8": 0,
        "zero_q8": 0,
        "alpha6_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_85_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
