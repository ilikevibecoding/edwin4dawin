#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.84."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA6_STREAMING_DESIGN_AND_TYPE247_PILOT_2026-08-20.md": "2F6F9155B449B6A8C5DD5C6823CA48E941114E9FFFA18B79710224BDFE81D545",
    "design_rank8_exceptional_first_crossing_alpha6_streaming.py": "A7AF9F397AECFC209500E4737E1A16FF9E59A2049308EE6747E6A6D095A82B38",
    "rank8_exceptional_first_crossing_alpha6_streaming_design_exact_20260820.json": "4986E672D8CC853957C11E45D339DEE54D835E2AB1CD25A916A3695AD71BA06D",
    "audit_rank8_exceptional_first_crossing_alpha6_streaming_design.py": "A11217D46406070BB3DD63FBFE66858FE81F7DD8B9929E02D71E0DB11783FFBD",
    "rank8_exceptional_first_crossing_alpha6_streaming_design_audit_exact_20260820.json": "E97994C367F88272652BE3BF507C9A758E2E4C6FCAB4E05D5BD357CAFC146DCC",
    "probe_rank8_exceptional_first_crossing_alpha6_s13_type247_exact.py": "3FE33B1C881F44166B374020621CF03B980B71BFB3981081378F52793BB7D748",
    "rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_exact_20260820.json": "FE07EFB377CA8C29916256C69312D1D2ECFE3E166532E9C472CD2CF180C3BB8F",
    "rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_keys_exact_20260820.sqlite3": "977899C986821067940BE2CAD62E443E7293D12C4AD5D3B8D7A94B0307EFD045",
    "audit_rank8_exceptional_first_crossing_alpha6_s13_type247.py": "295A7FA41BC5D9C1F9F8A4D1AFD52E2685ACB38D4FE6973359D08C6034219325",
    "rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_audit_exact_20260820.json": "7314319877C2E5C6C94F72F9B4F27237E25A71AD72ED8A94A06E226044AC0180",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }
    design = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha6_streaming_design_audit_exact_20260820.json").read_text(encoding="utf-8"))
    pilot = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert design["status"] == "PASS_INDEPENDENT_EXACT_RANK8_ALPHA6_STREAMING_DESIGN_AUDIT_NO_PRODUCTS"
    assert design["products_enumerated"] == 0
    assert design["raw_crossings_total"] == 39_319_350
    assert design["audit_shards_total"] == 61
    assert design["maximum_shard_raw_multisets"] == 748_113
    assert design["maximum_projected_audit_shard_private_bytes"] == 399_710_078
    assert pilot["status"] == "PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA6_S13_TYPE247_PILOT_AUDIT"
    cell = pilot["cell"]
    assert (cell["source_alpha"], cell["terminal_alpha"], cell["terminal_type_index"], cell["total_alpha"]) == (13, 6, 247, 19)
    assert cell["independently_enumerated_multisets"] == 195_031
    assert cell["canonical_check_keys"] == cell["distinct_crossing_jets"] == 130_341
    assert cell["negative_Q8"] == cell["zero_Q8"] == 0
    assert cell["minimum_Q8"] == 168_568_018_762
    assert cell["maximum_Q8"] == 282_462_928_635_888
    assert pilot["resources"]["peak_private_bytes"] == 69_763_072

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.84 The alpha-six first-crossing route is resource-bounded and its worst terminal type passes"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "source-alpha-13 cell alone has 21,803,250 raw multisets",
        "partitions the 39,319,350 raw crossings",
        "enumerates zero products and proves no alpha-six sign by itself",
        "canonical keys/products       130,341 / 130,341",
        "minimum Q8             168,568,018,762",
        "Only this one alpha-six terminal type is certified",
        "other 174 alpha-six\ntypes",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_84",
        "immutable_inputs": actual,
        "design_products_enumerated": 0,
        "design_shards": 61,
        "pilot_source_alpha": 13,
        "pilot_terminal_alpha": 6,
        "pilot_terminal_type_index": 247,
        "pilot_negative_q8": 0,
        "pilot_zero_q8": 0,
        "alpha6_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_84_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
