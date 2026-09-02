#!/usr/bin/env python3
"""Exact one-cell alpha6 pilot: source13, terminal type247 only."""

from __future__ import annotations

import csv
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


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha6_streaming_design_exact_20260820.json"
DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_keys_exact_20260820.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_exact_20260820.json"
CHECKPOINT = ROOT / "rank8_exceptional_first_crossing_alpha6_s13_type247_resource_checkpoint_20260820.json"
OBSTRUCTION = ROOT / "rank8_exceptional_first_crossing_alpha6_s13_type247_obstruction_20260820.json"
THRESHOLD = 14
SOURCE_ALPHA = 13
TERMINAL_ALPHA = 6
TERMINAL_TYPE_INDEX = 247
RAW_STATE_UPPER = 344802
RAW_CELL_UPPER = 195031
ABORT_LIMIT = 448 * 1024**2
DATABASE_ALLOWANCE = 32 * 1024**2


class ResourceGate(RuntimeError):
    pass


class SignObstruction(RuntimeError):
    def __init__(self, witness):
        super().__init__("negative exact Q8 in alpha6 type247 pilot")
        self.witness = witness


def encode(polynomial):
    return ",".join(str(value) for value in polynomial)


def load_jets_through_alpha6():
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert (
        classification["status"]
        == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    )
    assert [classification["distinct_by_alpha"][str(alpha)] for alpha in range(1, 7)] == [
        2,
        2,
        5,
        15,
        48,
        175,
    ]
    assert classification["hashes"][JETS.name] == digest(JETS)
    rows = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            alpha = int(row["alpha"])
            polynomial = tuple(int(row[f"i{rank}"]) for rank in range(10))
            value = int(row["q8"])
            assert polynomial[0] == 1
            assert value == q8(polynomial)
            rows.append((alpha, polynomial, value))
    assert len(rows) == len(set(rows)) == 1215
    assert rows == sorted(rows)
    selected = tuple(row for row in rows if row[0] <= TERMINAL_ALPHA)
    assert len(selected) == TERMINAL_TYPE_INDEX
    assert tuple(alpha for alpha, _, _ in selected) == (
        (1,) * 2 + (2,) * 2 + (3,) * 5 + (4,) * 15 + (5,) * 48 + (6,) * 175
    )
    assert all(value == 0 for _, _, value in selected)
    return selected


