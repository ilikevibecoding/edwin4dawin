#!/usr/bin/env python3
"""Independent audit of the bounded far-(1,1), paired-1 pendant cell."""

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
REPORT = "rank8_delta2_e2_pendant_far1_1_paired1_bridge_long_cells_exact_20260820.json"
EXPECTED = {
    "run_rank8_delta2_e2_pendant_far_pair_paired_cell.py":
        "FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5",
    REPORT: "9B709806D636A224016059C15E968AA7629E9B7E7E3B611395681B04AF12FC64",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert {name: sha256(HERE / name) for name in EXPECTED} == EXPECTED
    report = json.loads((HERE / REPORT).read_text())
    assert report["status"] == "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FAR_PAIR_PAIRED_CELL"
    assert report["far_pair"] == [1, 1] and report["paired_state"] == 1
    assert report["signed_cells"] == []
    states = [0, 1, 2, 3, 4, 5, 6, LONG]
    keys = {(near, tail) for near in states for tail in states}
    actual = {(row["near_state"], row["tail_state"]): row for row in report["cells"]}
    assert set(actual) == keys and len(actual) == 64
    constants = 0
    cells = 0
    for (near_state, tail_state), row in actual.items():
        names = []
        if near_state == LONG:
            names.append("N")
        if tail_state == LONG:
            names.append("U")
        names.append("G")
        near_base = 7 if near_state == LONG else int(near_state)
        tail_base = 7 if tail_state == LONG else int(tail_state)
        base = near_base + tail_base + 1 + 1 + 1 + 1 + 8
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
            core = double_claw((near + tail + 1, 1, bridge, 1, 1))
            deletion = multiply(path(tail), double_claw((near, 1, bridge, 1, 1)))
            literal = delta2(core, deletion)
            assert cell["negative_coefficients"] == 0
            assert Fraction(cell["minimum_coefficient"]) > 0
            assert literal == int(Fraction(cell["constant_coefficient"])) > 0
            constants += 1
            cells += 1
    assert cells == 70 and constants == 70
    payload = {
        "schema": "rank8-delta2-e2-pendant-far11-paired1-bridge-long-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_FAR11_PAIRED1_BRIDGE_LONG",
        "immutable_input_hashes": EXPECTED,
        "root_position_patterns": 64,
        "shifted_cells": cells,
        "independent_literal_constants_checked": constants,
        "scope": "far pair (1,1), paired arm1, selected arm/root arbitrary, bridge>=8, n>=23",
        "scope_guard": "bounded representative only; no claim for other two-short-far pairs",
    }
    output = HERE / "rank8_delta2_e2_pendant_far11_paired1_bridge_long_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("patterns 64 cells", cells, "constants", constants)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
