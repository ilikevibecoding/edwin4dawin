#!/usr/bin/env python3
"""Independent rehash, SQLite, recurrence, and no-gap audit of alpha7/source11."""
from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLER = ROOT / "assemble_rank8_exceptional_first_crossing_alpha7_s11.py"
ASSEMBLY = ROOT / "rank8_exceptional_first_crossing_alpha7_s11_complete_exact_20260820.json"
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_exact_20260820.json"
DESIGN_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_audit_exact_20260820.json"
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha7_s11_complete_audit_exact_20260820.json"


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
    assembly = json.loads(ASSEMBLY.read_text(encoding="utf-8"))
    design = json.loads(DESIGN.read_text(encoding="utf-8"))
    design_audit = json.loads(DESIGN_AUDIT.read_text(encoding="utf-8"))
    assert assembly["status"] == "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCE11_COMPLETE"
    assert assembly["hashes"][ASSEMBLER.name] == digest(ASSEMBLER)
    assert design_audit["status"] == "PASS_INDEPENDENT_EXACT_NO_GAP_RESOURCE_DESIGN_AUDIT_RANK8_ALPHA7"
    ranges = [
        (shard["terminal_type_index_start"], shard["terminal_type_index_stop"])
        for shard in design["exact_counts"]["source_cells"]["11"]["shards"]
    ]
    assert len(ranges) == 67

    with JETS.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle, delimiter="\t"))
    coefficients = [0] * 12
    coefficients[0] = 1
    for row in rows[:247]:
        weight = int(row["alpha"])
        for alpha in range(weight, 12):
            coefficients[alpha] += coefficients[alpha - weight]
    assert (coefficients[11], coefficients[4]) == (36_079, 39)

    hashes = {
        ASSEMBLER.name: digest(ASSEMBLER),
        ASSEMBLY.name: digest(ASSEMBLY),
        DESIGN.name: digest(DESIGN),
        DESIGN_AUDIT.name: digest(DESIGN_AUDIT),
        JETS.name: digest(JETS),
        Path(__file__).name: digest(Path(__file__)),
    }
    expected = 248
    raw = keys = products = raw_key_compression = key_product_compression = 0
    minimum = maximum = None

    for start, stop in ranges:
        assert start == expected
        expected = stop + 1
        report_path, database_path, audit_path = paths(start, stop)
        for path in (report_path, database_path, audit_path):
            assert assembly["hashes"][path.name] == digest(path)
            hashes[path.name] = digest(path)

        with sqlite3.connect(database_path) as connection:
            database_keys = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
            database_products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
            type_coverage = connection.execute(
                "SELECT MIN(largest_type), MAX(largest_type), COUNT(DISTINCT largest_type) FROM keys"
            ).fetchone()
            negative = connection.execute(
                "SELECT COUNT(*) FROM keys WHERE CAST(q8 AS INTEGER) < 0"
            ).fetchone()[0]
            zero = connection.execute(
                "SELECT COUNT(*) FROM keys WHERE CAST(q8 AS INTEGER) = 0"
            ).fetchone()[0]
            database_minimum = connection.execute(
                "SELECT MIN(CAST(q8 AS INTEGER)) FROM keys"
            ).fetchone()[0]
            database_maximum = connection.execute(
                "SELECT MAX(CAST(q8 AS INTEGER)) FROM keys"
            ).fetchone()[0]
        assert type_coverage == (start, stop, stop - start + 1)

        report = json.loads(report_path.read_text(encoding="utf-8"))
        audit = json.loads(audit_path.read_text(encoding="utf-8"))
        aggregate = report["aggregate"]
        audited = audit["shard"]
        assert database_keys == aggregate["canonical_check_keys"] == audited["canonical_check_keys"]
        assert database_products == aggregate["distinct_crossing_jets"] == audited["distinct_crossing_jets"]
        assert negative == zero == aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
        assert database_minimum == aggregate["minimum_Q8"] == audited["minimum_Q8"]
        assert database_maximum == aggregate["maximum_Q8"] == audited["maximum_Q8"]

        shard_raw = sum(36_079 + 39 * (index - 247) for index in range(start, stop + 1))
        assert shard_raw == aggregate["independently_counted_raw_multisets"]
        assert shard_raw == audited["independently_enumerated_multisets"]
        raw += shard_raw
        keys += database_keys
        products += database_products
        raw_key_compression += shard_raw - database_keys
        key_product_compression += database_keys - database_products
        minimum = database_minimum if minimum is None else min(minimum, database_minimum)
        maximum = database_maximum if maximum is None else max(maximum, database_maximum)

    assert expected == 948
    aggregate = assembly["aggregate"]
    assert (
        raw,
        keys,
        products,
        raw_key_compression,
        key_product_compression,
        minimum,
        maximum,
    ) == (
        34_823_950,
        aggregate["canonical_check_keys"],
        aggregate["distinct_shard_product_jets_sum"],
        aggregate["multiset_to_canonical_key_compression"],
        aggregate["canonical_key_to_product_compression_within_shards"],
        aggregate["minimum_Q8"],
        aggregate["maximum_Q8"],
    )
    assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha7-s11-complete-audit-v1",
        "status": "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCE11_ASSEMBLY_AUDIT",
        "method": (
            "rehash/query all 67 triples, independently derive c11=36079 and c4=39, "
            "reconstruct formula 36079+39L and exact union"
        ),
        "coverage": {
            "source_alpha": 11,
            "terminal_alpha": 7,
            "terminal_type_indices": [248, 947],
            "terminal_type_count": 700,
            "shards": 67,
            "gaps": 0,
            "overlaps": 0,
        },
        "aggregate": aggregate,
        "scope_warning": "Stops before source12.",
        "hashes": hashes,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"raw={raw} checks={keys} products={products} neg=0 zero=0 "
        f"min_Q8={minimum} max_Q8={maximum}"
    )
    print(f"audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