def prepare_database():
    if DATABASE.exists():
        DATABASE.unlink()
    connection = sqlite3.connect(DATABASE)
    connection.execute("PRAGMA journal_mode=DELETE")
    connection.execute("PRAGMA synchronous=FULL")
    connection.execute("PRAGMA temp_store=FILE")
    connection.execute("PRAGMA cache_size=-16384")
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
    projection_history = []

    def sample():
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, private_bytes())

    def gate(actual, projected=None):
        nonlocal peak
        peak = max(peak, actual)
        if actual >= ABORT_LIMIT or (projected is not None and projected >= ABORT_LIMIT):
            raise ResourceGate(
                f"448 MiB gate: actual={actual}, projected={projected}"
            )

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        design = json.loads(DESIGN.read_text(encoding="utf-8"))
        assert design["products_enumerated"] == 0
        assert design["exact_counts"]["alpha6_raw_state_upper_bound_total"] == RAW_STATE_UPPER
        assert design["exact_counts"]["source_cells"]["13"][
            "maximum_single_type_raw_count"
        ] == RAW_CELL_UPPER
        jets = load_jets_through_alpha6()
        terminal_component = jets[-1][1]
        connection = prepare_database()
        baseline = private_bytes()
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
            dynamic = max(0, actual - baseline)
            bytes_per_state = dynamic / max(1, distinct_states - 1)
            projected = (
                baseline
                + math.ceil(1.25 * bytes_per_state * RAW_STATE_UPPER)
                + DATABASE_ALLOWANCE
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
            if component_index % 25 == 0 or component_index == len(jets):
                print(
                    f"component={component_index}/247 states={distinct_states} "
                    f"private_MiB={actual/1024**2:.3f} "
                    f"projected_MiB={projected/1024**2:.3f}",
                    flush=True,
                )

        assert last_component == TERMINAL_TYPE_INDEX
        checks = negative = zero = 0
        minimum = maximum = None
        key_batch = []
        product_batch = []

        def flush():
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

        for source in states[SOURCE_ALPHA]:
            product = multiply(source, terminal_component)
            value = q8(product)
            if value < 0:
                raise SignObstruction(
                    {
                        "source_alpha": SOURCE_ALPHA,
                        "terminal_alpha": TERMINAL_ALPHA,
                        "total_alpha": SOURCE_ALPHA + TERMINAL_ALPHA,
                        "terminal_type_index": TERMINAL_TYPE_INDEX,
                        "source_i0_through_i9": list(source),
                        "terminal_i0_through_i9": list(terminal_component),
                        "product_i0_through_i9": list(product),
                        "Q8": value,
                    }
                )
            checks += 1
            negative += value < 0
            zero += value == 0
            minimum = value if minimum is None else min(minimum, value)
            maximum = value if maximum is None else max(maximum, value)
            source_text = encode(source)
            product_text = encode(product)
            key_batch.append(
                (SOURCE_ALPHA, TERMINAL_TYPE_INDEX, source_text, product_text, str(value))
            )
            product_batch.append((SOURCE_ALPHA, product_text))
            if len(key_batch) == 2500:
                flush()
        flush()
        connection.commit()
        database_checks = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
        database_products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        assert checks == database_checks
        assert negative == zero == 0
        assert minimum is not None and minimum > 0
        state_counts = {str(alpha): len(states[alpha]) for alpha in range(THRESHOLD)}
        cell = {
            "source_alpha": SOURCE_ALPHA,
            "terminal_alpha": TERMINAL_ALPHA,
            "total_alpha": SOURCE_ALPHA + TERMINAL_ALPHA,
            "terminal_type_index": TERMINAL_TYPE_INDEX,
            "terminal_relative_alpha6_type": 175,
            "terminal_i0_through_i9": list(terminal_component),
            "ordered_covering_checks": database_checks,
            "distinct_crossing_jets": database_products,
            "canonical_key_to_product_collisions": database_checks - database_products,
            "negative_Q8": 0,
            "zero_Q8": 0,
            "minimum_Q8": minimum,
            "maximum_Q8": maximum,
        }
        connection.execute(
            "INSERT INTO meta VALUES ('result',?)",
            (
                json.dumps(
                    {
                        "status": "PASS_EXACT_RANK8_ALPHA6_S13_TYPE247_KEYS",
                        "state_counts": state_counts,
                        "cell": cell,
                    },
                    sort_keys=True,
                    separators=(",", ":"),
                ),
            ),
        )
        connection.commit()
        connection.close()
        connection = None

        stop_sampling.set()
        sampler.join(timeout=1)
        peak = max(peak, private_bytes())
        maximum_projection = max(
            int(row["projected_private_bytes"]) for row in projection_history
        )
        elapsed = time.perf_counter() - started
        assert peak < ABORT_LIMIT < LIMIT
        assert maximum_projection < ABORT_LIMIT
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha6-s13-type247-pilot-v1",
            "status": "PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA6_S13_TYPE247_PILOT",
            "scope": {
                "certified_cell": {
                    "source": SOURCE_ALPHA,
                    "terminal": TERMINAL_ALPHA,
                    "total": SOURCE_ALPHA + TERMINAL_ALPHA,
                    "terminal_type_index": TERMINAL_TYPE_INDEX,
                },
                "workers": 1,
                "warning": (
                    "Only terminal type247 at source13 was run. No other alpha6 "
                    "terminal type or source cell is certified."
                ),
            },
            "partial_state_counts_by_alpha_after_type247": state_counts,
            "partial_states_total_after_type247": sum(state_counts.values()),
            "raw_multiset_state_upper_bound_total": RAW_STATE_UPPER,
            "raw_multiset_cell_upper_bound": RAW_CELL_UPPER,
            "cell": cell,
            "resources": {
                "workers": 1,
                "abort_limit_private_bytes": ABORT_LIMIT,
                "hard_limit_private_bytes": LIMIT,
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
                DESIGN.name: digest(DESIGN),
                DEPENDENCY.name: digest(DEPENDENCY),
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
        print(
            f"states={sum(state_counts.values())} checks={checks} "
            f"products={database_products} collisions={checks-database_products} "
            f"negative=0 zero=0 min_Q8={minimum} max_Q8={maximum}"
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
        checkpoint = {
            "status": "ABORTED_CLEANLY_RANK8_ALPHA6_S13_TYPE247_RESOURCE_GATE",
            "reason": str(error),
            "last_component_index": last_component,
            "partial_state_counts": state_counts,
            "partial_states_total": sum(state_counts.values()),
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
            "status": "EXACT_NEGATIVE_Q8_OBSTRUCTION_RANK8_ALPHA6_S13_TYPE247",
            "witness": error.witness,
            "scope_warning": "This exact pilot obstruction is not a connected-tree claim.",
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
