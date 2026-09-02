#!/usr/bin/env python3
"""Independent audit of all two-short-far pendant cells with paired arm 2."""

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
REPORT = "rank8_delta2_e2_pendant_far{left}_{right}_paired2_bridge_long_cells_exact_20260820.json"
EXPECTED = {
    "run_rank8_delta2_e2_pendant_far_pair_paired_cell.py": "FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5",
    "rank8_delta2_e2_pendant_far1_1_paired2_bridge_long_cells_exact_20260820.json": "840534FF2FBF4628C86491061BAABD803ACCC81A9E0FAC36970DEF95D2A88E3B",
    "rank8_delta2_e2_pendant_far1_2_paired2_bridge_long_cells_exact_20260820.json": "052C2D1B8A417B4B04106CF9E63F8EA36A6D95D6CC3E21D2BD837E86723D0128",
    "rank8_delta2_e2_pendant_far1_3_paired2_bridge_long_cells_exact_20260820.json": "61427846CF7A71D53B224ABB9973E521A07871C971307B88001D88E04525E2BD",
    "rank8_delta2_e2_pendant_far1_4_paired2_bridge_long_cells_exact_20260820.json": "77980D226D3B98511ABB2D0FF3935AF30E179A39D6A5CDF394D9A080BD8BF3AA",
    "rank8_delta2_e2_pendant_far1_5_paired2_bridge_long_cells_exact_20260820.json": "BD031D8664ED2BB539CEDBCA7D2698318123D782113742AC76CF7FC0AE43B9A9",
    "rank8_delta2_e2_pendant_far1_6_paired2_bridge_long_cells_exact_20260820.json": "1F2B82D026D50CE98A9F491FC25FC3D7ACFFE99CA5DCE58F3563D3A5C4BBAC5F",
    "rank8_delta2_e2_pendant_far2_2_paired2_bridge_long_cells_exact_20260820.json": "F971754DA67F7E99CDBDE3218B058F502EDCBE3603B9FA24D461E1C2DB2A1B7B",
    "rank8_delta2_e2_pendant_far2_3_paired2_bridge_long_cells_exact_20260820.json": "71A0C01D53B726368EDAB9579F8B966AA6BE3736EC1998D44BDDC6097C0635CF",
    "rank8_delta2_e2_pendant_far2_4_paired2_bridge_long_cells_exact_20260820.json": "392CE44DB3D4EADA4143694E73BF7551D911A57F084D2996CBCE09BFDFB75A91",
    "rank8_delta2_e2_pendant_far2_5_paired2_bridge_long_cells_exact_20260820.json": "89B8074D162A41A6EF49DD0DA43C0345E221A2F1D8527C5275A78A892C06E098",
    "rank8_delta2_e2_pendant_far2_6_paired2_bridge_long_cells_exact_20260820.json": "9635A2B410C72461E0ADED4B4DB788195CD9E41D7310D7DD6BBAA3CDD7023BA7",
    "rank8_delta2_e2_pendant_far3_3_paired2_bridge_long_cells_exact_20260820.json": "8063E8C821B3652A2CC760F4F0AD8E54D75AB265B7156AE51BDF4B10462AA0DF",
    "rank8_delta2_e2_pendant_far3_4_paired2_bridge_long_cells_exact_20260820.json": "DD10C65A88FB3BECBDD8230E7342FD85F671A916918978B3BE93BB63A3BD51F1",
    "rank8_delta2_e2_pendant_far3_5_paired2_bridge_long_cells_exact_20260820.json": "5C8AA9F0AFD2871F3895DC8010521AF73FBCF3553507B8C490EEBD27824CE601",
    "rank8_delta2_e2_pendant_far3_6_paired2_bridge_long_cells_exact_20260820.json": "E324112C6E50AF4CA01F0D3703043B7CDF3212F0DAF90DF84236FF4AE34AA5EA",
    "rank8_delta2_e2_pendant_far4_4_paired2_bridge_long_cells_exact_20260820.json": "26AC8AB12F2CC9012F36F37D61CB24ECB19A9899ECA42C3F944CF6B7B8FD9DD0",
    "rank8_delta2_e2_pendant_far4_5_paired2_bridge_long_cells_exact_20260820.json": "7966CABE042E0A50E9E3453FAB6D2D093D833831C09717E404D6F7DE0D0855BD",
    "rank8_delta2_e2_pendant_far4_6_paired2_bridge_long_cells_exact_20260820.json": "0F19010406445E3E94B1A3F77D66B1E1FF1885D9AA4A51982588F1F7A10A323E",
    "rank8_delta2_e2_pendant_far5_5_paired2_bridge_long_cells_exact_20260820.json": "E44C0853D8723B43C68941571D409DA7A928FC1FBA7685BB1C8A92E6CB9D4F90",
    "rank8_delta2_e2_pendant_far5_6_paired2_bridge_long_cells_exact_20260820.json": "D6AC6E8D1BE5AE118E057CB83E5DFA8A7E3F6FC5FBD5495590E731C56A59D736",
    "rank8_delta2_e2_pendant_far6_6_paired2_bridge_long_cells_exact_20260820.json": "934A8EFDE6BBA5318236AFC5B76B39F89B1DB6F58FEEA70CF447A5A40054AC53",
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
        assert report["paired_state"] == 2
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
            base = near_base + tail_base + 1 + 2 + left + right + 8
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
                core = double_claw((near + tail + 1, 2, bridge, left, right))
                deletion = multiply(
                    path(tail), double_claw((near, 2, bridge, left, right))
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
    assert total_cells == 1350 and constants == 1350
    payload = {
        "schema": "rank8-delta2-e2-pendant-two-short-far-paired2-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED2",
        "immutable_input_hashes": EXPECTED,
        "unordered_far_pairs": len(expected_pairs),
        "root_position_patterns": total_patterns,
        "shifted_cells": total_cells,
        "independent_literal_constants_checked": constants,
        "per_far_pair": per_pair,
        "scope": "all unordered far pairs 1<=f1<=f2<=6; paired arm2; selected arm/root arbitrary; bridge>=8; n>=23",
        "coverage_guard": "all triangular far keys, near-tail0..6/L keys, and every order-deficit orthant union regenerated",
        "scope_guard": "paired arms other than2 and bridges<=7 remain outside this theorem",
    }
    output = HERE / "rank8_delta2_e2_pendant_two_short_far_paired2_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("pairs 21 patterns", total_patterns, "cells", total_cells, "constants", constants)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
