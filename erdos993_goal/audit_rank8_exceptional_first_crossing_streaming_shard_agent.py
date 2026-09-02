#!/usr/bin/env python3
"""Independent raw-multiplicity and bidirectional audit for a config-pinned shard."""

from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
import sys
import tempfile
import threading
import time
from pathlib import Path

from audit_rank8_exceptional_first_crossing_alpha4 import multiply
from probe_rank8_exceptional_first_crossing_alpha2_exact import private_bytes


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
PRODUCER = ROOT / "probe_rank8_exceptional_first_crossing_streaming_shard_agent.py"
RAW_COEFFICIENTS = {
    8: (1, 2, 5, 13, 39, 123, 431, 1625, 3609, 8937, 23147, 63379, 176560, 496731),
    9: (1, 2, 5, 13, 39, 123, 431, 1625, 3862, 9443, 24412, 66668, 186427, 527850),
}
RETAINED_RANK = 9


class ResourceGate(RuntimeError):
    pass


class SignObstruction(RuntimeError):
    def __init__(self, witness: dict):
        super().__init__("nonpositive Q8 in independent configured-shard audit")
        self.witness = witness


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def encode(polynomial: tuple[int, ...]) -> str:
    return ",".join(str(value) for value in polynomial)


def q8(polynomial: tuple[int, ...]) -> int:
    return 16 * polynomial[8] ** 2 - polynomial[7] * polynomial[8] - 18 * polynomial[7] * polynomial[9]


def load_jets(terminal_alpha: int) -> tuple[tuple[tuple[int, tuple[int, ...]], ...], tuple[tuple[int, ...], ...]]:
    rows = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            polynomial = tuple(int(row[f"i{rank}"]) for rank in range(RETAINED_RANK + 1))
            assert int(row["q8"]) == q8(polynomial)
            rows.append((int(row["alpha"]), polynomial))
    assert len(rows) == 1215 and rows == sorted(rows)
    if terminal_alpha == 8:
        lower = tuple(rows[:947])
        terminals = tuple(polynomial for alpha, polynomial in rows[947:1200] if alpha == 8)
        assert len(terminals) == 253
    elif terminal_alpha == 9:
        lower = tuple(rows[:1200])
        terminals = tuple(polynomial for alpha, polynomial in rows[1200:] if alpha == 9)
        assert len(terminals) == 15
    else:
        raise AssertionError(terminal_alpha)
    return lower, terminals


def raw_states(
    lower: tuple[tuple[int, tuple[int, ...]], ...],
    source_alpha: int,
    expected: tuple[int, ...],
) -> list[list[tuple[int, ...]]]:
    identity = (1,) + (0,) * RETAINED_RANK
    states = [[] for _ in range(source_alpha + 1)]
    states[0].append(identity)
    for weight, component in lower:
        for alpha in range(weight, source_alpha + 1):
            states[alpha].extend(multiply(source, component) for source in tuple(states[alpha - weight]))
    assert [len(state) for state in states] == list(expected[: source_alpha + 1])
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


def load_config() -> tuple[Path, dict]:
    assert len(sys.argv) == 2, "usage: audit CONFIG.json"
    config_path = Path(sys.argv[1])
    if not config_path.is_absolute():
        config_path = ROOT / config_path
    config_path = config_path.resolve()
    assert config_path.parent == ROOT
    config = json.loads(config_path.read_text(encoding="utf-8"))
    assert config["schema"] == "rank8-exceptional-first-crossing-streaming-shard-config-agent-v1"
    return config_path, config


