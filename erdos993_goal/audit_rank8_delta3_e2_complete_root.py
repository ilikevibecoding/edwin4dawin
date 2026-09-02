#!/usr/bin/env python3
"""Independent no-gap audit of the complete rooted e=2 Delta3 assembly."""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLER = ROOT / "assemble_rank8_delta3_e2_complete_root.py"
PRIMARY_REPORT = ROOT / "rank8_delta3_e2_complete_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta3_e2_complete_independent_audit_root_20260823.json"
EXPECTED_ASSEMBLER_SOURCE = "0E09A1883336447A0260CBB1056441434C451158DDFE90ABD6A763F6C21D1B17"
EXPECTED_PRIMARY_REPORT = "E6E07392465F452E453915485EC9E62021F5497B7B8246C9EBCEC0D4124020C4"


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def sector(flags):
    if not any(flags):
        return "all_short"
    if all(flags):
        return "all_long"
    return "mixed"


def independent_partition_counts():
    arm_states = (*range(1, 7), "L")
    gap_states = (*range(0, 7), "L")
    bridge_states = (*range(1, 8), "L")
    arm_pairs = tuple(itertools.combinations_with_replacement(arm_states, 2))

    counts = {}
    target_short = {}

    branch = Counter()
    branch_target = 0
    for left, right, bridge in itertools.product(arm_pairs, arm_pairs, bridge_states):
        flat = (*left, *right, bridge)
        label = sector([value == "L" for value in flat])
        branch[label] += 1
        if label == "all_short" and 1 + sum(left) + sum(right) + bridge >= 31:
            branch_target += 1
    counts["branch"] = dict(branch)
    target_short["branch"] = branch_target

    pendant = Counter()
    pendant_target = 0
    for near, tail, sibling, far, bridge in itertools.product(
        gap_states, gap_states, arm_states, arm_pairs, bridge_states
    ):
        flat = (near, tail, sibling, *far, bridge)
        label = sector([value == "L" for value in flat])
        pendant[label] += 1
        if label == "all_short" and 2 + near + tail + sibling + sum(far) + bridge >= 31:
            pendant_target += 1
    counts["pendant"] = dict(pendant)
    target_short["pendant"] = pendant_target

    modules = tuple((gap, pair) for gap in gap_states for pair in arm_pairs)
    bridge_internal = Counter()
    bridge_target = 0
    for left, right in itertools.combinations_with_replacement(modules, 2):
        flat = (left[0], *left[1], right[0], *right[1])
        label = sector([value == "L" for value in flat])
        bridge_internal[label] += 1
        if label == "all_short" and (
            3 + left[0] + right[0] + sum(left[1]) + sum(right[1]) >= 31
        ):
            bridge_target += 1
    counts["bridge_internal"] = dict(bridge_internal)
    target_short["bridge_internal"] = bridge_target
    return counts, target_short


def main() -> None:
    assert sha256(ASSEMBLER) == EXPECTED_ASSEMBLER_SOURCE
    assert sha256(PRIMARY_REPORT) == EXPECTED_PRIMARY_REPORT
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA3_E2_COMPLETE_ALL_ROOTS_ALL_ORDERS_N23_PLUS"

    # Re-pin every input without importing the assembler or its enumeration.
    pinned = primary["immutable_input_hashes"]
    assert {name: sha256(ROOT / name) for name in pinned} == pinned

    counts, target_short = independent_partition_counts()
    expected = {
        "branch": {"all_short": 3087, "mixed": 3184, "all_long": 1},
        "pendant": {"all_short": 43218, "mixed": 57133, "all_long": 1},
        "bridge_internal": {"all_short": 10878, "mixed": 14321, "all_long": 1},
    }
    assert counts == expected
    assert target_short == {"branch": 4, "pendant": 1829, "bridge_internal": 579}

    partition = load("rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json")
    for root_type in expected:
        assert partition["roots"][root_type]["sectors"] == expected[root_type]
        assert partition["roots"][root_type]["all_short_target_n31_plus_points"] == target_short[root_type]

    finite_statuses = {
        "rank8_delta013_e2_double_claws_n23_exact_20260820.json":
            "PASS_EXACT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23",
        "rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json":
            "PASS_INDEPENDENT_EXACT_AUDIT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23",
        "rank8_delta013_e2_length_extension_scout_exact_20260820.json":
            "PASS_EXACT_SCOUT_RANK8_DELTA013_E2_LENGTH_EXTENSION_ORDERS_23_29",
        "rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json":
            "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_LENGTH_EXTENSION",
    }
    for name, status in finite_statuses.items():
        assert load(name)["status"] == status

    all_short = load("rank8_delta3_e2_all_short_n31_plus_independent_audit_root_20260823.json")
    all_long = load("rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json")
    assert all_short["status"] == "PASS_INDEPENDENT_RANK8_DELTA3_E2_ALL_SHORT_N31_PLUS_AUDIT"
    assert all_short["root_counts"] == target_short
    assert all_long["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_SYMMETRIC_LONG_CELLS"

    mixed_names = {
        "branch": "rank8_delta3_e2_branch_mixed_newton",
        "pendant": "rank8_delta3_e2_pendant_mixed_newton",
        "bridge_internal": "rank8_delta3_e2_bridge_internal_mixed_newton",
    }
    mixed_totals = {"rays": 0, "values": 0, "unseen": 0}
    for root_type, stem in mixed_names.items():
        producer = load(f"{stem}_exact_root_20260823.json")
        audit = load(f"{stem}_independent_audit_root_20260823.json")
        assert producer["rays"] == audit["rays_rebuilt"] == expected[root_type]["mixed"]
        assert producer["coefficient_stream_sha256"] == audit["coefficient_stream_sha256"]
        assert producer["minimum_coefficients"]["d0"] == audit["minimum_coefficients"]["d0"] > 0
        assert producer["minimum_coefficients"]["d1"] == audit["minimum_coefficients"]["d1"] > 0
        assert producer["minimum_coefficients"]["higher"] == audit["minimum_coefficients"]["higher"] >= 0
        mixed_totals["rays"] += producer["rays"]
        mixed_totals["values"] += audit["literal_values_rebuilt"]
        mixed_totals["unseen"] += audit["unseen_literal_checks"]
    assert mixed_totals == {"rays": 74638, "values": 2015226, "unseen": 74638}

    payload = {
        "schema": "rank8-delta3-e2-complete-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA3_E2_COMPLETE_ALL_ROOTS_ALL_ORDERS_N23_PLUS_AUDIT",
        "theorem_verified": primary["theorem"],
        "independent_root_partition": counts,
        "all_short_n31_plus_counts": target_short,
        "mixed_totals": mixed_totals,
        "finite_orders_verified": "23..30",
        "all_long_root_cells": 3,
        "primary_source_sha256": EXPECTED_ASSEMBLER_SOURCE,
        "primary_report_sha256": EXPECTED_PRIMARY_REPORT,
        "immutable_input_hashes": pinned,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Independent assembly audit of e=2 Delta3 only.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("PARTITION", counts, "TARGET_SHORT", target_short)
    print("MIXED", mixed_totals)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
