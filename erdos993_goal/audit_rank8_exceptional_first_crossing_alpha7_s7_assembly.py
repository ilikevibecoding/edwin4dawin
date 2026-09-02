#!/usr/bin/env python3
"""Independent rehash/SQLite/no-gap audit of complete alpha7/source7."""

from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLER = ROOT / "assemble_rank8_exceptional_first_crossing_alpha7_s7.py"
ASSEMBLY = ROOT / "rank8_exceptional_first_crossing_alpha7_s7_complete_exact_20260820.json"
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
RANGES = [(248, 720), (721, 947)]
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha7_s7_complete_audit_exact_20260820.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def paths(start, stop):
    stem = f"rank8_exceptional_first_crossing_alpha7_s7_types{start}_{stop}"
    return ROOT / f"{stem}_exact_20260820.json", ROOT / f"{stem}_keys_exact_20260820.sqlite3", ROOT / f"{stem}_audit_exact_20260820.json"


def main() -> int:
    assembly = json.loads(ASSEMBLY.read_text(encoding="utf-8"))
    assert assembly["status"] == "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCE7_COMPLETE"
    assert assembly["hashes"][ASSEMBLER.name] == digest(ASSEMBLER)
    with JETS.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle, delimiter="\t"))
    assert len(rows) == 1215
    # Independent raw coefficient DP from the first 247 lower types.
    coefficients = [0] * 8
    coefficients[0] = 1
    for row in rows[:247]:
        weight = int(row["alpha"])
        assert weight <= 6
        for alpha in range(weight, 8):
            coefficients[alpha] += coefficients[alpha - weight]
    assert coefficients[7] == 925

    expected_type = 248
    raw = checks = products = raw_key = key_product = negative = zero = 0
    minimum = maximum = None
    hashes = {ASSEMBLER.name: digest(ASSEMBLER), ASSEMBLY.name: digest(ASSEMBLY), JETS.name: digest(JETS), Path(__file__).name: digest(Path(__file__))}
    for start, stop in RANGES:
        assert start == expected_type
        expected_type = stop + 1
        report_path, database_path, audit_path = paths(start, stop)
        for path in (report_path, database_path, audit_path):
            assert assembly["hashes"][path.name] == digest(path)
            hashes[path.name] = digest(path)
        connection = sqlite3.connect(database_path)
        database_checks = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
        database_products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        type_rows = connection.execute("SELECT MIN(largest_type),MAX(largest_type),COUNT(DISTINCT largest_type) FROM keys").fetchone()
        assert type_rows == (start, stop, stop - start + 1)
        database_negative = connection.execute("SELECT COUNT(*) FROM keys WHERE CAST(q8 AS INTEGER)<0").fetchone()[0]
        database_zero = connection.execute("SELECT COUNT(*) FROM keys WHERE CAST(q8 AS INTEGER)=0").fetchone()[0]
        database_min = connection.execute("SELECT MIN(CAST(q8 AS INTEGER)) FROM keys").fetchone()[0]
        database_max = connection.execute("SELECT MAX(CAST(q8 AS INTEGER)) FROM keys").fetchone()[0]
        connection.close()
        report = json.loads(report_path.read_text(encoding="utf-8"))
        audit = json.loads(audit_path.read_text(encoding="utf-8"))
        row = report["aggregate"]
        assert database_checks == row["canonical_check_keys"] == audit["shard"]["canonical_check_keys"]
        assert database_products == row["distinct_crossing_jets"] == audit["shard"]["distinct_crossing_jets"]
        assert database_negative == database_zero == row["negative_Q8"] == row["zero_Q8"] == 0
        assert database_min == row["minimum_Q8"] == audit["shard"]["minimum_Q8"]
        assert database_max == row["maximum_Q8"] == audit["shard"]["maximum_Q8"]
        shard_raw = sum(925 + (type_index - 247) for type_index in range(start, stop + 1))
        assert shard_raw == row["independently_counted_raw_multisets"] == audit["shard"]["independently_enumerated_multisets"]
        raw += shard_raw; checks += database_checks; products += database_products
        raw_key += shard_raw - database_checks; key_product += database_checks - database_products
        negative += database_negative; zero += database_zero
        minimum = database_min if minimum is None else min(minimum, database_min)
        maximum = database_max if maximum is None else max(maximum, database_max)
    assert expected_type == 948
    aggregate = assembly["aggregate"]
    assert raw == 892850 == aggregate["independently_enumerated_multisets"]
    assert checks == aggregate["canonical_check_keys"]
    assert products == aggregate["distinct_shard_product_jets_sum"]
    assert raw_key == aggregate["multiset_to_canonical_key_compression"]
    assert key_product == aggregate["canonical_key_to_product_compression_within_shards"]
    assert negative == zero == aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
    assert minimum == aggregate["minimum_Q8"] > 0 and maximum == aggregate["maximum_Q8"]

    payload = {
        "schema": "rank8-exceptional-first-crossing-alpha7-s7-complete-audit-v1",
        "status": "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCE7_ASSEMBLY_AUDIT",
        "method": "rehash every sealed report/database/audit, derive lower-alpha7 raw coefficient925 from TSV, reconstruct formula925+L and exact type union, and query each recurrence database for key/product/type/sign/extrema equality",
        "coverage": {"source_alpha": 7, "terminal_alpha": 7, "terminal_type_indices": [248, 947], "terminal_type_count": 700, "gaps": 0, "overlaps": 0},
        "aggregate": aggregate,
        "scope_warning": "Independent complete audit only for source7 of terminal alpha7; stops before source8.",
        "hashes": hashes,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"raw={raw} checks={checks} products={products} neg=0 zero=0 min_Q8={minimum} max_Q8={maximum}")
    print(f"audit_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
