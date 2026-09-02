#!/usr/bin/env python3
"""Fail-closed assembly of complete terminal-alpha7/source11."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_exact_20260820.json"
DESIGN_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_audit_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha7_s11_complete_exact_20260820.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def paths(start: int, stop: int) -> tuple[Path, Path, Path]:
    stem = f"rank8_exceptional_first_crossing_alpha7_s11_types{start}_{stop}"
    return (
        ROOT / f"{stem}_exact_20260820.json",
        ROOT / f"{stem}_keys_exact_20260820.sqlite3",
        ROOT / f"{stem}_audit_exact_20260820.json",
    )


def main() -> int:
    design = json.loads(DESIGN.read_text(encoding="utf-8"))
    design_audit = json.loads(DESIGN_AUDIT.read_text(encoding="utf-8"))
    assert design_audit["status"] == "PASS_INDEPENDENT_EXACT_NO_GAP_RESOURCE_DESIGN_AUDIT_RANK8_ALPHA7"
    cell = design["exact_counts"]["source_cells"]["11"]
    ranges = [
        (shard["terminal_type_index_start"], shard["terminal_type_index_stop"])
        for shard in cell["shards"]
    ]
    assert len(ranges) == cell["shard_count"] == 67

    hashes = {
        DESIGN.name: digest(DESIGN),
        DESIGN_AUDIT.name: digest(DESIGN_AUDIT),
        Path(__file__).name: digest(Path(__file__)),
    }
    raw = keys = products = raw_key_compression = key_product_compression = 0
    minimum = maximum = None
    producer_seconds = audit_seconds = 0.0
    producer_peak = audit_peak = 0
    expected = 248
    shards = []

    for start, stop in ranges:
        assert start == expected
        expected = stop + 1
        report_path, database_path, audit_path = paths(start, stop)
        report = json.loads(report_path.read_text(encoding="utf-8"))
        audit = json.loads(audit_path.read_text(encoding="utf-8"))
        assert report["status"] == "PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA7_SOURCE11_SHARD"
        assert audit["status"] == "PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA7_SOURCE11_SHARD_AUDIT"
        assert report["hashes"][database_path.name] == digest(database_path)
        assert audit["hashes"][report_path.name] == digest(report_path)
        assert audit["hashes"][database_path.name] == digest(database_path)

        aggregate = report["aggregate"]
        independently_audited = audit["shard"]
        comparisons = (
            ("independently_counted_raw_multisets", "independently_enumerated_multisets"),
            ("canonical_check_keys", "canonical_check_keys"),
            ("distinct_crossing_jets", "distinct_crossing_jets"),
            ("minimum_Q8", "minimum_Q8"),
            ("maximum_Q8", "maximum_Q8"),
        )
        for report_key, audit_key in comparisons:
            assert aggregate[report_key] == independently_audited[audit_key]
        assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
        assert aggregate["minimum_Q8"] > 0

        raw += aggregate["independently_counted_raw_multisets"]
        keys += aggregate["canonical_check_keys"]
        products += aggregate["distinct_crossing_jets"]
        raw_key_compression += aggregate["raw_to_canonical_compression"]
        key_product_compression += aggregate["canonical_key_to_product_collisions"]
        minimum = aggregate["minimum_Q8"] if minimum is None else min(minimum, aggregate["minimum_Q8"])
        maximum = aggregate["maximum_Q8"] if maximum is None else max(maximum, aggregate["maximum_Q8"])
        producer_seconds += report["resources"]["elapsed_seconds"]
        audit_seconds += audit["resources"]["elapsed_seconds"]
        producer_peak = max(producer_peak, report["resources"]["peak_private_bytes"])
        audit_peak = max(audit_peak, audit["resources"]["peak_private_bytes"])
        for path in (report_path, database_path, audit_path):
            hashes[path.name] = digest(path)
        shards.append(
            {
                "terminal_type_index_start": start,
                "terminal_type_index_stop": stop,
                "raw_multisets": aggregate["independently_counted_raw_multisets"],
                "canonical_checks": aggregate["canonical_check_keys"],
                "products": aggregate["distinct_crossing_jets"],
                "minimum_Q8": aggregate["minimum_Q8"],
                "maximum_Q8": aggregate["maximum_Q8"],
            }
        )

    assert expected == 948
    assert raw == cell["raw_multiset_crossing_count"] == 34_823_950
    assert keys + raw_key_compression == raw
    assert products + key_product_compression == keys
    aggregate = {
        "independently_enumerated_multisets": raw,
        "canonical_check_keys": keys,
        "distinct_shard_product_jets_sum": products,
        "multiset_to_canonical_key_compression": raw_key_compression,
        "canonical_key_to_product_compression_within_shards": key_product_compression,
        "negative_Q8": 0,
        "zero_Q8": 0,
        "minimum_Q8": minimum,
        "maximum_Q8": maximum,
    }
    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha7-s11-complete-v1",
        "status": "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCE11_COMPLETE",
        "theorem": "Every exceptional-only first crossing with terminal alpha7 and source alpha11 has literal Q8>0.",
        "coverage": {
            "source_alpha": 11,
            "terminal_alpha": 7,
            "total_alpha": 18,
            "terminal_type_indices": [248, 947],
            "terminal_type_count": 700,
            "shard_ranges": [list(item) for item in ranges],
            "gaps": 0,
            "overlaps": 0,
        },
        "aggregate": aggregate,
        "resources": {
            "workers": 1,
            "fresh_process_per_shard_and_audit": True,
            "producer_elapsed_seconds_sum": producer_seconds,
            "audit_elapsed_seconds_sum": audit_seconds,
            "maximum_producer_peak_private_bytes": producer_peak,
            "maximum_producer_peak_private_MiB": producer_peak / 1024**2,
            "maximum_audit_peak_private_bytes": audit_peak,
            "maximum_audit_peak_private_MiB": audit_peak / 1024**2,
            "abort_limit_private_bytes": 448 * 1024**2,
            "hard_limit_private_bytes": 512 * 1024**2,
        },
        "shards": shards,
        "scope_warning": "Completes only source alpha11 for terminal alpha7; stops before source12.",
        "hashes": hashes,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"raw={raw} checks={keys} products={products} neg=0 zero=0 "
        f"min_Q8={minimum} max_Q8={maximum}"
    )
    print(f"assembly_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
