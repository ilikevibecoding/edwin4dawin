#!/usr/bin/env python3
"""Independent bidirectional audit for one sealed source-alpha9 alpha6 shard."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sqlite3
import tempfile
import threading
import time
from pathlib import Path

from audit_rank8_exceptional_first_crossing_alpha4 import encode, multiply
from probe_rank8_exceptional_first_crossing_alpha2_exact import LIMIT, private_bytes


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha6_s9_shard_exact.py"
ALGEBRA_DEPENDENCY = ROOT / "audit_rank8_exceptional_first_crossing_alpha4.py"
MEMORY_DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
SOURCE_ALPHA = 9
TERMINAL_ALPHA = 6
TOTAL_ALPHA = 15
RETAINED_RANK = 9
ABORT_LIMIT = 448 * 1024**2
SHARDS = {
    "types73_246": {"start": 73, "stop": 246, "raw": 748113},
    "type247": {"start": 247, "stop": 247, "raw": 5437},
}


class ResourceGate(RuntimeError):
    pass


class SignObstruction(RuntimeError):
    def __init__(self, witness):
        super().__init__("nonpositive independent Q8")
        self.witness = witness


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q8(polynomial):
    return 16 * polynomial[8] * polynomial[8] - polynomial[7] * polynomial[8] - 18 * polynomial[7] * polynomial[9]


def paths(label):
    stem = f"rank8_exceptional_first_crossing_alpha6_s9_{label}"
    return {
        "report": ROOT / f"{stem}_exact_20260820.json",
        "database": ROOT / f"{stem}_keys_exact_20260820.sqlite3",
        "output": ROOT / f"{stem}_audit_exact_20260820.json",
        "checkpoint": ROOT / f"{stem}_audit_resource_checkpoint_20260820.json",
        "obstruction": ROOT / f"{stem}_audit_obstruction_20260820.json",
    }


def load_jets():
    rows = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            rows.append((int(row["alpha"]), tuple(int(row[f"i{rank}"]) for rank in range(10))))
    assert len(rows) == 1215 and rows == sorted(rows)
    selected = tuple(row for row in rows if row[0] <= TERMINAL_ALPHA)
    assert len(selected) == 247
    assert tuple(alpha for alpha, _ in selected) == ((1,) * 2 + (2,) * 2 + (3,) * 5 + (4,) * 15 + (5,) * 48 + (6,) * 175)
    return selected


def enumerate_lower_multisets(lower_jets, target):
    identity = (1,) + (0,) * RETAINED_RANK
    powers = []
    for weight, polynomial in lower_jets:
        row = [identity]
        for _ in range(target // weight):
            row.append(multiply(row[-1], polynomial))
        powers.append(tuple(row))
    results = []

    def visit(index, remaining, source):
        if index == len(lower_jets):
            if remaining == 0:
                results.append(source)
            return
        weight = lower_jets[index][0]
        for exponent in range(remaining // weight + 1):
            next_source = source if exponent == 0 else multiply(source, powers[index][exponent])
            visit(index + 1, remaining - exponent * weight, next_source)

    visit(0, target, identity)
    return tuple(results)


def prepare_database(path):
    connection = sqlite3.connect(path)
    connection.execute("PRAGMA journal_mode=DELETE")
    connection.execute("PRAGMA synchronous=NORMAL")
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


def enumerate_shard(connection, jets, config, check_memory):
    lower = tuple(row for row in jets if row[0] < TERMINAL_ALPHA)
    alpha6 = tuple(polynomial for alpha, polynomial in jets if alpha == TERMINAL_ALPHA)
    assert len(lower) == 72 and len(alpha6) == 175
    lower3 = enumerate_lower_multisets(lower, 3)
    lower9 = enumerate_lower_multisets(lower, 9)
    assert len(lower3) == 13 and len(lower9) == 3162
    raw = 0
    minimum = maximum = None
    per_type = []
    batch = []
    started = time.perf_counter()

    def flush():
        if not batch:
            return
        connection.executemany(
            "INSERT INTO keys VALUES (?,?,?,?,?,1) "
            "ON CONFLICT(source_alpha,largest_type,source,product,q8) "
            "DO UPDATE SET multiplicity=multiplicity+1", batch,
        )
        batch.clear(); check_memory()

    def record(source, terminal, type_index):
        nonlocal raw, minimum, maximum
        product = multiply(source, terminal)
        value = q8(product)
        if value <= 0:
            raise SignObstruction({
                "source_alpha": SOURCE_ALPHA, "terminal_alpha": TERMINAL_ALPHA,
                "total_alpha": TOTAL_ALPHA, "terminal_type_index": type_index,
                "source_i0_through_i9": list(source), "terminal_i0_through_i9": list(terminal),
                "product_i0_through_i9": list(product), "Q8": value,
            })
        raw += 1
        minimum = value if minimum is None else min(minimum, value)
        maximum = value if maximum is None else max(maximum, value)
        batch.append((SOURCE_ALPHA, type_index, encode(source), encode(product), str(value)))
        if len(batch) == 2500:
            flush()

    for type_index in range(config["start"], config["stop"] + 1):
        relative = type_index - 72
        terminal = alpha6[relative - 1]
        before = raw
        for source in lower9:
            record(source, terminal, type_index)
        for source_component in alpha6[:relative]:
            for base in lower3:
                record(multiply(base, source_component), terminal, type_index)
        type_raw = raw - before
        assert type_raw == 3162 + 13 * relative
        per_type.append({
            "terminal_type_index": type_index,
            "terminal_relative_alpha6_type": relative,
            "independently_enumerated_multisets": type_raw,
        })
        if type_index % 25 == 0 or type_index == config["stop"]:
            flush(); connection.commit()
            print(f"audit-component={type_index}/{config['stop']} raw={raw} elapsed={time.perf_counter()-started:.3f}s", flush=True)
    flush()
    assert raw == config["raw"] and minimum is not None and minimum > 0
    connection.execute("INSERT OR IGNORE INTO products SELECT source_alpha,product FROM keys")
    connection.commit()
    canonical = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
    products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    return {
        "source_alpha": SOURCE_ALPHA, "terminal_alpha": TERMINAL_ALPHA, "total_alpha": TOTAL_ALPHA,
        "terminal_type_index_start": config["start"], "terminal_type_index_stop": config["stop"],
        "terminal_type_count": len(per_type),
        "independently_enumerated_multisets": raw,
        "canonical_check_keys": canonical, "distinct_crossing_jets": products,
        "multiset_to_canonical_key_collisions": raw - canonical,
        "canonical_key_to_product_collisions": canonical - products,
        "maximum_multisets_per_canonical_key": connection.execute("SELECT MAX(multiplicity) FROM keys").fetchone()[0],
        "maximum_canonical_keys_per_product": connection.execute("SELECT MAX(c) FROM (SELECT COUNT(*) c FROM keys GROUP BY product)").fetchone()[0],
        "maximum_multisets_per_product": connection.execute("SELECT MAX(c) FROM (SELECT SUM(multiplicity) c FROM keys GROUP BY product)").fetchone()[0],
        "negative_Q8": 0, "zero_Q8": 0, "minimum_Q8": minimum, "maximum_Q8": maximum,
        "lower_raw_multiset_counts": {"3": len(lower3), "9": len(lower9)},
        "per_terminal_type": per_type, "elapsed_seconds": time.perf_counter() - started,
    }


def assert_equality(connection, database):
    connection.execute("ATTACH DATABASE ? AS recurrence", (str(database.resolve()),))
    columns = "source_alpha,largest_type,source,product,q8"
    assert connection.execute(f"SELECT {columns} FROM keys EXCEPT SELECT {columns} FROM recurrence.keys LIMIT 1").fetchone() is None
    assert connection.execute(f"SELECT {columns} FROM recurrence.keys EXCEPT SELECT {columns} FROM keys LIMIT 1").fetchone() is None
    assert connection.execute("SELECT source_alpha,product FROM products EXCEPT SELECT source_alpha,product FROM recurrence.products LIMIT 1").fetchone() is None
    assert connection.execute("SELECT source_alpha,product FROM recurrence.products EXCEPT SELECT source_alpha,product FROM products LIMIT 1").fetchone() is None
    connection.execute("DETACH DATABASE recurrence")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("shard", choices=tuple(SHARDS))
    args = parser.parse_args()
    label = args.shard
    config = SHARDS[label]
    artifacts = paths(label)
    started = time.perf_counter()
    peak = private_bytes()
    stop_sampling = threading.Event()

    def sample():
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, private_bytes())

    def check_memory():
        nonlocal peak
        peak = max(peak, private_bytes())
        if peak >= ABORT_LIMIT:
            raise ResourceGate(f"audit reached 448 MiB gate: {peak}")

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    recurrence_hash = digest(artifacts["database"])
    try:
        report = json.loads(artifacts["report"].read_text(encoding="utf-8"))
        assert report["status"] == f"PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA6_S9_{label.upper()}"
        assert report["scope"]["certified_shard"] == {
            "source": 9, "terminal": 6, "total": 15,
            "terminal_type_index_start": config["start"], "terminal_type_index_stop": config["stop"],
        }
        assert report["resources"]["peak_private_bytes"] < ABORT_LIMIT
        assert report["hashes"][artifacts["database"].name] == recurrence_hash
        jets = load_jets()
        with tempfile.TemporaryDirectory(prefix=f"rank8_alpha6_s9_{label}_audit_") as temporary:
            connection = prepare_database(Path(temporary) / "independent.sqlite3")
            try:
                shard = enumerate_shard(connection, jets, config, check_memory)
                assert_equality(connection, artifacts["database"])
            finally:
                connection.close()
        assert digest(artifacts["database"]) == recurrence_hash
        reported = report["aggregate"]
        assert shard["canonical_check_keys"] == reported["ordered_covering_checks"]
        assert shard["distinct_crossing_jets"] == reported["distinct_crossing_jets"]
        assert shard["canonical_key_to_product_collisions"] == reported["canonical_key_to_product_collisions"]
        assert shard["negative_Q8"] == reported["negative_Q8"] == 0
        assert shard["zero_Q8"] == reported["zero_Q8"] == 0
        assert shard["minimum_Q8"] == reported["minimum_Q8"]
        assert shard["maximum_Q8"] == reported["maximum_Q8"]
        assert shard["independently_enumerated_multisets"] == report["raw_multiset_crossing_count_design"] == config["raw"]

        stop_sampling.set(); sampler.join(timeout=1); check_memory()
        elapsed = time.perf_counter() - started
        payload = {
            "schema": f"rank8-exceptional-first-crossing-alpha6-s9-{label}-audit-v1",
            "status": f"PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA6_S9_{label.upper()}_AUDIT",
            "method": "independently enumerate lower-type exponent multisets of weights3 and9, add zero or one allowed alpha6 source component for each terminal prefix, and compare exact key/product tables in both relational directions",
            "shard": shard,
            "resources": {"workers": 1, "abort_limit_private_bytes": ABORT_LIMIT, "hard_limit_private_bytes": LIMIT, "peak_private_bytes": peak, "peak_private_MiB": peak / 1024**2, "elapsed_seconds": elapsed},
            "scope_warning": "This audit certifies exactly one predesigned source-alpha9 shard and excludes source alpha10.",
            "hashes": {
                artifacts["report"].name: digest(artifacts["report"]),
                artifacts["database"].name: digest(artifacts["database"]),
                SOURCE.name: digest(SOURCE), ALGEBRA_DEPENDENCY.name: digest(ALGEBRA_DEPENDENCY),
                MEMORY_DEPENDENCY.name: digest(MEMORY_DEPENDENCY), JETS.name: digest(JETS),
                CLASSIFICATION.name: digest(CLASSIFICATION), Path(__file__).name: digest(Path(__file__)),
            },
        }
        artifacts["output"].write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        if artifacts["checkpoint"].exists(): artifacts["checkpoint"].unlink()
        if artifacts["obstruction"].exists(): artifacts["obstruction"].unlink()
        print(payload["status"])
        print(f"raw={shard['independently_enumerated_multisets']} keys={shard['canonical_check_keys']} products={shard['distinct_crossing_jets']} multiset_key_collisions={shard['multiset_to_canonical_key_collisions']} key_product_collisions={shard['canonical_key_to_product_collisions']} negative=0 zero=0")
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"audit_sha256={digest(artifacts['output'])}")
        return 0
    except ResourceGate as error:
        stop_sampling.set(); sampler.join(timeout=1)
        checkpoint = {
            "status": f"ABORTED_CLEANLY_RANK8_ALPHA6_S9_{label.upper()}_AUDIT_RESOURCE_GATE",
            "reason": str(error), "peak_private_bytes": max(peak, private_bytes()),
            "scope_warning": "This is a resource checkpoint, not a sign obstruction.",
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        artifacts["checkpoint"].write_text(json.dumps(checkpoint, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(checkpoint["status"]); print(f"checkpoint_sha256={digest(artifacts['checkpoint'])}")
        return 2
    except SignObstruction as error:
        obstruction = {
            "status": f"EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA6_S9_{label.upper()}_AUDIT",
            "witness": error.witness,
            "scope_warning": "This exact audit obstruction belongs only to this source-alpha9 shard.",
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        artifacts["obstruction"].write_text(json.dumps(obstruction, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(obstruction["status"]); print(f"obstruction_sha256={digest(artifacts['obstruction'])}")
        return 3
    finally:
        stop_sampling.set(); sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
