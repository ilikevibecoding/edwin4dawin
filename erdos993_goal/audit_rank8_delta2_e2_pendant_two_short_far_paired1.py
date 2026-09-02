#!/usr/bin/env python3
"""Independent audit of all two-short-far pendant cells with paired arm 1."""

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
REPORT = "rank8_delta2_e2_pendant_far{left}_{right}_paired1_bridge_long_cells_exact_20260820.json"
EXPECTED = {
    "run_rank8_delta2_e2_pendant_far_pair_paired_cell.py": "FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5",
    "rank8_delta2_e2_pendant_far1_1_paired1_bridge_long_cells_exact_20260820.json": "9B709806D636A224016059C15E968AA7629E9B7E7E3B611395681B04AF12FC64",
    "rank8_delta2_e2_pendant_far1_2_paired1_bridge_long_cells_exact_20260820.json": "2E6A81AF6E7FFAC2AE27116C5875088D795163E932D8D8CBB552D5704271038B",
    "rank8_delta2_e2_pendant_far1_3_paired1_bridge_long_cells_exact_20260820.json": "4F56D1DBE9F59D072E42936BF792B143EA75E2C60462E386B1965A07AA6BD310",
    "rank8_delta2_e2_pendant_far1_4_paired1_bridge_long_cells_exact_20260820.json": "8B100DA55EB6FB4723028646DB20236B2D177EBA16617D64C82377F209A9A1E4",
    "rank8_delta2_e2_pendant_far1_5_paired1_bridge_long_cells_exact_20260820.json": "05B42C4EDE5C2E9FCD1DE6664EAC5D21390DCE31B889B88B05F4F494567C1C81",
    "rank8_delta2_e2_pendant_far1_6_paired1_bridge_long_cells_exact_20260820.json": "0D80DCCC831FFE63E5B4B47202BE75071F11CBD81A324C5DF3F92DC1302A3C52",
    "rank8_delta2_e2_pendant_far2_2_paired1_bridge_long_cells_exact_20260820.json": "508D961868637DB2B985B20F5620C7A73586D51ABD42662945EAA61AD1A3DA3C",
    "rank8_delta2_e2_pendant_far2_3_paired1_bridge_long_cells_exact_20260820.json": "054CD487161243250042A60B418A65EC793663B8DF4A3FE8386D0306C71BE0C6",
    "rank8_delta2_e2_pendant_far2_4_paired1_bridge_long_cells_exact_20260820.json": "D9F84A51CCDB211D293AFE0D6D388DDC0A2332C3D318E909A14AB67071C75335",
    "rank8_delta2_e2_pendant_far2_5_paired1_bridge_long_cells_exact_20260820.json": "60AF097C11FE74FA33530ABCC47F6213F66E2535B00255E3728A24DEFEBF17C9",
    "rank8_delta2_e2_pendant_far2_6_paired1_bridge_long_cells_exact_20260820.json": "98E4D468DD328ED258CFA15EC14C530DC21072409AC0E0B3103FBF11E42FBD50",
    "rank8_delta2_e2_pendant_far3_3_paired1_bridge_long_cells_exact_20260820.json": "839D718039816BF0BB7750D5CE79A12D75F16DFDCAF8DF6ED9C1FE05029BD0E1",
    "rank8_delta2_e2_pendant_far3_4_paired1_bridge_long_cells_exact_20260820.json": "E9AF5FA2FE8E4C0F109B483032EB899CD293DA8EF81CE39A374ED632700836EC",
    "rank8_delta2_e2_pendant_far3_5_paired1_bridge_long_cells_exact_20260820.json": "5E0CFD29679A89D32E5ED370AD99FA5EE3187A0B9532E68BFD6E0B44498AB7A9",
    "rank8_delta2_e2_pendant_far3_6_paired1_bridge_long_cells_exact_20260820.json": "F5A578D4417483793C06096FF911CD9B8EC3C01432EDEE8BC2B60899E6754C84",
    "rank8_delta2_e2_pendant_far4_4_paired1_bridge_long_cells_exact_20260820.json": "4FFE761C9C909EDC2BD09B01F282AD79652729736BA532CEE52E1EBD3FE32A37",
    "rank8_delta2_e2_pendant_far4_5_paired1_bridge_long_cells_exact_20260820.json": "8E4D8D531B2B00F352EF9C17516C7005A3E9A3D928527F87FBCA5A8DEC981FC6",
    "rank8_delta2_e2_pendant_far4_6_paired1_bridge_long_cells_exact_20260820.json": "8E757F55646D1318D45C57FFF0C1FB4590CF0F35E2F6B812DD232325D35C706B",
    "rank8_delta2_e2_pendant_far5_5_paired1_bridge_long_cells_exact_20260820.json": "8466F299605734BFEABDEFF79634557FC8E567385FB992D62FE78BBB3B8E1FD9",
    "rank8_delta2_e2_pendant_far5_6_paired1_bridge_long_cells_exact_20260820.json": "49EFB25966ADCE6CC79005106A4BEA7C7160D6ADDB824A2EC86B743851A55A6F",
    "rank8_delta2_e2_pendant_far6_6_paired1_bridge_long_cells_exact_20260820.json": "63066F494230C3B2C31ABCAC0199666C7B5977881C8BC3D9903F0B75CFC3E82E",
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
        assert report["paired_state"] == 1
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
            base = near_base + tail_base + 1 + 1 + left + right + 8
            threshold = max(0, 22 - base)
            q = math.ceil(threshold / len(names)) if threshold else 0
            variants = {(name, q) for name in names} if threshold else {(None, 0)}
            actual_variants = {
                (cell["shifted_coordinate"], cell["shift"]): cell
                for cell in row["cells"]
            }
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
                core = double_claw((near + tail + 1, 1, bridge, left, right))
                deletion = multiply(
                    path(tail), double_claw((near, 1, bridge, left, right))
                )
                literal = delta2(core, deletion)
                assert cell["negative_coefficients"] == 0
                assert Fraction(cell["minimum_coefficient"]) > 0
                assert literal == int(Fraction(cell["constant_coefficient"])) > 0
                constants += 1
                pair_cells += 1

        total_patterns += len(actual)
        total_cells += pair_cells
        per_pair[f"{left},{right}"] = {
            "root_position_patterns": len(actual),
            "shifted_cells": pair_cells,
        }

    assert len(per_pair) == 21
    assert total_patterns == 1344
    assert total_cells == 1358 and constants == 1358
    payload = {
        "schema": "rank8-delta2-e2-pendant-two-short-far-paired1-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED1",
        "immutable_input_hashes": EXPECTED,
        "unordered_far_pairs": len(expected_pairs),
        "root_position_patterns": total_patterns,
        "shifted_cells": total_cells,
        "independent_literal_constants_checked": constants,
        "per_far_pair": per_pair,
        "scope": "all unordered far pairs 1<=f1<=f2<=6; paired arm1; selected arm/root arbitrary; bridge>=8; n>=23",
        "coverage_guard": "all triangular far keys, near-tail0..6/L keys, and every order-deficit orthant union regenerated",
        "scope_guard": "paired arms >=2 and bridges <=7 remain outside this theorem",
    }
    output = HERE / "rank8_delta2_e2_pendant_two_short_far_paired1_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("pairs 21 patterns", total_patterns, "cells", total_cells, "constants", constants)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
