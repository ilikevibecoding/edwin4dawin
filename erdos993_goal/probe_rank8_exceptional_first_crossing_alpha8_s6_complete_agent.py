#!/usr/bin/env python3
"""Exact low-memory producer for all terminal-alpha8/source-alpha6 cells."""

from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
import threading
import time
from pathlib import Path

from probe_rank8_exceptional_first_crossing_alpha2_exact import (
    RETAINED_RANK,
    multiply,
    private_bytes,
    q8,
)


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_agent_20260823.json"
DESIGN_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_independent_audit_agent_20260823.json"
DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha8_s6_types948_1200_keys_exact_agent_20260823.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha8_s6_types948_1200_complete_exact_agent_20260823.json"
CHECKPOINT = ROOT / "rank8_exceptional_first_crossing_alpha8_s6_types948_1200_resource_checkpoint_agent_20260823.json"
OBSTRUCTION = ROOT / "rank8_exceptional_first_crossing_alpha8_s6_types948_1200_obstruction_agent_20260823.json"

SOURCE_ALPHA = 6
TERMINAL_ALPHA = 8
TYPE_START = 948
TYPE_STOP = 1200
EXPECTED_RAW = 109_043
ABORT_LIMIT = 192 * 1024**2
HARD_LIMIT = 256 * 1024**2


class ResourceGate(RuntimeError):
    pass


class SignObstruction(RuntimeError):
    def __init__(self, witness: dict):
        super().__init__("nonpositive exact Q8 in terminal-alpha8/source-alpha6 band")
        self.witness = witness


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def encode(polynomial: tuple[int, ...]) -> str:
    return ",".join(str(value) for value in polynomial)


def load_jets() -> tuple[tuple[tuple[int, tuple[int, ...]], ...], tuple[tuple[int, ...], ...]]:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert classification["hashes"][JETS.name] == digest(JETS)
    rows = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            alpha = int(row["alpha"])
            polynomial = tuple(int(row[f"i{rank}"]) for rank in range(RETAINED_RANK + 1))
            assert int(row["q8"]) == q8(polynomial)
            rows.append((alpha, polynomial))
    assert len(rows) == 1215 and rows == sorted(rows)
    lower = tuple(rows[:247])
    terminals = tuple(polynomial for alpha, polynomial in rows[947:1200] if alpha == TERMINAL_ALPHA)
    assert tuple(alpha for alpha, _ in lower) == ((1,) * 2 + (2,) * 2 + (3,) * 5 + (4,) * 15 + (5,) * 48 + (6,) * 175)
    assert len(terminals) == TYPE_STOP - TYPE_START + 1 == 253
    assert all(q8(polynomial) < 0 for polynomial in terminals)
    return lower, terminals


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


