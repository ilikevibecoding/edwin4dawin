#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.86."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA6_SOURCE9_COMPLETE_2026-08-20.md": "E4C0FC86651BAC0D781D78DB815B1EB6192A47C195F10A449194F6356254A22B",
    "probe_rank8_exceptional_first_crossing_alpha6_s9_shard_exact.py": "7B64131262F240E0E9701E7958B2CF6FDFE8CA85F05D050DA54D760A1FDEF776",
    "audit_rank8_exceptional_first_crossing_alpha6_s9_shard.py": "8083399FEEFF087A04E0FBE5856942F2576259BAC5485A86A2862E4134129FA6",
    "rank8_exceptional_first_crossing_alpha6_s9_types73_246_exact_20260820.json": "0B679DF66A391B301C0D0179E4C23F58CB30998E687A668A0DD7185E7A8DA47A",
    "rank8_exceptional_first_crossing_alpha6_s9_types73_246_keys_exact_20260820.sqlite3": "D310534896E79D4E0C5AB6CDBEC406D4793926BB2315B573595D1FB49518A080",
    "rank8_exceptional_first_crossing_alpha6_s9_types73_246_audit_exact_20260820.json": "CF9DBB8D75C9C13BCEC16D4EF1FE9C0CC65CEEA52EA527B2CE9AF04861CBE55D",
    "rank8_exceptional_first_crossing_alpha6_s9_type247_exact_20260820.json": "1D33B1515EFCA4F3D3792E9C4EE2DDE4FC2EC009677B5FF4BFBBD69965457A3A",
    "rank8_exceptional_first_crossing_alpha6_s9_type247_keys_exact_20260820.sqlite3": "CDAB5408DED175CF42114331024ED57351B43C5406970C104C4CE6A08DF9C661",
    "rank8_exceptional_first_crossing_alpha6_s9_type247_audit_exact_20260820.json": "07D8F5B93CC415CAAB16AB1456668DB0F8ED39E3E2F019619EC2340E0D407DFB",
    "assemble_rank8_exceptional_first_crossing_alpha6_s9.py": "1AA6E38EC1C19E0B71244E2D2D1F5721C1E141F4768D57D2E3986315BF2CA481",
    "rank8_exceptional_first_crossing_alpha6_s9_complete_exact_20260820.json": "3FA63B5C268993BDA02B63D73BC82F7823CE171EE42F0D368B63A55B45B6F91A",
    "audit_rank8_exceptional_first_crossing_alpha6_s9_assembly.py": "15586DBFB4AAB4F2B35E483B06BA693F6EEBFAE5BCD6EEFB8ADBEBE70B2BF683",
    "rank8_exceptional_first_crossing_alpha6_s9_complete_audit_exact_20260820.json": "D8B33E850B03D7725609504401AE80494E7A20807E655321E36E5D79FC236651",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED if EXPECTED[name] != actual[name]
    }
    audit = json.loads((ROOT / "rank8_exceptional_first_crossing_alpha6_s9_complete_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA6_SOURCE9_ASSEMBLY_AUDIT"
    coverage = audit["coverage"]
    assert coverage["exact_union"] == [73, 247]
    assert coverage["shard_ranges"] == [[73, 246], [247, 247]]
    assert coverage["gaps"] == coverage["overlaps"] == 0
    aggregate = audit["aggregate"]
    assert aggregate["independently_enumerated_multisets"] == 753_550
    assert aggregate["canonical_checks"] == 625_033
    assert aggregate["distinct_shard_product_jets_sum"] == 516_570
    assert aggregate["multiset_to_key_collisions"] == 128_517
    assert aggregate["key_to_product_collisions_within_shards"] == 108_463
    assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
    assert aggregate["minimum_Q8"] == 37_487_421
    assert aggregate["maximum_Q8"] == 2_584_714_768_416

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.86 The complete source-alpha-nine slice of terminal alpha six is closed"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "Two fresh-process shards cover\n`73..246` and `247` with no gap or overlap",
        "raw multisets                         753,550",
        "canonical check keys                  625,033",
        "minimum Q8                         37,487,421",
        "not a cross-shard global deduplication",
        "closes source alpha 9 only",
        "Sources 10 through 13 are not complete",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_86",
        "immutable_inputs": actual,
        "source_alpha": 9,
        "terminal_alpha": 6,
        "terminal_type_indices": [73, 247],
        "canonical_checks": 625_033,
        "negative_q8": 0,
        "zero_q8": 0,
        "alpha6_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_86_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
