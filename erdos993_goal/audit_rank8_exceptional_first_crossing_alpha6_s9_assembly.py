#!/usr/bin/env python3
"""Independent fail-closed audit of the source-alpha9 two-shard assembly."""

from __future__ import annotations

import hashlib
import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLER = ROOT / "assemble_rank8_exceptional_first_crossing_alpha6_s9.py"
ASSEMBLY = ROOT / "rank8_exceptional_first_crossing_alpha6_s9_complete_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha6_s9_complete_audit_exact_20260820.json"
LABELS = ("types73_246", "type247")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def artifacts(label):
    stem = f"rank8_exceptional_first_crossing_alpha6_s9_{label}"
    return {
        "report": ROOT / f"{stem}_exact_20260820.json",
        "database": ROOT / f"{stem}_keys_exact_20260820.sqlite3",
        "audit": ROOT / f"{stem}_audit_exact_20260820.json",
    }


def main():
    assembly = json.loads(ASSEMBLY.read_text(encoding="utf-8"))
    assert assembly["status"] == "PASS_EXACT_NO_GAP_RANK8_ALPHA6_SOURCE9_COMPLETE"
    assert assembly["hashes"][ASSEMBLER.name] == digest(ASSEMBLER)
    ranges = []
    raw = checks = products_sum = multiset_collisions = key_product_collisions = 0
    minimum = maximum = None
    hashes = {ASSEMBLY.name: digest(ASSEMBLY), ASSEMBLER.name: digest(ASSEMBLER)}

    for label in LABELS:
        files = artifacts(label)
        for path in files.values():
            assert assembly["hashes"][path.name] == digest(path)
            hashes[path.name] = digest(path)
        report = json.loads(files["report"].read_text(encoding="utf-8"))
        audit = json.loads(files["audit"].read_text(encoding="utf-8"))
        shard_range = [report["aggregate"]["terminal_type_index_start"], report["aggregate"]["terminal_type_index_stop"]]
        ranges.append(shard_range)
        expected_types = list(range(shard_range[0], shard_range[1] + 1))
        assert [row["terminal_type_index"] for row in report["per_terminal_type"]] == expected_types
        assert [row["terminal_type_index"] for row in audit["shard"]["per_terminal_type"]] == expected_types
        for row in audit["shard"]["per_terminal_type"]:
            assert row["independently_enumerated_multisets"] == 3162 + 13 * row["terminal_relative_alpha6_type"]

        with sqlite3.connect(files["database"]) as connection:
            database_checks = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
            database_products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
            database_types = [row[0] for row in connection.execute("SELECT DISTINCT largest_type FROM keys ORDER BY largest_type")]
            database_nonpositive = connection.execute("SELECT COUNT(*) FROM keys WHERE CAST(q8 AS INTEGER)<=0").fetchone()[0]
            database_minimum, database_maximum = connection.execute("SELECT MIN(CAST(q8 AS INTEGER)),MAX(CAST(q8 AS INTEGER)) FROM keys").fetchone()
        assert database_types == expected_types and database_nonpositive == 0
        assert database_checks == report["aggregate"]["ordered_covering_checks"] == audit["shard"]["canonical_check_keys"]
        assert database_products == report["aggregate"]["distinct_crossing_jets"] == audit["shard"]["distinct_crossing_jets"]
        assert database_minimum == report["aggregate"]["minimum_Q8"] == audit["shard"]["minimum_Q8"]
        assert database_maximum == report["aggregate"]["maximum_Q8"] == audit["shard"]["maximum_Q8"]
        raw += audit["shard"]["independently_enumerated_multisets"]
        checks += database_checks
        products_sum += database_products
        multiset_collisions += audit["shard"]["multiset_to_canonical_key_collisions"]
        key_product_collisions += database_checks - database_products
        minimum = database_minimum if minimum is None else min(minimum, database_minimum)
        maximum = database_maximum if maximum is None else max(maximum, database_maximum)

    assert ranges == [[73, 246], [247, 247]]
    exact_types = [value for start, stop in ranges for value in range(start, stop + 1)]
    assert exact_types == list(range(73, 248)) and len(exact_types) == len(set(exact_types)) == 175
    aggregate = {
        "independently_enumerated_multisets": raw,
        "canonical_checks": checks,
        "distinct_shard_product_jets_sum": products_sum,
        "multiset_to_key_collisions": multiset_collisions,
        "key_to_product_collisions_within_shards": key_product_collisions,
        "negative_Q8": 0, "zero_Q8": 0,
        "minimum_Q8": minimum, "maximum_Q8": maximum,
    }
    for key, value in aggregate.items():
        assert assembly["aggregate"][key] == value
    assert aggregate == {
        "independently_enumerated_multisets": 753550,
        "canonical_checks": 625033,
        "distinct_shard_product_jets_sum": 516570,
        "multiset_to_key_collisions": 128517,
        "key_to_product_collisions_within_shards": 108463,
        "negative_Q8": 0, "zero_Q8": 0,
        "minimum_Q8": 37487421, "maximum_Q8": 2584714768416,
    }
    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha6-s9-complete-assembly-audit-v1",
        "status": "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA6_SOURCE9_ASSEMBLY_AUDIT",
        "coverage": {"shard_ranges": ranges, "exact_union": [73, 247], "overlaps": 0, "gaps": 0},
        "aggregate": aggregate,
        "method": "rehash every sealed shard artifact; rederive exponent counts; query each SQLite key/product table and nonpositive/extreme values; reconstruct the exact terminal-type union",
        "scope_warning": "This audit closes source alpha9 only and excludes source alpha10.",
        "hashes": {**hashes, Path(__file__).name: digest(Path(__file__))},
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"ranges={ranges} raw={raw} checks={checks} products_sum={products_sum} negative=0 zero=0")
    print(f"audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
