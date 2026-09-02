#!/usr/bin/env python3
"""Fail-closed assembly of the complete terminal-alpha7/source7 slice."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_exact_20260820.json"
DESIGN_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_audit_exact_20260820.json"
RANGES = [(248, 720), (721, 947)]
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha7_s7_complete_exact_20260820.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def artifact_paths(start, stop):
    stem = f"rank8_exceptional_first_crossing_alpha7_s7_types{start}_{stop}"
    return (
        ROOT / f"{stem}_exact_20260820.json",
        ROOT / f"{stem}_keys_exact_20260820.sqlite3",
        ROOT / f"{stem}_audit_exact_20260820.json",
    )


def main() -> int:
    design = json.loads(DESIGN.read_text(encoding="utf-8"))
    design_audit = json.loads(DESIGN_AUDIT.read_text(encoding="utf-8"))
    assert design["status"].startswith("PASS_EXACT_NO_GAP_RESOURCE_DESIGN")
    assert design_audit["status"].startswith("PASS_INDEPENDENT_EXACT_NO_GAP_RESOURCE_DESIGN_AUDIT")
    designed = design["exact_counts"]["source_cells"]["7"]
    assert [(s["terminal_type_index_start"], s["terminal_type_index_stop"]) for s in designed["shards"]] == RANGES

    hashes = {DESIGN.name: digest(DESIGN), DESIGN_AUDIT.name: digest(DESIGN_AUDIT), Path(__file__).name: digest(Path(__file__))}
    shards = []
    expected_start = 248
    aggregate = {
        "raw": 0, "checks": 0, "products": 0, "raw_key": 0, "key_product": 0,
        "negative": 0, "zero": 0, "minimum": None, "maximum": None,
        "producer_seconds": 0.0, "audit_seconds": 0.0,
        "producer_peak": 0, "audit_peak": 0,
    }
    for start, stop in RANGES:
        report_path, database_path, audit_path = artifact_paths(start, stop)
        report = json.loads(report_path.read_text(encoding="utf-8"))
        audit = json.loads(audit_path.read_text(encoding="utf-8"))
        assert report["status"] == "PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA7_SOURCE7_SHARD"
        assert audit["status"] == "PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA7_SOURCE7_SHARD_AUDIT"
        assert start == expected_start and stop >= start
        expected_start = stop + 1
        scope = report["scope"]
        assert (scope["source_alpha"], scope["terminal_alpha"], scope["terminal_type_index_start"], scope["terminal_type_index_stop"]) == (7, 7, start, stop)
        assert report["resources"]["peak_private_bytes"] < 448 * 1024**2
        assert audit["resources"]["peak_private_bytes"] < 448 * 1024**2
        assert report["hashes"][database_path.name] == digest(database_path)
        assert audit["hashes"][report_path.name] == digest(report_path)
        assert audit["hashes"][database_path.name] == digest(database_path)
        row = report["aggregate"]
        audited = audit["shard"]
        mapping = {
            "independently_counted_raw_multisets": "independently_enumerated_multisets",
            "canonical_check_keys": "canonical_check_keys",
            "distinct_crossing_jets": "distinct_crossing_jets",
            "raw_to_canonical_compression": "raw_to_canonical_compression",
            "canonical_key_to_product_collisions": "canonical_key_to_product_collisions",
            "negative_Q8": "negative_Q8", "zero_Q8": "zero_Q8",
            "minimum_Q8": "minimum_Q8", "maximum_Q8": "maximum_Q8",
        }
        for report_key, audit_key in mapping.items():
            assert row[report_key] == audited[audit_key]
        assert row["negative_Q8"] == row["zero_Q8"] == 0 and row["minimum_Q8"] > 0
        aggregate["raw"] += row["independently_counted_raw_multisets"]
        aggregate["checks"] += row["canonical_check_keys"]
        aggregate["products"] += row["distinct_crossing_jets"]
        aggregate["raw_key"] += row["raw_to_canonical_compression"]
        aggregate["key_product"] += row["canonical_key_to_product_collisions"]
        aggregate["negative"] += row["negative_Q8"]
        aggregate["zero"] += row["zero_Q8"]
        aggregate["minimum"] = row["minimum_Q8"] if aggregate["minimum"] is None else min(aggregate["minimum"], row["minimum_Q8"])
        aggregate["maximum"] = row["maximum_Q8"] if aggregate["maximum"] is None else max(aggregate["maximum"], row["maximum_Q8"])
        aggregate["producer_seconds"] += report["resources"]["elapsed_seconds"]
        aggregate["audit_seconds"] += audit["resources"]["elapsed_seconds"]
        aggregate["producer_peak"] = max(aggregate["producer_peak"], report["resources"]["peak_private_bytes"])
        aggregate["audit_peak"] = max(aggregate["audit_peak"], audit["resources"]["peak_private_bytes"])
        hashes[report_path.name] = digest(report_path)
        hashes[database_path.name] = digest(database_path)
        hashes[audit_path.name] = digest(audit_path)
        shards.append({
            "terminal_type_index_start": start,
            "terminal_type_index_stop": stop,
            "raw_multisets": row["independently_counted_raw_multisets"],
            "canonical_checks": row["canonical_check_keys"],
            "products": row["distinct_crossing_jets"],
            "minimum_Q8": row["minimum_Q8"],
            "maximum_Q8": row["maximum_Q8"],
        })
    assert expected_start == 948
    assert aggregate["raw"] == designed["raw_multiset_crossing_count"] == 892850
    assert aggregate["checks"] + aggregate["raw_key"] == aggregate["raw"]
    assert aggregate["products"] + aggregate["key_product"] == aggregate["checks"]
    assert aggregate["negative"] == aggregate["zero"] == 0

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha7-s7-complete-v1",
        "status": "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCE7_COMPLETE",
        "theorem": "Every exceptional-only threshold-14 first crossing with terminal alpha7 and source alpha7 has literal Q8>0.",
        "coverage": {"source_alpha": 7, "terminal_alpha": 7, "total_alpha": 14, "terminal_type_indices": [248, 947], "terminal_type_count": 700, "shard_ranges": [list(r) for r in RANGES], "gaps": 0, "overlaps": 0},
        "aggregate": {
            "independently_enumerated_multisets": aggregate["raw"],
            "canonical_check_keys": aggregate["checks"],
            "distinct_shard_product_jets_sum": aggregate["products"],
            "multiset_to_canonical_key_compression": aggregate["raw_key"],
            "canonical_key_to_product_compression_within_shards": aggregate["key_product"],
            "negative_Q8": aggregate["negative"],
            "zero_Q8": aggregate["zero"],
            "minimum_Q8": aggregate["minimum"],
            "maximum_Q8": aggregate["maximum"],
        },
        "resources": {
            "workers": 1, "fresh_process_per_shard_and_audit": True,
            "producer_elapsed_seconds_sum": aggregate["producer_seconds"],
            "audit_elapsed_seconds_sum": aggregate["audit_seconds"],
            "maximum_producer_peak_private_bytes": aggregate["producer_peak"],
            "maximum_producer_peak_private_MiB": aggregate["producer_peak"] / 1024**2,
            "maximum_audit_peak_private_bytes": aggregate["audit_peak"],
            "maximum_audit_peak_private_MiB": aggregate["audit_peak"] / 1024**2,
            "abort_limit_private_bytes": 448 * 1024**2, "hard_limit_private_bytes": 512 * 1024**2,
        },
        "shards": shards,
        "scope_warning": "Completes only source alpha7 for terminal alpha7; source alpha8..13 and terminal alpha8..9 remain.",
        "hashes": hashes,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"raw={aggregate['raw']} checks={aggregate['checks']} products={aggregate['products']} neg=0 zero=0 min_Q8={aggregate['minimum']} max_Q8={aggregate['maximum']}")
    print(f"assembly_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
