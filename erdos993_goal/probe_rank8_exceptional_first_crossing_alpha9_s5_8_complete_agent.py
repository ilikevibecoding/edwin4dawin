#!/usr/bin/env python3
"""Exact low-memory producer for terminal-alpha9/source-alpha5-through-8."""

from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
import threading
import time
from pathlib import Path

from probe_rank8_exceptional_first_crossing_alpha2_exact import RETAINED_RANK, multiply, private_bytes, q8


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_agent_20260823.json"
DESIGN_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_independent_audit_agent_20260823.json"
DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha9_s5_8_types1201_1215_keys_exact_agent_20260823.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha9_s5_8_types1201_1215_complete_exact_agent_20260823.json"
CHECKPOINT = ROOT / "rank8_exceptional_first_crossing_alpha9_s5_8_resource_checkpoint_agent_20260823.json"
OBSTRUCTION = ROOT / "rank8_exceptional_first_crossing_alpha9_s5_8_obstruction_agent_20260823.json"

SOURCES = range(5, 9)
TERMINAL_ALPHA = 9
TYPE_START = 1201
TYPE_STOP = 1215
EXPECTED_RAW_BY_SOURCE = {5: 1845, 6: 6465, 7: 24375, 8: 57930}
EXPECTED_RAW = 90_615
ABORT_LIMIT = 192 * 1024**2
HARD_LIMIT = 256 * 1024**2


class ResourceGate(RuntimeError):
    pass


class SignObstruction(RuntimeError):
    def __init__(self, witness: dict):
        super().__init__("nonpositive exact Q8 in terminal-alpha9/source-alpha5-through-8")
        self.witness = witness


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def encode(polynomial: tuple[int, ...]) -> str:
    return ",".join(str(value) for value in polynomial)


