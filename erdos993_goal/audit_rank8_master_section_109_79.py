#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.79."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_DELTA2_E2_LONG_OTHER_EDGES_ALL_ROOT_POSITIONS_THEOREMS_2026-08-20.md":
        "85E57E8BB747CC24A0D2C566F1AD6E3913854062A8BCB38F7F359DF63E1AEDBE",
    "run_rank8_delta2_e2_pendant_other_edges_long_root_position_cells.py":
        "02AAF522C01D1D98CCFA9FF73DD26177E6A4248F0E212323F92B603C6BE82B8D",
    "rank8_delta2_e2_pendant_other_edges_long_root_position_cells_exact_20260820.json":
        "67DCD9E51D238DEDFDB29D51E4136E0542B46AB3D1073B8B2BD0DEE1E676F41D",
    "run_rank8_delta2_e2_bridge_all_long_arms_gap_cells.py":
        "0DFC2FD9C10FF53F7232D319774F5224A6ABBC4ED19523D8EEB574A83D2B888A",
    "rank8_delta2_e2_bridge_all_long_arms_gap_cells_exact_20260820.json":
        "8826E88AB861F06731C7C8F6A913F6F27E54FC869EB8F48B53B8EE5053247C09",
    "audit_rank8_delta2_e2_long_other_edges_root_positions.py":
        "7D05739567CCE0DD47FE701EAE72BB315D95BA72FA2E735A3FCE3673EDD27EE1",
    "rank8_delta2_e2_long_other_edges_root_positions_independent_audit_exact_20260820.json":
        "AA143B4263215636C5E1984BC0295C4A6F7CFA385A777C8D0894550E22AB423C",
    "audit_rank8_delta2_e2_long_pair_sum_identity.py":
        "A63B505EA6F50FFAACB6DBBBCF1A5707E5105122FFE65D9A846117DD7688005B",
    "rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json":
        "3D08D942263C416BD799F4BBA5822B3289CD92BCBEE936520D95B23FFD2CAB46",
    "RANK8_DELTA2_E2_PENDANT_ROOT_SIDE_ARBITRARY_FAR_BRIDGE_LONG_THEOREM_2026-08-20.md":
        "C71AF17716BD3B0FD0AAB9985D22DF2393C70CB3FE0CFCE245E3C270682C38F1",
    "run_rank8_delta2_e2_pendant_fixed_paired_far_bridge_long_cells.py":
        "2B60A76EB9C727712B40DA3FFA1AA5B311885081D0F5C96F6EFB35FF87594D29",
    "rank8_delta2_e2_pendant_paired1_far_bridge_long_cells_exact_20260820.json":
        "9BA9A2CF6623156AA13C6903CAACFD4E7CB4A4736F45E9EB0227FB6F4A577FC3",
    "rank8_delta2_e2_pendant_paired2_far_bridge_long_cells_exact_20260820.json":
        "0AAAE48EF9BD4EB3B2B20851EF0B0CC8A2B78F5DD131296167C1AE279353BE9F",
    "rank8_delta2_e2_pendant_paired3_far_bridge_long_cells_exact_20260820.json":
        "5C0F2AEE822B84536A6D0115E2EB295561AB23DE336784782AC6781E43EFBD6B",
    "rank8_delta2_e2_pendant_paired4_far_bridge_long_cells_exact_20260820.json":
        "90E7E9464E92F4966B1C06CFE7952DA21EF85522E76BC7F704690C8477CFAD06",
    "rank8_delta2_e2_pendant_paired5_far_bridge_long_cells_exact_20260820.json":
        "EAFE7F410C6638E1692B276BC54A669314E56D07AFA62AA6806915C4A80063E4",
    "rank8_delta2_e2_pendant_paired6_far_bridge_long_cells_exact_20260820.json":
        "1E084D94BDA6AD11C965BB747EEA937F9A70636DEFA8F460D448645C285AE223",
    "audit_rank8_delta2_e2_pendant_short_paired_far_bridge_long.py":
        "D1559A3BD99553989C8728C0028626C68962FE0EBD761F03B91DC29DB4C4C5C7",
    "rank8_delta2_e2_pendant_short_paired_far_bridge_long_independent_audit_exact_20260820.json":
        "67C6D7FC16821A40373D2BC258603E68F6BC4B93E51752BA569F3D20D0A1C3AB",
    "assemble_rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long.py":
        "A4F6E1ABD67F748858D2F99FFDD9C2FF1231272018F98BA58F9304C8554CD22D",
    "rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long_exact_20260820.json":
        "97FE974A2BF6B160F84A82F729DA7D319095291DA8FB42B5ACA46E16BAC95DF5",
    "RANK8_DELTA2_E2_PENDANT_FAR1_LONG_PAIRED_ALL_THEOREM_2026-08-20.md":
        "5D3CD77AE31FA819E7129962B12C466DC83D370E24829E9CCBEC99AAC0D40752",
    "run_rank8_delta2_e2_pendant_far_pair_paired_cell.py":
        "FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5",
    "rank8_delta2_e2_pendant_far1_long_paired1_bridge_long_cells_exact_20260820.json":
        "4C2B8D9E8CA01758AB23BA13DF6986B87DC9D8831838517C55A9D5BF7A137CD7",
    "rank8_delta2_e2_pendant_far1_long_paired2_bridge_long_cells_exact_20260820.json":
        "D25028C842B6C7A429D13ED80DEAD231471E61B3B427B03005B5E0CD25837084",
    "rank8_delta2_e2_pendant_far1_long_paired3_bridge_long_cells_exact_20260820.json":
        "BB57014D95505B72CF4991BDC09053E7BFFDEB777695516B147B0787B5C2A50C",
    "rank8_delta2_e2_pendant_far1_long_paired4_bridge_long_cells_exact_20260820.json":
        "A27CF98D0A820D2CD32D95AB7C851EE79E36A48982FFFFC044555EC7D727EDCB",
    "rank8_delta2_e2_pendant_far1_long_paired5_bridge_long_cells_exact_20260820.json":
        "DF02160EF8743C452D0D554B97124374BEC415F1137626DF049960F41C7A4B66",
    "rank8_delta2_e2_pendant_far1_long_paired6_bridge_long_cells_exact_20260820.json":
        "1D5BDB49C46D822F98FDF144023D53B3F8F7C39412CD9FBB9E5F3FE9A7A83DF4",
    "rank8_delta2_e2_pendant_far1_long_pairedlong_bridge_long_cells_exact_20260820.json":
        "93642B93A5DFE52E7B13EB6F255061C6C183C1CBF3B46ACD6546CDEB6C7862AB",
    "audit_rank8_delta2_e2_pendant_far1_long_paired_all.py":
        "56DB8F8013448EDE8A3A55A5E0020167151778363F2E136D6A1A21B2C1D86DB9",
    "rank8_delta2_e2_pendant_far1_long_paired_all_independent_audit_exact_20260820.json":
        "7DFCAA77115B616EFFBEBF366E72C672FE615DB2134A34C38FCF35860231740A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED
        if EXPECTED[name] != actual[name]
    }

    pendant = load("rank8_delta2_e2_pendant_other_edges_long_root_position_cells_exact_20260820.json")
    bridge = load("rank8_delta2_e2_bridge_all_long_arms_gap_cells_exact_20260820.json")
    audit = load("rank8_delta2_e2_long_other_edges_root_positions_independent_audit_exact_20260820.json")
    strengthened = load("rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long_exact_20260820.json")
    far1 = load("rank8_delta2_e2_pendant_far1_long_paired_all_independent_audit_exact_20260820.json")
    assert pendant["status"] == "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_OTHER_EDGES_LONG_ALL_ROOT_POSITIONS"
    assert pendant["root_position_patterns"] == 64
    assert pendant["positive_symbolic_cells"] == 64
    assert pendant["signed_cells"] == []
    assert bridge["status"] == "PASS_EXACT_RANK8_DELTA2_E2_BRIDGE_ALL_LONG_ARMS_ALL_ROOT_POSITIONS"
    assert bridge["gap_patterns"] == 28
    assert bridge["positive_symbolic_cells"] == 28
    assert bridge["signed_cells"] == []
    assert audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_LONG_OTHER_EDGES_ROOT_POSITIONS"
    assert audit["bridge_root_subfamily"]["independent_literal_constants_checked"] == 28
    assert audit["pendant_root_subfamily"]["independent_literal_constants_checked"] == 64
    assert strengthened["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_ROOT_SIDE_ARBITRARY_FAR_BRIDGE_LONG"
    assert strengthened["strict_positivity"] is True
    assert "arbitrary positive selected and paired arms" in strengthened["theorem_scope"]
    assert far1["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_FAR1_LONG_PAIRED_ALL"
    assert far1["root_position_patterns"] == 448
    assert far1["shifted_cells"] == far1["independent_literal_constants_checked"] == 468

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.79 Two long-surrounding `e=2` root-position families are closed for `Delta2`"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "64 ordered near/tail cells",
        "All 384 cells are coefficientwise positive",
        "selected arm and its paired arm to have arbitrary",
        "448 root-position",
        "all 468 literal constants",
        "far-pair type `(1,long)` only",
        "exactly 28 triangular",
        "strictly positive constant",
        "These are scoped theorems",
        "They do not prove connected `Q8`, rank-eight",
        "PGC, or Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_79",
        "immutable_inputs": actual,
        "pendant_root_cells": 64,
        "short_paired_pendant_cells": 384,
        "pendant_selected_and_paired_arms_arbitrary": True,
        "far1_long_root_position_patterns": 448,
        "far1_long_shifted_cells": 468,
        "bridge_root_cells": 28,
        "all_e2_roots_closed": False,
        "connected_q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_79_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
