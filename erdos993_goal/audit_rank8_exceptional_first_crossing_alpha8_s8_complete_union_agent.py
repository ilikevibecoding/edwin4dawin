#!/usr/bin/env python3
"""Hash-pinned no-gap union audit for the two exact alpha8/source8 shards."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SHARDS = (
    {
        "source": ROOT / "probe_rank8_exceptional_first_crossing_alpha8_s8_types948_1096_shard_agent.py",
        "report": ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types948_1096_shard_exact_agent_20260823.json",
        "database": ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types948_1096_keys_exact_agent_20260823.sqlite3",
        "audit_source": ROOT / "audit_rank8_exceptional_first_crossing_alpha8_s8_types948_1096_shard_agent.py",
        "audit": ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types948_1096_shard_independent_audit_agent_20260823.json",
        "report_status": "PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA8_SOURCE8_TYPES948_1096_SHARD_AGENT",
        "audit_status": "PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_RANK8_ALPHA8_SOURCE8_TYPES948_1096_SHARD_AUDIT_AGENT",
        "interval": [948, 1096],
        "raw": 548_916,
    },
    {
        "source": ROOT / "probe_rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_shard_agent.py",
        "report": ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_shard_exact_agent_20260823.json",
        "database": ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_keys_exact_agent_20260823.sqlite3",
        "audit_source": ROOT / "audit_rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_shard_agent.py",
        "audit": ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_shard_independent_audit_agent_20260823.json",
        "report_status": "PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA8_SOURCE8_TYPES1097_1200_SHARD_AGENT",
        "audit_status": "PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_RANK8_ALPHA8_SOURCE8_TYPES1097_1200_SHARD_AUDIT_AGENT",
        "interval": [1097, 1200],
        "raw": 396_292,
    },
)
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types948_1200_complete_union_audit_agent_20260823.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    covered = []
    reports = []
    audits = []
    hashes = {}
    for shard in SHARDS:
        report = json.loads(shard["report"].read_text(encoding="utf-8"))
        audit = json.loads(shard["audit"].read_text(encoding="utf-8"))
        assert report["status"] == shard["report_status"]
        assert audit["status"] == shard["audit_status"]
        assert report["coverage"]["source_alpha"] == 8
        assert report["coverage"]["terminal_alpha"] == 8
        assert report["coverage"]["terminal_type_indices"] == shard["interval"]
        assert report["coverage"]["terminal_type_count"] == shard["interval"][1] - shard["interval"][0] + 1
        assert report["aggregate"]["independently_counted_raw_multisets"] == shard["raw"]
        assert report["aggregate"]["negative_Q8"] == report["aggregate"]["zero_Q8"] == 0
        assert audit["aggregate"]["independently_enumerated_multisets"] == shard["raw"]
        assert audit["aggregate"]["negative_Q8"] == audit["aggregate"]["zero_Q8"] == 0
        assert audit["hashes"][shard["report"].name] == digest(shard["report"])
        assert audit["hashes"][shard["database"].name] == digest(shard["database"])
        assert audit["hashes"][shard["source"].name] == digest(shard["source"])
        assert audit["hashes"][shard["audit_source"].name] == digest(shard["audit_source"])
        indices = [item["terminal_type_index"] for item in report["per_terminal_type"]]
        assert indices == list(range(shard["interval"][0], shard["interval"][1] + 1))
        covered.extend(indices)
        reports.append(report)
        audits.append(audit)
        for role in ("source", "report", "database", "audit_source", "audit"):
            path = shard[role]
            hashes[path.name] = digest(path)

    assert covered == list(range(948, 1201))
    raw = sum(report["aggregate"]["independently_counted_raw_multisets"] for report in reports)
    keys = sum(report["aggregate"]["canonical_check_keys"] for report in reports)
    product_sum = sum(report["aggregate"]["distinct_crossing_jets"] for report in reports)
    assert raw == 945_208
    assert len(covered) == 253 == len(set(covered))

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha8-s8-complete-union-audit-agent-v1",
        "status": "PASS_EXACT_HASH_PINNED_NO_GAP_RANK8_ALPHA8_SOURCE8_COMPLETE_UNION_AUDIT_AGENT",
        "theorem": "Every exceptional-only first crossing with terminal alpha8 and source alpha8 has literal Q8>0.",
        "coverage": {
            "source_alpha": 8,
            "terminal_alpha": 8,
            "terminal_type_indices": [948, 1200],
            "terminal_type_count": 253,
            "shard_intervals": [shard["interval"] for shard in SHARDS],
            "gaps": 0,
            "overlaps": 0,
        },
        "aggregate": {
            "independently_enumerated_raw_multisets": raw,
            "canonical_check_keys": keys,
            "per_shard_distinct_product_jet_sum_not_globally_deduplicated": product_sum,
            "negative_Q8": 0,
            "zero_Q8": 0,
            "minimum_Q8": min(report["aggregate"]["minimum_Q8"] for report in reports),
            "maximum_Q8": max(report["aggregate"]["maximum_Q8"] for report in reports),
            "maximum_producer_peak_private_bytes": max(report["resources"]["peak_private_bytes"] for report in reports),
            "maximum_audit_peak_private_bytes": max(audit["resources"]["peak_private_bytes"] for audit in audits),
        },
        "scope_warning": "Completes only terminal alpha8/source alpha8. Other first-crossing cells and broader forest-Q8/PGC dependencies remain.",
        "hashes": {**hashes, Path(__file__).name: digest(Path(__file__))},
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"cells=253 raw={raw} keys={keys} product_sum={product_sum} neg=0 zero=0")
    print(f"union_audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
