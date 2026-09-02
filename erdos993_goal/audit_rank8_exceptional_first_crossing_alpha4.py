#!/usr/bin/env python3
"""Independent exact no-gap/collision audit of terminal alpha four."""

from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
import tempfile
import threading
import time
from pathlib import Path

from probe_rank8_exceptional_first_crossing_alpha2_exact import LIMIT, private_bytes


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha4_exact.py"
SOURCE_DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
REPORT = ROOT / "rank8_exceptional_first_crossing_alpha4_exact_20260820.json"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha4_keys_exact_20260820.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha4_audit_exact_20260820.json"
RETAINED_RANK = 9
TERMINAL_ALPHA = 4
SOURCES = (10, 11, 12, 13)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def encode(polynomial: tuple[int, ...]) -> str:
    return ",".join(str(value) for value in polynomial)


def multiply(
    left: tuple[int, ...], right: tuple[int, ...]
) -> tuple[int, ...]:
    return tuple(
        sum(left[index] * right[rank - index] for index in range(rank + 1))
        for rank in range(RETAINED_RANK + 1)
    )


def divide_once(
    product: tuple[int, ...], factor: tuple[int, ...]
) -> tuple[int, ...]:
    """Exact triangular deconvolution for a factor with constant term one."""
    assert factor[0] == 1
    quotient = [product[0]]
    for rank in range(1, RETAINED_RANK + 1):
        quotient.append(
            product[rank]
            - sum(factor[index] * quotient[rank - index] for index in range(1, rank + 1))
        )
    result = tuple(quotient)
    assert multiply(result, factor) == product
    return result


def q8(polynomial: tuple[int, ...]) -> int:
    return (
        16 * polynomial[8] * polynomial[8]
        - polynomial[7] * polynomial[8]
        - 18 * polynomial[7] * polynomial[9]
    )


def load_first_twenty_four() -> tuple[tuple[int, tuple[int, ...]], ...]:
    rows = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            rows.append(
                (
                    int(row["alpha"]),
                    tuple(int(row[f"i{rank}"]) for rank in range(10)),
                )
            )
    assert len(rows) == 1215
    selected = tuple(row for row in rows if row[0] <= TERMINAL_ALPHA)
    assert len(selected) == 24
    assert tuple(alpha for alpha, _ in selected) == (
        (1,) * 2 + (2,) * 2 + (3,) * 5 + (4,) * 15
    )
    return selected


