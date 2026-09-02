#!/usr/bin/env python3
"""Independent audit of all two-short-far pendant cells with paired arm 5."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23 import double_claw, path, multiply
from audit_rank8_delta2_e1_all_order import delta2


HERE = Path(__file__).resolve().parent
LONG = "L"
ROOT_STATES = [0, 1, 2, 3, 4, 5, 6, LONG]
REPORT = "rank8_delta2_e2_pendant_far{left}_{right}_paired5_bridge_long_cells_exact_20260820.json"
EXPECTED = {
    "run_rank8_delta2_e2_pendant_far_pair_paired_cell.py": "FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5",
    "rank8_delta2_e2_pendant_far1_1_paired5_bridge_long_cells_exact_20260820.json": "5BDF622F4C6CAA6D264AEE34C483A864200477B33AA63E7DE5C06B815DF08869",
    "rank8_delta2_e2_pendant_far1_2_paired5_bridge_long_cells_exact_20260820.json": "020D974C93048E69C1AEB55C23587C0F93C335964D81801FD15472DC180FCBE1",
    "rank8_delta2_e2_pendant_far1_3_paired5_bridge_long_cells_exact_20260820.json": "14CF75E5BBA95754162ACB7044AD88AF809C8E807005589679518F15DBC643F4",
    "rank8_delta2_e2_pendant_far1_4_paired5_bridge_long_cells_exact_20260820.json": "FE7EC80D72397FE1C03D66D03BFF177944747B87044F67E3CF25AB5BFEA213FC",
    "rank8_delta2_e2_pendant_far1_5_paired5_bridge_long_cells_exact_20260820.json": "4238EDE27EC0D747E916FEE29098A6F5416278FC6B3F1EAE7DF8B16A2EB2AFFB",
    "rank8_delta2_e2_pendant_far1_6_paired5_bridge_long_cells_exact_20260820.json": "08D20F399A5D6E674EF3A3B4339E686282A9A258235ECBFB080A2CE61BA5C818",
    "rank8_delta2_e2_pendant_far2_2_paired5_bridge_long_cells_exact_20260820.json": "44E5DA1D7D76AAF3C264CF59164241B5FC886AA58B520065D4577EE0FDE16733",
    "rank8_delta2_e2_pendant_far2_3_paired5_bridge_long_cells_exact_20260820.json": "2F00EC9E5C2016E1BF31C1431D35B2496C59B519EC686D90F84CE623F334E94A",
    "rank8_delta2_e2_pendant_far2_4_paired5_bridge_long_cells_exact_20260820.json": "32DE1724D9015ED2FC61EEE5CFA7B7E794DF880F6F86E4866B9ECEDA66168D03",
    "rank8_delta2_e2_pendant_far2_5_paired5_bridge_long_cells_exact_20260820.json": "59005AFE8060D0467EB236AEFE35714D092A2A52439BC79472956946DB90616A",
    "rank8_delta2_e2_pendant_far2_6_paired5_bridge_long_cells_exact_20260820.json": "B6D6E7696D729D89E99393AD0B2BEB77E2BBEA87FFC0EC39F88D3A21AFC8AB79",
    "rank8_delta2_e2_pendant_far3_3_paired5_bridge_long_cells_exact_20260820.json": "519A647086BE572856562473285CCB42430DCE228BA04C0ED6D67C4219FD9AD7",
    "rank8_delta2_e2_pendant_far3_4_paired5_bridge_long_cells_exact_20260820.json": "0CD5EE950DE3510DBD44AB6AFBFA4912AF3A371A13EDBE99C28AA6B5D85BD3D1",
    "rank8_delta2_e2_pendant_far3_5_paired5_bridge_long_cells_exact_20260820.json": "EBF326A148BC541DEA086AE5ED49548B7E52003FF3A07E78BE5B5EAEFA5A0C4A",
    "rank8_delta2_e2_pendant_far3_6_paired5_bridge_long_cells_exact_20260820.json": "218504973A73D8DD73F737AC6F721BEB80DF0D73512F9221C07768F4739ADFCF",
    "rank8_delta2_e2_pendant_far4_4_paired5_bridge_long_cells_exact_20260820.json": "42B9E30A2B0D552C016031FEE761E6E1B38B2F2A7DE1196D31C6DE926FE30B08",
    "rank8_delta2_e2_pendant_far4_5_paired5_bridge_long_cells_exact_20260820.json": "9C32D219395C06C946C5AA9C14392DA6BF438C87A65BFA29B980587AFCD08AFE",
    "rank8_delta2_e2_pendant_far4_6_paired5_bridge_long_cells_exact_20260820.json": "2710654AFE67DE03AA7436DC79F907758D5A08610BF127041EE027E474BD2FAF",
    "rank8_delta2_e2_pendant_far5_5_paired5_bridge_long_cells_exact_20260820.json": "3736CF85E9548059B9A7B93F3C9F19764F628CF5506D401173F66139E251146F",
    "rank8_delta2_e2_pendant_far5_6_paired5_bridge_long_cells_exact_20260820.json": "56003B57279BAB31CA7E935832334D65C02F4EDFD15E61B4A3F0CE6FCDC55F8E",
    "rank8_delta2_e2_pendant_far6_6_paired5_bridge_long_cells_exact_20260820.json": "2EF570761576C727B75CABEFC03570C86BB09604CA3C91633FA263A46F612904",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert {name: sha256(HERE / name) for name in EXPECTED} == EXPECTED
    expected_pairs = {(left, right) for left in range(1, 7) for right in range(left, 7)}
    expected_root_keys = {(near, tail) for near in ROOT_STATES for tail in ROOT_STATES}
    total_patterns = 0
    total_cells = 0
    constants = 0
    per_pair = {}

    for left, right in sorted(expected_pairs):
        report = json.loads((HERE / REPORT.format(left=left, right=right)).read_text())
        assert report["status"] == "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FAR_PAIR_PAIRED_CELL"
        assert report["far_pair"] == [left, right]
        assert report["paired_state"] == 5
        assert report["signed_cells"] == []
        actual = {(row["near_state"], row["tail_state"]): row for row in report["cells"]}
        assert set(actual) == expected_root_keys and len(actual) == 64
        pair_cells = 0

        for (near_state, tail_state), row in actual.items():
            names = []
            if near_state == LONG:
                names.append("N")
            if tail_state == LONG:
                names.append("U")
            names.append("G")
            near_base = 7 if near_state == LONG else int(near_state)
            tail_base = 7 if tail_state == LONG else int(tail_state)
            base = near_base + tail_base + 1 + 5 + left + right + 8
            threshold = max(0, 22 - base)
            q = math.ceil(threshold / len(names)) if threshold else 0
            variants = {(name, q) for name in names} if threshold else {(None, 0)}
            actual_variants = {(cell["shifted_coordinate"], cell["shift"]): cell for cell in row["cells"]}
            assert row["base_suppressed_length_sum"] == base
            assert row["order_constraint_on_offsets"] == threshold
            assert row["cover_coordinate_threshold"] == q
            assert set(actual_variants) == variants
            if threshold:
                assert len(names) * (q - 1) < threshold

            for (shifted, shift), cell in actual_variants.items():
                near = near_base + (shift if shifted == "N" else 0)
                tail = tail_base + (shift if shifted == "U" else 0)
                bridge = 8 + (shift if shifted == "G" else 0)
                core = double_claw((near + tail + 1, 5, bridge, left, right))
                deletion = multiply(path(tail), double_claw((near, 5, bridge, left, right)))
                literal = delta2(core, deletion)
                assert cell["negative_coefficients"] == 0
                assert Fraction(cell["minimum_coefficient"]) > 0
                assert literal == int(Fraction(cell["constant_coefficient"])) > 0
                constants += 1
                pair_cells += 1

        total_patterns += len(actual)
        total_cells += pair_cells
        per_pair[f"{left},{right}"] = {"root_position_patterns": len(actual), "shifted_cells": pair_cells}

    assert len(per_pair) == 21
    assert total_patterns == 1344
    assert total_cells == 1344 and constants == 1344
    payload = {
        "schema": "rank8-delta2-e2-pendant-two-short-far-paired5-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED5",
        "immutable_input_hashes": EXPECTED,
        "unordered_far_pairs": len(expected_pairs),
        "root_position_patterns": total_patterns,
        "shifted_cells": total_cells,
        "independent_literal_constants_checked": constants,
        "per_far_pair": per_pair,
        "scope": "all unordered far pairs 1<=f1<=f2<=6; paired arm5; selected arm/root arbitrary; bridge>=8; n>=23",
        "coverage_guard": "all triangular far keys, near-tail0..6/L keys, and every order-deficit orthant union regenerated",
        "scope_guard": "paired arms other than5 and bridges<=7 remain outside this theorem",
    }
    output = HERE / "rank8_delta2_e2_pendant_two_short_far_paired5_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("pairs 21 patterns", total_patterns, "cells", total_cells, "constants", constants)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
