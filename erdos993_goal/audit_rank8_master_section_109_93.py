#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.93."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA7_DESIGN_AND_SOURCE7_COMPLETE_2026-08-20.md": "85008A97EEA74958D899FA1ED202C2B5052C3EA4446B41039F0C6035CAD4A241",
    "design_rank8_exceptional_first_crossing_alpha7_streaming.py": "007E84C46F72599B1A156B8210C4A16AADE720E0A20D3086FD9DAAA4C446D7CB",
    "rank8_exceptional_first_crossing_alpha7_streaming_design_exact_20260820.json": "CA16EB78BA65408898E59B26A79BE344BD7F9D7065C3B9C8F88E2496BC888D6D",
    "audit_rank8_exceptional_first_crossing_alpha7_streaming_design.py": "BA300AB0734FA787BF7C9E12D8CD9F097E41F42F68074910B12BB6882A44BC3F",
    "rank8_exceptional_first_crossing_alpha7_streaming_design_audit_exact_20260820.json": "8EE329584C104E03AF5B47BBCDA33D80EC40C05708AF09C9AA0FEC7FFAE9690E",
    "assemble_rank8_exceptional_first_crossing_alpha7_s7.py": "7CBAC4F954B03004E40C5FCAD76CFB327E8F391879CD778289083B8F3C76A37C",
    "rank8_exceptional_first_crossing_alpha7_s7_complete_exact_20260820.json": "F52C5D43EC8AFF07F673DFAC5B5EF07BD2ABA912BBDA0091FE7CA12FFDB27BB1",
    "audit_rank8_exceptional_first_crossing_alpha7_s7_assembly.py": "3ACC4728B30A375B13DFBA5B79CBFEDEB1109E239FA09BB0A51581883130D265",
    "rank8_exceptional_first_crossing_alpha7_s7_complete_audit_exact_20260820.json": "0F5E1C486DC05979019C0E3822EE1EC567DE21238AC9CB5B75B186EA18CF45F6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }
    design = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_audit_exact_20260820.json").read_text(encoding="utf-8"))
    source7 = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha7_s7_complete_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert design["status"] == "PASS_INDEPENDENT_EXACT_NO_GAP_RESOURCE_DESIGN_AUDIT_RANK8_ALPHA7"
    assert design["coverage"]["source_alpha_range"] == [7, 13]
    assert design["coverage"]["terminal_type_indices"] == [248, 947]
    assert design["coverage"]["raw_crossings_total"] == 391_576_500
    assert design["coverage"]["shards_total"] == 909
    assert design["coverage"]["gaps"] == design["coverage"]["overlaps"] == 0
    assert design["resources"]["maximum_shard_raw_multisets"] == 549_963
    assert design["resources"]["maximum_projected_peak_private_bytes"] < design["resources"]["abort_limit_private_bytes"]
    assert design["products_enumerated"] == 0
    assert source7["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCE7_ASSEMBLY_AUDIT"
    assert source7["coverage"]["source_alpha"] == source7["coverage"]["terminal_alpha"] == 7
    assert source7["coverage"]["terminal_type_indices"] == [248, 947]
    assert source7["coverage"]["terminal_type_count"] == 700
    assert source7["coverage"]["gaps"] == source7["coverage"]["overlaps"] == 0
    aggregate = source7["aggregate"]
    assert aggregate["independently_enumerated_multisets"] == 892_850
    assert aggregate["canonical_check_keys"] == 787_850
    assert aggregate["distinct_shard_product_jets_sum"] == 713_853
    assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
    assert aggregate["minimum_Q8"] == 9_630_126
    assert aggregate["maximum_Q8"] == 573_590_474_474

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.93 Terminal-alpha-seven first crossings are closed at source alpha seven"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "exact raw-fiber formula is `c_s + L*c_(s-7)`",
        "391,576,500 raw crossings",
        "terminal type union                     248..947",
        "canonical check keys                     787,850",
        "negative Q8                                    0",
        "zero Q8                                        0",
        "This closes only source alpha seven of terminal alpha seven",
        "Sources alpha\neight through thirteen",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_93",
        "immutable_inputs": actual,
        "terminal_alpha": 7,
        "terminal_type_indices": [248, 947],
        "designed_source_alpha_range": [7, 13],
        "designed_shards": 909,
        "certified_source_alphas": [7],
        "source7_raw_multisets": 892_850,
        "source7_canonical_checks": 787_850,
        "negative_q8": 0,
        "zero_q8": 0,
        "terminal_alpha7_complete": False,
        "exceptional_first_crossing_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_93_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