def prepare_independent_database(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.execute("PRAGMA journal_mode=DELETE")
    connection.execute("PRAGMA synchronous=NORMAL")
    connection.execute("PRAGMA temp_store=FILE")
    connection.execute("PRAGMA cache_size=-32768")
    connection.execute(
        "CREATE TABLE keys ("
        "source_alpha INTEGER NOT NULL, largest_type INTEGER NOT NULL, "
        "source TEXT NOT NULL, product TEXT NOT NULL, q8 TEXT NOT NULL, "
        "multiplicity INTEGER NOT NULL, "
        "PRIMARY KEY(source_alpha,largest_type,source,product,q8)) WITHOUT ROWID"
    )
    connection.execute(
        "CREATE TABLE products ("
        "source_alpha INTEGER NOT NULL, product TEXT NOT NULL, "
        "PRIMARY KEY(source_alpha,product)) WITHOUT ROWID"
    )
    return connection


def enumerate_cell(
    connection: sqlite3.Connection,
    jets: tuple[tuple[int, tuple[int, ...]], ...],
    total_alpha: int,
    check_memory,
) -> dict[str, int]:
    source_alpha = total_alpha - TERMINAL_ALPHA
    weights = tuple(alpha for alpha, _ in jets)
    identity = (1,) + (0,) * RETAINED_RANK
    powers = []
    for (weight, polynomial) in jets:
        row = [identity]
        for _ in range(total_alpha // weight):
            row.append(multiply(row[-1], polynomial))
        powers.append(tuple(row))

    raw_multisets = 0
    negative = 0
    zero = 0
    minimum = None
    maximum = None
    batch: list[tuple[object, ...]] = []

    def flush() -> None:
        if not batch:
            return
        connection.executemany(
            "INSERT INTO keys VALUES (?,?,?,?,?,1) "
            "ON CONFLICT(source_alpha,largest_type,source,product,q8) "
            "DO UPDATE SET multiplicity=multiplicity+1",
            batch,
        )
        batch.clear()
        check_memory()

    def visit(
        index: int,
        remaining: int,
        product: tuple[int, ...],
        exponents: tuple[int, ...],
    ) -> None:
        nonlocal raw_multisets, negative, zero, minimum, maximum
        if index == len(jets):
            if remaining != 0:
                return
            terminal_indices = [
                position for position in range(9, 24) if exponents[position] > 0
            ]
            if not terminal_indices:
                return
            largest_zero_based = max(terminal_indices)
            largest_type = largest_zero_based + 1
            source = divide_once(product, jets[largest_zero_based][1])
            value = q8(product)
            if value < 0:
                raise AssertionError(
                    "independent alpha4 multiset obstruction",
                    total_alpha,
                    exponents,
                    product,
                    value,
                )
            raw_multisets += 1
            negative += value < 0
            zero += value == 0
            minimum = value if minimum is None else min(minimum, value)
            maximum = value if maximum is None else max(maximum, value)
            batch.append(
                (
                    source_alpha,
                    largest_type,
                    encode(source),
                    encode(product),
                    str(value),
                )
            )
            if len(batch) == 5000:
                flush()
            return

        weight = weights[index]
        for exponent in range(remaining // weight + 1):
            next_product = (
                product
                if exponent == 0
                else multiply(product, powers[index][exponent])
            )
            visit(
                index + 1,
                remaining - exponent * weight,
                next_product,
                exponents + (exponent,),
            )

    visit(0, total_alpha, identity, ())
    flush()
    connection.execute(
        "INSERT OR IGNORE INTO products "
        "SELECT source_alpha,product FROM keys WHERE source_alpha=?",
        (source_alpha,),
    )
    connection.commit()

    canonical_keys = connection.execute(
        "SELECT COUNT(*) FROM keys WHERE source_alpha=?", (source_alpha,)
    ).fetchone()[0]
    distinct_products = connection.execute(
        "SELECT COUNT(*) FROM products WHERE source_alpha=?", (source_alpha,)
    ).fetchone()[0]
    maximum_multisets_per_key = connection.execute(
        "SELECT MAX(multiplicity) FROM keys WHERE source_alpha=?", (source_alpha,)
    ).fetchone()[0]
    maximum_keys_per_product = connection.execute(
        "SELECT MAX(c) FROM (SELECT COUNT(*) c FROM keys WHERE source_alpha=? GROUP BY product)",
        (source_alpha,),
    ).fetchone()[0]
    maximum_multisets_per_product = connection.execute(
        "SELECT MAX(c) FROM (SELECT SUM(multiplicity) c FROM keys WHERE source_alpha=? GROUP BY product)",
        (source_alpha,),
    ).fetchone()[0]
    return {
        "source_alpha": source_alpha,
        "terminal_alpha": TERMINAL_ALPHA,
        "total_alpha": total_alpha,
        "independently_enumerated_multisets": raw_multisets,
        "canonical_check_keys": canonical_keys,
        "distinct_crossing_jets": distinct_products,
        "multiset_to_canonical_key_collisions": raw_multisets - canonical_keys,
        "canonical_key_to_product_collisions": canonical_keys - distinct_products,
        "maximum_multisets_per_canonical_key": maximum_multisets_per_key,
        "maximum_canonical_keys_per_product": maximum_keys_per_product,
        "maximum_multisets_per_product": maximum_multisets_per_product,
        "negative_Q8": negative,
        "zero_Q8": zero,
        "minimum_Q8": int(minimum),
        "maximum_Q8": int(maximum),
    }


def assert_exact_database_equality(connection: sqlite3.Connection) -> None:
    # Parameterized native Windows paths are reliable for ATTACH; this audit
    # issues SELECT/EXCEPT only and verifies the database hash before and after.
    connection.execute("ATTACH DATABASE ? AS recurrence", (str(DATABASE.resolve()),))
    columns = "source_alpha,largest_type,source,product,q8"
    missing = connection.execute(
        f"SELECT {columns} FROM keys EXCEPT SELECT {columns} FROM recurrence.keys LIMIT 1"
    ).fetchone()
    extra = connection.execute(
        f"SELECT {columns} FROM recurrence.keys EXCEPT SELECT {columns} FROM keys LIMIT 1"
    ).fetchone()
    missing_product = connection.execute(
        "SELECT source_alpha,product FROM products EXCEPT "
        "SELECT source_alpha,product FROM recurrence.products LIMIT 1"
    ).fetchone()
    extra_product = connection.execute(
        "SELECT source_alpha,product FROM recurrence.products EXCEPT "
        "SELECT source_alpha,product FROM products LIMIT 1"
    ).fetchone()
    assert missing is None and extra is None
    assert missing_product is None and extra_product is None
    connection.execute("DETACH DATABASE recurrence")


def main() -> int:
    started = time.perf_counter()
    peak = private_bytes()
    stop_sampling = threading.Event()

    def sample() -> None:
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, private_bytes())

    def check_memory() -> None:
        nonlocal peak
        peak = max(peak, private_bytes())
        if peak >= LIMIT:
            raise MemoryError(f"independent audit reached private-byte cap: {peak}")

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        report = json.loads(REPORT.read_text(encoding="utf-8"))
        assert report["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA4_BAND"
        assert report["scope"]["workers"] == 1
        assert report["resources"]["peak_private_bytes"] < LIMIT
        assert report["hashes"] == {
            JETS.name: digest(JETS),
            CLASSIFICATION.name: digest(CLASSIFICATION),
            SOURCE_DEPENDENCY.name: digest(SOURCE_DEPENDENCY),
            DATABASE.name: digest(DATABASE),
            SOURCE.name: digest(SOURCE),
        }
        jets = load_first_twenty_four()

        with tempfile.TemporaryDirectory(prefix="rank8_alpha4_audit_") as temporary:
            independent_path = Path(temporary) / "independent.sqlite3"
            connection = prepare_independent_database(independent_path)
            try:
                audits = {}
                for total_alpha in (14, 15, 16, 17):
                    cell = enumerate_cell(connection, jets, total_alpha, check_memory)
                    source = str(cell["source_alpha"])
                    reported = report["cells"][source]
                    assert cell["canonical_check_keys"] == reported["ordered_covering_checks"]
                    assert cell["distinct_crossing_jets"] == reported["distinct_crossing_jets"]
                    assert cell["canonical_key_to_product_collisions"] == reported[
                        "canonical_key_to_product_collisions"
                    ]
                    assert cell["negative_Q8"] == reported["negative_Q8"] == 0
                    assert cell["zero_Q8"] == reported["zero_Q8"] == 0
                    assert cell["minimum_Q8"] == reported["minimum_Q8"]
                    assert cell["maximum_Q8"] == reported["maximum_Q8"]
                    audits[source] = cell
                assert_exact_database_equality(connection)
            finally:
                connection.close()

        stop_sampling.set()
        sampler.join(timeout=1)
        check_memory()
        elapsed = time.perf_counter() - started
        expected = {
            "10": (22165, 18864, 15599, 3301, 3265),
            "11": (38570, 31862, 25922, 6708, 5940),
            "12": (66330, 53393, 43088, 12937, 10305),
            "13": (109515, 85149, 67545, 24366, 17604),
        }
        for source, values in expected.items():
            cell = audits[source]
            assert (
                cell["independently_enumerated_multisets"],
                cell["canonical_check_keys"],
                cell["distinct_crossing_jets"],
                cell["multiset_to_canonical_key_collisions"],
                cell["canonical_key_to_product_collisions"],
            ) == values

        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha4-independent-audit-v1",
            "status": "PASS_INDEPENDENT_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA4_AUDIT",
            "method": (
                "directly enumerate every exponent vector of the 24 alpha<=4 types, "
                "select the unique largest alpha4 type, recover the source by exact "
                "triangular deconvolution, and compare both SQLite key tables by "
                "bidirectional relational EXCEPT"
            ),
            "cells": audits,
            "aggregate": {
                "independently_enumerated_multisets": sum(
                    int(cell["independently_enumerated_multisets"])
                    for cell in audits.values()
                ),
                "canonical_check_keys": sum(
                    int(cell["canonical_check_keys"]) for cell in audits.values()
                ),
                "distinct_cell_crossing_jets_sum": sum(
                    int(cell["distinct_crossing_jets"]) for cell in audits.values()
                ),
                "multiset_to_canonical_key_collisions": sum(
                    int(cell["multiset_to_canonical_key_collisions"])
                    for cell in audits.values()
                ),
                "canonical_key_to_product_collisions": sum(
                    int(cell["canonical_key_to_product_collisions"])
                    for cell in audits.values()
                ),
                "negative_Q8": 0,
                "zero_Q8": 0,
                "minimum_Q8": min(int(cell["minimum_Q8"]) for cell in audits.values()),
                "maximum_Q8": max(int(cell["maximum_Q8"]) for cell in audits.values()),
            },
            "resources": {
                "limit_private_bytes": LIMIT,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "elapsed_seconds": elapsed,
            },
            "scope_warning": (
                "This audit covers only terminal alpha4; terminal-alpha bands 5 "
                "through 9 remain.  Collision counts are exact equivalence "
                "compression, not omitted multisets."
            ),
            "hashes": {
                REPORT.name: digest(REPORT),
                DATABASE.name: digest(DATABASE),
                SOURCE.name: digest(SOURCE),
                SOURCE_DEPENDENCY.name: digest(SOURCE_DEPENDENCY),
                JETS.name: digest(JETS),
                CLASSIFICATION.name: digest(CLASSIFICATION),
                Path(__file__).name: digest(Path(__file__)),
            },
        }
        OUTPUT.write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        print(payload["status"])
        aggregate = payload["aggregate"]
        print(
            f"multisets={aggregate['independently_enumerated_multisets']} "
            f"checks={aggregate['canonical_check_keys']} "
            f"products={aggregate['distinct_cell_crossing_jets_sum']} "
            f"multiset_key_collisions={aggregate['multiset_to_canonical_key_collisions']} "
            f"key_product_collisions={aggregate['canonical_key_to_product_collisions']} "
            "negative=0 zero=0"
        )
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"audit_sha256={digest(OUTPUT)}")
        return 0
    finally:
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
