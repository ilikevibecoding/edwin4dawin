#!/usr/bin/env python3
"""Fail-closed PGC dependency refresh after terminal-alpha8/source-alpha7."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIOR_SOURCE = ROOT / "audit_rank8_forest_pgc_dependency_refresh_after_low_memory_batches_agent.py"
PRIOR = ROOT / "rank8_forest_pgc_dependency_refresh_after_low_memory_batches_agent_20260823.json"
SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha8_s7_complete_agent.py"
REPORT = ROOT / "rank8_exceptional_first_crossing_alpha8_s7_types948_1200_complete_exact_agent_20260823.json"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha8_s7_types948_1200_keys_exact_agent_20260823.sqlite3"
AUDIT_SOURCE = ROOT / "audit_rank8_exceptional_first_crossing_alpha8_s7_complete_agent.py"
AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha8_s7_types948_1200_complete_independent_audit_agent_20260823.json"
OUTPUT = ROOT / "rank8_forest_pgc_dependency_refresh_after_alpha8_s7_agent_20260823.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    prior = json.loads(PRIOR.read_text(encoding="utf-8"))
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    audit = json.loads(AUDIT.read_text(encoding="utf-8"))
    assert prior["status"] == "PENDING_EXACT_RANK8_FOREST_Q8_AND_PGC_AFTER_313_FIRST_CROSSING_CELLS_CLOSED_AGENT"
    assert prior["hashes"][PRIOR_SOURCE.name] == digest(PRIOR_SOURCE)
    assert prior["exact_progress"]["remaining_source_type_cells"] == 1846
    assert report["status"] == "PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA8_SOURCE7_COMPLETE_AGENT"
    assert audit["status"] == "PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_RANK8_ALPHA8_SOURCE7_COMPLETE_AUDIT_AGENT"
    assert audit["hashes"][REPORT.name] == digest(REPORT)
    assert audit["hashes"][DATABASE.name] == digest(DATABASE)
    assert audit["hashes"][SOURCE.name] == digest(SOURCE)
    assert audit["hashes"][AUDIT_SOURCE.name] == digest(AUDIT_SOURCE)
    assert report["coverage"]["terminal_type_count"] == 253
    assert report["coverage"]["source_alpha"] == 7

    remaining_alpha8 = 6 * 253
    remaining_alpha9 = 5 * 15
    remaining_total = remaining_alpha8 + remaining_alpha9
    closed_total = 313 + 253
    assert remaining_alpha8 == 1518
    assert remaining_alpha9 == 75
    assert remaining_total == 1593 == 2159 - closed_total

    payload = {
        "schema": "rank8-forest-pgc-dependency-refresh-after-alpha8-s7-agent-v1",
        "status": "PENDING_EXACT_RANK8_FOREST_Q8_AND_PGC_AFTER_566_FIRST_CROSSING_CELLS_CLOSED_AGENT",
        "exact_progress": {
            "original_remaining_source_type_cells": 2159,
            "total_source_type_cells_closed": closed_total,
            "remaining_source_type_cells": remaining_total,
            "terminal_alpha8_remaining": {
                "source_alpha": [8, 13],
                "terminal_type_indices": [948, 1200],
                "cells": remaining_alpha8,
            },
            "terminal_alpha9_remaining": prior["exact_progress"]["terminal_alpha9_remaining"],
            "new_alpha8_source7_package": {
                "source_type_cells": 253,
                "raw_multisets": report["aggregate"]["independently_counted_raw_multisets"],
                "canonical_check_keys": report["aggregate"]["canonical_check_keys"],
                "distinct_crossing_jets": report["aggregate"]["distinct_crossing_jets"],
                "negative_Q8": 0,
                "zero_Q8": 0,
                "minimum_Q8": report["aggregate"]["minimum_Q8"],
                "maximum_Q8": report["aggregate"]["maximum_Q8"],
                "producer_peak_private_bytes": report["resources"]["peak_private_bytes"],
                "audit_peak_private_bytes": audit["resources"]["peak_private_bytes"],
            },
        },
        "forest_Q8_dependencies": {
            **prior["forest_Q8_dependencies"],
            "exceptional_first_crossing": f"PARTIAL_{remaining_total}_SOURCE_TYPE_CELLS_REMAIN",
            "forest_Q8_complete": False,
        },
        "rank8_PGC_downstream": prior["rank8_PGC_downstream"],
        "problem_993_solved": False,
        "scope_warning": "The exact alpha8/source7 package closes 253 further cells. Connected Q8, low/low, 1,593 first-crossing cells, forest Q8, rank8 PGC, and Problem 993 remain open.",
        "hashes": {
            PRIOR_SOURCE.name: digest(PRIOR_SOURCE),
            PRIOR.name: digest(PRIOR),
            SOURCE.name: digest(SOURCE),
            REPORT.name: digest(REPORT),
            DATABASE.name: digest(DATABASE),
            AUDIT_SOURCE.name: digest(AUDIT_SOURCE),
            AUDIT.name: digest(AUDIT),
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
