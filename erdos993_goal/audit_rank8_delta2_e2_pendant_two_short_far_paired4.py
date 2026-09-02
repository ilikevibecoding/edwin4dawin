#!/usr/bin/env python3
"""Independent audit of all two-short-far pendant cells with paired arm 4."""

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
REPORT = "rank8_delta2_e2_pendant_far{left}_{right}_paired4_bridge_long_cells_exact_20260820.json"
EXPECTED = {
    "run_rank8_delta2_e2_pendant_far_pair_paired_cell.py": "FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5",
    "rank8_delta2_e2_pendant_far1_1_paired4_bridge_long_cells_exact_20260820.json": "902FB4543A514749335E125C120B51CBC21328E572140AEE0CAA03711C5EC1DA",
    "rank8_delta2_e2_pendant_far1_2_paired4_bridge_long_cells_exact_20260820.json": "0F3DBE24A6913399608D988969E596C63ACBFD1706FBA7EA26997C34C198CAA4",
    "rank8_delta2_e2_pendant_far1_3_paired4_bridge_long_cells_exact_20260820.json": "2A22BE4DBBE8B3C6646E8354C0D95F048FEFFCC38D13DCE40189BD7853EA76C2",
    "rank8_delta2_e2_pendant_far1_4_paired4_bridge_long_cells_exact_20260820.json": "EBC724172C2D300267055D8327F15284C8C3340C090875EA1F62AD119DA765CA",
    "rank8_delta2_e2_pendant_far1_5_paired4_bridge_long_cells_exact_20260820.json": "884953F0940DD4DE64F684F8E7454C297FE1D76AE2DC451900BACFC7B8313352",
    "rank8_delta2_e2_pendant_far1_6_paired4_bridge_long_cells_exact_20260820.json": "6A0A45AAB968992B29B32834227968DCC2DE09F4376854B394654413D46D1B19",
    "rank8_delta2_e2_pendant_far2_2_paired4_bridge_long_cells_exact_20260820.json": "0B982DCD08928E45B854DE226BFA10049B3F4632BBBA64C8E829D0A47C5639DE",
    "rank8_delta2_e2_pendant_far2_3_paired4_bridge_long_cells_exact_20260820.json": "2E086EC4CD39BE89510F02EAAD17A0DB1F362701B93FDCD1E689AA88C40ED4B3",
    "rank8_delta2_e2_pendant_far2_4_paired4_bridge_long_cells_exact_20260820.json": "D58A788CFCE82B8E3E170AA884A20B2C34B5A17E048A60744F938A2E3C95E093",
    "rank8_delta2_e2_pendant_far2_5_paired4_bridge_long_cells_exact_20260820.json": "1BC0DE7620EC381DE1521468100E242D21D6923C598C67A0899CAFD327784835",
    "rank8_delta2_e2_pendant_far2_6_paired4_bridge_long_cells_exact_20260820.json": "AC5EA222EDE4BEE570D1C432C836ECD2BE2DA1B6622A6C2A93F80FEC9750EBE2",
    "rank8_delta2_e2_pendant_far3_3_paired4_bridge_long_cells_exact_20260820.json": "B51C612912089FA1406395513913A027B96962F84991052B21D7A580034194DA",
    "rank8_delta2_e2_pendant_far3_4_paired4_bridge_long_cells_exact_20260820.json": "75482CBAEEF60BB642EB51559C56B75705DA32ACD2DAE1086C36EE60A4DFBFFC",
    "rank8_delta2_e2_pendant_far3_5_paired4_bridge_long_cells_exact_20260820.json": "22F5F4503791888976E03A31E5D00356DD0B645E2F443D59FCFBE3EAD49BFBFF",
    "rank8_delta2_e2_pendant_far3_6_paired4_bridge_long_cells_exact_20260820.json": "935669EBA57CB888447CA23529952F3335CD722A9AC91A5DE00ED44A6AD9A068",
    "rank8_delta2_e2_pendant_far4_4_paired4_bridge_long_cells_exact_20260820.json": "1534A408D35753EA98B1E61CD5DA8E367FA1CFE2F1B3F90974FF6D3DCF91BCF8",
    "rank8_delta2_e2_pendant_far4_5_paired4_bridge_long_cells_exact_20260820.json": "9DA8617A48D98E5F1DEFC8AF56ACF2C8CFCDAF05495BCC5D8524A99FE6E3228A",
    "rank8_delta2_e2_pendant_far4_6_paired4_bridge_long_cells_exact_20260820.json": "78670363C07A26D7135D6CF9A52449F503DF3B8D09B5A55BB97E6ED05ECAE68B",
    "rank8_delta2_e2_pendant_far5_5_paired4_bridge_long_cells_exact_20260820.json": "47D35E9E97BB4DAE7B70737F7B3F88E7FFDCA080A22EA99DFBCADD7C08B6FF60",
    "rank8_delta2_e2_pendant_far5_6_paired4_bridge_long_cells_exact_20260820.json": "27DA323753582AD6BDD1AE2320D372F333BD22A3F59B9C0E07F128233F204419",
    "rank8_delta2_e2_pendant_far6_6_paired4_bridge_long_cells_exact_20260820.json": "6731F3B5C833F5CA128C6C59FCCF96528C877482DB6AACFE6771D65B94B1BDF1",
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
        assert report["paired_state"] == 4
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
            base = near_base + tail_base + 1 + 4 + left + right + 8
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
                core = double_claw((near + tail + 1, 4, bridge, left, right))
                deletion = multiply(path(tail), double_claw((near, 4, bridge, left, right)))
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
        "schema": "rank8-delta2-e2-pendant-two-short-far-paired4-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED4",
        "immutable_input_hashes": EXPECTED,
        "unordered_far_pairs": len(expected_pairs),
        "root_position_patterns": total_patterns,
        "shifted_cells": total_cells,
        "independent_literal_constants_checked": constants,
        "per_far_pair": per_pair,
        "scope": "all unordered far pairs 1<=f1<=f2<=6; paired arm4; selected arm/root arbitrary; bridge>=8; n>=23",
        "coverage_guard": "all triangular far keys, near-tail0..6/L keys, and every order-deficit orthant union regenerated",
        "scope_guard": "paired arms other than4 and bridges<=7 remain outside this theorem",
    }
    output = HERE / "rank8_delta2_e2_pendant_two_short_far_paired4_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("pairs 21 patterns", total_patterns, "cells", total_cells, "constants", constants)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
