#!/usr/bin/env python3
"""Independent audit of the far-pair (1,long), paired-all pendant package."""

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
PAIRED_STATES = [1, 2, 3, 4, 5, 6, LONG]
SOURCE = "run_rank8_delta2_e2_pendant_far_pair_paired_cell.py"
REPORT = "rank8_delta2_e2_pendant_far1_long_paired{paired}_bridge_long_cells_exact_20260820.json"
EXPECTED = {
    SOURCE: "FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5",
    REPORT.format(paired=1): "4C2B8D9E8CA01758AB23BA13DF6986B87DC9D8831838517C55A9D5BF7A137CD7",
    REPORT.format(paired=2): "D25028C842B6C7A429D13ED80DEAD231471E61B3B427B03005B5E0CD25837084",
    REPORT.format(paired=3): "BB57014D95505B72CF4991BDC09053E7BFFDEB777695516B147B0787B5C2A50C",
    REPORT.format(paired=4): "A27CF98D0A820D2CD32D95AB7C851EE79E36A48982FFFFC044555EC7D727EDCB",
    REPORT.format(paired=5): "DF02160EF8743C452D0D554B97124374BEC415F1137626DF049960F41C7A4B66",
    REPORT.format(paired=6): "1D5BDB49C46D822F98FDF144023D53B3F8F7C39412CD9FBB9E5F3FE9A7A83DF4",
    REPORT.format(paired="long"): "93642B93A5DFE52E7B13EB6F255061C6C183C1CBF3B46ACD6546CDEB6C7862AB",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def base_value(state, long_base: int) -> int:
    return long_base if state == LONG else int(state)


def coordinate_names(paired_state, near_state, tail_state):
    names = []
    if paired_state == LONG and near_state == LONG:
        names.append("X")
    else:
        if paired_state == LONG:
            names.append("B")
        if near_state == LONG:
            names.append("N")
    if tail_state == LONG:
        names.append("U")
    names.extend(("F", "G"))
    return names


def literal_lengths(paired_state, near_state, tail_state, shifted, shift):
    offsets = {name: 0 for name in coordinate_names(paired_state, near_state, tail_state)}
    if shifted is not None:
        offsets[shifted] = shift
    if paired_state == LONG and near_state == LONG:
        # X is the exact sum of the paired and near offsets.  Assigning it to
        # near gives a literal representative with the same endpoint states.
        paired = 7
        near = 7 + offsets["X"]
    else:
        paired = 7 + offsets.get("B", 0) if paired_state == LONG else int(paired_state)
        near = 7 + offsets.get("N", 0) if near_state == LONG else int(near_state)
    tail = 7 + offsets.get("U", 0) if tail_state == LONG else int(tail_state)
    far_long = 7 + offsets["F"]
    bridge = 8 + offsets["G"]
    return paired, near, tail, far_long, bridge


def main() -> None:
    assert {name: sha256(HERE / name) for name in EXPECTED} == EXPECTED
    expected_root_keys = {(near, tail) for near in ROOT_STATES for tail in ROOT_STATES}
    total_patterns = 0
    total_cells = 0
    constant_checks = 0
    per_paired = {}

    for paired_state in PAIRED_STATES:
        name = REPORT.format(paired="long" if paired_state == LONG else paired_state)
        report = json.loads((HERE / name).read_text())
        assert report["status"] == "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FAR_PAIR_PAIRED_CELL"
        assert report["far_pair"] == [1, LONG]
        assert report["paired_state"] == paired_state
        assert report["signed_cells"] == []
        actual = {(row["near_state"], row["tail_state"]): row for row in report["cells"]}
        assert set(actual) == expected_root_keys and len(actual) == 64

        paired_cells = 0
        for (near_state, tail_state), row in actual.items():
            base = (
                base_value(near_state, 7) + base_value(tail_state, 7) + 1
                + base_value(paired_state, 7) + 1 + 7 + 8
            )
            threshold = max(0, 22 - base)
            names = coordinate_names(paired_state, near_state, tail_state)
            q = math.ceil(threshold / len(names)) if threshold else 0
            expected_variants = (
                {(coordinate, q) for coordinate in names}
                if threshold else {(None, 0)}
            )
            actual_variants = {
                (cell["shifted_coordinate"], cell["shift"]): cell
                for cell in row["cells"]
            }
            assert row["base_suppressed_length_sum"] == base
            assert row["order_constraint_on_offsets"] == threshold
            assert row["cover_coordinate_threshold"] == q
            assert set(actual_variants) == expected_variants

            # If nonnegative integer offsets sum to at least threshold, one of
            # the len(names) coordinates is >=ceil(threshold/len(names)).
            if threshold:
                assert len(names) * (q - 1) < threshold

            for (shifted, shift), cell in actual_variants.items():
                paired, near, tail, far_long, bridge = literal_lengths(
                    paired_state, near_state, tail_state, shifted, shift
                )
                selected = near + tail + 1
                core = double_claw((selected, paired, bridge, 1, far_long))
                deletion = multiply(
                    path(tail), double_claw((near, paired, bridge, 1, far_long))
                )
                literal = delta2(core, deletion)
                assert cell["negative_coefficients"] == 0
                assert Fraction(cell["minimum_coefficient"]) > 0
                assert literal == int(Fraction(cell["constant_coefficient"])) > 0
                constant_checks += 1
                paired_cells += 1

        total_patterns += len(actual)
        total_cells += paired_cells
        per_paired[str(paired_state)] = {
            "root_position_patterns": len(actual),
            "shifted_cells": paired_cells,
        }

    assert total_patterns == 448 and total_cells == 468 and constant_checks == 468
    payload = {
        "schema": "rank8-delta2-e2-pendant-far1-long-paired-all-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_FAR1_LONG_PAIRED_ALL",
        "immutable_input_hashes": EXPECTED,
        "far_pair": [1, LONG],
        "paired_states": PAIRED_STATES,
        "root_position_patterns": total_patterns,
        "shifted_cells": total_cells,
        "independent_literal_constants_checked": constant_checks,
        "per_paired": per_paired,
        "scope": "selected arm/root and paired arm arbitrary; unordered far pair (1,>=7); bridge>=8; n>=23",
        "coverage_guard": "far-pair symmetry, paired 1..6/L, near-tail 0..6/L, and each order-deficit orthant union were regenerated exactly",
        "scope_guard": "this proves one exact far-pair type, not every short-far boundary",
    }
    output = HERE / "rank8_delta2_e2_pendant_far1_long_paired_all_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("patterns", total_patterns, "cells", total_cells, "constants", constant_checks)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
