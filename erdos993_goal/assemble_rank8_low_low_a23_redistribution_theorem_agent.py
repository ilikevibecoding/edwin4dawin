#!/usr/bin/env python3
"""Fail-closed assembler for the final rank-eight low/low a2/a3 bridge.

The two long-running endpoint/interior reports are deliberately not hash-coded
before they exist.  Their hashes are captured in the assembled theorem, while
their complete schemas, cell universes, source hashes, and positivity
invariants are validated here.  A later publication audit should hash-lock the
finished package.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_rank8_low_low_a23_redistribution_bernstein_cell_agent import (
    LABELS,
    required_positions,
)


ROOT = Path(__file__).resolve().parent
EARLY = ROOT / "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json"
EARLY_AUDIT = ROOT / "rank8_low_low_full_early_suffix45_redistribution_audit_20260822.json"
GAP0 = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json"
GAP0_AUDIT = ROOT / "rank8_low_low_suffix3_gap0_fast_full_face_root_audit_exact_20260822.json"
INTERIOR = ROOT / "rank8_low_low_a23_redistribution_cells_fast_agent_exact_20260822.json"
IDENTITY = ROOT / "rank8_low_low_a23_redistribution_identity_support_agent_20260822.json"
REPLAY = ROOT / "rank8_low_low_a23_probe_replay_agent_20260822.json"
OUTPUT = ROOT / "rank8_low_low_full_cone_a23_redistribution_theorem_agent_20260822.json"
EXPECTED_FIXED = {
    EARLY.name: "846145E70AD06754450951C233E92C249770BBBCD02A1061C8AD78A122E13183",
    EARLY_AUDIT.name: "784C9F6343FC4058E4A60BF5BD5742B5A1A67766A7CC1EF926BC5FCA58684ABE",
    IDENTITY.name: "9B86F3473F0D2B13F67645696D8F990732912825C42514B5FDDB021E665EB041",
    REPLAY.name: "3E87855326EC347967856C8053A41404A782142F829C3CB762E5340BB47088CB",
    GAP0.name: "E63F12DCBFC9ACF7874A241A6DF48D7DD6CE4CE136F0AEF5413477F867F3EBFD",
    GAP0_AUDIT.name: "51EF34F786D4E472C2392766EDF5007EE5CCE5636C53EF81D2426B569D732A79",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def validate_statistics(statistics) -> None:
    assert statistics["negative"] == 0
    assert statistics["first_negative"] is None
    if statistics["terms"]:
        assert statistics["minimum"] > 0
        assert statistics["maximum"] >= statistics["minimum"]
    else:
        assert statistics["minimum"] is None
        assert statistics["maximum"] is None


def main() -> None:
    missing = [path.name for path in (GAP0, INTERIOR) if not path.exists()]
    if missing:
        raise FileNotFoundError(
            "pending exact inputs: " + ", ".join(missing)
        )
    assert {
        path.name: sha256(path)
        for path in (EARLY, EARLY_AUDIT, IDENTITY, REPLAY, GAP0, GAP0_AUDIT)
    } == EXPECTED_FIXED
    early = json.loads(EARLY.read_text(encoding="utf-8"))
    early_audit = json.loads(EARLY_AUDIT.read_text(encoding="utf-8"))
    gap0 = json.loads(GAP0.read_text(encoding="utf-8"))
    interior = json.loads(INTERIOR.read_text(encoding="utf-8"))
    identity = json.loads(IDENTITY.read_text(encoding="utf-8"))
    replay = json.loads(REPLAY.read_text(encoding="utf-8"))
    gap0_audit = json.loads(GAP0_AUDIT.read_text(encoding="utf-8"))

    assert early["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_REDISTRIBUTION_GRID"
    assert "a3=b3=0" in early["theorem"]
    assert early_audit["status"] == "PASS_INDEPENDENT_SUFFIX45_REDISTRIBUTION_GRID_AUDIT"
    assert gap0["status"] == "PASS_EXACT_FAST_AGENT_SUFFIX3_GAP0_FULL_FACE"
    assert gap0["support"] == {
        "a0": [0, 2], "b0": [0, 2],
        "a0_plus_a3": [0, 9], "b0_plus_b3": [0, 8],
    }
    assert gap0["inherited_suffix_cells"] == 90
    assert gap0["computed_positive_early_support_cells"] == 558
    assert gap0["total_disjoint_outer_cells"] == 648
    assert gap0_audit["status"] == "PASS_INDEPENDENT_EXACT_FAST_SUFFIX3_GAP0_FULL_FACE_AUDIT"
    assert gap0_audit["complete_target_universe"] == 558
    assert gap0_audit["imported_original_oracle_cells_exactly_replayed"] == 64
    assert gap0_audit["fast_agent_cells"] == 494
    assert gap0_audit["inherited_suffix_cells"] == 90
    assert gap0_audit["total_disjoint_outer_cells"] == 648
    assert gap0_audit["recomputed_total_exact_coefficients"] == gap0["total_exact_coefficients"]
    assert identity["status"] == "PASS_EXACT_A23_REDISTRIBUTION_IDENTITY_SUPPORT_AUDIT"
    assert identity["raw_auxiliary_redistribution_degree"] == [2, 2]
    assert replay["status"] == "PASS_INDEPENDENT_EXACT_A23_PROBE_REPLAY"
    assert replay["row_builder_replay"]["exact_equalities"] == 126
    assert replay["bernstein_conversion_replay"]["exact_position_equalities"] == 18
    assert identity["support"] == {
        "P_exponents": [0, 9],
        "Q_exponents": [0, 8],
        "argument": identity["support"]["argument"],
    }
    assert interior["status"] == "PASS_EXACT_A23_REDISTRIBUTION_NEW_BERNSTEIN_CELLS"
    assert interior["expansion_units"] == 89
    assert interior["new_Bernstein_position_cells"] == 521
    assert len(interior["rows"]) == 89
    seen = set()
    position_count = 0
    for row in interior["rows"]:
        key = row["p_exponent"], row["q_exponent"]
        assert key not in seen and key != (0, 0)
        seen.add(key)
        expected_positions = required_positions(*key)
        actual_positions = tuple(
            (item["left_bernstein_index"], item["right_bernstein_index"])
            for item in row["positions"]
        )
        assert actual_positions == expected_positions
        assert row["pass"] is True
        position_count += len(actual_positions)
        for position in row["positions"]:
            assert position["pass"] is True
            assert set(position["rows"]) == set(LABELS)
            for statistics in position["rows"].values():
                validate_statistics(statistics)
    assert seen == {
        (p_exponent, q_exponent)
        for p_exponent in range(10) for q_exponent in range(9)
        if p_exponent or q_exponent
    }
    assert position_count == 521
    for statistics in interior["global_aggregates"].values():
        assert statistics["negative"] == 0
        if statistics["terms"]:
            assert statistics["minimum"] > 0

    payload = {
        "schema": "rank8-low-low-full-cone-a23-redistribution-theorem-agent-v1",
        "status": "PASS_EXACT_RANK8_LOW_LOW_FULL_CONE_A23_REDISTRIBUTION",
        "theorem": (
            "All four pending rank-eight low/low auxiliaries are nonnegative "
            "for arbitrary nonnegative h,ta,tb and all adjusted gap slacks "
            "a0,a2,...,a7,b0,b2,...,b7."
        ),
        "proof": {
            "coordinates": identity["coordinates"],
            "degree": [2, 2],
            "bernstein_scaling": 4,
            "corner_0_0": EARLY.name,
            "corner_2_2": GAP0.name,
            "new_positions": INTERIOR.name,
            "new_position_cells": 521,
            "compressed_expansion_units": 89,
        },
        "support": {"P": [0, 9], "Q": [0, 8]},
        "interior_global_aggregates": interior["global_aggregates"],
        "interior_total_exact_coefficients": interior["total_exact_coefficients"],
        "immutable_inputs": {
            path.name: sha256(path)
            for path in (
                EARLY, EARLY_AUDIT, GAP0, GAP0_AUDIT,
                INTERIOR, IDENTITY, REPLAY,
            )
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes the rank-eight low/low convolution cone only. It does "
            "not by itself close the remaining connected families, forest "
            "lift, PGC, or Erdos Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