def main() -> int:
    started = time.perf_counter()
    peak = private_bytes()
    stop_sampling = threading.Event()
    connection: sqlite3.Connection | None = None
    last_type = TYPE_START - 1

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
        assert design_audit["status"].startswith("PASS_INDEPENDENT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159")
        assert design_audit["hashes"][DESIGN.name] == digest(DESIGN)
        cell = design["bands"]["8"]["source_cells"][str(SOURCE_ALPHA)]
        assert cell["terminal_type_indices"] == [TYPE_START, TYPE_STOP]
        assert cell["shard_count"] == 1
        assert cell["shards"][0]["raw_multiset_count"] == EXPECTED_RAW
        assert cell["lower_source_raw_count"] == 431
        assert ABORT_LIMIT < HARD_LIMIT

        lower, terminals = load_jets()
        identity = (1,) + (0,) * RETAINED_RANK
        states = [set() for _ in range(SOURCE_ALPHA + 1)]
        states[0].add(identity)
        for weight, component in lower:
            for alpha in range(weight, SOURCE_ALPHA + 1):
                for source in tuple(states[alpha - weight]):
                    states[alpha].add(multiply(source, component))
            gate()
        canonical_sources = tuple(sorted(states[SOURCE_ALPHA]))
        assert 0 < len(canonical_sources) <= 431

        connection = prepare_database(DATABASE)
        checks = 0
        minimum = maximum = None
        per_type = []
        for relative, terminal in enumerate(terminals, 1):
            type_index = TYPE_START + relative - 1
            last_type = type_index
            type_min = type_max = None
            key_batch = []
            product_batch = []
            for source in canonical_sources:
                product = multiply(source, terminal)
                value = q8(product)
                if value <= 0:
                    raise SignObstruction(
                        {
                            "classification": "zero_Q8" if value == 0 else "negative_Q8",
                            "source_alpha": SOURCE_ALPHA,
                            "terminal_alpha": TERMINAL_ALPHA,
                            "total_alpha": SOURCE_ALPHA + TERMINAL_ALPHA,
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
                key_batch.append((SOURCE_ALPHA, type_index, encode(source), product_text, str(value)))
                product_batch.append((SOURCE_ALPHA, product_text))
            connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)", key_batch)
            connection.executemany("INSERT OR IGNORE INTO products VALUES (?,?)", product_batch)
            checks += len(canonical_sources)
            minimum = type_min if minimum is None else min(minimum, type_min)
            maximum = type_max if maximum is None else max(maximum, type_max)
            per_type.append(
                {
                    "terminal_type_index": type_index,
                    "terminal_relative_alpha8_type": relative,
                    "raw_multisets": 431,
                    "canonical_checks": len(canonical_sources),
                    "negative_Q8": 0,
                    "zero_Q8": 0,
                    "minimum_Q8": type_min,
                    "maximum_Q8": type_max,
                }
            )
            if type_index % 25 == 0 or type_index == TYPE_STOP:
                connection.commit()
                gate()
                print(
                    f"component={type_index}/{TYPE_STOP} checks={checks} "
                    f"private_MiB={peak/1024**2:.3f} elapsed={time.perf_counter()-started:.3f}s",
                    flush=True,
                )

        connection.commit()
        database_checks = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
        database_products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        raw = sum(row["raw_multisets"] for row in per_type)
        assert raw == EXPECTED_RAW
        assert database_checks == checks
        assert minimum is not None and minimum > 0
        aggregate = {
            "source_alpha": SOURCE_ALPHA,
            "terminal_alpha": TERMINAL_ALPHA,
            "total_alpha": SOURCE_ALPHA + TERMINAL_ALPHA,
            "terminal_type_index_start": TYPE_START,
            "terminal_type_index_stop": TYPE_STOP,
            "terminal_type_count": len(terminals),
            "independently_counted_raw_multisets": raw,
            "canonical_check_keys": database_checks,
            "distinct_crossing_jets": database_products,
            "raw_to_canonical_compression": raw - database_checks,
            "canonical_key_to_product_collisions": database_checks - database_products,
            "negative_Q8": 0,
            "zero_Q8": 0,
            "minimum_Q8": minimum,
            "maximum_Q8": maximum,
        }
        connection.execute(
            "INSERT INTO meta VALUES ('result',?)",
            (json.dumps(aggregate, sort_keys=True, separators=(",", ":")),),
        )
        connection.commit()
        connection.close()
        connection = None
        stop_sampling.set()
        sampler.join(timeout=1)
        gate()
        elapsed = time.perf_counter() - started
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha8-s6-complete-agent-v1",
            "status": "PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA8_SOURCE6_COMPLETE_AGENT",
            "theorem": "Every exceptional-only threshold-14 first crossing with terminal alpha8 and source alpha6 has literal Q8>0.",
            "coverage": {
                "source_alpha": SOURCE_ALPHA,
                "terminal_alpha": TERMINAL_ALPHA,
                "total_alpha": 14,
                "terminal_type_indices": [TYPE_START, TYPE_STOP],
                "terminal_type_count": len(terminals),
                "gaps": 0,
                "overlaps": 0,
            },
            "lower_canonical_state_counts_by_alpha": {str(alpha): len(value) for alpha, value in enumerate(states)},
            "per_terminal_type": per_type,
            "aggregate": aggregate,
            "resources": {
                "workers": 1,
                "abort_limit_private_bytes": ABORT_LIMIT,
                "hard_limit_private_bytes": HARD_LIMIT,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "elapsed_seconds": elapsed,
            },
            "scope_warning": "Completes only terminal alpha8/source alpha6 (253 of 2,159 formerly remaining source/type cells); all other alpha8/9 cells and the broader proof dependencies remain.",
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
            f"raw={raw} checks={database_checks} products={database_products} "
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
            "status": "ABORTED_CLEANLY_RANK8_ALPHA8_SOURCE6_COMPLETE_AGENT_RESOURCE_GATE",
            "reason": str(error),
            "last_terminal_type_index": last_type,
            "peak_private_bytes": max(peak, private_bytes()),
            "scope_warning": "Resource checkpoint only; not a sign or forest obstruction.",
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        CHECKPOINT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        print(f"checkpoint_sha256={digest(CHECKPOINT)}")
        return 2
    except SignObstruction as error:
        payload = {
            "status": "EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA8_SOURCE6_COMPLETE_AGENT",
            "witness": error.witness,
            "scope_warning": "Exact product-jet obstruction in the stated source/type cell; no broader conclusion is asserted here.",
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        OBSTRUCTION.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        print(f"obstruction_sha256={digest(OBSTRUCTION)}")
        return 3
    finally:
        if connection is not None:
            connection.close()
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
