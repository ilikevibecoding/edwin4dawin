#!/usr/bin/env python3
"""Fail-closed assembler for the pendant-root-side arbitrary e=2 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "rank8_delta2_e2_pendant_other_edges_long_root_position_cells_exact_20260820.json":
        "67DCD9E51D238DEDFDB29D51E4136E0542B46AB3D1073B8B2BD0DEE1E676F41D",
    "rank8_delta2_e2_long_other_edges_root_positions_independent_audit_exact_20260820.json":
        "AA143B4263215636C5E1984BC0295C4A6F7CFA385A777C8D0894550E22AB423C",
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
    "rank8_delta2_e2_pendant_short_paired_far_bridge_long_independent_audit_exact_20260820.json":
        "67C6D7FC16821A40373D2BC258603E68F6BC4B93E51752BA569F3D20D0A1C3AB",
    "rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json":
        "3D08D942263C416BD799F4BBA5822B3289CD92BCBEE936520D95B23FFD2CAB46",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text())


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED

    long_report = load("rank8_delta2_e2_pendant_other_edges_long_root_position_cells_exact_20260820.json")
    long_audit = load("rank8_delta2_e2_long_other_edges_root_positions_independent_audit_exact_20260820.json")
    short_audit = load("rank8_delta2_e2_pendant_short_paired_far_bridge_long_independent_audit_exact_20260820.json")
    sum_audit = load("rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json")
    assert long_report["status"] == "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_OTHER_EDGES_LONG_ALL_ROOT_POSITIONS"
    assert long_report["root_position_patterns"] == 64 and long_report["signed_cells"] == []
    assert long_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_LONG_OTHER_EDGES_ROOT_POSITIONS"
    assert short_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_SHORT_PAIRED_FAR_BRIDGE_LONG"
    assert short_audit["paired_arm_lengths"] == [1, 2, 3, 4, 5, 6]
    assert short_audit["total_no_gap_keys"] == 384
    assert sum_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_LONG_PAIR_SUM_AND_ROOT_CELLS"

    for paired in range(1, 7):
        report = load(f"rank8_delta2_e2_pendant_paired{paired}_far_bridge_long_cells_exact_20260820.json")
        assert report["status"] == "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FIXED_PAIRED_FAR_BRIDGE_LONG"
        assert report["paired_arm_length"] == paired
        assert report["root_position_patterns"] == 64
        assert report["positive_symbolic_cells"] == 64
        assert report["signed_cells"] == []

    payload = {
        "schema": "rank8-delta2-e2-pendant-root-side-arbitrary-far-bridge-long-assembler-v1",
        "status": "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_ROOT_SIDE_ARBITRARY_FAR_BRIDGE_LONG",
        "immutable_input_hashes": EXPECTED,
        "theorem_scope": (
            "every pendant-arm root of every e=2 double claw with arbitrary positive selected and paired "
            "arms, both far arms >=7, and central bridge >=8"
        ),
        "paired_arm_no_gap": "lengths 1..6 are fixed packages; every length >=7 is the long-paired package",
        "root_position_no_gap": (
            "near and tail are independently 0..6 or >=7, so every nonnegative near/tail pair and hence "
            "every selected-arm length/root position occurs"
        ),
        "order_scope": "all covered trees have order >=23; short paired packages in fact start at order >=25",
        "strict_positivity": True,
        "scope_guard": "short far arms or a central bridge <=7 remain outside this theorem",
    }
    output = HERE / "rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
