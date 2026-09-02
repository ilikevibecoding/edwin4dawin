#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.82."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_TERMINAL_DELTA03_ALL_ROOT_N25_FINITE_THEOREM_2026-08-20.md":
        "EA3EA96E5626A354885382B936EC40075A2996938CA6AF2CE72170E092F0B7B1",
    "verify_rank8_terminal_delta03_finite_n25.rs":
        "431A54BC6C37EF884074D4ADBD805AE8614A78BB773F37AE4BC84EB0DF7E0E8A",
    "verify_rank8_terminal_delta03_finite_n25.exe":
        "4A91610ED7D468D62EA1FC81B1A199EE23338FE4F22E3AFDA7E198E3B04F7110",
    "rank8_terminal_delta03_finite_n25_primary_20260820.log":
        "030E2A06BCEF8A4FFA09B366BA699245C244F94298156993A0BC6411BFAE206F",
    "rank8_terminal_delta03_finite_n25_primary_20260820.err.log":
        "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    "audit_rank8_terminal_delta03_finite_n25.py":
        "285A7623620B7697FDAF302C33EDD1D2AE4C3AAF5A56B240B020DBC643160F3B",
    "rank8_terminal_delta03_finite_n25_independent_audit_exact_20260820.json":
        "EDC9574415B23BB596074536734F33123D909258E9BC2D1C713036E426687F72",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED
        if EXPECTED[name] != actual[name]
    }
    report = json.loads(
        (ROOT / "rank8_terminal_delta03_finite_n25_independent_audit_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert report["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N25"
    primary = report["primary"]
    assert primary["trees"] == 104_636_890
    assert primary["roots"] == primary["active_roots"] == 2_615_922_250
    assert primary["negative_counts"] == [0, 0, 0, 0]
    assert primary["minima"] == [
        195_231_879_800_229_242_880,
        587_022_928_070_258_744_064,
        916_860_486_100_125_176_064,
        1_160_407_068_315_624_694_656,
    ]
    assert primary["path_endpoint_witness"]["matches_all_global_minima"] is True
    assert report["source_successor"]["normalized_byte_for_byte_equal_to_n24"] is True
    assert report["i128_safety"]["delta3_bound_bits"] == 92
    assert report["i128_safety"]["integer_margin_floor"] == 54_786_976_341

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.82 The entire order-25 rank-eight residual layer is closed"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "104,636,890 free trees",
        "2,615,922,250 rooted pairs",
        "negative counts are exactly",
        "All four minima occur at an endpoint root of `P_25`",
        "gap now begins at core\norder 26",
        "not an all-order proof",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_82",
        "immutable_inputs": actual,
        "core_order": 25,
        "free_trees": 104_636_890,
        "rooted_pairs": 2_615_922_250,
        "negative_counts": [0, 0, 0, 0],
        "connected_q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_82_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
