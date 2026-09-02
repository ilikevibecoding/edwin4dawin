#!/usr/bin/env python3
"""Resource-gated exact alpha5/source9 exceptional first-crossing pilot."""

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
DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_keys_exact_20260820.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_exact_20260820.json"
CHECKPOINT = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_resource_checkpoint_20260820.json"
THRESHOLD = 14
TERMINAL_ALPHA = 5
SOURCE_ALPHA = 9
ABORT_LIMIT = 480 * 1024**2


class ResourceGate(RuntimeError):
    pass


def encode(polynomial: tuple[int, ...]) -> str:
    return ",".join(str(value) for value in polynomial)


def load_jets_through_alpha5() -> tuple[tuple[int, tuple[int, ...], int], ...]:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert (
        classification["status"]
        == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    )
    assert classification["distinct_exceptional_jets"] == 1215
    assert [classification["distinct_by_alpha"][str(alpha)] for alpha in range(1, 6)] == [
        2,
        2,
        5,
        15,
        48,
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
    assert len(selected) == 72
    assert tuple(alpha for alpha, _, _ in selected) == (
        (1,) * 2 + (2,) * 2 + (3,) * 5 + (4,) * 15 + (5,) * 48
    )
    assert all(value == 0 for _, _, value in selected)
    return selected


def raw_state_upper_bound(weights: tuple[int, ...]) -> tuple[int, tuple[int, ...]]:
    counts = [0] * THRESHOLD
    counts[0] = 1
    for weight in weights:
        for alpha in range(weight, THRESHOLD):
            counts[alpha] += counts[alpha - weight]
    return sum(counts), tuple(counts)


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
    projection_history = []

    def sample() -> None:
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, private_bytes())

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        jets = load_jets_through_alpha5()
        weights = tuple(alpha for alpha, _, _ in jets)
        raw_upper_total, raw_upper_by_alpha = raw_state_upper_bound(weights)
        connection = prepare_database()
        baseline_private = private_bytes()
        identity = (1,) + (0,) * RETAINED_RANK
        states = {alpha: set() for alpha in range(THRESHOLD)}
        states[0].add(identity)

        checks = negative = zero = 0
        minimum = maximum = None
        for component_index, (component_alpha, component, _) in enumerate(jets, 1):
            last_component = component_index
            for target_alpha in range(component_alpha, THRESHOLD):
                for source in tuple(states[target_alpha - component_alpha]):
                    states[target_alpha].add(multiply(source, component))

            current_private = private_bytes()
            peak = max(peak, current_private)
            distinct_states = sum(len(values) for values in states.values())
            dynamic_bytes = max(0, current_private - baseline_private)
            bytes_per_state = dynamic_bytes / max(1, distinct_states - 1)
            projected_private = baseline_private + math.ceil(
                1.25 * bytes_per_state * raw_upper_total
            )
            projection_history.append(
                {
                    "component_index": component_index,
                    "component_alpha": component_alpha,
                    "distinct_states": distinct_states,
                    "private_bytes": current_private,
                    "projected_private_bytes": projected_private,
                }
            )
            if current_private >= ABORT_LIMIT or projected_private >= ABORT_LIMIT:
                raise ResourceGate(
                    f"480 MiB safety gate at component {component_index}: "
                    f"actual={current_private}, projected={projected_private}"
                )

            if component_alpha == TERMINAL_ALPHA:
                key_batch = []
                product_batch = []
                for source in states[SOURCE_ALPHA]:
                    product = multiply(source, component)
                    value = q8(product)
                    if value < 0:
                        raise AssertionError(
                            "exceptional first-crossing obstruction in alpha5 s9 pilot",
                            component_index,
                            source,
                            product,
                            value,
                        )
                    checks += 1
                    negative += value < 0
                    zero += value == 0
                    minimum = value if minimum is None else min(minimum, value)
                    maximum = value if maximum is None else max(maximum, value)
                    source_text = encode(source)
                    product_text = encode(product)
                    key_batch.append(
                        (SOURCE_ALPHA, component_index, source_text, product_text, str(value))
                    )
                    product_batch.append((SOURCE_ALPHA, product_text))
                before = connection.total_changes
                connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)", key_batch)
                assert connection.total_changes - before == len(key_batch)
                connection.executemany(
                    "INSERT OR IGNORE INTO products VALUES (?,?)", product_batch
                )
                connection.commit()
                current_private = private_bytes()
                peak = max(peak, current_private)
                if current_private >= ABORT_LIMIT:
                    raise ResourceGate(
                        f"480 MiB actual safety gate after component {component_index}: "
                        f"actual={current_private}"
                    )

            if component_index % 8 == 0 or component_index == len(jets):
                print(
                    f"component={component_index}/72 states={distinct_states} "
                    f"checks={checks} private_MiB={current_private/1024**2:.3f} "
                    f"projected_MiB={projected_private/1024**2:.3f}",
                    flush=True,
                )

        state_counts = {str(alpha): len(states[alpha]) for alpha in range(THRESHOLD)}
        database_checks = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
        database_products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        assert checks == database_checks
        assert negative == zero == 0
        assert minimum is not None and minimum > 0
        cell = {
            "source_alpha": SOURCE_ALPHA,
            "terminal_alpha": TERMINAL_ALPHA,
            "total_alpha": SOURCE_ALPHA + TERMINAL_ALPHA,
            "ordered_covering_checks": database_checks,
            "distinct_crossing_jets": database_products,
            "canonical_key_to_product_collisions": database_checks - database_products,
            "negative_Q8": negative,
            "zero_Q8": zero,
            "minimum_Q8": minimum,
            "maximum_Q8": maximum,
        }
        database_meta = {
            "status": "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_S9_KEYS",
            "state_counts": state_counts,
            "cell": cell,
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
        assert peak < LIMIT and peak < ABORT_LIMIT
        maximum_projection = max(
            int(row["projected_private_bytes"]) for row in projection_history
        )
        assert maximum_projection < ABORT_LIMIT
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha5-s9-pilot-v1",
            "status": "PASS_EXACT_RESOURCE_GATED_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_S9_PILOT",
            "scope": {
                "certified_cell": {"source": 9, "terminal": 5, "total": 14},
                "terminal_component_type_indices": [25, 72],
                "workers": 1,
                "warning": (
                    "Only source alpha9 was run. Sources10 through13 and all "
                    "terminal-alpha bands6 through9 remain."
                ),
            },
            "partial_state_counts_by_alpha_after_type72": state_counts,
            "partial_states_total_after_type72": sum(state_counts.values()),
            "raw_multiset_state_upper_bound_by_alpha": {
                str(alpha): value for alpha, value in enumerate(raw_upper_by_alpha)
            },
            "raw_multiset_state_upper_bound_total": raw_upper_total,
            "cell": cell,
            "resources": {
                "hard_limit_private_bytes": LIMIT,
                "abort_limit_private_bytes": ABORT_LIMIT,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "maximum_projected_private_bytes": maximum_projection,
                "maximum_projected_private_MiB": maximum_projection / 1024**2,
                "projection": (
                    "baseline plus 1.25 times observed dynamic bytes per distinct "
                    "state times the exact raw-multiset state upper bound"
                ),
                "projection_history": projection_history,
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
        if CHECKPOINT.exists():
            CHECKPOINT.unlink()
        print(payload["status"])
        print(
            f"states={sum(state_counts.values())} checks={database_checks} "
            f"products={database_products} collisions={database_checks-database_products} "
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
        peak = max(peak, private_bytes())
        state_counts = (
            {str(alpha): len(states[alpha]) for alpha in range(THRESHOLD)}
            if states is not None
            else {}
        )
        checkpoint = {
            "status": "ABORTED_CLEANLY_RANK8_ALPHA5_S9_RESOURCE_GATE",
            "reason": str(error),
            "last_completed_component_index": last_component,
            "partial_state_counts": state_counts,
            "partial_states_total": sum(state_counts.values()),
            "peak_private_bytes": peak,
            "abort_limit_private_bytes": ABORT_LIMIT,
            "hard_limit_private_bytes": LIMIT,
            "projection_history": projection_history,
            "scope_warning": "This resource checkpoint is not a sign certificate or counterexample.",
            "hashes": {
                JETS.name: digest(JETS),
                CLASSIFICATION.name: digest(CLASSIFICATION),
                Path(__file__).name: digest(Path(__file__)),
            },
        }
        CHECKPOINT.write_text(
            json.dumps(checkpoint, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        print(checkpoint["status"])
        print(f"checkpoint_sha256={digest(CHECKPOINT)}")
        return 2
    finally:
        if connection is not None:
            connection.close()
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
