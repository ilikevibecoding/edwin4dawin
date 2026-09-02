#!/usr/bin/env python3
"""Exact disk-backed terminal-alpha-four exceptional first-crossing band."""

from __future__ import annotations

import csv
import json
import sqlite3
import threading
import time
from pathlib import Path

from probe_rank8_exceptional_first_crossing_alpha2_exact import (
    LIMIT,
    RETAINED_RANK,
    digest,
    multiply,
    private_bytes,
    q8,
)


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha4_keys_exact_20260820.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha4_exact_20260820.json"
THRESHOLD = 14
TERMINAL_ALPHA = 4
SOURCES = (10, 11, 12, 13)


def encode(polynomial: tuple[int, ...]) -> str:
    return ",".join(str(value) for value in polynomial)


def load_jets_through_alpha4() -> tuple[tuple[int, tuple[int, ...], int], ...]:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert (
        classification["status"]
        == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    )
    assert classification["distinct_exceptional_jets"] == 1215
    assert [classification["distinct_by_alpha"][str(alpha)] for alpha in range(1, 5)] == [
        2,
        2,
        5,
        15,
    ]
    assert classification["hashes"][JETS.name] == digest(JETS)
    rows: list[tuple[int, tuple[int, ...], int]] = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            alpha = int(row["alpha"])
            polynomial = tuple(
                int(row[f"i{rank}"]) for rank in range(RETAINED_RANK + 1)
            )
            value = int(row["q8"])
            assert polynomial[0] == 1
            assert value == q8(polynomial)
            rows.append((alpha, polynomial, value))
    assert len(rows) == len(set(rows)) == 1215
    assert rows == sorted(rows)
    selected = tuple(row for row in rows if row[0] <= TERMINAL_ALPHA)
    assert len(selected) == 24
    assert tuple(alpha for alpha, _, _ in selected) == (
        (1,) * 2 + (2,) * 2 + (3,) * 5 + (4,) * 15
    )
    assert all(value == 0 for _, _, value in selected)
    return selected


