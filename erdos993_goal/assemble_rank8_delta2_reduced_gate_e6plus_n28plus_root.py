#!/usr/bin/env python3
"""Assemble the reduced Delta2 terminal gate for e>=6 at every n>=28."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_reduced_gate_e6plus_n28plus_assembled_root_20260826.json"

INPUTS = {
    "n28": "rank8_delta2_n28_lcross_k1_e6plus_assembled_root_20260826.json",
    "n29_34": "rank8_delta2_lcross_k1_finite_orders29_34_assembled_root_20260826.json",
    "tail": "rank8_delta2_attachment_floor_n35plus_assembled_root_20260826.json",
    "tail_audit": "rank8_delta2_attachment_floor_n35plus_independent_audit_root_20260826.json",
    "lcross_k7": "rank8_delta2_lcross_k7_attachment_floor_n28plus_exact_agent_20260825.json",
    "ucap_k1": "rank8_delta2_ucap_k1_attachment_floor_n28plus_exact_agent_20260825.json",
    "ucap_k7": "rank8_delta2_ucap_k7_attachment_floor_n28plus_exact_agent_20260825.json",
    "mapping_audit": "rank8_delta23_live_path_attachment_floor_box_mappings_independent_audit_agent_20260825.json",
    "reduction": "rank8_q8_terminal_delta2_reduction_exact_20260820.json",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> int:
    documents = {key: load(name) for key, name in INPUTS.items()}
    assert documents["n28"]["status"] == "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA2_N28_LCROSS_K1_E6PLUS_AND_STAR"
    assert documents["n29_34"]["status"] == "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA2_LCROSS_K1_FINITE_ORDERS_29_TO_34"
    assert documents["tail"]["status"] == "PASS_EXACT_RANK8_DELTA2_TERMINAL_GATE_FOR_ALL_ROOTED_TREES_N35_PLUS"
    assert documents["tail_audit"]["status"] == "PASS_INDEPENDENT_EXACT_RANK8_DELTA2_TERMINAL_GATE_FOR_ALL_ROOTED_TREES_N35_PLUS"
    assert documents["mapping_audit"]["status"] == "PASS_INDEPENDENT_EXACT_DELTA23_ATTACHMENT_FLOOR_BOX_MAPPING_AUDIT"
    assert documents["reduction"]["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA2_REDUCTION_FOUR_LIVE_PATHS"

    expected_paths = {
        "lcross_k7": (7, "lcross"),
        "ucap_k1": (1, "ucap"),
        "ucap_k7": (7, "ucap"),
    }
    for key, (endpoint, piece) in expected_paths.items():
        report = documents[key]
        assert report["status"] == "PASS_EXACT_DELTA2_LIVE_PATH_WITH_ATTACHMENT_FLOOR"
        assert report["Delta"] == 2 and report["D6_k"] == endpoint
        assert report["capacity_piece"] == piece
        assert report["order_scope"] == "every finite integer n>=28; T=0 is the audited limit boundary"
        assert report["coefficient_sign_counts"]["negative"] == 0

    payload = {
        "schema": "rank8-delta2-reduced-gate-e6plus-n28plus-assembled-root-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA2_REDUCED_GATE_E6PLUS_N28_PLUS",
        "theorem": (
            "For every rooted tree core of order n>=28 and degree surplus "
            "e>=6, the rank-eight terminal Delta2 residual is nonnegative "
            "throughout the exact rank-six defect interval and root-capacity polygon."
        ),
        "no_gap_order_partition": [
            {"minimum": 28, "maximum": 28, "evidence": INPUTS["n28"]},
            {"minimum": 29, "maximum": 34, "evidence": INPUTS["n29_34"]},
            {"minimum": 35, "maximum": None, "evidence": INPUTS["tail"]},
        ],
        "live_path_partition": [
            {
                "endpoint": 1,
                "piece": "lower-cross",
                "evidence": "finite independently audited e>=6 certificates at 28..34 and compactified tail at n>=35",
            },
            {"endpoint": 7, "piece": "lower-cross", "evidence": INPUTS["lcross_k7"]},
            {"endpoint": 1, "piece": "upper-capacity", "evidence": INPUTS["ucap_k1"]},
            {"endpoint": 7, "piece": "upper-capacity", "evidence": INPUTS["ucap_k7"]},
        ],
        "artifacts": {name: sha256(HERE / name) for name in INPUTS.values()},
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Degree-surplus families e=0,1,2,3,4,5 require their separate "
            "structural theorems before this becomes the full Delta2 gate."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
