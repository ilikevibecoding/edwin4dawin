#!/usr/bin/env python3
"""Fail-closed forest-Q8/rank-eight-PGC dependency refresh after alpha8/s6."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FILES = {
    "rank7": ROOT / "rank7_integration_readonly_20260820.json",
    "connected": ROOT / "rank8_connected_q8_integration_readonly_20260820.json",
    "high_high": ROOT / "rank8_high_high_mlr_convolution_exact_20260820.json",
    "high_high_audit": ROOT / "rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json",
    "low_high": ROOT / "rank8_low_high_full_cone_direct_h_exact_20260821.json",
    "low_high_audit": ROOT / "rank8_low_high_full_cone_direct_h_independent_audit_exact_20260821.json",
    "low_low_state": ROOT / "rank8_low_low_connected_forest_integration_agent_20260822.json",
    "low_low_audit": ROOT / "rank8_low_low_connected_forest_integration_agent_independent_audit_20260822.json",
    "fixed_full": ROOT / "rank8_forest_lift_fixed_full_complete_integration_exact_20260820.json",
    "alpha7": ROOT / "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_exact_20260820.json",
    "alpha7_audit": ROOT / "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_audit_exact_20260820.json",
    "design": ROOT / "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_agent_20260823.json",
    "design_audit": ROOT / "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_independent_audit_agent_20260823.json",
    "alpha8_s6": ROOT / "rank8_exceptional_first_crossing_alpha8_s6_types948_1200_complete_exact_agent_20260823.json",
    "alpha8_s6_database": ROOT / "rank8_exceptional_first_crossing_alpha8_s6_types948_1200_keys_exact_agent_20260823.sqlite3",
    "alpha8_s6_audit": ROOT / "rank8_exceptional_first_crossing_alpha8_s6_types948_1200_complete_independent_audit_agent_20260823.json",
    "v8": ROOT / "rank8_v8_alpha14_finite_reduction_exact_20260816.json",
    "pgc_boundary": ROOT / "rank8_pgc_matching_quotient_boundary_exact_20260817.json",
}
OUTPUT = ROOT / "rank8_forest_pgc_dependency_refresh_after_alpha8_s6_agent_20260823.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str) -> dict:
    return json.loads(FILES[key].read_text(encoding="utf-8"))


def main() -> int:
    rank7 = load("rank7")
    connected = load("connected")
    high_high = load("high_high")
    high_high_audit = load("high_high_audit")
    low_high = load("low_high")
    low_high_audit = load("low_high_audit")
    low_low_state = load("low_low_state")
    low_low_audit = load("low_low_audit")
    fixed_full = load("fixed_full")
    alpha7 = load("alpha7")
    alpha7_audit = load("alpha7_audit")
    design = load("design")
    design_audit = load("design_audit")
    alpha8_s6 = load("alpha8_s6")
    alpha8_s6_audit = load("alpha8_s6_audit")
    v8 = load("v8")
    pgc_boundary = load("pgc_boundary")

    assert rank7["status"] == "PASS_EXACT_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER"
    assert connected["status"] == "PENDING_EXACT_RANK8_CONNECTED_Q8_INTEGRATION_DELTA0_3_N27_PLUS"
    assert high_high["status"] == "PASS_EXACT_ALL_ORDER_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE"
    assert high_high_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE"
    assert low_high["status"] == "PASS_EXACT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE"
    assert low_high_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE"
    assert low_low_state["status"] == "WAITING_FOR_EXACT_LOW_LOW_A23_BRIDGE"
    assert low_low_audit["status"] == "PASS_INDEPENDENT_FAIL_CLOSED_WAITING_INTEGRATION_AUDIT"
    assert low_low_audit["integration_report_sha256"] == digest(FILES["low_low_state"])
    assert fixed_full["status"] == "PASS_EXACT_READ_ONLY_FOREST_LIFT_INTEGRATION_FIXED_FULL_COMPLETE"
    assert alpha7["status"] == "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCES7_13_COMPLETE"
    assert alpha7_audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCES7_13_ASSEMBLY_AUDIT"
    assert design["status"].startswith("PASS_EXACT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159")
    assert design_audit["status"].startswith("PASS_INDEPENDENT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159")
    assert design_audit["hashes"][FILES["design"].name] == digest(FILES["design"])
    assert alpha8_s6["status"] == "PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA8_SOURCE6_COMPLETE_AGENT"
    assert alpha8_s6_audit["status"] == "PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_RANK8_ALPHA8_SOURCE6_COMPLETE_AUDIT_AGENT"
    assert alpha8_s6_audit["hashes"][FILES["alpha8_s6"].name] == digest(FILES["alpha8_s6"])
    assert alpha8_s6_audit["hashes"][FILES["alpha8_s6_database"].name] == digest(FILES["alpha8_s6_database"])
    assert v8["status"] == "PASS_PROOF_RANK8_V8_ALPHA14_ALL_FORESTS"
    assert pgc_boundary["status"] == "PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS"

    pinned = low_low_state["immutable_inputs"]
    for key in (
        "connected",
        "high_high",
        "high_high_audit",
        "low_high",
        "low_high_audit",
        "fixed_full",
        "alpha7",
        "alpha7_audit",
        "v8",
        "pgc_boundary",
    ):
        name = FILES[key].name
        assert pinned[name] == digest(FILES[key])

    design_remaining = int(design["aggregate"]["remaining_source_type_cells"])
    newly_closed = int(alpha8_s6["coverage"]["terminal_type_count"])
    assert design_remaining == 2159 and newly_closed == 253
    assert alpha8_s6["coverage"]["source_alpha"] == 6
    assert alpha8_s6["coverage"]["terminal_type_indices"] == [948, 1200]
    remaining_alpha8 = 7 * 253
    remaining_alpha9 = 9 * 15
    remaining_total = remaining_alpha8 + remaining_alpha9
    assert remaining_total == design_remaining - newly_closed == 1906

    payload = {
        "schema": "rank8-forest-pgc-dependency-refresh-after-alpha8-s6-agent-v1",
        "status": "PENDING_EXACT_RANK8_FOREST_Q8_AND_PGC_AFTER_ALPHA8_SOURCE6_PROGRESS_AGENT",
        "new_exact_progress": {
            "theorem": alpha8_s6["theorem"],
            "source_type_cells_closed": newly_closed,
            "raw_multisets": alpha8_s6["aggregate"]["independently_counted_raw_multisets"],
            "canonical_check_keys": alpha8_s6["aggregate"]["canonical_check_keys"],
            "distinct_crossing_jets": alpha8_s6["aggregate"]["distinct_crossing_jets"],
            "negative_Q8": 0,
            "zero_Q8": 0,
            "minimum_Q8": alpha8_s6["aggregate"]["minimum_Q8"],
            "maximum_Q8": alpha8_s6["aggregate"]["maximum_Q8"],
            "producer_peak_private_bytes": alpha8_s6["resources"]["peak_private_bytes"],
            "audit_peak_private_bytes": alpha8_s6_audit["resources"]["peak_private_bytes"],
        },
        "exceptional_first_crossing_state": {
            "original_remaining_source_type_cells": design_remaining,
            "newly_closed_terminal_alpha8_source6_cells": newly_closed,
            "remaining_source_type_cells": remaining_total,
            "terminal_alpha8": {
                "remaining_source_alpha": [7, 13],
                "terminal_type_indices": [948, 1200],
                "remaining_cells": remaining_alpha8,
            },
            "terminal_alpha9": {
                "remaining_source_alpha": [5, 13],
                "terminal_type_indices": [1201, 1215],
                "remaining_cells": remaining_alpha9,
            },
        },
        "forest_Q8_dependencies": {
            "rank7_lower_gaps_including_forest_Q7": "COMPLETE",
            "connected_Q8_alpha_at_least_14": {
                "status": "PENDING",
                "exact_remainder": "Delta^j R_1>=0 for j=0,1,2,3 on the remaining rooted-tree cores of order at least 27",
            },
            "full_full_cones": {
                "high_high": "COMPLETE",
                "low_high": "COMPLETE",
                "low_low": "PENDING_EXACT_A23_BRIDGE",
            },
            "fixed_exceptional_full": "COMPLETE_FOR_ALL_1215_JETS",
            "exceptional_first_crossing": f"PARTIAL_{remaining_total}_SOURCE_TYPE_CELLS_REMAIN",
            "forest_Q8_complete": False,
        },
        "rank8_PGC_downstream": {
            "rank7_PGC_prefix": "COMPLETE",
            "coupled_boundary_alpha_G_13_14": "COMPLETE",
            "standalone_V8_for_forests_alpha_at_least_14": "COMPLETE",
            "separated_identity": "H8(P)-H7(B)=4*Q8(P)/p7+12*c7+V8(B)/(2*b6)",
            "conditional_composition": "forest Q8 for alpha>=14 would combine with V8 for alpha(G)>=15; the coupled theorem already covers alpha(G)=13,14",
            "remaining_unbounded_PGC_obligation_beyond_forest_Q8": "NONE_IDENTIFIED_IN_THE_PINNED_RANK8_REDUCTION",
            "rank8_PGC_complete": False,
        },
        "problem_993_solved": False,
        "scope_warning": "This is a fail-closed dependency refresh. The new finite band theorem does not close connected Q8, low/low, the remaining first crossings, forest Q8, rank8 PGC, or Problem 993.",
        "hashes": {path.name: digest(path) for path in FILES.values()},
        "source_sha256": digest(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"newly_closed={newly_closed} first_crossing_remaining={remaining_total} "
        "connected_Q8=false low_low=false forest_Q8=false rank8_PGC=false problem993=false"
    )
    print(f"report_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
