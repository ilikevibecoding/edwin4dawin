#!/usr/bin/env python3
"""Generic exact, config-pinned, resource-gated exceptional first-crossing shard producer."""

from __future__ import annotations

import csv
import json
import sqlite3
import sys
import threading
import time
from pathlib import Path

from probe_rank8_exceptional_first_crossing_alpha2_exact import RETAINED_RANK, multiply, private_bytes, q8
from probe_rank8_exceptional_first_crossing_alpha8_s6_complete_agent import digest, encode, prepare_database


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_agent_20260823.json"
DESIGN_AUDIT = ROOT / "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_independent_audit_agent_20260823.json"
HELPER = ROOT / "probe_rank8_exceptional_first_crossing_alpha8_s6_complete_agent.py"
RAW_COEFFICIENTS = {
    8: (1, 2, 5, 13, 39, 123, 431, 1625, 3609, 8937, 23147, 63379, 176560, 496731),
    9: (1, 2, 5, 13, 39, 123, 431, 1625, 3862, 9443, 24412, 66668, 186427, 527850),
}


class ResourceGate(RuntimeError):
    pass


class SignObstruction(RuntimeError):
    def __init__(self, witness: dict):
        super().__init__("nonpositive Q8 in configured exceptional first-crossing shard")
        self.witness = witness


def load_jets(terminal_alpha: int) -> tuple[tuple[tuple[int, tuple[int, ...]], ...], tuple[tuple[int, ...], ...]]:
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
    assert all(q8(polynomial) < 0 for polynomial in terminals)
    return lower, terminals


