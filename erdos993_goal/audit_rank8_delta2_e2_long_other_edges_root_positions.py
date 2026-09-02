#!/usr/bin/env python3
"""Independent key/constant audit of bounded pendant and bridge e=2 cells."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23 import claw, double_claw, path, multiply
from audit_rank8_delta2_e1_all_order import delta2


HERE = Path(__file__).resolve().parent
LONG = "L"
EXPECTED = {
    "probe_rank8_delta2_e2_symmetric_long_cells.py": "4141749D3431C439510C1A35F5BA4509EC4236503104753D610E7FC777250A36",
    "run_rank8_delta2_e2_branch_short_long_cells.py": "DBC56B368C6033336568B05215EEC173DB428CF4AA16C477D123AE245391040B",
    "run_rank8_delta2_e2_bridge_all_long_arms_gap_cells.py": "0DFC2FD9C10FF53F7232D319774F5224A6ABBC4ED19523D8EEB574A83D2B888A",
    "rank8_delta2_e2_bridge_all_long_arms_gap_cells_exact_20260820.json": "8826E88AB861F06731C7C8F6A913F6F27E54FC869EB8F48B53B8EE5053247C09",
    "run_rank8_delta2_e2_pendant_other_edges_long_root_position_cells.py": "02AAF522C01D1D98CCFA9FF73DD26177E6A4248F0E212323F92B603C6BE82B8D",
    "rank8_delta2_e2_pendant_other_edges_long_root_position_cells_exact_20260820.json": "67DCD9E51D238DEDFDB29D51E4136E0542B46AB3D1073B8B2BD0DEE1E676F41D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert {name: sha256(HERE / name) for name in EXPECTED} == EXPECTED
    bridge = json.loads(
        (HERE / "rank8_delta2_e2_bridge_all_long_arms_gap_cells_exact_20260820.json").read_text()
    )
    pendant = json.loads(
        (HERE / "rank8_delta2_e2_pendant_other_edges_long_root_position_cells_exact_20260820.json").read_text()
    )

    assert bridge["status"] == "PASS_EXACT_RANK8_DELTA2_E2_BRIDGE_ALL_LONG_ARMS_ALL_ROOT_POSITIONS"
    gap_states = [0, 1, 2, 3, 4, 5, LONG]
    expected_gap_keys = {
        (left, right)
        for index, left in enumerate(gap_states)
        for right in gap_states[index:]
    }
    actual_gap = {(row["left_gap"], row["right_gap"]): row for row in bridge["cells"]}
    assert set(actual_gap) == expected_gap_keys and len(actual_gap) == 28
    bridge_constants = 0
    for (left_state, right_state), row in actual_gap.items():
        left = 6 if left_state == LONG else int(left_state)
        right = 6 if right_state == LONG else int(right_state)
        core = double_claw((7, 7, left + right + 2, 7, 7))
        deletion = multiply(claw((7, 7, left)), claw((7, 7, right)))
        value = delta2(core, deletion)
        assert row["negative_coefficients"] == 0
        assert Fraction(row["minimum_coefficient"]) > 0
        assert value == int(Fraction(row["constant_coefficient"])) > 0
        bridge_constants += 1

    assert pendant["status"] == "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_OTHER_EDGES_LONG_ALL_ROOT_POSITIONS"
    root_states = [0, 1, 2, 3, 4, 5, 6, LONG]
    expected_root_keys = {(near, tail) for near in root_states for tail in root_states}
    actual_root = {(row["near_state"], row["tail_state"]): row for row in pendant["cells"]}
    assert set(actual_root) == expected_root_keys and len(actual_root) == 64
    pendant_constants = 0
    for (near_state, tail_state), row in actual_root.items():
        near = 7 if near_state == LONG else int(near_state)
        tail = 7 if tail_state == LONG else int(tail_state)
        selected = near + tail + 1
        core = double_claw((selected, 7, 8, 7, 7))
        deletion = multiply(path(tail), double_claw((near, 7, 8, 7, 7)))
        value = delta2(core, deletion)
        assert row["negative_coefficients"] == 0
        assert Fraction(row["minimum_coefficient"]) > 0
        assert value == int(Fraction(row["constant_coefficient"])) > 0
        pendant_constants += 1

    payload = {
        "schema": "rank8-delta2-e2-long-other-edges-root-position-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_LONG_OTHER_EDGES_ROOT_POSITIONS",
        "immutable_input_hashes": EXPECTED,
        "bridge_root_subfamily": {
            "gap_patterns": len(expected_gap_keys),
            "independent_literal_constants_checked": bridge_constants,
            "scope": "four pendant arms >=7; arbitrary positive bridge and every internal bridge root",
        },
        "pendant_root_subfamily": {
            "near_tail_patterns": len(expected_root_keys),
            "independent_literal_constants_checked": pendant_constants,
            "scope": "paired and two far arms >=7, bridge>=8; arbitrary selected arm and every pendant root",
        },
        "scope_guard": "these are no-gap root-position theorems within the stated other-edge-long scopes, not all e=2 pendant/bridge roots",
    }
    output = HERE / "rank8_delta2_e2_long_other_edges_root_positions_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("bridge_constants", bridge_constants, "pendant_constants", pendant_constants)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
