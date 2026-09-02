#!/usr/bin/env python3
"""Independent raw-multiplicity audit of terminal-alpha9/sources5-through-8."""

from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
import tempfile
import threading
import time
from pathlib import Path

from audit_rank8_exceptional_first_crossing_alpha4 import multiply
from probe_rank8_exceptional_first_crossing_alpha2_exact import private_bytes


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha9_s5_8_complete_agent.py"
REPORT = ROOT / "rank8_exceptional_first_crossing_alpha9_s5_8_types1201_1215_complete_exact_agent_20260823.json"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha9_s5_8_types1201_1215_keys_exact_agent_20260823.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha9_s5_8_types1201_1215_complete_independent_audit_agent_20260823.json"
CHECKPOINT = ROOT / "rank8_exceptional_first_crossing_alpha9_s5_8_audit_resource_checkpoint_agent_20260823.json"
OBSTRUCTION = ROOT / "rank8_exceptional_first_crossing_alpha9_s5_8_audit_obstruction_agent_20260823.json"

SOURCES = range(5, 9)
TERMINAL_ALPHA = 9
TYPE_START = 1201
TYPE_STOP = 1215
RAW_COEFFICIENTS = [1, 2, 5, 13, 39, 123, 431, 1625, 3862]
EXPECTED_RAW_BY_SOURCE = {source: 15 * RAW_COEFFICIENTS[source] for source in SOURCES}
EXPECTED_RAW = 90_615
RETAINED_RANK = 9
ABORT_LIMIT = 192 * 1024**2
HARD_LIMIT = 256 * 1024**2


class ResourceGate(RuntimeError):
    pass


class SignObstruction(RuntimeError):
    def __init__(self, witness: dict):
        super().__init__("nonpositive Q8 in independent alpha9/source5-through-8 audit")
        self.witness = witness


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def encode(polynomial: tuple[int, ...]) -> str:
    return ",".join(str(value) for value in polynomial)


def q8(polynomial: tuple[int, ...]) -> int:
    return 16 * polynomial[8] ** 2 - polynomial[7] * polynomial[8] - 18 * polynomial[7] * polynomial[9]


def load_jets() -> tuple[tuple[tuple[int, tuple[int, ...]], ...], tuple[tuple[int, ...], ...]]:
    rows = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            polynomial = tuple(int(row[f"i{rank}"]) for rank in range(RETAINED_RANK + 1))
            assert int(row["q8"]) == q8(polynomial)
            rows.append((int(row["alpha"]), polynomial))
    assert len(rows) == 1215 and rows == sorted(rows)
    return tuple(rows[:1200]), tuple(polynomial for alpha, polynomial in rows[1200:] if alpha == TERMINAL_ALPHA)


def raw_states(lower: tuple[tuple[int, tuple[int, ...]], ...]) -> list[list[tuple[int, ...]]]:
    identity = (1,) + (0,) * RETAINED_RANK
    states = [[] for _ in range(9)]
    states[0].append(identity)
    for weight, component in lower:
        for alpha in range(weight, 9):
            states[alpha].extend(multiply(source, component) for source in tuple(states[alpha - weight]))
    assert [len(state) for state in states] == RAW_COEFFICIENTS
    return states


