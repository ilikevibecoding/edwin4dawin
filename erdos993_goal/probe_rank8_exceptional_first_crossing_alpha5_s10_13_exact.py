#!/usr/bin/env python3
"""Resource-gated exact remaining alpha5 exceptional first-crossing cells."""

from __future__ import annotations

import json
import math
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
from probe_rank8_exceptional_first_crossing_alpha5_s9_exact import (
    encode,
    load_jets_through_alpha5,
    raw_state_upper_bound,
)


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
BASE_DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
PILOT_DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha5_s9_exact.py"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_keys_exact_20260820.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_exact_20260820.json"
CHECKPOINT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_resource_checkpoint_20260820.json"
OBSTRUCTION = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_obstruction_20260820.json"
THRESHOLD = 14
TERMINAL_ALPHA = 5
SOURCES = (10, 11, 12, 13)
ABORT_LIMIT = 480 * 1024**2


class ResourceGate(RuntimeError):
    pass


class SignObstruction(RuntimeError):
    def __init__(self, witness):
        super().__init__("negative exact Q8 in alpha5 remaining band")
        self.witness = witness


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
    connection = None
    states = None
    last_component = 0
    last_source = None
    projection_history = []
    accumulators = {
        source: {"checks": 0, "negative": 0, "zero": 0, "minimum": None, "maximum": None}
        for source in SOURCES
    }

    def sample() -> None:
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, private_bytes())

    def gate(actual: int, projected: int | None = None) -> None:
        nonlocal peak
        peak = max(peak, actual)
        if actual >= ABORT_LIMIT or (projected is not None and projected >= ABORT_LIMIT):
            raise ResourceGate(
                f"480 MiB gate: actual={actual}, projected={projected}"
            )

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        jets = load_jets_through_alpha5()
        raw_upper_total, raw_upper_by_alpha = raw_state_upper_bound(
            tuple(alpha for alpha, _, _ in jets)
        )
        connection = prepare_database()
        baseline_private = private_bytes()
        identity = (1,) + (0,) * RETAINED_RANK
        states = {alpha: set() for alpha in range(THRESHOLD)}
        states[0].add(identity)

        for component_index, (component_alpha, component, _) in enumerate(jets, 1):
            last_component = component_index
            for target_alpha in range(component_alpha, THRESHOLD):
                for source in tuple(states[target_alpha - component_alpha]):
                    states[target_alpha].add(multiply(source, component))

            actual = private_bytes()
            distinct_states = sum(len(values) for values in states.values())
            dynamic_bytes = max(0, actual - baseline_private)
            bytes_per_state = dynamic_bytes / max(1, distinct_states - 1)
            projected = baseline_private + math.ceil(
                1.25 * bytes_per_state * raw_upper_total
            )
            projection_history.append(
                {
                    "component_index": component_index,
                    "component_alpha": component_alpha,
                    "distinct_states": distinct_states,
                    "private_bytes": actual,
                    "projected_private_bytes": projected,
                }
            )
            gate(actual, projected)

            if component_alpha != TERMINAL_ALPHA:
                continue
            for source_alpha in SOURCES:
                last_source = source_alpha
                accumulator = accumulators[source_alpha]
                key_batch = []
                product_batch = []

                def flush() -> None:
                    if not key_batch:
                        return
                    before = connection.total_changes
                    connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)", key_batch)
                    assert connection.total_changes - before == len(key_batch)
                    connection.executemany(
                        "INSERT OR IGNORE INTO products VALUES (?,?)", product_batch
                    )
                    key_batch.clear()
                    product_batch.clear()
                    gate(private_bytes())

                for source in states[source_alpha]:
                    product = multiply(source, component)
                    value = q8(product)
                    if value < 0:
                        raise SignObstruction(
                            {
                                "component_index": component_index,
                                "source_alpha": source_alpha,
                                "terminal_alpha": TERMINAL_ALPHA,
                                "total_alpha": source_alpha + TERMINAL_ALPHA,
                                "source_i0_through_i9": list(source),
                                "component_i0_through_i9": list(component),
                                "product_i0_through_i9": list(product),
                                "Q8": value,
                            }
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
                    if len(key_batch) == 5000:
                        flush()
                flush()
            connection.commit()

            if component_index % 8 == 0 or component_index == len(jets):
                print(
                    f"component={component_index}/72 states={distinct_states} "
                    f"checks={sum(int(item['checks']) for item in accumulators.values())} "
                    f"private_MiB={private_bytes()/1024**2:.3f} "
                    f"projected_MiB={projected/1024**2:.3f}",
                    flush=True,
                )

        state_counts = {str(alpha): len(states[alpha]) for alpha in range(THRESHOLD)}
        cells = {}
        for source_alpha in SOURCES:
            accumulator = accumulators[source_alpha]
            database_checks = connection.execute(
                "SELECT COUNT(*) FROM keys WHERE source_alpha=?", (source_alpha,)
            ).fetchone()[0]
            database_products = connection.execute(
                "SELECT COUNT(*) FROM products WHERE source_alpha=?", (source_alpha,)
            ).fetchone()[0]
            assert database_checks == accumulator["checks"]
            assert accumulator["negative"] == accumulator["zero"] == 0
            assert int(accumulator["minimum"]) > 0
            cells[str(source_alpha)] = {
                "source_alpha": source_alpha,
                "terminal_alpha": TERMINAL_ALPHA,
                "total_alpha": source_alpha + TERMINAL_ALPHA,
                "ordered_covering_checks": database_checks,
                "distinct_crossing_jets": database_products,
                "canonical_key_to_product_collisions": database_checks - database_products,
                "negative_Q8": 0,
                "zero_Q8": 0,
                "minimum_Q8": int(accumulator["minimum"]),
                "maximum_Q8": int(accumulator["maximum"]),
            }
        meta = {
            "status": "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_S10_13_KEYS",
            "state_counts": state_counts,
            "cells": cells,
        }
        connection.execute(
            "INSERT INTO meta VALUES ('result',?)",
            (json.dumps(meta, sort_keys=True, separators=(",", ":")),),
        )
        connection.commit()
        connection.close()
        connection = None

        stop_sampling.set()
        sampler.join(timeout=1)
        peak = max(peak, private_bytes())
        elapsed = time.perf_counter() - started
        maximum_projection = max(
            int(row["projected_private_bytes"]) for row in projection_history
        )
        assert peak < ABORT_LIMIT < LIMIT
        assert maximum_projection < ABORT_LIMIT
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha5-s10-13-v1",
            "status": "PASS_EXACT_RESOURCE_GATED_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_S10_13",
            "scope": {
                "certified_cells": [
                    {"source": source, "terminal": 5, "total": source + 5}
                    for source in SOURCES
                ],
                "terminal_component_type_indices": [25, 72],
                "workers": 1,
                "warning": "This report excludes source9 and stops before terminal alpha6.",
            },
            "partial_state_counts_by_alpha_after_type72": state_counts,
            "partial_states_total_after_type72": sum(state_counts.values()),
            "raw_multiset_state_upper_bound_by_alpha": {
                str(alpha): value for alpha, value in enumerate(raw_upper_by_alpha)
            },
            "raw_multiset_state_upper_bound_total": raw_upper_total,
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
                "hard_limit_private_bytes": LIMIT,
                "abort_limit_private_bytes": ABORT_LIMIT,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "maximum_projected_private_bytes": maximum_projection,
                "maximum_projected_private_MiB": maximum_projection / 1024**2,
                "projection_history": projection_history,
                "elapsed_seconds": elapsed,
            },
            "hashes": {
                JETS.name: digest(JETS),
                CLASSIFICATION.name: digest(CLASSIFICATION),
                BASE_DEPENDENCY.name: digest(BASE_DEPENDENCY),
                PILOT_DEPENDENCY.name: digest(PILOT_DEPENDENCY),
                DATABASE.name: digest(DATABASE),
                Path(__file__).name: digest(Path(__file__)),
            },
        }
        OUTPUT.write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        if CHECKPOINT.exists():
            CHECKPOINT.unlink()
        if OBSTRUCTION.exists():
            OBSTRUCTION.unlink()
        print(payload["status"])
        for source in SOURCES:
            cell = cells[str(source)]
            print(
                f"source={source} total={source+5} checks={cell['ordered_covering_checks']} "
                f"products={cell['distinct_crossing_jets']} "
                f"collisions={cell['canonical_key_to_product_collisions']} "
                f"negative=0 zero=0 min_Q8={cell['minimum_Q8']} max_Q8={cell['maximum_Q8']}"
            )
        print(
            f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak} "
            f"max_projected_private_bytes={maximum_projection}"
        )
        print(f"database_sha256={digest(DATABASE)}")
        print(f"report_sha256={digest(OUTPUT)}")
        return 0
    except ResourceGate as error:
        stop_sampling.set()
        sampler.join(timeout=1)
        state_counts = (
            {str(alpha): len(states[alpha]) for alpha in range(THRESHOLD)}
            if states is not None
            else {}
        )
        database_counts = {}
        if connection is not None:
            for source in SOURCES:
                database_counts[str(source)] = connection.execute(
                    "SELECT COUNT(*) FROM keys WHERE source_alpha=?", (source,)
                ).fetchone()[0]
        checkpoint = {
            "status": "ABORTED_CLEANLY_RANK8_ALPHA5_S10_13_RESOURCE_GATE",
            "reason": str(error),
            "last_component_index": last_component,
            "last_source_alpha": last_source,
            "partial_state_counts": state_counts,
            "partial_states_total": sum(state_counts.values()),
            "preserved_canonical_key_counts": database_counts,
            "peak_private_bytes": max(peak, private_bytes()),
            "abort_limit_private_bytes": ABORT_LIMIT,
            "projection_history": projection_history,
            "scope_warning": "This is a resource checkpoint, not a sign obstruction.",
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        CHECKPOINT.write_text(
            json.dumps(checkpoint, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        print(checkpoint["status"])
        print(f"checkpoint_sha256={digest(CHECKPOINT)}")
        return 2
    except SignObstruction as error:
        obstruction = {
            "status": "EXACT_NEGATIVE_Q8_OBSTRUCTION_RANK8_ALPHA5_S10_13",
            "witness": error.witness,
            "scope_warning": "This is an exact exceptional-product obstruction.",
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        OBSTRUCTION.write_text(
            json.dumps(obstruction, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        print(obstruction["status"])
        print(f"obstruction_sha256={digest(OBSTRUCTION)}")
        return 3
    finally:
        if connection is not None:
            connection.close()
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
