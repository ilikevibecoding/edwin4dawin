#!/usr/bin/env python3
"""Independent aggregate audit closing pendant-rooted Delta2 at bridge one."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23 import double_claw, multiply, path
from audit_rank8_delta2_e1_all_order import delta2
from audit_rank8_delta2_e2_pendant_fixed_bridge_far_pair_report_root import (
    LENGTH_STATES, LONG, ROOT_STATES, base_value, coordinate_names, literal_lengths,
)


ROOT = Path(__file__).resolve().parent
BATCH = ROOT / "rank8_delta2_e2_pendant_short_bridges_all_far_pairs_exact_root.json"
OUTPUT = ROOT / (
    "rank8_delta2_e2_pendant_bridge1_all_arm_lengths_"
    "independent_audit_exact_root_20260823.json"
)
EXPECTED = {
    "run_rank8_delta2_e2_pendant_fixed_bridge_far_pair_root_side_arbitrary_cells_root.py":
        "5C0B2046275275074C893DAA875D6A34D37FE7DB85C5DE25CBD1491E7E3FABD2",
    "verify_rank8_delta2_e2_pendant_short_bridge_all_far_pairs_root.py":
        "E917CD91D6394F38AE4226F60D9378E4EBA665BBB564E510498E0FD5E65E59C0",
    "rank8_delta2_e2_pendant_short_bridges_all_far_pairs_exact_root.json":
        "AC9E46B598CFAEFED825B06BC96E41819A03F931A890912B37F86D78EBA6D881",
    "audit_rank8_delta2_e2_pendant_fixed_bridge_far_pair_report_root.py":
        "5CD2C889927997E6F15EB36F0EA98DABA0216B38AED0470259F65FB9CAD69DF3",
    "audit_rank8_delta013_e2_symmetric_long_cells.py":
        "D5EB865FC0923F0AF43B89F8EEC6092FD5EE081E78E50EDA00DFA7A4D5F3875E",
    "rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json":
        "7872A0B5F181B4F15FC54DDFB9E54B57E1412C3BDC620D477911192EABE55A1B",
    "audit_rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary.py":
        "79C76B76F451A968F2CEFBA34A934A635A29259FA7040CF3FC2C449702C6114C",
    "rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_independent_audit_exact_20260821.json":
        "6664B9D08C7C7BE3DE5EFD3FAD0F6700A44190272AD9813B07CC5FD9972489BE",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def far_pairs():
    return [
        (left, right)
        for index, left in enumerate(LENGTH_STATES)
        for right in LENGTH_STATES[index:]
    ]


def main() -> None:
    actual_inputs = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual_inputs == EXPECTED
    endpoint_audit = json.loads(
        (ROOT / "rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert endpoint_audit["status"] == (
        "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_SYMMETRIC_LONG_CELLS"
    )
    long_audit = json.loads(
        (ROOT / (
            "rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_"
            "independent_audit_exact_20260821.json"
        )).read_text(encoding="utf-8")
    )
    assert long_audit["status"] == (
        "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_BRIDGE1_"
        "FAR_LONG_ROOT_SIDE_ARBITRARY"
    )
    assert long_audit["symbolic_cells"] == 448
    assert long_audit["independent_literal_constants_checked"] == 448

    batch = json.loads(BATCH.read_text(encoding="utf-8"))
    assert batch["status"] == (
        "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_SHORT_BRIDGES_ALL_NONLONGLONG_FAR_PAIRS"
    )
    assert batch["bridges"] == [1]
    assert batch["far_pair_states_per_bridge"] == 27
    assert batch["tasks"] == 27
    assert batch["patterns"] == 27 * 448 == 12_096
    assert batch["empty_patterns"] == 4_674
    assert batch["symbolic_cells"] == 7_517
    assert batch["signed_cells"] == 0
    expected_pairs = set(far_pairs()) - {(LONG, LONG)}
    summaries = {
        tuple(row["far_pair"]): row for row in batch["rows"]
    }
    assert set(summaries) == expected_pairs and len(summaries) == 27
    expected_keys = {
        (paired, near, tail)
        for paired in LENGTH_STATES for near in ROOT_STATES for tail in ROOT_STATES
    }

    report_hashes = {}
    pair_summaries = []
    global_minimum = None
    total_patterns = 0
    total_empty = 0
    total_cells = 0
    total_shifted = 0
    for far_pair in far_pairs():
        if far_pair == (LONG, LONG):
            continue
        summary = summaries[far_pair]
        assert summary["bridge_length"] == 1
        report_path = ROOT / summary["report"]
        actual_hash = sha256(report_path)
        assert actual_hash == summary["report_sha256"]
        report_hashes[report_path.name] = actual_hash
        primary = json.loads(report_path.read_text(encoding="utf-8"))
        assert primary["status"] == (
            "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FIXED_BRIDGE_"
            "FAR_PAIR_ROOT_SIDE_ARBITRARY"
        )
        assert primary["bridge_length"] == 1
        assert tuple(primary["far_pair"]) == far_pair
        assert primary["patterns_completed"] == 448
        assert primary["signed_cells"] == []
        rows = {
            (row["paired_state"], row["near_state"], row["tail_state"]): row
            for row in primary["cells"]
        }
        assert set(rows) == expected_keys and len(rows) == 448
        pair_empty = 0
        pair_cells = 0
        pair_shifted = 0
        pair_minimum = None
        for (paired, near, tail), row in rows.items():
            names = coordinate_names(paired, near, tail, far_pair)
            base = (
                base_value(near) + base_value(tail) + 1 + base_value(paired)
                + base_value(far_pair[0]) + base_value(far_pair[1]) + 1
            )
            threshold = max(0, 22 - base)
            if threshold and not names:
                cover = None
                variants = set()
                pair_empty += 1
            elif threshold:
                cover = math.ceil(threshold / len(names))
                variants = {(name, cover) for name in names}
                assert len(names) * (cover - 1) < threshold
                pair_shifted += len(variants)
            else:
                cover = 0
                variants = {(None, 0)}
            cells = {
                (cell["shifted_coordinate"], cell["shift"]): cell
                for cell in row["cells"]
            }
            assert row["base_suppressed_length_sum"] == base
            assert row["order_constraint_on_offsets"] == threshold
            assert row["cover_coordinate_threshold"] == cover
            assert row["empty_by_order_constraint"] == bool(threshold and not names)
            assert set(cells) == variants
            for (shifted_coordinate, shift), cell in cells.items():
                assert cell["negative_coefficients"] == 0
                minimum = Fraction(cell["minimum_coefficient"])
                constant = Fraction(cell["constant_coefficient"])
                assert minimum > 0 and constant > 0
                pair_minimum = minimum if pair_minimum is None else min(pair_minimum, minimum)
                global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
                paired_v, near_v, tail_v, far_left, far_right = literal_lengths(
                    paired, near, tail, far_pair, shifted_coordinate, shift
                )
                core = double_claw((near_v + tail_v + 1, paired_v, 1, far_left, far_right))
                deletion = multiply(
                    path(tail_v),
                    double_claw((near_v, paired_v, 1, far_left, far_right)),
                )
                assert delta2(core, deletion) == int(constant) > 0
                pair_cells += 1
        assert pair_empty == primary["empty_patterns"] == summary["empty_patterns"]
        assert pair_cells == primary["symbolic_cells_completed"] == summary["symbolic_cells"]
        total_patterns += len(rows)
        total_empty += pair_empty
        total_cells += pair_cells
        total_shifted += pair_shifted
        pair_summaries.append({
            "far_pair": list(far_pair),
            "patterns": len(rows),
            "empty_patterns": pair_empty,
            "symbolic_cells": pair_cells,
            "shifted_order_cover_cells": pair_shifted,
            "independent_literal_constants_checked": pair_cells,
            "minimum_coefficient": str(pair_minimum),
        })

    assert total_patterns == batch["patterns"] == 12_096
    assert total_empty == batch["empty_patterns"] == 4_674
    assert total_cells == batch["symbolic_cells"] == 7_517
    report = {
        "schema": "rank8-delta2-e2-pendant-bridge1-all-arm-lengths-independent-audit-root-v1",
        "status": (
            "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_BRIDGE1_"
            "ALL_ARM_LENGTHS"
        ),
        "theorem_scope": (
            "every pendant-rooted e=2 double claw of order n>=23 with arbitrary "
            "selected arm/root, paired arm, and positive far-arm lengths, at central bridge one"
        ),
        "far_pair_states": 28,
        "new_non_longlong_patterns": total_patterns,
        "new_empty_patterns": total_empty,
        "new_symbolic_cells": total_cells,
        "new_shifted_order_cover_cells": total_shifted,
        "new_independent_literal_constants_checked": total_cells,
        "existing_long_long_symbolic_cells": long_audit["symbolic_cells"],
        "existing_long_long_independent_literal_constants_checked":
            long_audit["independent_literal_constants_checked"],
        "global_minimum_coefficient_new_cells": str(global_minimum),
        "pair_summaries": pair_summaries,
        "primary_report_hashes": report_hashes,
        "immutable_inputs": actual_inputs,
        "coverage_logic": (
            "the 28 unordered far states 1..6,L are exhaustive; the new package covers the 27 "
            "states other than L,L and the immutable bridge-one theorem covers L,L. Each paired/"
            "near/tail partition is exhaustive, empty fixed states below order 23 are discarded, "
            "and every admissible offset-sum deficit is covered by a shifted orthant."
        ),
        "scope_guard": (
            "this closes bridge one for pendant roots only; bridges 2..7 with a short far arm and "
            "all non-pendant root types remain separate"
        ),
        "audit_source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("far_pairs", report["far_pair_states"], "new_patterns", total_patterns)
    print("new_cells", total_cells, "literal_constants", total_cells)
    print("source_sha256", report["audit_source_sha256"])
    print("output_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