def prepare_database(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.execute("PRAGMA journal_mode=DELETE")
    connection.execute("PRAGMA synchronous=FULL")
    connection.execute("PRAGMA temp_store=FILE")
    connection.execute("PRAGMA cache_size=-16384")
    connection.execute(
        "CREATE TABLE keys (source_alpha INTEGER NOT NULL, largest_type INTEGER NOT NULL, "
        "source TEXT NOT NULL, product TEXT NOT NULL, q8 TEXT NOT NULL, multiplicity INTEGER NOT NULL, "
        "PRIMARY KEY(source_alpha,largest_type,source,product,q8)) WITHOUT ROWID"
    )
    connection.execute(
        "CREATE TABLE products (source_alpha INTEGER NOT NULL, product TEXT NOT NULL, "
        "PRIMARY KEY(source_alpha,product)) WITHOUT ROWID"
    )
    return connection


def main() -> int:
    started = time.perf_counter()
    peak = private_bytes()
    stop_sampling = threading.Event()

    def sample() -> None:
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, private_bytes())

    def gate() -> None:
        nonlocal peak
        peak = max(peak, private_bytes())
        if peak >= ABORT_LIMIT:
            raise ResourceGate(f"audit reached 192 MiB gate: {peak}")

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    database_hash = digest(DATABASE)
    try:
        report = json.loads(REPORT.read_text(encoding="utf-8"))
        assert report["status"] == "PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA9_SOURCES5_8_COMPLETE_AGENT"
        assert report["hashes"][DATABASE.name] == database_hash
        lower, terminals = load_jets()
        states = raw_states(lower)
        assert len(terminals) == 15
        gate()

        raw = 0
        minimum = maximum = None
        independent_cells = []
        with tempfile.TemporaryDirectory(prefix="rank8_alpha9_s5_8_audit_agent_") as temporary:
            connection = prepare_database(Path(temporary) / "independent.sqlite3")
            batch = []

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
                gate()

            for source_alpha in SOURCES:
                before = raw
                source_min = source_max = None
                for relative, terminal in enumerate(terminals, 1):
                    type_index = TYPE_START + relative - 1
                    for source in states[source_alpha]:
                        product = multiply(source, terminal)
                        value = q8(product)
                        if value <= 0:
                            raise SignObstruction(
                                {
                                    "classification": "zero_Q8" if value == 0 else "negative_Q8",
                                    "source_alpha": source_alpha,
                                    "terminal_alpha": TERMINAL_ALPHA,
                                    "total_alpha": source_alpha + TERMINAL_ALPHA,
                                    "terminal_type_index": type_index,
                                    "source_i0_through_i9": list(source),
                                    "terminal_i0_through_i9": list(terminal),
                                    "product_i0_through_i9": list(product),
                                    "Q8": value,
                                }
                            )
                        raw += 1
                        source_min = value if source_min is None else min(source_min, value)
                        source_max = value if source_max is None else max(source_max, value)
                        minimum = value if minimum is None else min(minimum, value)
                        maximum = value if maximum is None else max(maximum, value)
                        batch.append((source_alpha, type_index, encode(source), encode(product), str(value)))
                        if len(batch) == 2500:
                            flush()
                flush()
                connection.commit()
                assert raw - before == EXPECTED_RAW_BY_SOURCE[source_alpha]
                independent_cells.append(
                    {
                        "source_alpha": source_alpha,
                        "raw_multisets": raw - before,
                        "minimum_Q8": source_min,
                        "maximum_Q8": source_max,
                    }
                )
                print(
                    f"audit-source={source_alpha}/8 raw={raw} private_MiB={peak/1024**2:.3f} "
                    f"elapsed={time.perf_counter()-started:.3f}s",
                    flush=True,
                )
            connection.execute("INSERT OR IGNORE INTO products SELECT source_alpha,product FROM keys")
            connection.commit()
            keys = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
            products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
            multiplicity = connection.execute("SELECT SUM(multiplicity) FROM keys").fetchone()[0]
            connection.execute("ATTACH DATABASE ? AS recurrence", (str(DATABASE.resolve()),))
            columns = "source_alpha,largest_type,source,product,q8"
            assert connection.execute(
                f"SELECT {columns} FROM keys EXCEPT SELECT {columns} FROM recurrence.keys LIMIT 1"
            ).fetchone() is None
            assert connection.execute(
                f"SELECT {columns} FROM recurrence.keys EXCEPT SELECT {columns} FROM keys LIMIT 1"
            ).fetchone() is None
            assert connection.execute(
                "SELECT source_alpha,product FROM products EXCEPT SELECT source_alpha,product FROM recurrence.products LIMIT 1"
            ).fetchone() is None
            assert connection.execute(
                "SELECT source_alpha,product FROM recurrence.products EXCEPT SELECT source_alpha,product FROM products LIMIT 1"
            ).fetchone() is None
            connection.execute("DETACH DATABASE recurrence")
            connection.close()

        aggregate = report["aggregate"]
        assert raw == multiplicity == EXPECTED_RAW == aggregate["independently_counted_raw_multisets"]
        assert keys == aggregate["canonical_check_keys"]
        assert products == aggregate["distinct_crossing_jets"]
        assert raw - keys == aggregate["raw_to_canonical_compression"]
        assert keys - products == aggregate["canonical_key_to_product_collisions"]
        assert minimum == aggregate["minimum_Q8"] > 0 and maximum == aggregate["maximum_Q8"]
        assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
        assert digest(DATABASE) == database_hash

        stop_sampling.set()
        sampler.join(timeout=1)
        gate()
        elapsed = time.perf_counter() - started
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha9-s5-8-complete-independent-audit-agent-v1",
            "status": "PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_RANK8_ALPHA9_SOURCES5_8_COMPLETE_AUDIT_AGENT",
            "method": "independent list-valued unbounded-knapsack DP retaining raw multiplicity through alpha8; exact local Q8; both SQLite EXCEPT directions for keys and products",
            "coverage": report["coverage"],
            "cells": independent_cells,
            "aggregate": {
                "independently_enumerated_multisets": raw,
                "canonical_check_keys": keys,
                "distinct_crossing_jets": products,
                "raw_to_canonical_compression": raw - keys,
                "canonical_key_to_product_collisions": keys - products,
                "negative_Q8": 0,
                "zero_Q8": 0,
                "minimum_Q8": minimum,
                "maximum_Q8": maximum,
            },
            "resources": {
                "workers": 1,
                "abort_limit_private_bytes": ABORT_LIMIT,
                "hard_limit_private_bytes": HARD_LIMIT,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "elapsed_seconds": elapsed,
            },
            "scope_warning": "Independent complete audit only for terminal alpha9/source alpha5..8; sources9..13 remain.",
            "hashes": {
                REPORT.name: digest(REPORT),
                DATABASE.name: digest(DATABASE),
                SOURCE.name: digest(SOURCE),
                JETS.name: digest(JETS),
                CLASSIFICATION.name: digest(CLASSIFICATION),
                Path(__file__).name: digest(Path(__file__)),
            },
        }
        OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        CHECKPOINT.unlink(missing_ok=True)
        OBSTRUCTION.unlink(missing_ok=True)
        print(payload["status"])
        print(
            f"raw={raw} keys={keys} products={products} neg=0 zero=0 "
            f"min_Q8={minimum} max_Q8={maximum}"
        )
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"audit_sha256={digest(OUTPUT)}")
        return 0
    except ResourceGate as error:
        stop_sampling.set()
        sampler.join(timeout=1)
        payload = {
            "status": "ABORTED_CLEANLY_RANK8_ALPHA9_SOURCES5_8_AUDIT_AGENT_RESOURCE_GATE",
            "reason": str(error),
            "peak_private_bytes": max(peak, private_bytes()),
            "scope_warning": "Resource checkpoint only; not a sign or forest obstruction.",
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        CHECKPOINT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        return 2
    except SignObstruction as error:
        payload = {
            "status": "EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA9_SOURCES5_8_AUDIT_AGENT",
            "witness": error.witness,
            "scope_warning": "Exact independent product-jet obstruction in the stated cell; no broader conclusion is asserted.",
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        OBSTRUCTION.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        return 3
    finally:
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
