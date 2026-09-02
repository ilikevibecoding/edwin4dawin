#!/usr/bin/env python3
"""Independent audit of all two-short-far pendant cells with paired arm 3."""

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
REPORT = "rank8_delta2_e2_pendant_far{left}_{right}_paired3_bridge_long_cells_exact_20260820.json"
EXPECTED = {
    "run_rank8_delta2_e2_pendant_far_pair_paired_cell.py": "FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5",
    "rank8_delta2_e2_pendant_far1_1_paired3_bridge_long_cells_exact_20260820.json": "081CC74BFB7655959640D49A4FDA578939705275DA7AFE0BB97C2B0F8E78C54C",
    "rank8_delta2_e2_pendant_far1_2_paired3_bridge_long_cells_exact_20260820.json": "B12D534BBA99EC1E64B1CFEC132C20DD2B19FF072E138953045F177035DA0190",
    "rank8_delta2_e2_pendant_far1_3_paired3_bridge_long_cells_exact_20260820.json": "E9CEC5D7B45AFBBE40A37E5392DBA5184A2A65C61F65D0C6B94AAECC816F7EDD",
    "rank8_delta2_e2_pendant_far1_4_paired3_bridge_long_cells_exact_20260820.json": "44B4640A56A7F285E89A4D56FDC18C266B2AF3A3ADF4FFCFAD583B668713FCDA",
    "rank8_delta2_e2_pendant_far1_5_paired3_bridge_long_cells_exact_20260820.json": "B1B50DC757188FE1ECC8CA04358BA1BAEFB0EE6A835AAFA18995AC253BBBFDD1",
    "rank8_delta2_e2_pendant_far1_6_paired3_bridge_long_cells_exact_20260820.json": "E1C14E3C4172B524B915A7E10D73BE6F4188705BF187B862830E84E851C7463D",
    "rank8_delta2_e2_pendant_far2_2_paired3_bridge_long_cells_exact_20260820.json": "8CEBF881CDD11C6D101FA25A017209696A468006BA3D915D1EBF7AA1D3F8C69F",
    "rank8_delta2_e2_pendant_far2_3_paired3_bridge_long_cells_exact_20260820.json": "32562079B1D59CA3B6D847E2715D3CB234D278B1A3557F5A4E6A5142968DF05D",
    "rank8_delta2_e2_pendant_far2_4_paired3_bridge_long_cells_exact_20260820.json": "D646B3ADB7D07E22CAB85C65735EDFADF8E60A6270373CE7E30C25EF5102ACED",
    "rank8_delta2_e2_pendant_far2_5_paired3_bridge_long_cells_exact_20260820.json": "15FFEE8FF7539A9960431A9B465AB1DB365A578776F015E7EDB93143E8789F3D",
    "rank8_delta2_e2_pendant_far2_6_paired3_bridge_long_cells_exact_20260820.json": "B6B8DD320327942F5C2D6444C1077D40BE9FCB9DF2C6C562A420DC01D4991BA6",
    "rank8_delta2_e2_pendant_far3_3_paired3_bridge_long_cells_exact_20260820.json": "B3CF62B194D2FF818BD4059FF138D178D88E56C8BF256D025E62B001EE04A4C7",
    "rank8_delta2_e2_pendant_far3_4_paired3_bridge_long_cells_exact_20260820.json": "606DB98F344E943DFDC01D357B9499548B630BEB786786DFC10FF3E06303AC58",
    "rank8_delta2_e2_pendant_far3_5_paired3_bridge_long_cells_exact_20260820.json": "280DF6AFB3DEB84887586E960E41BC5B2DF7C216111F26BCE26EA2236129F73B",
    "rank8_delta2_e2_pendant_far3_6_paired3_bridge_long_cells_exact_20260820.json": "1BB3FA11046706B24D6103859CFE39A3D285F73F91489346F7082D9136632EE0",
    "rank8_delta2_e2_pendant_far4_4_paired3_bridge_long_cells_exact_20260820.json": "05DF4FE0E8439A690CBA49A21F64B53366ABAAC2900CB4D67307347B7E8F5593",
    "rank8_delta2_e2_pendant_far4_5_paired3_bridge_long_cells_exact_20260820.json": "E8C928F86B0848118CE851239BFAED8C194BABB69832C4EF42513C9BE1300D64",
    "rank8_delta2_e2_pendant_far4_6_paired3_bridge_long_cells_exact_20260820.json": "DC57B605F75498DD3CE385EDB7E09747D0850C39EE0D55E49CBE5C11C4056887",
    "rank8_delta2_e2_pendant_far5_5_paired3_bridge_long_cells_exact_20260820.json": "B4F2AB2C893C0D283E1628CFCE9F1289CCB651D1BA6EC7349B0D6E0291B05A7A",
    "rank8_delta2_e2_pendant_far5_6_paired3_bridge_long_cells_exact_20260820.json": "1D54B3EFABD65AC2D9635C2CEE72838EE8CDF4E8E860E35EC02524530ACCE8BF",
    "rank8_delta2_e2_pendant_far6_6_paired3_bridge_long_cells_exact_20260820.json": "422B76FF3B60C3F98337290CD7504E7B1049C0104100C44558C03E7D2CDC5D2C",
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
        assert report["paired_state"] == 3
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
            base = near_base + tail_base + 1 + 3 + left + right + 8
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
                core = double_claw((near + tail + 1, 3, bridge, left, right))
                deletion = multiply(path(tail), double_claw((near, 3, bridge, left, right)))
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
    assert total_cells == 1346 and constants == 1346
    payload = {
        "schema": "rank8-delta2-e2-pendant-two-short-far-paired3-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED3",
        "immutable_input_hashes": EXPECTED,
        "unordered_far_pairs": len(expected_pairs),
        "root_position_patterns": total_patterns,
        "shifted_cells": total_cells,
        "independent_literal_constants_checked": constants,
        "per_far_pair": per_pair,
        "scope": "all unordered far pairs 1<=f1<=f2<=6; paired arm3; selected arm/root arbitrary; bridge>=8; n>=23",
        "coverage_guard": "all triangular far keys, near-tail0..6/L keys, and every order-deficit orthant union regenerated",
        "scope_guard": "paired arms other than3 and bridges<=7 remain outside this theorem",
    }
    output = HERE / "rank8_delta2_e2_pendant_two_short_far_paired3_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("pairs 21 patterns", total_patterns, "cells", total_cells, "constants", constants)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