def prepare_database(path: Path) -> sqlite3.Connection:
    path.unlink(missing_ok=True)
    connection = sqlite3.connect(path)
    connection.execute("PRAGMA journal_mode=DELETE")
    connection.execute("PRAGMA synchronous=FULL")
    connection.execute("PRAGMA temp_store=FILE")
    connection.execute("PRAGMA cache_size=-16384")
    connection.execute(
        "CREATE TABLE keys (source_alpha INTEGER NOT NULL, largest_type INTEGER NOT NULL, "
        "source TEXT NOT NULL, product TEXT NOT NULL, q8 TEXT NOT NULL, "
        "PRIMARY KEY(source_alpha,largest_type,source,product,q8)) WITHOUT ROWID"
    )
    connection.execute(
        "CREATE TABLE products (source_alpha INTEGER NOT NULL, product TEXT NOT NULL, "
        "PRIMARY KEY(source_alpha,product)) WITHOUT ROWID"
    )
    connection.execute("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    connection.commit()
    return connection


def load_jets() -> tuple[tuple[tuple[int, tuple[int, ...]], ...], tuple[tuple[int, ...], ...]]:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert classification["hashes"][JETS.name] == digest(JETS)
    rows = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            polynomial = tuple(int(row[f"i{rank}"]) for rank in range(RETAINED_RANK + 1))
            assert int(row["q8"]) == q8(polynomial)
            rows.append((int(row["alpha"]), polynomial))
    assert len(rows) == 1215 and rows == sorted(rows)
    lower = tuple(rows[:1200])
    terminals = tuple(polynomial for alpha, polynomial in rows[1200:] if alpha == TERMINAL_ALPHA)
    assert len(terminals) == 15 and all(q8(polynomial) < 0 for polynomial in terminals)
    return lower, terminals


def main() -> int:
    started = time.perf_counter()
    peak = private_bytes()
    stop_sampling = threading.Event()
    connection: sqlite3.Connection | None = None
    last_cell = [5, TYPE_START - 1]

    def sample() -> None:
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, private_bytes())

    def gate() -> None:
        nonlocal peak
        peak = max(peak, private_bytes())
        if peak >= ABORT_LIMIT:
            raise ResourceGate(f"producer reached 192 MiB gate: {peak}")

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        design = json.loads(DESIGN.read_text(encoding="utf-8"))
        design_audit = json.loads(DESIGN_AUDIT.read_text(encoding="utf-8"))
        assert design["status"].startswith("PASS_EXACT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159")
        assert design_audit["hashes"][DESIGN.name] == digest(DESIGN)
        for source_alpha in SOURCES:
            cell = design["bands"]["9"]["source_cells"][str(source_alpha)]
            assert cell["terminal_type_indices"] == [TYPE_START, TYPE_STOP]
            assert cell["shard_count"] == 1
            assert cell["raw_multiset_crossing_count"] == EXPECTED_RAW_BY_SOURCE[source_alpha]

        lower, terminals = load_jets()
        identity = (1,) + (0,) * RETAINED_RANK
        states = [set() for _ in range(9)]
        states[0].add(identity)
        for weight, component in lower:
            for alpha in range(weight, 9):
                for source in tuple(states[alpha - weight]):
                    states[alpha].add(multiply(source, component))
            gate()
        canonical_sources = {source_alpha: tuple(sorted(states[source_alpha])) for source_alpha in SOURCES}
        raw_coefficients = [1, 2, 5, 13, 39, 123, 431, 1625, 3862]
        assert all(0 < len(canonical_sources[source]) <= raw_coefficients[source] for source in SOURCES)

        connection = prepare_database(DATABASE)
        raw_total = checks = 0
        minimum = maximum = None
        cells = []
        for source_alpha in SOURCES:
            source_raw = 0
            source_checks = 0
            source_min = source_max = None
            for relative, terminal in enumerate(terminals, 1):
                type_index = TYPE_START + relative - 1
                last_cell = [source_alpha, type_index]
                type_min = type_max = None
                key_batch = []
                product_batch = []
                for source in canonical_sources[source_alpha]:
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
                    type_min = value if type_min is None else min(type_min, value)
                    type_max = value if type_max is None else max(type_max, value)
                    product_text = encode(product)
                    key_batch.append((source_alpha, type_index, encode(source), product_text, str(value)))
                    product_batch.append((source_alpha, product_text))
                connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)", key_batch)
                connection.executemany("INSERT OR IGNORE INTO products VALUES (?,?)", product_batch)
                source_raw += raw_coefficients[source_alpha]
                source_checks += len(canonical_sources[source_alpha])
                source_min = type_min if source_min is None else min(source_min, type_min)
                source_max = type_max if source_max is None else max(source_max, type_max)
            connection.commit()
            gate()
            assert source_raw == EXPECTED_RAW_BY_SOURCE[source_alpha]
            cells.append(
                {
                    "source_alpha": source_alpha,
                    "terminal_alpha": TERMINAL_ALPHA,
                    "total_alpha": source_alpha + TERMINAL_ALPHA,
                    "terminal_type_indices": [TYPE_START, TYPE_STOP],
                    "terminal_type_count": len(terminals),
                    "raw_multisets": source_raw,
                    "canonical_check_keys": source_checks,
                    "negative_Q8": 0,
                    "zero_Q8": 0,
                    "minimum_Q8": source_min,
                    "maximum_Q8": source_max,
                }
            )
            raw_total += source_raw
            checks += source_checks
            minimum = source_min if minimum is None else min(minimum, source_min)
            maximum = source_max if maximum is None else max(maximum, source_max)
            print(
                f"source={source_alpha}/8 raw={raw_total} checks={checks} "
                f"private_MiB={peak/1024**2:.3f} elapsed={time.perf_counter()-started:.3f}s",
                flush=True,
            )

        database_checks = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
        database_products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        assert raw_total == EXPECTED_RAW and checks == database_checks and minimum is not None and minimum > 0
        aggregate = {
            "source_alpha_range": [5, 8],
            "terminal_alpha": TERMINAL_ALPHA,
            "total_alpha_range": [14, 17],
            "source_type_cells": len(cells) * len(terminals),
            "independently_counted_raw_multisets": raw_total,
            "canonical_check_keys": database_checks,
            "distinct_crossing_jets": database_products,
            "raw_to_canonical_compression": raw_total - database_checks,
            "canonical_key_to_product_collisions": database_checks - database_products,
            "negative_Q8": 0,
            "zero_Q8": 0,
            "minimum_Q8": minimum,
            "maximum_Q8": maximum,
        }
        connection.execute("INSERT INTO meta VALUES ('result',?)", (json.dumps(aggregate, sort_keys=True, separators=(",", ":")),))
        connection.commit()
        connection.close()
        connection = None
        stop_sampling.set()
        sampler.join(timeout=1)
        gate()
        elapsed = time.perf_counter() - started
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha9-s5-8-complete-agent-v1",
            "status": "PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA9_SOURCES5_8_COMPLETE_AGENT",
            "theorem": "Every exceptional-only threshold-14 first crossing with terminal alpha9 and source alpha5 through 8 has literal Q8>0.",
            "coverage": {
                "source_alpha_range": [5, 8],
                "terminal_alpha": TERMINAL_ALPHA,
                "terminal_type_indices": [TYPE_START, TYPE_STOP],
                "source_type_cells": 60,
                "gaps": 0,
                "overlaps": 0,
            },
            "lower_canonical_state_counts_by_alpha": {str(alpha): len(value) for alpha, value in enumerate(states)},
            "cells": cells,
            "aggregate": aggregate,
            "resources": {
                "workers": 1,
                "abort_limit_private_bytes": ABORT_LIMIT,
                "hard_limit_private_bytes": HARD_LIMIT,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "elapsed_seconds": elapsed,
            },
            "scope_warning": "Completes only terminal alpha9/source alpha5..8 (60 source/type cells); sources9..13 and the other proof dependencies remain.",
            "hashes": {
                JETS.name: digest(JETS),
                CLASSIFICATION.name: digest(CLASSIFICATION),
                DESIGN.name: digest(DESIGN),
                DESIGN_AUDIT.name: digest(DESIGN_AUDIT),
                DEPENDENCY.name: digest(DEPENDENCY),
                DATABASE.name: digest(DATABASE),
                Path(__file__).name: digest(Path(__file__)),
            },
        }
        OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        CHECKPOINT.unlink(missing_ok=True)
        OBSTRUCTION.unlink(missing_ok=True)
        print(payload["status"])
        print(
            f"raw={raw_total} checks={database_checks} products={database_products} "
            f"neg=0 zero=0 min_Q8={minimum} max_Q8={maximum}"
        )
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"database_sha256={digest(DATABASE)}")
        print(f"report_sha256={digest(OUTPUT)}")
        return 0
    except ResourceGate as error:
        stop_sampling.set()
        sampler.join(timeout=1)
        payload = {
            "status": "ABORTED_CLEANLY_RANK8_ALPHA9_SOURCES5_8_AGENT_RESOURCE_GATE",
            "reason": str(error),
            "last_source_and_terminal_type": last_cell,
            "peak_private_bytes": max(peak, private_bytes()),
            "scope_warning": "Resource checkpoint only; not a sign or forest obstruction.",
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        CHECKPOINT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        return 2
    except SignObstruction as error:
        payload = {
            "status": "EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA9_SOURCES5_8_AGENT",
            "witness": error.witness,
            "scope_warning": "Exact product-jet obstruction in the stated cell; no broader conclusion is asserted.",
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        OBSTRUCTION.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        return 3
    finally:
        if connection is not None:
            connection.close()
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
