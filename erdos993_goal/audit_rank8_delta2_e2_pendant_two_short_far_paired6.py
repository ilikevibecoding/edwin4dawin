#!/usr/bin/env python3
"""Independent audit of all two-short-far pendant cells with paired arm 6."""

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
REPORT = "rank8_delta2_e2_pendant_far{left}_{right}_paired6_bridge_long_cells_exact_20260820.json"
EXPECTED = {
    "run_rank8_delta2_e2_pendant_far_pair_paired_cell.py": "FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5",
    "rank8_delta2_e2_pendant_far1_1_paired6_bridge_long_cells_exact_20260820.json": "857BB075C3D1DF3E7F30D5174589D46F2F2D1687BB7FDEE5206F6677668C229B",
    "rank8_delta2_e2_pendant_far1_2_paired6_bridge_long_cells_exact_20260820.json": "817B74E4984D97CC223E2AC0974A5FFDBEC196679BE9FB86B41DCFD0138007FE",
    "rank8_delta2_e2_pendant_far1_3_paired6_bridge_long_cells_exact_20260820.json": "14FA4633B8BDA556E9445B12B113DFD75AA5F41A2154B671F4EB505B715F239C",
    "rank8_delta2_e2_pendant_far1_4_paired6_bridge_long_cells_exact_20260820.json": "5A8F30A3C34E7DBDCFF3F1C2FE692ED9F3E2F1910340B546A13512BCE44E7DF1",
    "rank8_delta2_e2_pendant_far1_5_paired6_bridge_long_cells_exact_20260820.json": "0EAC330915F995D242F44D5F7E2CA0CFA84F15038D179D764E25660122744539",
    "rank8_delta2_e2_pendant_far1_6_paired6_bridge_long_cells_exact_20260820.json": "B95E13B3A786FFACFC2E63DC066B18348CEF224C3619D415377B74EA7971C67D",
    "rank8_delta2_e2_pendant_far2_2_paired6_bridge_long_cells_exact_20260820.json": "166B1644D363E263A82DEE32DC49F7A54F342D52DA5EEF0958531344E910BF81",
    "rank8_delta2_e2_pendant_far2_3_paired6_bridge_long_cells_exact_20260820.json": "28687287F35B8E0B55AF8CF158C01074362D43F06B921D391C5AA0C73DF9F067",
    "rank8_delta2_e2_pendant_far2_4_paired6_bridge_long_cells_exact_20260820.json": "A1716F8BA7898E5CE8790AA882FA25653F4297602C5BCA2467E5AD74C5D9A46F",
    "rank8_delta2_e2_pendant_far2_5_paired6_bridge_long_cells_exact_20260820.json": "7893991FBFD4ACA2BC1BE45D53B01F15D146B7A41408C98047BE1B32C526F268",
    "rank8_delta2_e2_pendant_far2_6_paired6_bridge_long_cells_exact_20260820.json": "65A1DD17D69AC031780C39C8A1E463C76B3315050D0C3337E1BEE688E2512148",
    "rank8_delta2_e2_pendant_far3_3_paired6_bridge_long_cells_exact_20260820.json": "CEA3D614868C206C307775825C2421A085C374162CEFF1ECE7635BCFB03A2246",
    "rank8_delta2_e2_pendant_far3_4_paired6_bridge_long_cells_exact_20260820.json": "34504629A7B52A17BE6FE0A119B72AA5463C2EB698AE5AF78A767340F684F070",
    "rank8_delta2_e2_pendant_far3_5_paired6_bridge_long_cells_exact_20260820.json": "E69207D63C33F0F7500638D1108468D50E48DEC4EB2CEC8A393EF2E10744842C",
    "rank8_delta2_e2_pendant_far3_6_paired6_bridge_long_cells_exact_20260820.json": "600FF73FFA6FDE48EAE00C3DA47DE895DE87F56F47250357FE87E276289E5AAD",
    "rank8_delta2_e2_pendant_far4_4_paired6_bridge_long_cells_exact_20260820.json": "1504697CD83B266D5CD3E29B7767E4931B256C1C534A6C5FFDBDA0EB5832CF02",
    "rank8_delta2_e2_pendant_far4_5_paired6_bridge_long_cells_exact_20260820.json": "D416C8BF895E14E9292B191EEE946BB6CAE1BC9A1701D9A5A6E830A323E45D76",
    "rank8_delta2_e2_pendant_far4_6_paired6_bridge_long_cells_exact_20260820.json": "21B79F53FD584F1CF8DD2AF700C094423738B676B1E14446431A4022A6889970",
    "rank8_delta2_e2_pendant_far5_5_paired6_bridge_long_cells_exact_20260820.json": "5640D733D4EF1FC9B98EA2037D5B60B94A4E90C7BE686085146441543C690FF0",
    "rank8_delta2_e2_pendant_far5_6_paired6_bridge_long_cells_exact_20260820.json": "920463CE914E7055701569B2D199213C9B9076D0F243B2902A9F0E4EF6DB1A4B",
    "rank8_delta2_e2_pendant_far6_6_paired6_bridge_long_cells_exact_20260820.json": "7FCD38E70381C6104223432041C4B6405AA257A7ADA2E4F5D2CD3FC2C60075CA",
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
        assert report["paired_state"] == 6
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
            base = near_base + tail_base + 1 + 6 + left + right + 8
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
                core = double_claw((near + tail + 1, 6, bridge, left, right))
                deletion = multiply(path(tail), double_claw((near, 6, bridge, left, right)))
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
        "schema": "rank8-delta2-e2-pendant-two-short-far-paired6-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED6",
        "immutable_input_hashes": EXPECTED,
        "unordered_far_pairs": len(expected_pairs),
        "root_position_patterns": total_patterns,
        "shifted_cells": total_cells,
        "independent_literal_constants_checked": constants,
        "per_far_pair": per_pair,
        "scope": "all unordered far pairs 1<=f1<=f2<=6; paired arm6; selected arm/root arbitrary; bridge>=8; n>=23",
        "coverage_guard": "all triangular far keys, near-tail0..6/L keys, and every order-deficit orthant union regenerated",
        "scope_guard": "paired arms other than6 and bridges<=7 remain outside this theorem",
    }
    output = HERE / "rank8_delta2_e2_pendant_two_short_far_paired6_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("pairs 21 patterns", total_patterns, "cells", total_cells, "constants", constants)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
