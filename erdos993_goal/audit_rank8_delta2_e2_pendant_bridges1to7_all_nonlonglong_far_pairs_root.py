#!/usr/bin/env python3
"""Independent aggregate audit of short-bridge pendant roots, excluding LL far pairs."""

from __future__ import annotations

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
FAR_PAIRS = [
    (left, right)
    for index, left in enumerate(LENGTH_STATES)
    for right in LENGTH_STATES[index:]
    if (left, right) != (LONG, LONG)
]
SWEEP_REPORT = ROOT / "rank8_delta2_e2_pendant_bridges1to7_all_far_pairs_exact_root_20260823.json"
AUDIT_REPORT = ROOT / "rank8_delta2_e2_pendant_bridges1to7_all_nonlonglong_far_pairs_independent_audit_exact_root_20260823.json"
IDENTITY_REPORT = ROOT / "rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json"

EXPECTED = {
    "audit_rank8_delta013_e2_double_claws_n23.py":
        "F6052968F9924B4D2A49EEC6A5650B8F36EE06B43984C0125784B6A4F1669B82",
    "audit_rank8_delta2_e1_all_order.py":
        "7F2D9FEB80138E36491D0133CDFD78C27690B4DA3C1FEF65D244315F14AB587C",
    "run_rank8_delta2_e2_pendant_fixed_bridge_far_pair_root_side_arbitrary_cells_root.py":
        "5C0B2046275275074C893DAA875D6A34D37FE7DB85C5DE25CBD1491E7E3FABD2",
    "verify_rank8_delta2_e2_pendant_short_bridge_all_far_pairs_root.py":
        "E917CD91D6394F38AE4226F60D9378E4EBA665BBB564E510498E0FD5E65E59C0",
    "verify_rank8_delta2_e2_pendant_bridges1to7_all_far_pairs_root.py":
        "1C7FA00142227C7B1A5CEAF63DB94ED4EFAF7B01C283720E82D5550FBD8B6115",
    "audit_rank8_delta2_e2_long_pair_sum_identity.py":
        "A63B505EA6F50FFAACB6DBBBCF1A5707E5105122FFE65D9A846117DD7688005B",
    "rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json":
        "3D08D942263C416BD799F4BBA5822B3289CD92BCBEE936520D95B23FFD2CAB46",
    SWEEP_REPORT.name: "F7B5428F35498B5A7672614C5240CD74A798EB72226BBDB623829C3F4569A9C5",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def normalize(value):
    return LONG if str(value).upper() == LONG else int(value)


def normalize_pair(values):
    return normalize(values[0]), normalize(values[1])


def base_value(state) -> int:
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
    if LONG in far_pair:
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
        paired = 7 + values.get("B", 0) if paired_state == LONG else int(paired_state)
        near = 7 + values.get("N", 0) if near_state == LONG else int(near_state)
    tail = 7 + values.get("U", 0) if tail_state == LONG else int(tail_state)
    far = tuple(
        7 + values.get("F", 0) if state == LONG else int(state)
        for state in far_pair
    )
    return paired, near, tail, far[0], far[1]


def report_name(bridge, far_pair) -> str:
    label = f"bridge{bridge}_far{far_pair[0]}_{far_pair[1]}".replace("L", "long")
    return f"rank8_delta2_e2_pendant_{label}_root_side_arbitrary_cells_exact_root.json"


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
        "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_SHORT_BRIDGES_ALL_NONLONGLONG_FAR_PAIRS"
    )
    assert sweep["bridges"] == list(range(1, 8))
    assert sweep["immutable_inputs"] == {
        "run_rank8_delta2_e2_pendant_fixed_bridge_far_pair_root_side_arbitrary_cells_root.py":
            EXPECTED["run_rank8_delta2_e2_pendant_fixed_bridge_far_pair_root_side_arbitrary_cells_root.py"]
    }
    assert sweep["source_sha256"] == EXPECTED[
        "verify_rank8_delta2_e2_pendant_short_bridge_all_far_pairs_root.py"
    ]

    expected_tasks = {
        (bridge, far_pair) for bridge in range(1, 8) for far_pair in FAR_PAIRS
    }
    summary_rows = {
        (int(row["bridge_length"]), normalize_pair(row["far_pair"])): row
        for row in sweep["rows"]
    }
    assert set(summary_rows) == expected_tasks
    assert len(expected_tasks) == 189

    expected_states = {
        (paired, near, tail)
        for paired in LENGTH_STATES
        for near in ROOT_STATES
        for tail in ROOT_STATES
    }
    assert len(expected_states) == 448

    total_patterns = 0
    total_empty = 0
    total_constants = 0
    global_minimum = None
    report_hash_stream = hashlib.sha256()

    for bridge, far_pair in sorted(
        expected_tasks,
        key=lambda item: (item[0], FAR_PAIRS.index(item[1])),
    ):
        summary = summary_rows[(bridge, far_pair)]
        path_value = ROOT / report_name(bridge, far_pair)
        assert summary["report"] == path_value.name
        report_hash = sha256(path_value)
        assert summary["report_sha256"] == report_hash
        report_hash_stream.update(f"{path_value.name}\0{report_hash}\n".encode("ascii"))

        report = json.loads(path_value.read_text(encoding="utf-8"))
        assert report["status"] == (
            "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FIXED_BRIDGE_FAR_PAIR_ROOT_SIDE_ARBITRARY"
        )
        assert report["bridge_length"] == bridge
        assert normalize_pair(report["far_pair"]) == far_pair
        assert report["signed_cells"] == []
        rows = {
            (
                normalize(row["paired_state"]),
                normalize(row["near_state"]),
                normalize(row["tail_state"]),
            ): row
            for row in report["cells"]
        }
        assert set(rows) == expected_states

        report_empty = 0
        report_constants = 0
        for (paired, near, tail), row in rows.items():
            names = coordinate_names(paired, near, tail, far_pair)
            base = (
                base_value(near) + base_value(tail) + 1 + base_value(paired)
                + base_value(far_pair[0]) + base_value(far_pair[1]) + bridge
            )
            threshold = max(0, 22 - base)
            if threshold and not names:
                variants = set()
                cover = None
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

                paired_v, near_v, tail_v, far_left, far_right = literal_lengths(
                    paired, near, tail, far_pair, shifted, shift
                )
                core = double_claw((
                    near_v + tail_v + 1,
                    paired_v,
                    bridge,
                    far_left,
                    far_right,
                ))
                deletion = multiply(
                    path(tail_v),
                    double_claw((near_v, paired_v, bridge, far_left, far_right)),
                )
                assert delta2(core, deletion) == int(constant) > 0
                report_constants += 1

        assert len(rows) == report["patterns_completed"] == summary["patterns"] == 448
        assert report_empty == report["empty_patterns"] == summary["empty_patterns"]
        assert report_constants == report["symbolic_cells_completed"] == summary["symbolic_cells"]
        assert summary["signed_cells"] == 0
        total_patterns += len(rows)
        total_empty += report_empty
        total_constants += report_constants

    assert sweep["tasks"] == len(expected_tasks) == 189
    assert sweep["patterns"] == total_patterns
    assert sweep["empty_patterns"] == total_empty
    assert sweep["symbolic_cells"] == total_constants
    assert sweep["signed_cells"] == 0

    payload = {
        "schema": "rank8-delta2-e2-pendant-bridges1to7-all-nonlonglong-far-pairs-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_NO_GAP_AUDIT_RANK8_DELTA2_E2_PENDANT_BRIDGES1TO7_ALL_NONLONGLONG_FAR_PAIRS",
        "scope": "every pendant root of every e=2 double claw with bridge length 1..7 and far-arm pair other than long-long, order n>=23",
        "bridges": list(range(1, 8)),
        "far_pair_states_per_bridge": len(FAR_PAIRS),
        "reports": len(expected_tasks),
        "patterns": total_patterns,
        "empty_patterns": total_empty,
        "literal_constants_rebuilt": total_constants,
        "global_minimum_coefficient": str(global_minimum),
        "report_hash_stream_sha256": report_hash_stream.hexdigest().upper(),
        "immutable_input_hashes": EXPECTED,
        "coverage_argument": "if m nonnegative long offsets sum to at least T, one is at least ceil(T/m); the corresponding shifted orthants exhaust the exact order region",
        "root_deletion_identity": "deleting the pendant-arm root gives a tail path times the remaining literal double claw",
        "long_pair_identity_report": IDENTITY_REPORT.name,
    }
    AUDIT_REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("reports", len(expected_tasks), "patterns", total_patterns, "empty", total_empty, "constants", total_constants)
    print("global_minimum_coefficient", global_minimum)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(AUDIT_REPORT))


if __name__ == "__main__":
    main()
