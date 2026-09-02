#!/usr/bin/env python3
"""Independent no-gap audit of the branch-rooted e=2 Delta2 cells."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23 import claw, double_claw, path, product
from audit_rank8_delta2_e1_all_order import delta2


HERE = Path(__file__).resolve().parent
LONG = "L"
EXPECTED = {
    "run_rank8_delta2_e2_branch_short_long_cells.py": "DBC56B368C6033336568B05215EEC173DB428CF4AA16C477D123AE245391040B",
    "rank8_delta2_e2_branch_short_long_0coord_exact_20260820.json": "1D5700803A1371E9E19566147EA5E592A676C243766F92180640969AB5D3E7DD",
    "rank8_delta2_e2_branch_short_long_1coord_exact_20260820.json": "3BE314AF1A92FB3B4FA5F3467572598B390B5C64CAFED0B2B99C6666BA2BBF1D",
    "rank8_delta2_e2_branch_short_long_2coord_exact_20260820.json": "6E1F3A98E72E47B3E98A0E265AF16FD1FFC619BEDBE5C4A52FC0A9C2A635C590",
    "rank8_delta2_e2_branch_short_long_3coord_exact_20260820.json": "78F7ED3CCFD3C2E93CC3DBA71E349249D067AAA6D23C4A932265EF52FD97D6BF",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pair_types():
    values = [1, 2, 3, 4, 5, 6, LONG]
    return [(left, right) for index, left in enumerate(values) for right in values[index:]]


def variable_pair(pair) -> bool:
    return LONG in pair


def pair_base(pair) -> int:
    return sum(7 if value == LONG else int(value) for value in pair)


def universe(coordinate_count: int):
    for root_pair in pair_types():
        for far_pair in pair_types():
            for bridge in [1, 2, 3, 4, 5, 6, 7, LONG]:
                count = int(variable_pair(root_pair)) + int(variable_pair(far_pair)) + int(bridge == LONG)
                if count == coordinate_count:
                    yield root_pair, far_pair, bridge


def literal_pair(pair, coordinate_shift: int) -> tuple[int, int]:
    if pair.count(LONG) == 0:
        return int(pair[0]), int(pair[1])
    if pair.count(LONG) == 1:
        return int(pair[0]), 7 + coordinate_shift
    # The exact long-long endpoint state depends only on the offset sum; put
    # the full shifted sum on one arm for an independent literal realization.
    return 7, 7 + coordinate_shift


def independent_constant(row: dict, cell: dict) -> int:
    shifted = cell["shifted_coordinate"]
    shift = int(cell["shift"])
    root_shift = shift if shifted == "root_pair" else 0
    far_shift = shift if shifted == "far_pair" else 0
    bridge_shift = shift if shifted == "bridge" else 0
    root_pair = literal_pair(tuple(row["root_pair"]), root_shift)
    far_pair = literal_pair(tuple(row["far_pair"]), far_shift)
    bridge = 8 + bridge_shift if row["bridge"] == LONG else int(row["bridge"])
    core = double_claw((root_pair[0], root_pair[1], bridge, far_pair[0], far_pair[1]))
    deletion = product(
        [path(root_pair[0]), path(root_pair[1]), claw((far_pair[0], far_pair[1], bridge - 1))]
    )
    return delta2(core, deletion)


def main() -> None:
    assert {name: sha256(HERE / name) for name in EXPECTED} == EXPECTED
    expected_summary = {
        0: {"patterns": 636, "cells": 636, "irrelevant": 2451},
        1: {"patterns": 2499, "cells": 2499, "irrelevant": 0},
        2: {"patterns": 637, "cells": 698, "irrelevant": 0},
        3: {"patterns": 49, "cells": 49, "irrelevant": 0},
    }
    total_patterns = 0
    total_cells = 0
    constants_checked = 0
    for coordinate_count in range(4):
        report = json.loads(
            (HERE / f"rank8_delta2_e2_branch_short_long_{coordinate_count}coord_exact_20260820.json").read_text()
        )
        assert report["status"] == "PASS_POSITIVE_COEFFICIENT_CELLS"
        full = list(universe(coordinate_count))
        relevant = []
        irrelevant = []
        for pattern in full:
            root_pair, far_pair, bridge = pattern
            base = pair_base(root_pair) + pair_base(far_pair) + (8 if bridge == LONG else int(bridge))
            if coordinate_count == 0 and base < 22:
                irrelevant.append(pattern)
            else:
                relevant.append(pattern)
        actual = {
            (tuple(row["root_pair"]), tuple(row["far_pair"]), row["bridge"]): row
            for row in report["patterns"]
        }
        assert len(actual) == len(report["patterns"])
        assert set(actual) == set(relevant)
        assert report["patterns_checked"] == expected_summary[coordinate_count]["patterns"] == len(relevant)
        assert report["irrelevant_fixed_patterns_below_n23"] == expected_summary[coordinate_count]["irrelevant"] == len(irrelevant)

        cells_here = 0
        for pattern in relevant:
            root_pair, far_pair, bridge = pattern
            row = actual[pattern]
            base = pair_base(root_pair) + pair_base(far_pair) + (8 if bridge == LONG else int(bridge))
            threshold = max(0, 22 - base)
            coordinates = []
            if variable_pair(root_pair):
                coordinates.append("root_pair")
            if variable_pair(far_pair):
                coordinates.append("far_pair")
            if bridge == LONG:
                coordinates.append("bridge")
            if threshold == 0:
                variants = {(None, 0)}
                q = 0
            else:
                q = math.ceil(threshold / len(coordinates))
                variants = {(name, q) for name in coordinates}
            assert row["base_suppressed_length_sum"] == base
            assert row["order_constraint_on_offsets"] == threshold
            assert row["cover_coordinate_threshold"] == q
            assert {(cell["shifted_coordinate"], cell["shift"]) for cell in row["cells"]} == variants
            for cell in row["cells"]:
                assert cell["negative_coefficients"] == 0
                assert Fraction(cell["minimum_coefficient"]) > 0
                assert Fraction(cell["constant_coefficient"]) > 0
                assert independent_constant(row, cell) == int(Fraction(cell["constant_coefficient"]))
                constants_checked += 1
            cells_here += len(row["cells"])
        assert cells_here == report["symbolic_cells_checked"] == expected_summary[coordinate_count]["cells"]
        assert report["signed_cell_count"] == 0 and report["signed_cells"] == []
        total_patterns += len(relevant)
        total_cells += cells_here

    assert total_patterns == 3821 and total_cells == constants_checked == 3882
    payload = {
        "schema": "rank8-delta2-e2-branch-all-order-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_BRANCH_ALL_ORDER",
        "immutable_input_hashes": EXPECTED,
        "coverage": {
            "root_pair_types": 28,
            "far_pair_types": 28,
            "bridge_types": 8,
            "relevant_patterns": total_patterns,
            "positive_symbolic_cells": total_cells,
            "independent_literal_constants_checked": constants_checked,
            "by_aggregate_long_coordinate_count": expected_summary,
        },
        "no_gap": "each pendant arm is fixed 1..6 or long X+7; the bridge is fixed 1..7 or long G+8; n>=23 is suppressed-length sum>=22; every positive offset-sum constraint is covered by shifting each coordinate by ceil(T/m)",
        "root_scope": "either degree-3 branch vertex, using side reversal to call it the root side",
        "theorem": "Delta^2 R_1>0 for every branch-rooted e=2 double claw of order n>=23",
        "scope_guard": "pendant-arm and bridge-interior roots still require their short-boundary certificates",
    }
    output = HERE / "rank8_delta2_e2_branch_all_order_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("patterns", total_patterns, "cells", total_cells)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
