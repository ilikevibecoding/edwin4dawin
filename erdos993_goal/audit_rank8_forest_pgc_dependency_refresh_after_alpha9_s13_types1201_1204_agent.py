#!/usr/bin/env python3
"""Fail-closed PGC dependency refresh through alpha9/source13/types1201..1204."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIOR_SOURCE = ROOT / "audit_rank8_forest_pgc_dependency_refresh_after_alpha8_s8_agent.py"
PRIOR = ROOT / "rank8_forest_pgc_dependency_refresh_after_alpha8_s8_agent_20260823.json"
UNION_SOURCE = ROOT / "audit_rank8_exceptional_first_crossing_streaming_union_agent.py"
PACKAGES = (
    {
        "label": "alpha9_source11_complete",
        "config": ROOT / "rank8_exceptional_first_crossing_alpha9_s11_types1201_1215_union_config_agent_20260823.json",
        "report": ROOT / "rank8_exceptional_first_crossing_alpha9_s11_types1201_1215_complete_union_audit_agent_20260823.json",
        "status": "PASS_EXACT_HASH_PINNED_NO_GAP_RANK8_ALPHA9_SOURCE11_TYPES1201_1215_COMPLETE_UNION_AUDIT_AGENT",
        "interval": [1201, 1215],
        "cells": 15,
        "raw": 1_000_620,
    },
    {
        "label": "alpha9_source12_complete",
        "config": ROOT / "rank8_exceptional_first_crossing_alpha9_s12_types1201_1215_union_config_agent_20260823.json",
        "report": ROOT / "rank8_exceptional_first_crossing_alpha9_s12_types1201_1215_complete_union_audit_agent_20260823.json",
        "status": "PASS_EXACT_HASH_PINNED_NO_GAP_RANK8_ALPHA9_SOURCE12_TYPES1201_1215_COMPLETE_UNION_AUDIT_AGENT",
        "interval": [1201, 1215],
        "cells": 15,
        "raw": 2_797_965,
    },
    {
        "label": "alpha9_source13_types1201_1204_partial",
        "config": ROOT / "rank8_exceptional_first_crossing_alpha9_s13_types1201_1204_union_config_agent_20260823.json",
        "report": ROOT / "rank8_exceptional_first_crossing_alpha9_s13_types1201_1204_complete_union_audit_agent_20260823.json",
        "status": "PASS_EXACT_HASH_PINNED_NO_GAP_RANK8_ALPHA9_SOURCE13_TYPES1201_1204_COMPLETE_UNION_AUDIT_AGENT",
        "interval": [1201, 1204],
        "cells": 4,
        "raw": 2_111_790,
    },
)
OUTPUT = ROOT / "rank8_forest_pgc_dependency_refresh_after_alpha9_s13_types1201_1204_agent_20260823.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    prior = json.loads(PRIOR.read_text(encoding="utf-8"))
    assert prior["status"] == "PENDING_EXACT_RANK8_FOREST_Q8_AND_PGC_AFTER_849_FIRST_CROSSING_CELLS_CLOSED_AGENT"
    assert prior["hashes"][PRIOR_SOURCE.name] == digest(PRIOR_SOURCE)
    assert prior["exact_progress"]["remaining_source_type_cells"] == 1310

    package_summaries = {}
    hashes = {
        PRIOR_SOURCE.name: digest(PRIOR_SOURCE),
        PRIOR.name: digest(PRIOR),
        UNION_SOURCE.name: digest(UNION_SOURCE),
    }
    for package in PACKAGES:
        config = json.loads(package["config"].read_text(encoding="utf-8"))
        report = json.loads(package["report"].read_text(encoding="utf-8"))
        assert report["status"] == package["status"]
        assert report["configuration"] == config
        assert report["hashes"][package["config"].name] == digest(package["config"])
        assert report["hashes"][UNION_SOURCE.name] == digest(UNION_SOURCE)
        assert report["coverage"]["terminal_alpha"] == 9
        assert report["coverage"]["terminal_type_indices"] == package["interval"]
        assert report["coverage"]["terminal_type_count"] == package["cells"]
        assert report["coverage"]["gaps"] == report["coverage"]["overlaps"] == 0
        assert report["aggregate"]["independently_enumerated_raw_multisets"] == package["raw"]
        assert report["aggregate"]["negative_Q8"] == report["aggregate"]["zero_Q8"] == 0
        package_summaries[package["label"]] = {
            "source_alpha": report["coverage"]["source_alpha"],
            "terminal_type_indices": package["interval"],
            "source_type_cells": package["cells"],
            "raw_multisets": package["raw"],
            "canonical_check_keys": report["aggregate"]["canonical_check_keys"],
            "per_shard_distinct_product_jet_sum_not_globally_deduplicated": report["aggregate"]["per_shard_distinct_product_jet_sum_not_globally_deduplicated"],
            "negative_Q8": 0,
            "zero_Q8": 0,
            "minimum_Q8": report["aggregate"]["minimum_Q8"],
            "maximum_Q8": report["aggregate"]["maximum_Q8"],
            "maximum_producer_peak_private_bytes": report["aggregate"]["maximum_producer_peak_private_bytes"],
            "maximum_audit_peak_private_bytes": report["aggregate"]["maximum_audit_peak_private_bytes"],
        }
        hashes[package["config"].name] = digest(package["config"])
        hashes[package["report"].name] = digest(package["report"])

    newly_closed = sum(package["cells"] for package in PACKAGES)
    closed_total = 849 + newly_closed
    remaining_alpha8 = 5 * 253
    remaining_alpha9 = 11
    remaining_total = remaining_alpha8 + remaining_alpha9
    assert newly_closed == 34
    assert closed_total == 883
    assert remaining_alpha8 == 1265
    assert remaining_total == 1276 == 2159 - closed_total

    payload = {
        "schema": "rank8-forest-pgc-dependency-refresh-after-alpha9-s13-types1201-1204-agent-v1",
        "status": "PENDING_EXACT_RANK8_FOREST_Q8_AND_PGC_AFTER_883_FIRST_CROSSING_CELLS_CLOSED_AGENT",
        "exact_progress": {
            "original_remaining_source_type_cells": 2159,
            "total_source_type_cells_closed": closed_total,
            "remaining_source_type_cells": remaining_total,
            "terminal_alpha8_remaining": prior["exact_progress"]["terminal_alpha8_remaining"],
            "terminal_alpha9_remaining": {
                "source_alpha": [13, 13],
                "terminal_type_indices": [1205, 1215],
                "cells": remaining_alpha9,
            },
            "new_alpha9_packages_since_prior_refresh": package_summaries,
        },
        "forest_Q8_dependencies": {
            **prior["forest_Q8_dependencies"],
            "exceptional_first_crossing": f"PARTIAL_{remaining_total}_SOURCE_TYPE_CELLS_REMAIN",
            "forest_Q8_complete": False,
        },
        "rank8_PGC_downstream": prior["rank8_PGC_downstream"],
        "problem_993_solved": False,
        "scope_warning": (
            "The exact alpha9/source11 and source12 rows plus source13/types1201..1204 close 34 further cells. "
            "Connected Q8, low/low, 1,276 first-crossing cells, forest Q8, rank8 PGC, and Problem 993 remain open."
        ),
        "hashes": {**hashes, Path(__file__).name: digest(Path(__file__))},
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
