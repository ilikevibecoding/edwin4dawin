#!/usr/bin/env python3
"""Generic hash-pinned no-gap union audit for independently audited streaming shards."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRODUCER = ROOT / "probe_rank8_exceptional_first_crossing_streaming_shard_agent.py"
AUDITOR = ROOT / "audit_rank8_exceptional_first_crossing_streaming_shard_agent.py"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_union_config() -> tuple[Path, dict]:
    assert len(sys.argv) == 2, "usage: union-audit UNION_CONFIG.json"
    path = Path(sys.argv[1])
    if not path.is_absolute():
        path = ROOT / path
    path = path.resolve()
    assert path.parent == ROOT
    config = json.loads(path.read_text(encoding="utf-8"))
    assert config["schema"] == "rank8-exceptional-first-crossing-streaming-union-config-agent-v1"
    return path, config


def main() -> int:
    union_config_path, union_config = load_union_config()
    terminal_alpha = int(union_config["terminal_alpha"])
    source_alpha = int(union_config["source_alpha"])
    type_start = int(union_config["terminal_type_index_start"])
    type_stop = int(union_config["terminal_type_index_stop"])
    expected_raw = int(union_config["expected_raw_multisets"])
    config_names = tuple(union_config["shard_config_files"])
    assert terminal_alpha in (8, 9) and terminal_alpha <= source_alpha <= 13
    assert config_names

    reports = []
    audits = []
    intervals = []
    covered = []
    hashes = {
        PRODUCER.name: digest(PRODUCER),
        AUDITOR.name: digest(AUDITOR),
        union_config_path.name: digest(union_config_path),
    }
    for config_name in config_names:
        config_path = (ROOT / config_name).resolve()
        assert config_path.parent == ROOT
        config = json.loads(config_path.read_text(encoding="utf-8"))
        assert config["schema"] == "rank8-exceptional-first-crossing-streaming-shard-config-agent-v1"
        assert config["terminal_alpha"] == terminal_alpha
        assert config["source_alpha"] == source_alpha
        shard_start = int(config["terminal_type_index_start"])
        shard_stop = int(config["terminal_type_index_stop"])
        stem = f"rank8_exceptional_first_crossing_alpha{terminal_alpha}_s{source_alpha}_types{shard_start}_{shard_stop}"
        database = ROOT / f"{stem}_keys_exact_agent_20260823.sqlite3"
        report_path = ROOT / f"{stem}_shard_exact_agent_20260823.json"
        audit_path = ROOT / f"{stem}_shard_independent_audit_agent_20260823.json"
        producer_status = (
            f"PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA{terminal_alpha}_SOURCE{source_alpha}_"
            f"TYPES{shard_start}_{shard_stop}_SHARD_AGENT"
        )
        audit_status = (
            f"PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_RANK8_ALPHA{terminal_alpha}_SOURCE{source_alpha}_"
            f"TYPES{shard_start}_{shard_stop}_SHARD_AUDIT_AGENT"
        )
        report = json.loads(report_path.read_text(encoding="utf-8"))
        audit = json.loads(audit_path.read_text(encoding="utf-8"))
        assert report["status"] == producer_status
        assert audit["status"] == audit_status
        assert report["configuration"] == config == audit["configuration"]
        assert report["coverage"]["source_alpha"] == source_alpha
        assert report["coverage"]["terminal_alpha"] == terminal_alpha
        assert report["coverage"]["terminal_type_indices"] == [shard_start, shard_stop]
        assert report["coverage"]["terminal_type_count"] == shard_stop - shard_start + 1
        assert report["aggregate"]["independently_counted_raw_multisets"] == config["expected_raw_multisets"]
        assert report["aggregate"]["negative_Q8"] == report["aggregate"]["zero_Q8"] == 0
        assert audit["aggregate"]["independently_enumerated_multisets"] == config["expected_raw_multisets"]
        assert audit["aggregate"]["negative_Q8"] == audit["aggregate"]["zero_Q8"] == 0
        assert report["hashes"][config_path.name] == digest(config_path)
        assert report["hashes"][database.name] == digest(database)
        assert report["hashes"][PRODUCER.name] == digest(PRODUCER)
        assert audit["hashes"][config_path.name] == digest(config_path)
        assert audit["hashes"][report_path.name] == digest(report_path)
        assert audit["hashes"][database.name] == digest(database)
        assert audit["hashes"][PRODUCER.name] == digest(PRODUCER)
        assert audit["hashes"][AUDITOR.name] == digest(AUDITOR)
        indices = [item["terminal_type_index"] for item in report["per_terminal_type"]]
        assert indices == list(range(shard_start, shard_stop + 1))
        covered.extend(indices)
        intervals.append([shard_start, shard_stop])
        reports.append(report)
        audits.append(audit)
        for path in (config_path, database, report_path, audit_path):
            hashes[path.name] = digest(path)

    assert covered == list(range(type_start, type_stop + 1))
    assert len(covered) == len(set(covered))
    raw = sum(report["aggregate"]["independently_counted_raw_multisets"] for report in reports)
    keys = sum(report["aggregate"]["canonical_check_keys"] for report in reports)
    product_sum = sum(report["aggregate"]["distinct_crossing_jets"] for report in reports)
    assert raw == expected_raw

    stem = f"rank8_exceptional_first_crossing_alpha{terminal_alpha}_s{source_alpha}_types{type_start}_{type_stop}"
    output = ROOT / f"{stem}_complete_union_audit_agent_20260823.json"
    status = (
        f"PASS_EXACT_HASH_PINNED_NO_GAP_RANK8_ALPHA{terminal_alpha}_SOURCE{source_alpha}_"
        f"TYPES{type_start}_{type_stop}_COMPLETE_UNION_AUDIT_AGENT"
    )
    payload = {
        "schema": "rank8-exceptional-first-crossing-streaming-complete-union-audit-agent-v1",
        "status": status,
        "theorem": (
            f"Every exceptional-only first crossing with terminal alpha{terminal_alpha}, source alpha{source_alpha}, "
            f"and terminal type{type_start}..{type_stop} has literal Q8>0."
        ),
        "configuration": union_config,
        "coverage": {
            "source_alpha": source_alpha,
            "terminal_alpha": terminal_alpha,
            "terminal_type_indices": [type_start, type_stop],
            "terminal_type_count": type_stop - type_start + 1,
            "shard_intervals": intervals,
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
        "scope_warning": "Completes only the configured finite union. Other first-crossing cells and broader forest-Q8/PGC dependencies remain.",
        "hashes": {**hashes, Path(__file__).name: digest(Path(__file__))},
    }
    output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(status)
    print(f"cells={len(covered)} raw={raw} keys={keys} product_sum={product_sum} neg=0 zero=0")
    print(f"union_audit_sha256={digest(output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