def load_config() -> tuple[Path, dict]:
    assert len(sys.argv) == 2, "usage: producer CONFIG.json"
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
    shard_index = int(config["design_shard_index"])
    type_start = int(config["terminal_type_index_start"])
    type_stop = int(config["terminal_type_index_stop"])
    relative_start = int(config["relative_terminal_type_start"])
    relative_stop = int(config["relative_terminal_type_stop"])
    expected_raw = int(config["expected_raw_multisets"])
    abort_limit = int(config["abort_limit_mib"]) * 1024**2
    hard_limit = int(config["hard_limit_mib"]) * 1024**2
    assert terminal_alpha in (8, 9) and terminal_alpha <= source_alpha <= 13
    assert 1 <= relative_start <= relative_stop
    assert 0 <= shard_index
    assert abort_limit < hard_limit <= 500 * 1024**2

    stem = f"rank8_exceptional_first_crossing_alpha{terminal_alpha}_s{source_alpha}_types{type_start}_{type_stop}"
    database = ROOT / f"{stem}_keys_exact_agent_20260823.sqlite3"
    output = ROOT / f"{stem}_shard_exact_agent_20260823.json"
    checkpoint = ROOT / f"{stem}_resource_checkpoint_agent_20260823.json"
    obstruction = ROOT / f"{stem}_obstruction_agent_20260823.json"
    status = (
        f"PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA{terminal_alpha}_SOURCE{source_alpha}_"
        f"TYPES{type_start}_{type_stop}_SHARD_AGENT"
    )
    started = time.perf_counter()
    peak = private_bytes()
    stop_sampling = threading.Event()
    connection: sqlite3.Connection | None = None
    last_type = type_start - 1

    def sample() -> None:
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, private_bytes())

    def gate() -> None:
        nonlocal peak
        peak = max(peak, private_bytes())
        if peak >= abort_limit:
            raise ResourceGate(f"producer reached {config['abort_limit_mib']} MiB gate: {peak}")

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        design = json.loads(DESIGN.read_text(encoding="utf-8"))
        design_audit = json.loads(DESIGN_AUDIT.read_text(encoding="utf-8"))
        assert design_audit["hashes"][DESIGN.name] == digest(DESIGN)
        cell = design["bands"][str(terminal_alpha)]["source_cells"][str(source_alpha)]
        shard = cell["shards"][shard_index]
        assert shard["terminal_type_index_start"] == type_start
        assert shard["terminal_type_index_stop"] == type_stop
        assert shard["relative_terminal_type_start"] == relative_start
        assert shard["relative_terminal_type_stop"] == relative_stop
        assert shard["raw_multiset_count"] == expected_raw
        assert shard["projection_below_abort_gate"] is True

        lower, terminals = load_jets(terminal_alpha)
        assert relative_stop <= len(terminals)
        raw_coefficients = RAW_COEFFICIENTS[terminal_alpha]
        identity = (1,) + (0,) * RETAINED_RANK
        states = [set() for _ in range(source_alpha + 1)]
        states[0].add(identity)
        for weight, component in lower:
            for alpha in range(weight, source_alpha + 1):
                for source in tuple(states[alpha - weight]):
                    states[alpha].add(multiply(source, component))
            gate()
        assert all(0 < len(states[alpha]) <= raw_coefficients[alpha] for alpha in range(source_alpha + 1))
        low = tuple(sorted(states[source_alpha]))
        bases = tuple(sorted(states[source_alpha - terminal_alpha]))

        connection = prepare_database(database)
        raw_total = checks = 0
        minimum = maximum = None
        per_type = []
        type_offset = 947 if terminal_alpha == 8 else 1200
        for relative in range(relative_start, relative_stop + 1):
            terminal = terminals[relative - 1]
            type_index = type_offset + relative
            last_type = type_index
            sources = set(low)
            sources.update(
                multiply(base, component)
                for component in terminals[:relative]
                for base in bases
            )
            ordered_sources = tuple(sorted(sources))
            key_batch = []
            product_batch = []
            type_min = type_max = None
            for source in ordered_sources:
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
                type_min = value if type_min is None else min(type_min, value)
                type_max = value if type_max is None else max(type_max, value)
                product_text = encode(product)
                key_batch.append((source_alpha, type_index, encode(source), product_text, str(value)))
                product_batch.append((source_alpha, product_text))
                if len(key_batch) == 2500:
                    connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)", key_batch)
                    connection.executemany("INSERT OR IGNORE INTO products VALUES (?,?)", product_batch)
                    key_batch.clear()
                    product_batch.clear()
                    gate()
            if key_batch:
                connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)", key_batch)
                connection.executemany("INSERT OR IGNORE INTO products VALUES (?,?)", product_batch)
            type_raw = raw_coefficients[source_alpha] + relative * raw_coefficients[source_alpha - terminal_alpha]
            raw_total += type_raw
            checks += len(ordered_sources)
            minimum = type_min if minimum is None else min(minimum, type_min)
            maximum = type_max if maximum is None else max(maximum, type_max)
            per_type.append(
                {
                    "terminal_type_index": type_index,
                    "terminal_relative_type": relative,
                    "raw_multisets": type_raw,
                    "canonical_checks": len(ordered_sources),
                    "minimum_Q8": type_min,
                    "maximum_Q8": type_max,
                }
            )
            connection.commit()
            gate()
            print(
                f"component={type_index}/{type_stop} raw={raw_total} checks={checks} "
                f"private_MiB={peak/1024**2:.3f} elapsed={time.perf_counter()-started:.3f}s",
                flush=True,
            )

        keys = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
        products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        assert raw_total == expected_raw and keys == checks and minimum is not None and minimum > 0
        aggregate = {
            "source_alpha": source_alpha,
            "terminal_alpha": terminal_alpha,
            "total_alpha": source_alpha + terminal_alpha,
            "terminal_type_index_start": type_start,
            "terminal_type_index_stop": type_stop,
            "terminal_type_count": type_stop - type_start + 1,
            "independently_counted_raw_multisets": raw_total,
            "canonical_check_keys": keys,
            "distinct_crossing_jets": products,
            "raw_to_canonical_compression": raw_total - keys,
            "canonical_key_to_product_collisions": keys - products,
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
            "schema": "rank8-exceptional-first-crossing-streaming-shard-exact-agent-v1",
            "status": status,
            "theorem": (
                f"Every exceptional-only first crossing with terminal alpha{terminal_alpha}, source alpha{source_alpha}, "
                f"and terminal type{type_start}..{type_stop} has literal Q8>0."
            ),
            "configuration": config,
            "coverage": {
                "source_alpha": source_alpha,
                "terminal_alpha": terminal_alpha,
                "total_alpha": source_alpha + terminal_alpha,
                "terminal_type_indices": [type_start, type_stop],
                "relative_terminal_type_indices": [relative_start, relative_stop],
                "terminal_type_count": type_stop - type_start + 1,
                "gaps_within_shard": 0,
                "overlaps_within_shard": 0,
            },
            "lower_canonical_state_counts_by_alpha": {str(alpha): len(value) for alpha, value in enumerate(states)},
            "per_terminal_type": per_type,
            "aggregate": aggregate,
            "resources": {
                "workers": 1,
                "abort_limit_private_bytes": abort_limit,
                "hard_limit_private_bytes": hard_limit,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "elapsed_seconds": elapsed,
            },
            "scope_warning": "Completes only the configured finite shard; all other open cells and broader dependencies remain.",
            "hashes": {
                JETS.name: digest(JETS),
                CLASSIFICATION.name: digest(CLASSIFICATION),
                DESIGN.name: digest(DESIGN),
                DESIGN_AUDIT.name: digest(DESIGN_AUDIT),
                HELPER.name: digest(HELPER),
                config_path.name: digest(config_path),
                database.name: digest(database),
                Path(__file__).name: digest(Path(__file__)),
            },
        }
        output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        checkpoint.unlink(missing_ok=True)
        obstruction.unlink(missing_ok=True)
        print(status)
        print(f"raw={raw_total} keys={keys} products={products} neg=0 zero=0 min_Q8={minimum} max_Q8={maximum}")
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"database_sha256={digest(database)}")
        print(f"report_sha256={digest(output)}")
        return 0
    except ResourceGate as error:
        stop_sampling.set()
        sampler.join(timeout=1)
        payload = {
            "status": "ABORTED_CLEANLY_RANK8_STREAMING_SHARD_AGENT_RESOURCE_GATE",
            "reason": str(error),
            "configuration": config,
            "last_terminal_type_index": last_type,
            "peak_private_bytes": max(peak, private_bytes()),
            "scope_warning": "Resource checkpoint only; not a sign or forest obstruction.",
            "hashes": {config_path.name: digest(config_path), Path(__file__).name: digest(Path(__file__))},
        }
        checkpoint.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        return 2
    except SignObstruction as error:
        payload = {
            "status": "EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_STREAMING_SHARD_AGENT",
            "configuration": config,
            "witness": error.witness,
            "scope_warning": "Exact product-jet obstruction in the configured shard; no broader conclusion is asserted.",
            "hashes": {config_path.name: digest(config_path), Path(__file__).name: digest(Path(__file__))},
        }
        obstruction.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        return 3
    finally:
        if connection is not None:
            connection.close()
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
