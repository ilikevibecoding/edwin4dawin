#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.102."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA7_SOURCE11_COMPLETE_2026-08-20.md": "DF15ECBCE9F44DBD9B338E9DD612B29BA9EA018D574C17A50FF72D6A34B9D42D",
    "assemble_rank8_exceptional_first_crossing_alpha7_s11.py": "4D7A48145E94EA8BEB80B717B9B56E287F34A183306D25A93D24690F75E3DB48",
    "rank8_exceptional_first_crossing_alpha7_s11_complete_exact_20260820.json": "6814360C7FE17ABA30E5C22AD56189BF6999C6DC85DCB32A29579A79D43AC9A1",
    "audit_rank8_exceptional_first_crossing_alpha7_s11_assembly.py": "EE06118C1FBDF63A1E7875ACCD0123A6A7B0DB9ADBB388F4BE5159B37D199EE5",
    "rank8_exceptional_first_crossing_alpha7_s11_complete_audit_exact_20260820.json": "CD2FDF2AEC62F398B0440464F29996D5BC054660138DD7684BAA504633972DD8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }

    assembly = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha7_s11_complete_exact_20260820.json").read_text(encoding="utf-8"))
    audit = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha7_s11_complete_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert assembly["status"] == "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCE11_COMPLETE"
    assert audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCE11_ASSEMBLY_AUDIT"

    coverage = assembly["coverage"]
    assert coverage["source_alpha"] == 11
    assert coverage["terminal_alpha"] == 7
    assert coverage["total_alpha"] == 18
    assert coverage["terminal_type_indices"] == [248, 947]
    assert coverage["terminal_type_count"] == 700
    assert len(coverage["shard_ranges"]) == 67
    assert coverage["gaps"] == coverage["overlaps"] == 0

    aggregate = assembly["aggregate"]
    expected_aggregate = {
        "independently_enumerated_multisets": 34_823_950,
        "canonical_check_keys": 27_151_746,
        "distinct_shard_product_jets_sum": 26_828_969,
        "multiset_to_canonical_key_compression": 7_672_204,
        "canonical_key_to_product_compression_within_shards": 322_777,
        "negative_Q8": 0,
        "zero_Q8": 0,
        "minimum_Q8": 1_258_476_120,
        "maximum_Q8": 95_565_156_849_954,
    }
    assert aggregate == expected_aggregate
    assert audit["coverage"] == {
        "gaps": 0,
        "overlaps": 0,
        "shards": 67,
        "source_alpha": 11,
        "terminal_alpha": 7,
        "terminal_type_count": 700,
        "terminal_type_indices": [248, 947],
    }
    assert audit["aggregate"] == expected_aggregate

    resources = assembly["resources"]
    assert resources["workers"] == 1
    assert resources["maximum_producer_peak_private_bytes"] < resources["abort_limit_private_bytes"]
    assert resources["maximum_audit_peak_private_bytes"] < resources["abort_limit_private_bytes"]

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.102 Terminal-alpha-seven first crossings are closed at source alpha eleven"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "index 248 through\n947",
        "total alpha\n18 with literal `Q8>0`",
        "36,079+39L",
        "fresh producer shards and sixty-seven independent",
        "independently enumerated raw multisets     34,823,950",
        "canonical check keys                      27,151,746",
        "negative Q8                                        0",
        "zero Q8                                            0",
        "Sources alpha\ntwelve and thirteen",
        "full forest `Q8`",
        "Problem 993\nremain open",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_102",
        "immutable_inputs": actual,
        "source_alpha": 11,
        "terminal_alpha": 7,
        "total_alpha": 18,
        "terminal_type_indices": [248, 947],
        "terminal_type_count": 700,
        "shards": 67,
        "raw_multisets": 34_823_950,
        "canonical_checks": 27_151_746,
        "negative_Q8": 0,
        "zero_Q8": 0,
        "strict_positivity": True,
        "source_alpha_12_13_complete": False,
        "connected_q8_complete": False,
        "forest_q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_102_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
