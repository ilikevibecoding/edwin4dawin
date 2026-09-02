#!/usr/bin/env python3
"""Fail-closed PGC dependency refresh after the complete terminal-alpha8/source8 row."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIOR_SOURCE = ROOT / "audit_rank8_forest_pgc_dependency_refresh_after_alpha9_s9_10_agent.py"
PRIOR = ROOT / "rank8_forest_pgc_dependency_refresh_after_alpha9_s9_10_agent_20260823.json"
UNION_SOURCE = ROOT / "audit_rank8_exceptional_first_crossing_alpha8_s8_complete_union_agent.py"
UNION = ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types948_1200_complete_union_audit_agent_20260823.json"
OUTPUT = ROOT / "rank8_forest_pgc_dependency_refresh_after_alpha8_s8_agent_20260823.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    prior = json.loads(PRIOR.read_text(encoding="utf-8"))
    union = json.loads(UNION.read_text(encoding="utf-8"))
    assert prior["status"] == "PENDING_EXACT_RANK8_FOREST_Q8_AND_PGC_AFTER_596_FIRST_CROSSING_CELLS_CLOSED_AGENT"
    assert prior["hashes"][PRIOR_SOURCE.name] == digest(PRIOR_SOURCE)
    assert prior["exact_progress"]["remaining_source_type_cells"] == 1563
    assert union["status"] == "PASS_EXACT_HASH_PINNED_NO_GAP_RANK8_ALPHA8_SOURCE8_COMPLETE_UNION_AUDIT_AGENT"
    assert union["hashes"][UNION_SOURCE.name] == digest(UNION_SOURCE)
    assert union["coverage"]["terminal_type_indices"] == [948, 1200]
    assert union["coverage"]["terminal_type_count"] == 253
    assert union["coverage"]["gaps"] == union["coverage"]["overlaps"] == 0
    assert union["aggregate"]["independently_enumerated_raw_multisets"] == 945_208
    assert union["aggregate"]["negative_Q8"] == union["aggregate"]["zero_Q8"] == 0

    remaining_alpha8 = 5 * 253
    remaining_alpha9 = 3 * 15
    remaining_total = remaining_alpha8 + remaining_alpha9
    closed_total = 596 + 253
    assert remaining_alpha8 == 1265
    assert remaining_alpha9 == 45
    assert remaining_total == 1310 == 2159 - closed_total

    payload = {
        "schema": "rank8-forest-pgc-dependency-refresh-after-alpha8-s8-agent-v1",
        "status": "PENDING_EXACT_RANK8_FOREST_Q8_AND_PGC_AFTER_849_FIRST_CROSSING_CELLS_CLOSED_AGENT",
        "exact_progress": {
            "original_remaining_source_type_cells": 2159,
            "total_source_type_cells_closed": closed_total,
            "remaining_source_type_cells": remaining_total,
            "terminal_alpha8_remaining": {
                "source_alpha": [9, 13],
                "terminal_type_indices": [948, 1200],
                "cells": remaining_alpha8,
            },
            "terminal_alpha9_remaining": prior["exact_progress"]["terminal_alpha9_remaining"],
            "new_alpha8_source8_complete_package": {
                "source_type_cells": 253,
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
        "forest_Q8_dependencies": {
            **prior["forest_Q8_dependencies"],
            "exceptional_first_crossing": f"PARTIAL_{remaining_total}_SOURCE_TYPE_CELLS_REMAIN",
            "forest_Q8_complete": False,
        },
        "rank8_PGC_downstream": prior["rank8_PGC_downstream"],
        "problem_993_solved": False,
        "scope_warning": (
            "The exact alpha8/source8 two-shard union closes 253 further cells. Connected Q8, low/low, "
            "1,310 first-crossing cells, forest Q8, rank8 PGC, and Problem 993 remain open."
        ),
        "hashes": {
            PRIOR_SOURCE.name: digest(PRIOR_SOURCE),
            PRIOR.name: digest(PRIOR),
            UNION_SOURCE.name: digest(UNION_SOURCE),
            UNION.name: digest(UNION),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"closed={closed_total} remaining={remaining_total} "
        "connected_Q8=false low_low=false forest_Q8=false rank8_PGC=false problem993=false"
    )
    print(f"report_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
