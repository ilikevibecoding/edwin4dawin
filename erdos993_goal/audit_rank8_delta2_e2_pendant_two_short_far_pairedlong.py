#!/usr/bin/env python3
"""Independent audit of all two-short-far pendant cells with paired arm >=7."""

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
REPORT = "rank8_delta2_e2_pendant_far{left}_{right}_pairedlong_bridge_long_cells_exact_20260820.json"
EXPECTED = {
    "run_rank8_delta2_e2_pendant_far_pair_paired_cell.py": "FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5",
    "rank8_delta2_e2_pendant_far1_1_pairedlong_bridge_long_cells_exact_20260820.json": "DA224ED01A8D41AB8189DDD7FE2F1CC03E762280372E3E8B8BEF8F2808E975F5",
    "rank8_delta2_e2_pendant_far1_2_pairedlong_bridge_long_cells_exact_20260820.json": "A3AF59732AA311E9E715B78A1B31C9D0F0C9CE17357136E0A06E433EA41E20B6",
    "rank8_delta2_e2_pendant_far1_3_pairedlong_bridge_long_cells_exact_20260820.json": "1F6B8939F5276F5DAF9C2EB3EB407EFB36A77BAC6381AA93018FC10D1C6B6A21",
    "rank8_delta2_e2_pendant_far1_4_pairedlong_bridge_long_cells_exact_20260820.json": "40EE17640ED7D08EE4C6E5CBB19965E567F40F47FB4C9C2B082EA85A5ACFBE84",
    "rank8_delta2_e2_pendant_far1_5_pairedlong_bridge_long_cells_exact_20260820.json": "0EDCE6E52D73C0D1D068DCCF5A6469FF8D0EEDF72E4DF8E241942153CD4D898D",
    "rank8_delta2_e2_pendant_far1_6_pairedlong_bridge_long_cells_exact_20260820.json": "E3DF92DF9E35B84E44FB11778D51A419032C4B6DCAC5AD9AFC0824F4524B889D",
    "rank8_delta2_e2_pendant_far2_2_pairedlong_bridge_long_cells_exact_20260820.json": "02DACCE38C8FE527DDC1B076B0CF45B0CE8683CA24CAF9BE1528932E9E2F2752",
    "rank8_delta2_e2_pendant_far2_3_pairedlong_bridge_long_cells_exact_20260820.json": "4A037771C60010274DC71AD06E6F5F1A9D2A077F58E17CE142E5FE3598FBFB48",
    "rank8_delta2_e2_pendant_far2_4_pairedlong_bridge_long_cells_exact_20260820.json": "F6BBA97312123DB35A62C5F2FED5DC06548C1678D4B4CB798DCC3388B400EFA6",
    "rank8_delta2_e2_pendant_far2_5_pairedlong_bridge_long_cells_exact_20260820.json": "80418F4A73F8A1EBC42522D6199837B5A1426313F032BC55899AA03E6ED8BD13",
    "rank8_delta2_e2_pendant_far2_6_pairedlong_bridge_long_cells_exact_20260820.json": "1056397EACD9FFBC72B60DD352FF190A2E637C85F8A0ED0F5F801121121AC456",
    "rank8_delta2_e2_pendant_far3_3_pairedlong_bridge_long_cells_exact_20260820.json": "7DBA80671C8A259B059C4338FF3A2EB583B4E9543E9883DB04E2F010389A309A",
    "rank8_delta2_e2_pendant_far3_4_pairedlong_bridge_long_cells_exact_20260820.json": "268AA3036CD17D6A6C2393D741E96594EEADAA32ECA7D73FF2B91CBC196CDE04",
    "rank8_delta2_e2_pendant_far3_5_pairedlong_bridge_long_cells_exact_20260820.json": "C796D6A663AF9E2F4C9876325BBC8E3B417427D4CABAC892621B9E89BC4B1770",
    "rank8_delta2_e2_pendant_far3_6_pairedlong_bridge_long_cells_exact_20260820.json": "DA84E74CD11EBAEAB99A029314F98D7EE85C74A69C7AA63F2F8B798870C42058",
    "rank8_delta2_e2_pendant_far4_4_pairedlong_bridge_long_cells_exact_20260820.json": "7E944CAF7869F39428548695FBB28ADA76697990F0E4F298033A13C2615E17CD",
    "rank8_delta2_e2_pendant_far4_5_pairedlong_bridge_long_cells_exact_20260820.json": "022A5A9DF66C69D25ACC201D122582290119E1850708E06566AB19378E50C6FC",
    "rank8_delta2_e2_pendant_far4_6_pairedlong_bridge_long_cells_exact_20260820.json": "724536E89E9EE8F1AC7F096E6B2E5C36082DED89927121A70CE79075688752E2",
    "rank8_delta2_e2_pendant_far5_5_pairedlong_bridge_long_cells_exact_20260820.json": "E6718783581270BEB34256BC0FCAC4849C5FDD6A36C132FF749896C606AAA679",
    "rank8_delta2_e2_pendant_far5_6_pairedlong_bridge_long_cells_exact_20260820.json": "1EE3D36AA9E7FA9459A815F44FD4B85081807804D731D6E4792368042EA9E00C",
    "rank8_delta2_e2_pendant_far6_6_pairedlong_bridge_long_cells_exact_20260820.json": "1EB387D8F33D7DF12A2CAC386F1AA96EC67E3E0241275EC941D5439B4E2DECA4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coordinate_names(near_state, tail_state):
    names = ["X"] if near_state == LONG else ["B"]
    if tail_state == LONG:
        names.append("U")
    names.append("G")
    return names


def literal_lengths(near_state, tail_state, shifted, shift):
    offsets = {name: 0 for name in coordinate_names(near_state, tail_state)}
    if shifted is not None:
        offsets[shifted] = shift
    if near_state == LONG:
        paired = 7
        near = 7 + offsets["X"]
    else:
        paired = 7 + offsets["B"]
        near = int(near_state)
    tail = 7 + offsets.get("U", 0) if tail_state == LONG else int(tail_state)
    bridge = 8 + offsets["G"]
    return paired, near, tail, bridge


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
        assert report["paired_state"] == LONG
        assert report["signed_cells"] == []
        actual = {(row["near_state"], row["tail_state"]): row for row in report["cells"]}
        assert set(actual) == expected_root_keys and len(actual) == 64
        pair_cells = 0

        for (near_state, tail_state), row in actual.items():
            names = coordinate_names(near_state, tail_state)
            near_base = 7 if near_state == LONG else int(near_state)
            tail_base = 7 if tail_state == LONG else int(tail_state)
            base = near_base + tail_base + 1 + 7 + left + right + 8
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
                paired, near, tail, bridge = literal_lengths(
                    near_state, tail_state, shifted, shift
                )
                core = double_claw((near + tail + 1, paired, bridge, left, right))
                deletion = multiply(
                    path(tail), double_claw((near, paired, bridge, left, right))
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
    assert total_cells == 1368 and constants == 1368
    payload = {
        "schema": "rank8-delta2-e2-pendant-two-short-far-pairedlong-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIREDLONG",
        "immutable_input_hashes": EXPECTED,
        "unordered_far_pairs": len(expected_pairs),
        "root_position_patterns": total_patterns,
        "shifted_cells": total_cells,
        "independent_literal_constants_checked": constants,
        "per_far_pair": per_pair,
        "scope": "all unordered far pairs 1<=f1<=f2<=6; paired arm>=7; selected arm/root arbitrary; bridge>=8; n>=23",
        "coverage_guard": "all triangular far keys, near-tail0..6/L keys, coupled X/B/U/G coordinates, and every order-deficit orthant union regenerated",
        "scope_guard": "this audit is the paired-arm>=7 state and does not by itself cover paired arms1..6",
    }
    output = HERE / "rank8_delta2_e2_pendant_two_short_far_pairedlong_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("pairs 21 patterns", total_patterns, "cells", total_cells, "constants", constants)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
