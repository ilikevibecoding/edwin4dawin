#!/usr/bin/env python3
"""Fail-closed PGC dependency refresh after the two low-memory exact batches."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIOR_SOURCE = ROOT / "audit_rank8_forest_pgc_dependency_refresh_agent.py"
PRIOR = ROOT / "rank8_forest_pgc_dependency_refresh_after_alpha8_s6_agent_20260823.json"
ALPHA9_SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha9_s5_8_complete_agent.py"
ALPHA9_REPORT = ROOT / "rank8_exceptional_first_crossing_alpha9_s5_8_types1201_1215_complete_exact_agent_20260823.json"
ALPHA9_DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha9_s5_8_types1201_1215_keys_exact_agent_20260823.sqlite3"
ALPHA9_AUDIT_SOURCE = ROOT / "audit_rank8_exceptional_first_crossing_alpha9_s5_8_complete_agent.py"
ALPHA9_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha9_s5_8_types1201_1215_complete_independent_audit_agent_20260823.json"
OUTPUT = ROOT / "rank8_forest_pgc_dependency_refresh_after_low_memory_batches_agent_20260823.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    prior = json.loads(PRIOR.read_text(encoding="utf-8"))
    alpha9 = json.loads(ALPHA9_REPORT.read_text(encoding="utf-8"))
    audit = json.loads(ALPHA9_AUDIT.read_text(encoding="utf-8"))
    assert prior["status"] == "PENDING_EXACT_RANK8_FOREST_Q8_AND_PGC_AFTER_ALPHA8_SOURCE6_PROGRESS_AGENT"
    assert prior["source_sha256"] == digest(PRIOR_SOURCE)
    assert prior["exceptional_first_crossing_state"]["remaining_source_type_cells"] == 1906
    assert alpha9["status"] == "PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA9_SOURCES5_8_COMPLETE_AGENT"
    assert audit["status"] == "PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_RANK8_ALPHA9_SOURCES5_8_COMPLETE_AUDIT_AGENT"
    assert audit["hashes"][ALPHA9_REPORT.name] == digest(ALPHA9_REPORT)
    assert audit["hashes"][ALPHA9_DATABASE.name] == digest(ALPHA9_DATABASE)
    assert audit["hashes"][ALPHA9_SOURCE.name] == digest(ALPHA9_SOURCE)
    assert audit["hashes"][ALPHA9_AUDIT_SOURCE.name] == digest(ALPHA9_AUDIT_SOURCE)
    assert alpha9["coverage"] == {
        "source_alpha_range": [5, 8],
        "terminal_alpha": 9,
        "terminal_type_indices": [1201, 1215],
        "source_type_cells": 60,
        "gaps": 0,
        "overlaps": 0,
    }

    remaining_alpha8 = 7 * 253
    remaining_alpha9 = 5 * 15
    remaining_total = remaining_alpha8 + remaining_alpha9
    newly_closed_total = 253 + 60
    assert remaining_alpha8 == 1771
    assert remaining_alpha9 == 75
    assert remaining_total == 1846 == 2159 - newly_closed_total

    payload = {
        "schema": "rank8-forest-pgc-dependency-refresh-after-low-memory-batches-agent-v1",
        "status": "PENDING_EXACT_RANK8_FOREST_Q8_AND_PGC_AFTER_313_FIRST_CROSSING_CELLS_CLOSED_AGENT",
        "exact_progress": {
            "original_remaining_source_type_cells": 2159,
            "terminal_alpha8_source6_cells_closed": 253,
            "terminal_alpha9_sources5_8_cells_closed": 60,
            "total_source_type_cells_closed": newly_closed_total,
            "remaining_source_type_cells": remaining_total,
            "terminal_alpha8_remaining": {
                "source_alpha": [7, 13],
                "terminal_type_indices": [948, 1200],
                "cells": remaining_alpha8,
            },
            "terminal_alpha9_remaining": {
                "source_alpha": [9, 13],
                "terminal_type_indices": [1201, 1215],
                "cells": remaining_alpha9,
            },
            "two_batches_combined": {
                "raw_multisets": prior["new_exact_progress"]["raw_multisets"] + alpha9["aggregate"]["independently_counted_raw_multisets"],
                "canonical_check_keys": prior["new_exact_progress"]["canonical_check_keys"] + alpha9["aggregate"]["canonical_check_keys"],
                "distinct_batch_product_jets_sum": prior["new_exact_progress"]["distinct_crossing_jets"] + alpha9["aggregate"]["distinct_crossing_jets"],
                "negative_Q8": 0,
                "zero_Q8": 0,
                "minimum_Q8": min(prior["new_exact_progress"]["minimum_Q8"], alpha9["aggregate"]["minimum_Q8"]),
                "maximum_Q8": max(prior["new_exact_progress"]["maximum_Q8"], alpha9["aggregate"]["maximum_Q8"]),
            },
        },
        "forest_Q8_dependencies": {
            **prior["forest_Q8_dependencies"],
            "exceptional_first_crossing": f"PARTIAL_{remaining_total}_SOURCE_TYPE_CELLS_REMAIN",
            "forest_Q8_complete": False,
        },
        "rank8_PGC_downstream": prior["rank8_PGC_downstream"],
        "problem_993_solved": False,
        "scope_warning": "The two exact finite packages close 313 formerly open source/type cells. Connected Q8, low/low, 1,846 first-crossing cells, forest Q8, rank8 PGC, and Problem 993 remain open.",
        "hashes": {
            PRIOR_SOURCE.name: digest(PRIOR_SOURCE),
            PRIOR.name: digest(PRIOR),
            ALPHA9_SOURCE.name: digest(ALPHA9_SOURCE),
            ALPHA9_REPORT.name: digest(ALPHA9_REPORT),
            ALPHA9_DATABASE.name: digest(ALPHA9_DATABASE),
            ALPHA9_AUDIT_SOURCE.name: digest(ALPHA9_AUDIT_SOURCE),
            ALPHA9_AUDIT.name: digest(ALPHA9_AUDIT),
            Path(__file__).name: digest(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"closed={newly_closed_total} remaining={remaining_total} "
        "connected_Q8=false low_low=false forest_Q8=false rank8_PGC=false problem993=false"
    )
    print(f"report_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
