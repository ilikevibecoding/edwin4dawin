#!/usr/bin/env python3
"""Independent aggregate/no-gap audit for every bridge-rooted e=2 state."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23 import claw, double_claw, multiply
from audit_rank8_delta2_e1_all_order import delta2


ROOT = Path(__file__).resolve().parent
LONG = "L"
LENGTH_STATES = [1, 2, 3, 4, 5, 6, LONG]
GAP_STATES = [0, 1, 2, 3, 4, 5, LONG]
PAIR_TYPES = [
    (left, right)
    for index, left in enumerate(LENGTH_STATES)
    for right in LENGTH_STATES[index:]
]
SWEEP_REPORT = ROOT / "rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_exact_root_20260823.json"
AUDIT_REPORT = ROOT / "rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_independent_audit_exact_root_20260823.json"
IDENTITY_REPORT = ROOT / "rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json"

# The aggregate sweep hash is filled only after the producer finishes.  The
# other hashes pin the exact frozen producer, orchestrator, and long-pair
# identity packages used by the sweep.
EXPECTED = {
    "audit_rank8_delta013_e2_double_claws_n23.py":
        "F6052968F9924B4D2A49EEC6A5650B8F36EE06B43984C0125784B6A4F1669B82",
    "audit_rank8_delta2_e1_all_order.py":
        "7F2D9FEB80138E36491D0133CDFD78C27690B4DA3C1FEF65D244315F14AB587C",
    "run_rank8_delta2_e2_bridge_fixed_arm_pairs_all_root_positions_root.py":
        "7AEBCE311A7407D93C37CBF8C2B18D0C0F3E8FB37934B2A896BF38458477A700",
    "verify_rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_root.py":
        "79A0A1BDB17DA6DABA73D3FB7430E5B56B6BA5A954D4E8DD69BBAA57FF3CB50F",
    "audit_rank8_delta2_e2_long_pair_sum_identity.py":
        "A63B505EA6F50FFAACB6DBBBCF1A5707E5105122FFE65D9A846117DD7688005B",
    "rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json":
        "3D08D942263C416BD799F4BBA5822B3289CD92BCBEE936520D95B23FFD2CAB46",
    SWEEP_REPORT.name: "2D4CB3907B77C38859F081C8BF894839E4CD2E73C10A5BF8858C2AD5E45A1B91",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def normalize(value):
    return LONG if str(value).upper() == LONG else int(value)


def normalize_pair(values) -> tuple[int | str, int | str]:
    return normalize(values[0]), normalize(values[1])


def pair_base(pair_type: tuple[int | str, int | str]) -> int:
    return sum(7 if value == LONG else int(value) for value in pair_type)


def gap_base(state: int | str) -> int:
    return 6 if state == LONG else int(state)


def coordinate_names(left_pair, right_pair, left_gap, right_gap):
    names = []
    if LONG in left_pair:
        names.append("SL")
    if LONG in right_pair:
        names.append("SR")
    if left_gap == LONG:
        names.append("X")
    if right_gap == LONG:
        names.append("Y")
    return names


def literal_pair(pair_type, coordinate_value: int) -> tuple[int, int]:
    if LONG not in pair_type:
        return int(pair_type[0]), int(pair_type[1])
    if pair_type == (LONG, LONG):
        # The pinned independent identity proves this representative has the
        # endpoint states of every split with the same offset sum.
        return 7 + coordinate_value, 7
    return int(pair_type[0]), 7 + coordinate_value


def literal_lengths(left_pair, right_pair, left_gap, right_gap, shifted, shift):
    values = {
        name: shift if name == shifted else 0
        for name in coordinate_names(left_pair, right_pair, left_gap, right_gap)
    }
    left_arms = literal_pair(left_pair, values.get("SL", 0))
    right_arms = literal_pair(right_pair, values.get("SR", 0))
    left_gap_value = 6 + values.get("X", 0) if left_gap == LONG else int(left_gap)
    right_gap_value = 6 + values.get("Y", 0) if right_gap == LONG else int(right_gap)
    return left_arms, right_arms, left_gap_value, right_gap_value


def task_key(left_pair, right_pair):
    return left_pair, right_pair


def report_name(left_pair, right_pair) -> str:
    label = (
        f"left{left_pair[0]}_{left_pair[1]}_right{right_pair[0]}_{right_pair[1]}"
        .replace("L", "long")
    )
    return f"rank8_delta2_e2_bridge_{label}_all_root_positions_exact_root.json"


def main() -> None:
    assert EXPECTED[SWEEP_REPORT.name] != "FILL_AFTER_SWEEP"
    for name, expected_hash in EXPECTED.items():
        assert sha256(ROOT / name) == expected_hash, name

    identity = json.loads(IDENTITY_REPORT.read_text(encoding="utf-8"))
    assert identity["status"] == (
        "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_LONG_PAIR_SUM_AND_ROOT_CELLS"
    )

    sweep = json.loads(SWEEP_REPORT.read_text(encoding="utf-8"))
    assert sweep["status"] == (
        "PASS_EXACT_RANK8_DELTA2_E2_BRIDGE_ALL_ARM_PAIRS_ALL_ROOT_POSITIONS"
    )
    assert sweep["immutable_inputs"] == {
        "run_rank8_delta2_e2_bridge_fixed_arm_pairs_all_root_positions_root.py":
            EXPECTED["run_rank8_delta2_e2_bridge_fixed_arm_pairs_all_root_positions_root.py"]
    }
    assert sweep["source_sha256"] == EXPECTED[
        "verify_rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_root.py"
    ]

    expected_tasks = {
        task_key(left_pair, right_pair)
        for index, left_pair in enumerate(PAIR_TYPES)
        for right_pair in PAIR_TYPES[index:]
    }
    summary_rows = {
        task_key(normalize_pair(row["left_arm_pair"]), normalize_pair(row["right_arm_pair"])): row
        for row in sweep["rows"]
    }
    assert set(summary_rows) == expected_tasks
    assert len(expected_tasks) == 406

    total_patterns = 0
    total_empty = 0
    total_constants = 0
    total_reports = 0
    global_minimum = None
    report_hash_stream = hashlib.sha256()

    for left_pair, right_pair in sorted(
        expected_tasks,
        key=lambda item: (PAIR_TYPES.index(item[0]), PAIR_TYPES.index(item[1])),
    ):
        summary = summary_rows[(left_pair, right_pair)]
        path_value = ROOT / report_name(left_pair, right_pair)
        assert summary["report"] == path_value.name
        report_hash = sha256(path_value)
        assert summary["report_sha256"] == report_hash
        report_hash_stream.update(f"{path_value.name}\0{report_hash}\n".encode("ascii"))

        report = json.loads(path_value.read_text(encoding="utf-8"))
        assert report["status"] == (
            "PASS_EXACT_RANK8_DELTA2_E2_BRIDGE_FIXED_ARM_PAIRS_ALL_ROOT_POSITIONS"
        )
        assert normalize_pair(report["left_arm_pair"]) == left_pair
        assert normalize_pair(report["right_arm_pair"]) == right_pair
        assert report["signed_cells"] == []

        expected_gaps = (
            {
                (left, right)
                for index, left in enumerate(GAP_STATES)
                for right in GAP_STATES[index:]
            }
            if left_pair == right_pair
            else {(left, right) for left in GAP_STATES for right in GAP_STATES}
        )
        rows = {
            (normalize(row["left_gap_state"]), normalize(row["right_gap_state"])): row
            for row in report["cells"]
        }
        assert set(rows) == expected_gaps

        report_empty = 0
        report_constants = 0
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
                report_empty += 1
            elif threshold:
                cover = math.ceil(threshold / len(names))
                variants = {(name, cover) for name in names}
                assert len(names) * (cover - 1) < threshold <= len(names) * cover
            else:
                cover = 0
                variants = {(None, 0)}

            actual = {
                (cell["shifted_coordinate"], cell["shift"]): cell
                for cell in row["cells"]
            }
            assert row["base_suppressed_length_sum"] == base
            assert row["order_constraint_on_offsets"] == threshold
            assert row["cover_coordinate_threshold"] == cover
            assert row["empty_by_order_constraint"] == bool(threshold and not names)
            assert set(actual) == variants

            for (shifted, shift), cell in actual.items():
                assert cell["negative_coefficients"] == 0
                minimum = Fraction(cell["minimum_coefficient"])
                constant = Fraction(cell["constant_coefficient"])
                assert minimum > 0 and constant > 0
                global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)

                left_arms, right_arms, left_gap_value, right_gap_value = literal_lengths(
                    left_pair, right_pair, left_gap, right_gap, shifted, shift
                )
                bridge = left_gap_value + right_gap_value + 2
                core = double_claw((*left_arms, bridge, *right_arms))
                deletion = multiply(
                    claw((*left_arms, left_gap_value)),
                    claw((*right_arms, right_gap_value)),
                )
                assert delta2(core, deletion) == int(constant) > 0
                report_constants += 1

        assert len(rows) == report["patterns_completed"] == summary["patterns"]
        assert report_empty == report["empty_patterns"] == summary["empty_patterns"]
        assert report_constants == report["symbolic_cells_completed"] == summary["symbolic_cells"]
        assert summary["signed_cells"] == 0
        total_patterns += len(rows)
        total_empty += report_empty
        total_constants += report_constants
        total_reports += 1

    assert total_reports == sweep["side_pair_tasks"] == 406
    assert total_patterns == sweep["patterns"]
    assert total_empty == sweep["empty_patterns"]
    assert total_constants == sweep["symbolic_cells"]
    assert sweep["signed_cells"] == 0

    payload = {
        "schema": "rank8-delta2-e2-bridge-all-arm-pairs-all-root-positions-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_NO_GAP_AUDIT_RANK8_DELTA2_E2_BRIDGE_ALL_ARM_PAIRS_ALL_ROOT_POSITIONS",
        "scope": "every bridge-interior root of every e=2 double claw, arbitrary positive arm/bridge lengths, order n>=23",
        "arm_pair_types": len(PAIR_TYPES),
        "side_pair_reports": total_reports,
        "gap_patterns": total_patterns,
        "empty_patterns": total_empty,
        "literal_constants_rebuilt": total_constants,
        "global_minimum_coefficient": str(global_minimum),
        "report_hash_stream_sha256": report_hash_stream.hexdigest().upper(),
        "immutable_input_hashes": EXPECTED,
        "coverage_argument": "if m nonnegative long offsets sum to at least T, one is at least ceil(T/m); the corresponding shifted orthants exhaust the exact order region",
        "root_deletion_identity": "deleting an internal bridge root gives the product of the two adjacent literal claw independence polynomials",
        "long_pair_identity_report": IDENTITY_REPORT.name,
    }
    AUDIT_REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("reports", total_reports, "patterns", total_patterns, "empty", total_empty, "constants", total_constants)
    print("global_minimum_coefficient", global_minimum)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(AUDIT_REPORT))


if __name__ == "__main__":
    main()
