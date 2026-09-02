#!/usr/bin/env python3
"""Independent literal/no-gap audit for one bridge-root fixed-arm-pair report."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23 import claw, double_claw, multiply
from audit_rank8_delta2_e1_all_order import delta2
from run_rank8_delta2_e2_bridge_fixed_arm_pairs_all_root_positions_root import (
    GAP_STATES, LONG, PAIR_TYPES, coordinate_names, gap_base, pair_base,
)


ROOT = Path(__file__).resolve().parent


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def parse_length(value: str):
    if value.upper() == LONG:
        return LONG
    parsed = int(value)
    if parsed not in range(1, 7):
        raise argparse.ArgumentTypeError(value)
    return parsed


def literal_pair(pair_type, coordinate_value):
    if LONG not in pair_type:
        return int(pair_type[0]), int(pair_type[1])
    if pair_type == (LONG, LONG):
        return 7 + coordinate_value, 7
    fixed = int(pair_type[0]) if pair_type[0] != LONG else int(pair_type[1])
    return fixed, 7 + coordinate_value


def literal_lengths(left_pair, right_pair, left_gap, right_gap, shifted, shift):
    values = {
        name: shift if name == shifted else 0
        for name in coordinate_names(left_pair, right_pair, left_gap, right_gap)
    }
    left_arms = literal_pair(left_pair, values.get("SL", 0))
    right_arms = literal_pair(right_pair, values.get("SR", 0))
    left_gap_value = 6 + values["X"] if left_gap == LONG else int(left_gap)
    right_gap_value = 6 + values["Y"] if right_gap == LONG else int(right_gap)
    return left_arms, right_arms, left_gap_value, right_gap_value


def report_path(left_pair, right_pair):
    label = (
        f"left{left_pair[0]}_{left_pair[1]}_right{right_pair[0]}_{right_pair[1]}"
        .replace("L", "long")
    )
    return ROOT / f"rank8_delta2_e2_bridge_{label}_all_root_positions_exact_root.json"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--left-a", type=parse_length, required=True)
    parser.add_argument("--left-b", type=parse_length, required=True)
    parser.add_argument("--right-a", type=parse_length, required=True)
    parser.add_argument("--right-b", type=parse_length, required=True)
    args = parser.parse_args()
    left_pair = (args.left_a, args.left_b)
    right_pair = (args.right_a, args.right_b)
    assert left_pair in PAIR_TYPES and right_pair in PAIR_TYPES
    assert PAIR_TYPES.index(left_pair) <= PAIR_TYPES.index(right_pair)
    path_value = report_path(left_pair, right_pair)
    report = json.loads(path_value.read_text(encoding="utf-8"))
    assert report["status"] == (
        "PASS_EXACT_RANK8_DELTA2_E2_BRIDGE_FIXED_ARM_PAIRS_ALL_ROOT_POSITIONS"
    )
    assert tuple(report["left_arm_pair"]) == left_pair
    assert tuple(report["right_arm_pair"]) == right_pair
    assert report["signed_cells"] == []
    expected_gaps = (
        {(left, right) for index, left in enumerate(GAP_STATES) for right in GAP_STATES[index:]}
        if left_pair == right_pair
        else {(left, right) for left in GAP_STATES for right in GAP_STATES}
    )
    rows = {
        (row["left_gap_state"], row["right_gap_state"]): row for row in report["cells"]
    }
    assert set(rows) == expected_gaps
    empty = 0
    checked = 0
    global_minimum = None
    for (left_gap, right_gap), row in rows.items():
        names = coordinate_names(left_pair, right_pair, left_gap, right_gap)
        base = (
            pair_base(left_pair) + pair_base(right_pair)
            + gap_base(left_gap) + gap_base(right_gap) + 2
        )
        threshold = max(0, 22 - base)
        if threshold and not names:
            cover = None
            variants = set()
            empty += 1
        elif threshold:
            cover = math.ceil(threshold / len(names))
            variants = {(name, cover) for name in names}
            assert len(names) * (cover - 1) < threshold
        else:
            cover = 0
            variants = {(None, 0)}
        actual = {
            (cell["shifted_coordinate"], cell["shift"]): cell for cell in row["cells"]
        }
        assert row["base_suppressed_length_sum"] == base
        assert row["order_constraint_on_offsets"] == threshold
        assert row["cover_coordinate_threshold"] == cover
        assert row["empty_by_order_constraint"] == bool(threshold and not names)
        assert set(actual) == variants
        for (shifted_coordinate, shift), cell in actual.items():
            assert cell["negative_coefficients"] == 0
            minimum = Fraction(cell["minimum_coefficient"])
            constant = Fraction(cell["constant_coefficient"])
            assert minimum > 0 and constant > 0
            global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
            left_arms, right_arms, left_gap_value, right_gap_value = literal_lengths(
                left_pair, right_pair, left_gap, right_gap, shifted_coordinate, shift
            )
            bridge = left_gap_value + right_gap_value + 2
            core = double_claw((*left_arms, bridge, *right_arms))
            deletion = multiply(
                claw((*left_arms, left_gap_value)),
                claw((*right_arms, right_gap_value)),
            )
            assert delta2(core, deletion) == int(constant) > 0
            checked += 1
    assert empty == report["empty_patterns"]
    assert checked == report["symbolic_cells_completed"]
    print("PASS_INDEPENDENT_LITERAL_NO_GAP_AUDIT")
    print("report", path_value.name, sha256(path_value))
    print("patterns", len(rows), "empty", empty, "constants", checked)
    print("global_minimum_coefficient", global_minimum)
    print("source_sha256", sha256(Path(__file__)))


if __name__ == "__main__":
    main()
