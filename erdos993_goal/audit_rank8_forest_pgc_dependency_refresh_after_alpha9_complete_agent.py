#!/usr/bin/env python3
"""Fail-closed dependency refresh after the alpha9 first-crossing band is complete."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIOR_SOURCE = ROOT / "audit_rank8_forest_pgc_dependency_refresh_after_alpha9_s13_types1201_1204_agent.py"
PRIOR = ROOT / "rank8_forest_pgc_dependency_refresh_after_alpha9_s13_types1201_1204_agent_20260823.json"
UNION_SOURCE = ROOT / "audit_rank8_exceptional_first_crossing_streaming_union_agent.py"
UNION_CONFIG = ROOT / "rank8_exceptional_first_crossing_alpha9_s13_types1201_1215_union_config_agent_20260823.json"
UNION = ROOT / "rank8_exceptional_first_crossing_alpha9_s13_types1201_1215_complete_union_audit_agent_20260823.json"
LOW_LOW_SOURCE = ROOT / "assemble_rank8_low_low_a23_redistribution_interior_complete_root.py"
LOW_LOW = ROOT / "rank8_low_low_a23_redistribution_interior_complete_exact_root_20260823.json"
LOW_LOW_AUDIT_SOURCE = ROOT / "audit_rank8_low_low_a23_redistribution_interior_complete_root.py"
LOW_LOW_AUDIT = ROOT / "rank8_low_low_a23_redistribution_interior_complete_independent_audit_root_20260823.json"
OUTPUT = ROOT / "rank8_forest_pgc_dependency_refresh_after_alpha9_complete_agent_20260823.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    prior = json.loads(PRIOR.read_text(encoding="utf-8"))
    union_config = json.loads(UNION_CONFIG.read_text(encoding="utf-8"))
    union = json.loads(UNION.read_text(encoding="utf-8"))
    low_low = json.loads(LOW_LOW.read_text(encoding="utf-8"))
    low_low_audit = json.loads(LOW_LOW_AUDIT.read_text(encoding="utf-8"))
    assert prior["status"] == "PENDING_EXACT_RANK8_FOREST_Q8_AND_PGC_AFTER_883_FIRST_CROSSING_CELLS_CLOSED_AGENT"
    assert prior["hashes"][PRIOR_SOURCE.name] == digest(PRIOR_SOURCE)
    assert prior["exact_progress"]["remaining_source_type_cells"] == 1276

    assert union["status"] == "PASS_EXACT_HASH_PINNED_NO_GAP_RANK8_ALPHA9_SOURCE13_TYPES1201_1215_COMPLETE_UNION_AUDIT_AGENT"
    assert union["configuration"] == union_config
    assert union["hashes"][UNION_CONFIG.name] == digest(UNION_CONFIG)
    assert union["hashes"][UNION_SOURCE.name] == digest(UNION_SOURCE)
    assert union["coverage"]["terminal_type_indices"] == [1201, 1215]
    assert union["coverage"]["terminal_type_count"] == 15
    assert union["coverage"]["gaps"] == union["coverage"]["overlaps"] == 0
    assert union["aggregate"]["independently_enumerated_raw_multisets"] == 7_922_430
    assert union["aggregate"]["negative_Q8"] == union["aggregate"]["zero_Q8"] == 0

    assert low_low["status"] == "PASS_EXACT_A23_377_POSITION_COMPLEMENT_ASSEMBLED"
    assert low_low["universe"]["retained_positions"] == 377
    assert low_low["universe"]["separate_mixed_face_positions"] == 144
    assert low_low["source_sha256"] == digest(LOW_LOW_SOURCE)
    assert low_low_audit["status"] == "PASS_INDEPENDENT_A23_377_POSITION_ASSEMBLY_AUDIT"
    assert low_low_audit["coverage"]["retained_positions_reconstructed"] == 377
    assert low_low_audit["coverage"]["mixed_positions_excluded"] == 144
    assert low_low_audit["assembled_report_sha256"] == digest(LOW_LOW)
    assert low_low_audit["source_sha256"] == digest(LOW_LOW_AUDIT_SOURCE)

    newly_closed = 11
    closed_total = 883 + newly_closed
    remaining_alpha8 = 5 * 253
    remaining_total = remaining_alpha8
    assert closed_total == 894
    assert remaining_total == 1265 == 2159 - closed_total
    forest_dependencies = prior["forest_Q8_dependencies"]
    full_full_cones = {
        **forest_dependencies["full_full_cones"],
        "low_low": "PARTIAL_377_POSITION_COMPLEMENT_COMPLETE_144_MIXED_ENDPOINT_POSITIONS_REMAIN",
    }

    payload = {
        "schema": "rank8-forest-pgc-dependency-refresh-after-alpha9-complete-agent-v1",
        "status": "PENDING_EXACT_RANK8_FOREST_Q8_AND_PGC_AFTER_894_FIRST_CROSSING_CELLS_CLOSED_AGENT",
        "exact_progress": {
            "original_remaining_source_type_cells": 2159,
            "total_source_type_cells_closed": closed_total,
            "remaining_source_type_cells": remaining_total,
            "terminal_alpha8_remaining": prior["exact_progress"]["terminal_alpha8_remaining"],
            "terminal_alpha9_remaining": {
                "status": "COMPLETE",
                "source_alpha": [],
                "terminal_type_indices": [],
                "cells": 0,
            },
            "new_alpha9_source13_complete_union": {
                "source_type_cells": 15,
                "new_cells_beyond_prior_partial_union": newly_closed,
                "raw_multisets": union["aggregate"]["independently_enumerated_raw_multisets"],
                "canonical_check_keys": union["aggregate"]["canonical_check_keys"],
                "per_shard_distinct_product_jet_sum_not_globally_deduplicated": union["aggregate"]["per_shard_distinct_product_jet_sum_not_globally_deduplicated"],
                "negative_Q8": 0,
                "zero_Q8": 0,
                "minimum_Q8": union["aggregate"]["minimum_Q8"],
                "maximum_Q8": union["aggregate"]["maximum_Q8"],
                "maximum_producer_peak_private_bytes": union["aggregate"]["maximum_producer_peak_private_bytes"],
                "maximum_audit_peak_private_bytes": union["aggregate"]["maximum_audit_peak_private_bytes"],
            },
        },
        "new_low_low_evidence": {
            "status": "PARTIAL_COMPLEMENT_COMPLETE_MIXED_ENDPOINT_FACES_REMAIN",
            "retained_positions_complete": 377,
            "excluded_mixed_endpoint_positions": 144,
            "all_recorded_negative_counts": 0,
            "independent_assembly_audit": "PASS",
        },
        "forest_Q8_dependencies": {
            **forest_dependencies,
            "full_full_cones": full_full_cones,
            "exceptional_first_crossing": f"PARTIAL_{remaining_total}_SOURCE_TYPE_CELLS_REMAIN",
            "forest_Q8_complete": False,
        },
        "rank8_PGC_downstream": prior["rank8_PGC_downstream"],
        "problem_993_solved": False,
        "scope_warning": (
            "The terminal-alpha9 first-crossing band is complete. The 377-position low/low complement is also "
            "complete, but 144 mixed endpoint positions, connected Q8, 1,265 alpha8 first-crossing cells, "
            "forest Q8, rank8 PGC, and Problem 993 remain open."
        ),
        "hashes": {
            PRIOR_SOURCE.name: digest(PRIOR_SOURCE),
            PRIOR.name: digest(PRIOR),
            UNION_SOURCE.name: digest(UNION_SOURCE),
            UNION_CONFIG.name: digest(UNION_CONFIG),
            UNION.name: digest(UNION),
            LOW_LOW_SOURCE.name: digest(LOW_LOW_SOURCE),
            LOW_LOW.name: digest(LOW_LOW),
            LOW_LOW_AUDIT_SOURCE.name: digest(LOW_LOW_AUDIT_SOURCE),
            LOW_LOW_AUDIT.name: digest(LOW_LOW_AUDIT),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"closed={closed_total} remaining={remaining_total} alpha9_complete=true low_low_complement=true "
        "mixed_endpoints=false connected_Q8=false forest_Q8=false rank8_PGC=false problem993=false"
    )
    print(f"report_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