def main() -> int:
    config_path, config = load_config()
    terminal_alpha = int(config["terminal_alpha"])
    source_alpha = int(config["source_alpha"])
    type_start = int(config["terminal_type_index_start"])
    type_stop = int(config["terminal_type_index_stop"])
    relative_start = int(config["relative_terminal_type_start"])
    relative_stop = int(config["relative_terminal_type_stop"])
    expected_raw = int(config["expected_raw_multisets"])
    abort_limit = int(config["abort_limit_mib"]) * 1024**2
    hard_limit = int(config["hard_limit_mib"]) * 1024**2
    assert terminal_alpha in (8, 9) and terminal_alpha <= source_alpha <= 13
    assert abort_limit < hard_limit <= 500 * 1024**2

    stem = f"rank8_exceptional_first_crossing_alpha{terminal_alpha}_s{source_alpha}_types{type_start}_{type_stop}"
    database = ROOT / f"{stem}_keys_exact_agent_20260823.sqlite3"
    report_path = ROOT / f"{stem}_shard_exact_agent_20260823.json"
    output = ROOT / f"{stem}_shard_independent_audit_agent_20260823.json"
    checkpoint = ROOT / f"{stem}_audit_resource_checkpoint_agent_20260823.json"
    obstruction = ROOT / f"{stem}_audit_obstruction_agent_20260823.json"
    producer_status = (
        f"PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA{terminal_alpha}_SOURCE{source_alpha}_"
        f"TYPES{type_start}_{type_stop}_SHARD_AGENT"
    )
    audit_status = (
        f"PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_RANK8_ALPHA{terminal_alpha}_SOURCE{source_alpha}_"
        f"TYPES{type_start}_{type_stop}_SHARD_AUDIT_AGENT"
    )
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
        if peak >= abort_limit:
            raise ResourceGate(f"audit reached {config['abort_limit_mib']} MiB gate: {peak}")

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    database_hash = digest(database)
    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["status"] == producer_status
        assert report["configuration"] == config
        assert report["hashes"][config_path.name] == digest(config_path)
        assert report["hashes"][database.name] == database_hash
        assert report["hashes"][PRODUCER.name] == digest(PRODUCER)
        lower, terminals = load_jets(terminal_alpha)
        raw_coefficients = RAW_COEFFICIENTS[terminal_alpha]
        states = raw_states(lower, source_alpha, raw_coefficients)
        gate()

        raw = 0
        minimum = maximum = None
        with tempfile.TemporaryDirectory(prefix=f"rank8_alpha{terminal_alpha}_s{source_alpha}_audit_agent_") as temporary:
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

            type_offset = 947 if terminal_alpha == 8 else 1200
            for relative in range(relative_start, relative_stop + 1):
                terminal = terminals[relative - 1]
                type_index = type_offset + relative
                raw_sources = list(states[source_alpha])
                for component in terminals[:relative]:
                    raw_sources.extend(
                        multiply(base, component)
                        for base in states[source_alpha - terminal_alpha]
                    )
                expected_type_raw = raw_coefficients[source_alpha] + relative * raw_coefficients[source_alpha - terminal_alpha]
                assert len(raw_sources) == expected_type_raw
                for source in raw_sources:
                    product = multiply(source, terminal)
                    value = q8(product)
                    if value <= 0:
                        raise SignObstruction(
                            {
                                "classification": "zero_Q8" if value == 0 else "negative_Q8",
                                "source_alpha": source_alpha,
                                "terminal_alpha": terminal_alpha,
                                "total_alpha": source_alpha + terminal_alpha,
                                "terminal_type_index": type_index,
                                "source_i0_through_i9": list(source),
                                "terminal_i0_through_i9": list(terminal),
                                "product_i0_through_i9": list(product),
                                "Q8": value,
                            }
                        )
                    raw += 1
                    minimum = value if minimum is None else min(minimum, value)
                    maximum = value if maximum is None else max(maximum, value)
                    batch.append((source_alpha, type_index, encode(source), encode(product), str(value)))
                    if len(batch) == 2500:
                        flush()
                flush()
                connection.commit()
                gate()
                print(
                    f"audit-component={type_index}/{type_stop} raw={raw} "
                    f"private_MiB={peak/1024**2:.3f} elapsed={time.perf_counter()-started:.3f}s",
                    flush=True,
                )
            connection.execute("INSERT OR IGNORE INTO products SELECT source_alpha,product FROM keys")
            connection.commit()
            keys = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
            products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
            multiplicity = connection.execute("SELECT SUM(multiplicity) FROM keys").fetchone()[0]
            connection.execute("ATTACH DATABASE ? AS recurrence", (str(database.resolve()),))
            columns = "source_alpha,largest_type,source,product,q8"
            assert connection.execute(
                f"SELECT {columns} FROM keys EXCEPT SELECT {columns} FROM recurrence.keys LIMIT 1"
            ).fetchone() is None
            assert connection.execute(
                f"SELECT {columns} FROM recurrence.keys EXCEPT SELECT {columns} FROM keys LIMIT 1"
            ).fetchone() is None
            assert connection.execute(
                "SELECT source_alpha,product FROM products EXCEPT "
                "SELECT source_alpha,product FROM recurrence.products LIMIT 1"
            ).fetchone() is None
            assert connection.execute(
                "SELECT source_alpha,product FROM recurrence.products EXCEPT "
                "SELECT source_alpha,product FROM products LIMIT 1"
            ).fetchone() is None
            connection.execute("DETACH DATABASE recurrence")
            connection.close()

        aggregate = report["aggregate"]
        assert raw == multiplicity == expected_raw == aggregate["independently_counted_raw_multisets"]
        assert keys == aggregate["canonical_check_keys"]
        assert products == aggregate["distinct_crossing_jets"]
        assert raw - keys == aggregate["raw_to_canonical_compression"]
        assert keys - products == aggregate["canonical_key_to_product_collisions"]
        assert minimum == aggregate["minimum_Q8"] > 0 and maximum == aggregate["maximum_Q8"]
        assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
        assert digest(database) == database_hash

        stop_sampling.set()
        sampler.join(timeout=1)
        gate()
        elapsed = time.perf_counter() - started
        payload = {
            "schema": "rank8-exceptional-first-crossing-streaming-shard-independent-audit-agent-v1",
            "status": audit_status,
            "method": (
                "independent list-valued unbounded-knapsack DP retaining raw multiplicity; explicit ordered "
                "terminal-band prefix insertion; exact local Q8; both SQLite EXCEPT directions for keys and products"
            ),
            "configuration": config,
            "coverage": report["coverage"],
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
                "abort_limit_private_bytes": abort_limit,
                "hard_limit_private_bytes": hard_limit,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "elapsed_seconds": elapsed,
            },
            "scope_warning": "Independent complete audit only for the configured finite shard; all other open cells remain.",
            "hashes": {
                report_path.name: digest(report_path),
                database.name: digest(database),
                config_path.name: digest(config_path),
                PRODUCER.name: digest(PRODUCER),
                JETS.name: digest(JETS),
                CLASSIFICATION.name: digest(CLASSIFICATION),
                Path(__file__).name: digest(Path(__file__)),
            },
        }
        output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        checkpoint.unlink(missing_ok=True)
        obstruction.unlink(missing_ok=True)
        print(audit_status)
        print(f"raw={raw} keys={keys} products={products} neg=0 zero=0 min_Q8={minimum} max_Q8={maximum}")
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"audit_sha256={digest(output)}")
        return 0
    except ResourceGate as error:
        stop_sampling.set()
        sampler.join(timeout=1)
        payload = {
            "status": "ABORTED_CLEANLY_RANK8_STREAMING_SHARD_AUDIT_AGENT_RESOURCE_GATE",
            "reason": str(error),
            "configuration": config,
            "peak_private_bytes": max(peak, private_bytes()),
            "scope_warning": "Resource checkpoint only; not a sign or forest obstruction.",
            "hashes": {config_path.name: digest(config_path), Path(__file__).name: digest(Path(__file__))},
        }
        checkpoint.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        return 2
    except SignObstruction as error:
        payload = {
            "status": "EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_STREAMING_SHARD_AUDIT_AGENT",
            "configuration": config,
            "witness": error.witness,
            "scope_warning": "Exact independent product-jet obstruction in the configured shard; no broader conclusion is asserted.",
            "hashes": {config_path.name: digest(config_path), Path(__file__).name: digest(Path(__file__))},
        }
        obstruction.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        return 3
    finally:
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
