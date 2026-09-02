#!/usr/bin/env python3
"""Assemble the exact rank-eight Delta2 terminal theorem for n>=28."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_all_rooted_trees_n28plus_assembled_root_20260826.json"
FILES = {
    "reduction": "rank8_q8_terminal_delta2_reduction_exact_20260820.json",
    "finite_lcross_k1": "rank8_delta2_lcross_k1_orders28_34_all_trees_assembled_root_20260826.json",
    "tail": "rank8_delta2_attachment_floor_n35plus_assembled_root_20260826.json",
    "tail_audit": "rank8_delta2_attachment_floor_n35plus_independent_audit_root_20260826.json",
    "lcross_k7": "rank8_delta2_lcross_k7_attachment_floor_n28plus_exact_agent_20260825.json",
    "ucap_k1": "rank8_delta2_ucap_k1_attachment_floor_n28plus_exact_agent_20260825.json",
    "ucap_k7": "rank8_delta2_ucap_k7_attachment_floor_n28plus_exact_agent_20260825.json",
    "mapping_audit": "rank8_delta23_live_path_attachment_floor_box_mappings_independent_audit_agent_20260825.json",
    "floor": "rank8_root_deletion_attachment_floor_exact_root_20260825.json",
    "floor_audit": "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> int:
    reports = {key: load(name) for key, name in FILES.items()}
    reduction = reports["reduction"]
    assert reduction["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA2_REDUCTION_FOUR_LIVE_PATHS"
    assert reduction["remaining_exact_analytic_tensors"] == 4
    assert reduction["live_root_paths_per_rank6_endpoint"] == [
        "lower-cross with live Z",
        "upper-capacity with live Z",
    ]
    assert reports["finite_lcross_k1"]["status"] == "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA2_LCROSS_K1_ALL_TREES_ORDERS28_TO34"
    assert reports["finite_lcross_k1"]["coverage"]["missing_orders"] == []
    assert reports["finite_lcross_k1"]["coverage"]["missing_degree_surplus_families"] == []
    assert reports["tail"]["status"] == "PASS_EXACT_RANK8_DELTA2_TERMINAL_GATE_FOR_ALL_ROOTED_TREES_N35_PLUS"
    assert reports["tail_audit"]["status"] == "PASS_INDEPENDENT_EXACT_RANK8_DELTA2_TERMINAL_GATE_FOR_ALL_ROOTED_TREES_N35_PLUS"

    expected_live = {
        "lcross_k7": ("lcross", 7),
        "ucap_k1": ("ucap", 1),
        "ucap_k7": ("ucap", 7),
    }
    for key, (piece, endpoint) in expected_live.items():
        report = reports[key]
        assert report["status"] == "PASS_EXACT_DELTA2_LIVE_PATH_WITH_ATTACHMENT_FLOOR"
        assert report["Delta"] == 2
        assert report["capacity_piece"] == piece
        assert report["D6_k"] == endpoint
        assert report["order_scope"] == "every finite integer n>=28; T=0 is the audited limit boundary"
        assert report["coefficient_sign_counts"]["negative"] == 0
    assert reports["mapping_audit"]["status"] == "PASS_INDEPENDENT_EXACT_DELTA23_ATTACHMENT_FLOOR_BOX_MAPPING_AUDIT"
    assert reports["mapping_audit"]["embedded_manifest_matches"] is True
    assert reports["floor"]["status"] == "PASS_EXACT_ALL_ORDER_ROOT_DELETION_ATTACHMENT_FLOOR"
    assert reports["floor_audit"]["status"] == "PASS_INDEPENDENT_ROOT_DELETION_ATTACHMENT_FLOOR_AUDIT"

    payload = {
        "schema": "rank8-delta2-all-rooted-trees-n28plus-assembled-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_FOR_ALL_ROOTED_TREES_N28_PLUS",
        "theorem": (
            "For every rooted tree core of order n>=28, the second Newton "
            "difference of the rank-eight terminal residual is nonnegative "
            "throughout the exact rank-six and root-capacity domains."
        ),
        "no_gap_partition": [
            {
                "orders": "28..34",
                "live_tensor": "lower-cross, k=1",
                "evidence": "all rooted trees partitioned without gaps by path, exact surplus, continuous e>=6, and star certificates",
            },
            {
                "orders": "n>=28",
                "live_tensors": ["lower-cross, k=7", "upper-capacity, k=1", "upper-capacity, k=7"],
                "evidence": "three exact compactified attachment-floor Bernstein boxes with no negative coefficients",
            },
            {
                "orders": "n>=35",
                "live_tensor": "lower-cross, k=1 (and hence the full gate)",
                "evidence": "exact all-rooted-tree tail theorem, independently audited",
            },
        ],
        "coverage": {
            "orders": "every integer n>=28",
            "rooted_tree_families": "all",
            "four_live_tensors_required": 4,
            "four_live_tensors_covered": 4,
            "missing_orders": [],
            "missing_live_tensors": [],
            "reduction_valid_from_order": 23,
        },
        "audit_boundary": (
            "The finite lower-cross k=1 lane and n>=35 tail have independent "
            "coefficient replays. The other three compactified boxes have an "
            "independent exact coordinate/source-binding audit and directly "
            "replayable exact coefficient reports."
        ),
        "artifacts": {name: sha256(HERE / name) for name in FILES.values()},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes Delta2 only. The complete rank-eight theorem also "
            "requires Delta0, Delta1, Delta3, the base/terminal identity, and "
            "the forest lift."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("LIVE_TENSORS", 4)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