def prepare_database() -> sqlite3.Connection:
    if DATABASE.exists():
        DATABASE.unlink()
    connection = sqlite3.connect(DATABASE)
    connection.execute("PRAGMA journal_mode=DELETE")
    connection.execute("PRAGMA synchronous=FULL")
    connection.execute("PRAGMA temp_store=FILE")
    connection.execute("PRAGMA cache_size=-32768")
    connection.execute(
        "CREATE TABLE keys ("
        "source_alpha INTEGER NOT NULL, largest_type INTEGER NOT NULL, "
        "source TEXT NOT NULL, product TEXT NOT NULL, q8 TEXT NOT NULL, "
        "PRIMARY KEY(source_alpha,largest_type,source,product,q8)) WITHOUT ROWID"
    )
    connection.execute(
        "CREATE TABLE products ("
        "source_alpha INTEGER NOT NULL, product TEXT NOT NULL, "
        "PRIMARY KEY(source_alpha,product)) WITHOUT ROWID"
    )
    connection.execute("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    connection.commit()
    return connection


def main() -> int:
    started = time.perf_counter()
    peak = private_bytes()
    stop_sampling = threading.Event()

    def sample() -> None:
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, private_bytes())

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    connection = None
    try:
        jets = load_jets_through_alpha4()
        connection = prepare_database()
        identity = (1,) + (0,) * RETAINED_RANK
        states = {alpha: set() for alpha in range(THRESHOLD)}
        states[0].add(identity)
        cell_accumulators = {
            source: {
                "checks": 0,
                "negative": 0,
                "zero": 0,
                "minimum": None,
                "maximum": None,
            }
            for source in SOURCES
        }

        for component_index, (component_alpha, component, _) in enumerate(jets, 1):
            for target_alpha in range(component_alpha, THRESHOLD):
                for source in tuple(states[target_alpha - component_alpha]):
                    states[target_alpha].add(multiply(source, component))
            peak = max(peak, private_bytes())
            if peak >= LIMIT:
                raise MemoryError(
                    f"private-byte cap reached after closing type {component_index}: {peak}"
                )

            if component_alpha != TERMINAL_ALPHA:
                continue
            for source_alpha in SOURCES:
                accumulator = cell_accumulators[source_alpha]
                key_batch = []
                product_batch = []
                for source in states[source_alpha]:
                    product = multiply(source, component)
                    value = q8(product)
                    if value < 0:
                        raise AssertionError(
                            "exceptional first-crossing obstruction in exact alpha4 band",
                            component_index,
                            source_alpha,
                            source,
                            product,
                            value,
                        )
                    accumulator["checks"] += 1
                    accumulator["negative"] += value < 0
                    accumulator["zero"] += value == 0
                    accumulator["minimum"] = (
                        value
                        if accumulator["minimum"] is None
                        else min(int(accumulator["minimum"]), value)
                    )
                    accumulator["maximum"] = (
                        value
                        if accumulator["maximum"] is None
                        else max(int(accumulator["maximum"]), value)
                    )
                    source_text = encode(source)
                    product_text = encode(product)
                    key_batch.append(
                        (source_alpha, component_index, source_text, product_text, str(value))
                    )
                    product_batch.append((source_alpha, product_text))
                before = connection.total_changes
                connection.executemany(
                    "INSERT INTO keys VALUES (?,?,?,?,?)", key_batch
                )
                inserted = connection.total_changes - before
                assert inserted == len(key_batch)
                connection.executemany(
                    "INSERT OR IGNORE INTO products VALUES (?,?)", product_batch
                )
                peak = max(peak, private_bytes())
                if peak >= LIMIT:
                    raise MemoryError(
                        f"private-byte cap reached in source cell {source_alpha}: {peak}"
                    )
            connection.commit()

        state_counts = {str(alpha): len(states[alpha]) for alpha in range(THRESHOLD)}
        cells: dict[str, dict[str, object]] = {}
        for source_alpha in SOURCES:
            accumulator = cell_accumulators[source_alpha]
            database_checks = connection.execute(
                "SELECT COUNT(*) FROM keys WHERE source_alpha=?", (source_alpha,)
            ).fetchone()[0]
            database_products = connection.execute(
                "SELECT COUNT(*) FROM products WHERE source_alpha=?", (source_alpha,)
            ).fetchone()[0]
            assert database_checks == accumulator["checks"]
            assert accumulator["negative"] == 0
            assert accumulator["zero"] == 0
            assert int(accumulator["minimum"]) > 0
            cells[str(source_alpha)] = {
                "source_alpha": source_alpha,
                "terminal_alpha": TERMINAL_ALPHA,
                "total_alpha": source_alpha + TERMINAL_ALPHA,
                "ordered_covering_checks": database_checks,
                "distinct_crossing_jets": database_products,
                "canonical_key_to_product_collisions": database_checks
                - database_products,
                "negative_Q8": int(accumulator["negative"]),
                "zero_Q8": int(accumulator["zero"]),
                "minimum_Q8": int(accumulator["minimum"]),
                "maximum_Q8": int(accumulator["maximum"]),
            }

        database_meta = {
            "status": "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA4_KEYS",
            "terminal_alpha": TERMINAL_ALPHA,
            "sources": list(SOURCES),
            "state_counts": state_counts,
            "cells": cells,
        }
        connection.execute(
            "INSERT INTO meta VALUES ('result',?)",
            (json.dumps(database_meta, sort_keys=True, separators=(",", ":")),),
        )
        connection.commit()
        connection.close()
        connection = None

        stop_sampling.set()
        sampler.join(timeout=1)
        peak = max(peak, private_bytes())
        elapsed = time.perf_counter() - started
        assert peak < LIMIT
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha4-v1",
            "status": "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA4_BAND",
            "scope": {
                "certified_cells": [
                    {
                        "source": source,
                        "terminal": TERMINAL_ALPHA,
                        "total": source + TERMINAL_ALPHA,
                    }
                    for source in SOURCES
                ],
                "terminal_component_type_indices": [10, 24],
                "workers": 1,
                "warning": (
                    "This certifies the complete terminal-alpha4 band only; "
                    "terminal-alpha bands 5 through 9 remain."
                ),
            },
            "exact_recurrence": {
                "state_key": "(alpha,i1,...,i9), with i0=1 implicit",
                "product": "c_k=sum_{j=0}^k a_j*b_{k-j}, 0<=k<=9",
                "type_closure": (
                    "S[r,a]=S[r-1,a] union {truncate9(P*J_r): "
                    "P in S[r,a-alpha(J_r)]}"
                ),
                "symmetry": (
                    "each multiset is tested under its unique largest sorted type; "
                    "ascending alpha closes arbitrary repetitions"
                ),
                "key_storage": (
                    "every canonical (source_alpha,largest_type,source,product,Q8) "
                    "key is retained exactly in the SQLite artifact"
                ),
                "Q8": "16*i8^2-i7*i8-18*i7*i9",
            },
            "partial_state_counts_by_alpha_after_type24": state_counts,
            "partial_states_total_after_type24": sum(state_counts.values()),
            "cells": cells,
            "aggregate": {
                "ordered_covering_checks": sum(
                    int(cell["ordered_covering_checks"]) for cell in cells.values()
                ),
                "distinct_cell_crossing_jets_sum": sum(
                    int(cell["distinct_crossing_jets"]) for cell in cells.values()
                ),
                "canonical_key_to_product_collisions": sum(
                    int(cell["canonical_key_to_product_collisions"])
                    for cell in cells.values()
                ),
                "negative_Q8": 0,
                "zero_Q8": 0,
                "minimum_Q8": min(int(cell["minimum_Q8"]) for cell in cells.values()),
                "maximum_Q8": max(int(cell["maximum_Q8"]) for cell in cells.values()),
            },
            "resources": {
                "limit_private_bytes": LIMIT,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "elapsed_seconds": elapsed,
            },
            "hashes": {
                JETS.name: digest(JETS),
                CLASSIFICATION.name: digest(CLASSIFICATION),
                DEPENDENCY.name: digest(DEPENDENCY),
                DATABASE.name: digest(DATABASE),
                Path(__file__).name: digest(Path(__file__)),
            },
        }
        OUTPUT.write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        print(payload["status"])
        for source_alpha in SOURCES:
            cell = cells[str(source_alpha)]
            print(
                f"source={source_alpha} total={source_alpha+TERMINAL_ALPHA} "
                f"checks={cell['ordered_covering_checks']} "
                f"products={cell['distinct_crossing_jets']} "
                f"collisions={cell['canonical_key_to_product_collisions']} "
                f"negative={cell['negative_Q8']} zero={cell['zero_Q8']} "
                f"min_Q8={cell['minimum_Q8']} max_Q8={cell['maximum_Q8']}"
            )
        print(
            f"states={sum(state_counts.values())} elapsed_seconds={elapsed:.6f} "
            f"peak_private_bytes={peak}"
        )
        print(f"database_sha256={digest(DATABASE)}")
        print(f"report_sha256={digest(OUTPUT)}")
        return 0
    finally:
        if connection is not None:
            connection.close()
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
