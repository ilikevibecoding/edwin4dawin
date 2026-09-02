#!/usr/bin/env python3
"""Independent aggregate audit of pendant bridges 2..7 with two long far arms."""

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
OUTPUT = ROOT / (
    "rank8_delta2_e2_pendant_bridges2to7_far_long_root_side_arbitrary_"
    "independent_audit_exact_root_20260823.json"
)
REPORTS = {
    2: "D3D86B63CB0225EB41DB344E2309E1D57DC3639611D8F9BA4B3CD1200C145DC1",
    3: "DFF57E8C6C0E3E1B7CA2F6A9A438CB9A7F6D9AF0D15DAF4AF194025582BE1F06",
    4: "A520D6C09960C0CA93DE0A70CBBE492B15727DAC90DDBD8F60863DB008657EF3",
    5: "C58AF5128BC654FF517C4EFBFCF5F099D60E70E586C4C6B26614D48EA3AE10A4",
    6: "2240045AEFD4692028A8C05D810F67D934F4D9D872B97376963B00B1C158974E",
    7: "474D246EE8FB740CE5BB0FB87C0CC5B7EF4918AFEE8FC880AB623ED28BCCF52D",
}
EXPECTED = {
    "run_rank8_delta2_e2_pendant_fixed_bridge_far_long_root_side_arbitrary_cells.py":
        "4926057DC1A4AB503694B9D19457D89E1B3FA125DA0DD656A5286563CF0BE597",
    "audit_rank8_delta2_e2_pendant_fixed_bridge_far_pair_report_root.py":
        "5CD2C889927997E6F15EB36F0EA98DABA0216B38AED0470259F65FB9CAD69DF3",
    "audit_rank8_delta013_e2_symmetric_long_cells.py":
        "D5EB865FC0923F0AF43B89F8EEC6092FD5EE081E78E50EDA00DFA7A4D5F3875E",
    "rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json":
        "7872A0B5F181B4F15FC54DDFB9E54B57E1412C3BDC620D477911192EABE55A1B",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    endpoint_audit = json.loads(
        (ROOT / "rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert endpoint_audit["status"] == (
        "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_SYMMETRIC_LONG_CELLS"
    )
    assert endpoint_audit["sum_only_guard"] == (
        "PL and PR degrees are zero in every branch/bridge report"
    )

    far_pair = (LONG, LONG)
    expected_keys = {
        (paired, near, tail)
        for paired in LENGTH_STATES for near in ROOT_STATES for tail in ROOT_STATES
    }
    report_hashes = {}
    bridge_summaries = []
    global_minimum = None
    total_constants = 0
    total_shifted = 0
    for bridge, expected_hash in REPORTS.items():
        report_path = ROOT / (
            f"rank8_delta2_e2_pendant_bridge{bridge}_"
            "far_long_root_side_arbitrary_cells_exact_20260820.json"
        )
        actual_hash = sha256(report_path)
        assert actual_hash == expected_hash
        report_hashes[report_path.name] = actual_hash
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["status"] == (
            "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FIXED_BRIDGE_FAR_LONG_ROOT_SIDE_ARBITRARY"
        )
        assert report["bridge_length"] == bridge
        assert report["patterns"] == 448
        assert report["symbolic_cells"] == report["positive_symbolic_cells"] == 448
        assert report["signed_cells"] == []
        rows = {
            (row["paired_state"], row["near_state"], row["tail_state"]): row
            for row in report["cells"]
        }
        assert set(rows) == expected_keys and len(rows) == 448
        bridge_minimum = None
        bridge_constants = 0
        shifted = 0
        for (paired, near, tail), row in rows.items():
            names = coordinate_names(paired, near, tail, far_pair)
            base = (
                base_value(near) + base_value(tail) + 1 + base_value(paired)
                + 7 + 7 + bridge
            )
            threshold = max(0, 22 - base)
            if threshold:
                cover = math.ceil(threshold / len(names))
                variants = {(name, cover) for name in names}
                assert len(names) * (cover - 1) < threshold
                shifted += len(variants)
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
            assert set(actual) == variants
            for (shifted_coordinate, shift), cell in actual.items():
                assert cell["negative_coefficients"] == 0
                minimum = Fraction(cell["minimum_coefficient"])
                constant = Fraction(cell["constant_coefficient"])
                assert minimum > 0 and constant > 0
                bridge_minimum = minimum if bridge_minimum is None else min(bridge_minimum, minimum)
                global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
                paired_v, near_v, tail_v, far_left, far_right = literal_lengths(
                    paired, near, tail, far_pair, shifted_coordinate, shift
                )
                core = double_claw(
                    (near_v + tail_v + 1, paired_v, bridge, far_left, far_right)
                )
                deletion = multiply(
                    path(tail_v),
                    double_claw((near_v, paired_v, bridge, far_left, far_right)),
                )
                assert delta2(core, deletion) == int(constant) > 0
                bridge_constants += 1
        assert bridge_constants == 448
        total_constants += bridge_constants
        total_shifted += shifted
        bridge_summaries.append({
            "bridge_length": bridge,
            "patterns": len(rows),
            "symbolic_cells": bridge_constants,
            "shifted_order_cover_cells": shifted,
            "independent_literal_constants_checked": bridge_constants,
            "minimum_coefficient": str(bridge_minimum),
        })

    report = {
        "schema": "rank8-delta2-e2-pendant-bridges2to7-far-long-independent-audit-root-v1",
        "status": (
            "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_BRIDGES2TO7_"
            "FAR_LONG_ROOT_SIDE_ARBITRARY"
        ),
        "theorem_scope": (
            "every pendant-rooted e=2 double claw of order n>=23 with arbitrary "
            "selected arm/root and paired arm, both far arms >=7, and central bridge 2..7"
        ),
        "bridges": list(REPORTS),
        "state_patterns": len(REPORTS) * 448,
        "symbolic_cells": total_constants,
        "shifted_order_cover_cells": total_shifted,
        "independent_literal_constants_checked": total_constants,
        "global_minimum_coefficient": str(global_minimum),
        "bridge_summaries": bridge_summaries,
        "primary_report_hashes": report_hashes,
        "immutable_inputs": EXPECTED,
        "coverage_logic": (
            "the short/long paired/near/tail states are exhaustive; for every order deficit d "
            "among k nonnegative compressed offsets, some offset is at least ceil(d/k), so the "
            "recorded shifted orthants cover the entire n>=23 domain"
        ),
        "scope_guard": (
            "this package covers bridges 2..7 only when both far arms are at least seven; "
            "short-far states and non-pendant root types remain separate"
        ),
        "audit_source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("bridges", len(REPORTS), "patterns", report["state_patterns"], "constants", total_constants)
    print("source_sha256", report["audit_source_sha256"])
    print("output_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
