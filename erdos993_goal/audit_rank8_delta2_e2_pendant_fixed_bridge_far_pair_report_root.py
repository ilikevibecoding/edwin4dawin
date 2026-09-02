#!/usr/bin/env python3
"""Independent literal/no-gap audit for one fixed-bridge far-pair report."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23 import double_claw, multiply, path
from audit_rank8_delta2_e1_all_order import delta2


ROOT = Path(__file__).resolve().parent
LONG = "L"
ROOT_STATES = [0, 1, 2, 3, 4, 5, 6, LONG]
LENGTH_STATES = [1, 2, 3, 4, 5, 6, LONG]


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def parse_state(value: str):
    if value.upper() == LONG:
        return LONG
    parsed = int(value)
    if parsed not in range(1, 7):
        raise argparse.ArgumentTypeError(value)
    return parsed


def base_value(state):
    return 7 if state == LONG else int(state)


def coordinate_names(paired_state, near_state, tail_state, far_pair):
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
    if far_pair == (LONG, LONG):
        names.append("SR")
    elif LONG in far_pair:
        names.append("F")
    return names


def literal_lengths(paired_state, near_state, tail_state, far_pair, shifted, shift):
    values = {
        name: shift if name == shifted else 0
        for name in coordinate_names(paired_state, near_state, tail_state, far_pair)
    }
    if paired_state == LONG and near_state == LONG:
        paired = 7 + values["X"]
        near = 7
    else:
        paired = 7 + values["B"] if paired_state == LONG else int(paired_state)
        near = 7 + values["N"] if near_state == LONG else int(near_state)
    tail = 7 + values["U"] if tail_state == LONG else int(tail_state)
    if far_pair == (LONG, LONG):
        far = [7 + values["SR"], 7]
    else:
        far = []
        for state in far_pair:
            far.append(7 + values["F"] if state == LONG else int(state))
    return paired, near, tail, far[0], far[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bridge-length", type=int, choices=range(1, 8), required=True)
    parser.add_argument("--far-left", type=parse_state, required=True)
    parser.add_argument("--far-right", type=parse_state, required=True)
    args = parser.parse_args()
    far_pair = (args.far_left, args.far_right)
    if far_pair == (LONG, LONG):
        report_path = ROOT / (
            f"rank8_delta2_e2_pendant_bridge{args.bridge_length}_"
            "far_long_root_side_arbitrary_cells_exact_20260820.json"
        )
    else:
        label = f"bridge{args.bridge_length}_far{far_pair[0]}_{far_pair[1]}".replace("L", "long")
        report_path = ROOT / f"rank8_delta2_e2_pendant_{label}_root_side_arbitrary_cells_exact_root.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    expected_status = (
        "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FIXED_BRIDGE_FAR_LONG_ROOT_SIDE_ARBITRARY"
        if far_pair == (LONG, LONG) else
        "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FIXED_BRIDGE_FAR_PAIR_ROOT_SIDE_ARBITRARY"
    )
    assert report["status"] == expected_status
    assert report["bridge_length"] == args.bridge_length
    if far_pair != (LONG, LONG):
        assert tuple(report["far_pair"]) == far_pair
    assert report["signed_cells"] == []

    expected_keys = {
        (paired, near, tail)
        for paired in LENGTH_STATES for near in ROOT_STATES for tail in ROOT_STATES
    }
    rows = {
        (row["paired_state"], row["near_state"], row["tail_state"]): row
        for row in report["cells"]
    }
    assert set(rows) == expected_keys and len(rows) == 448
    checked = 0
    empty = 0
    global_minimum = None
    for (paired, near, tail), row in rows.items():
        names = coordinate_names(paired, near, tail, far_pair)
        base = (
            base_value(near) + base_value(tail) + 1 + base_value(paired)
            + base_value(far_pair[0]) + base_value(far_pair[1]) + args.bridge_length
        )
        threshold = max(0, 22 - base)
        if threshold and not names:
            variants = set()
            cover = None
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
        if far_pair != (LONG, LONG):
            assert row["empty_by_order_constraint"] == bool(threshold and not names)
        assert set(actual) == variants
        for (shifted, shift), cell in actual.items():
            assert cell["negative_coefficients"] == 0
            minimum = Fraction(cell["minimum_coefficient"])
            constant = Fraction(cell["constant_coefficient"])
            assert minimum > 0 and constant > 0
            global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
            paired_v, near_v, tail_v, far_left, far_right = literal_lengths(
                paired, near, tail, far_pair, shifted, shift
            )
            lengths = (
                near_v + tail_v + 1, paired_v, args.bridge_length, far_left, far_right
            )
            core = double_claw(lengths)
            deletion = multiply(
                path(tail_v),
                double_claw((near_v, paired_v, args.bridge_length, far_left, far_right)),
            )
            assert delta2(core, deletion) == int(constant) > 0
            checked += 1
    expected_cells = (
        report["symbolic_cells"] if far_pair == (LONG, LONG)
        else report["symbolic_cells_completed"]
    )
    expected_empty = 0 if far_pair == (LONG, LONG) else report["empty_patterns"]
    assert checked == expected_cells
    assert empty == expected_empty
    print("PASS_INDEPENDENT_LITERAL_NO_GAP_AUDIT")
    print("report", report_path.name, sha256(report_path))
    print("patterns", len(rows), "empty", empty, "constants", checked)
    print("global_minimum_coefficient", global_minimum)
    print("source_sha256", sha256(Path(__file__)))


if __name__ == "__main__":
    main()
