#!/usr/bin/env python3
"""Exact resource-gated terminal-alpha7/source8 type-block producer."""

from __future__ import annotations

import argparse
import json
import threading
import time
from pathlib import Path

from probe_rank8_exceptional_first_crossing_alpha2_exact import LIMIT, RETAINED_RANK, digest, multiply, private_bytes, q8
from probe_rank8_exceptional_first_crossing_alpha7_s7_shard_exact import encode, load_jets, prepare_database


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha7_streaming_design_exact_20260820.json"
DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha7_s7_shard_exact.py"
SOURCE_ALPHA = 8
TERMINAL_ALPHA = 7
TYPE_START_ALL = 248
ABORT_LIMIT = 448 * 1024**2


class ResourceGate(RuntimeError):
    pass


class SignObstruction(RuntimeError):
    def __init__(self, witness):
        super().__init__("nonpositive exact Q8 in terminal-alpha7/source8 shard")
        self.witness = witness


def paths(start, stop):
    stem = f"rank8_exceptional_first_crossing_alpha7_s8_types{start}_{stop}"
    return (
        ROOT / f"{stem}_keys_exact_20260820.sqlite3",
        ROOT / f"{stem}_exact_20260820.json",
        ROOT / f"{stem}_resource_checkpoint_20260820.json",
        ROOT / f"{stem}_obstruction_20260820.json",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("start", type=int)
    parser.add_argument("stop", type=int)
    args = parser.parse_args()
    start, stop = args.start, args.stop
    database, output, checkpoint, obstruction = paths(start, stop)
    started = time.perf_counter()
    peak = private_bytes()
    stop_sampling = threading.Event()
    connection = None
    last_type = start - 1

    def sample():
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, private_bytes())

    def gate():
        nonlocal peak
        peak = max(peak, private_bytes())
        if peak >= ABORT_LIMIT:
            raise ResourceGate(f"producer reached 448 MiB gate: {peak}")

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        design = json.loads(DESIGN.read_text(encoding="utf-8"))
        assert design["status"].startswith("PASS_EXACT_NO_GAP_RESOURCE_DESIGN")
        shard = next(
            candidate for candidate in design["exact_counts"]["source_cells"][str(SOURCE_ALPHA)]["shards"]
            if candidate["terminal_type_index_start"] == start and candidate["terminal_type_index_stop"] == stop
        )
        assert shard["projected_peak_private_bytes"] < ABORT_LIMIT < LIMIT
        expected_raw = int(shard["raw_multiset_count"])
        jets = load_jets()
        lower = tuple(row for row in jets if row[0] < TERMINAL_ALPHA)
        terminals = tuple(polynomial for alpha, polynomial in jets if alpha == TERMINAL_ALPHA)
        assert len(lower) == 247 and len(terminals) == 700

        identity = (1,) + (0,) * RETAINED_RANK
        states = [set() for _ in range(SOURCE_ALPHA + 1)]
        states[0].add(identity)
        for weight, component in lower:
            for alpha in range(weight, SOURCE_ALPHA + 1):
                for source in tuple(states[alpha - weight]):
                    states[alpha].add(multiply(source, component))
            gate()
        lower_sources = frozenset(states[SOURCE_ALPHA])
        lower_bases = frozenset(states[SOURCE_ALPHA - TERMINAL_ALPHA])
        assert len(lower_sources) <= 2209 and len(lower_bases) == 2

        connection = prepare_database(database)
        checks = 0
        minimum = maximum = None
        per_type = []
        for type_index in range(start, stop + 1):
            last_type = type_index
            relative = type_index - TYPE_START_ALL + 1
            terminal = terminals[relative - 1]
            sources = set(lower_sources)
            sources.update(multiply(base, component) for component in terminals[:relative] for base in lower_bases)
            batch_keys = []
            batch_products = []
            type_min = type_max = None
            for source in sources:
                product = multiply(source, terminal)
                value = q8(product)
                if value <= 0:
                    raise SignObstruction({
                        "classification": "zero_Q8" if value == 0 else "negative_Q8",
                        "source_alpha": SOURCE_ALPHA, "terminal_alpha": TERMINAL_ALPHA,
                        "total_alpha": SOURCE_ALPHA + TERMINAL_ALPHA,
                        "terminal_type_index": type_index,
                        "source_i0_through_i9": list(source), "terminal_i0_through_i9": list(terminal),
                        "product_i0_through_i9": list(product), "Q8": value,
                    })
                type_min = value if type_min is None else min(type_min, value)
                type_max = value if type_max is None else max(type_max, value)
                product_text = encode(product)
                batch_keys.append((SOURCE_ALPHA, type_index, encode(source), product_text, str(value)))
                batch_products.append((SOURCE_ALPHA, product_text))
                if len(batch_keys) == 2500:
                    connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)", batch_keys)
                    connection.executemany("INSERT OR IGNORE INTO products VALUES (?,?)", batch_products)
                    batch_keys.clear(); batch_products.clear(); gate()
            if batch_keys:
                connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)", batch_keys)
                connection.executemany("INSERT OR IGNORE INTO products VALUES (?,?)", batch_products)
            type_checks = len(sources)
            checks += type_checks
            minimum = type_min if minimum is None else min(minimum, type_min)
            maximum = type_max if maximum is None else max(maximum, type_max)
            per_type.append({
                "terminal_type_index": type_index,
                "terminal_relative_alpha7_type": relative,
                "raw_multisets": 2209 + 2 * relative,
                "canonical_checks": type_checks,
                "negative_Q8": 0, "zero_Q8": 0,
                "minimum_Q8": type_min, "maximum_Q8": type_max,
            })
            if type_index % 50 == 0 or type_index == stop:
                connection.commit(); gate()
                print(f"component={type_index}/{stop} checks={checks} private_MiB={peak/1024**2:.3f} elapsed={time.perf_counter()-started:.3f}s", flush=True)

        connection.commit()
        database_checks = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
        database_products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        assert database_checks == checks and minimum is not None and minimum > 0
        raw = sum(row["raw_multisets"] for row in per_type)
        assert raw == expected_raw
        aggregate = {
            "source_alpha": SOURCE_ALPHA, "terminal_alpha": TERMINAL_ALPHA,
            "total_alpha": SOURCE_ALPHA + TERMINAL_ALPHA,
            "terminal_type_index_start": start, "terminal_type_index_stop": stop,
            "terminal_type_count": len(per_type),
            "independently_counted_raw_multisets": raw,
            "canonical_check_keys": database_checks,
            "distinct_crossing_jets": database_products,
            "raw_to_canonical_compression": raw - database_checks,
            "canonical_key_to_product_collisions": database_checks - database_products,
            "negative_Q8": 0, "zero_Q8": 0,
            "minimum_Q8": minimum, "maximum_Q8": maximum,
        }
        connection.execute("INSERT INTO meta VALUES ('result',?)", (json.dumps(aggregate, sort_keys=True, separators=(",", ":")),))
        connection.commit(); connection.close(); connection = None
        stop_sampling.set(); sampler.join(timeout=1); gate()
        elapsed = time.perf_counter() - started
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha7-s8-shard-v1",
            "status": "PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA7_SOURCE8_SHARD",
            "scope": {"source_alpha": 8, "terminal_alpha": 7, "total_alpha": 15, "terminal_type_index_start": start, "terminal_type_index_stop": stop, "workers": 1},
            "lower_canonical_state_counts_by_alpha": {str(alpha): len(values) for alpha, values in enumerate(states)},
            "per_terminal_type": per_type,
            "aggregate": aggregate,
            "resources": {"workers": 1, "abort_limit_private_bytes": ABORT_LIMIT, "hard_limit_private_bytes": LIMIT, "design_projected_peak_private_bytes": shard["projected_peak_private_bytes"], "peak_private_bytes": peak, "peak_private_MiB": peak / 1024**2, "elapsed_seconds": elapsed},
            "scope_warning": "Only this source-alpha8 terminal-alpha7 type block is certified.",
            "hashes": {JETS.name: digest(JETS), CLASSIFICATION.name: digest(CLASSIFICATION), DESIGN.name: digest(DESIGN), DEPENDENCY.name: digest(DEPENDENCY), database.name: digest(database), Path(__file__).name: digest(Path(__file__))},
        }
        output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        if checkpoint.exists(): checkpoint.unlink()
        if obstruction.exists(): obstruction.unlink()
        print(payload["status"])
        print(f"raw={raw} checks={database_checks} products={database_products} neg=0 zero=0 min_Q8={minimum} max_Q8={maximum}")
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"database_sha256={digest(database)}")
        print(f"report_sha256={digest(output)}")
        return 0
    except ResourceGate as error:
        stop_sampling.set(); sampler.join(timeout=1)
        payload = {"status": "ABORTED_CLEANLY_RANK8_ALPHA7_SOURCE8_SHARD_RESOURCE_GATE", "reason": str(error), "terminal_type_index_start": start, "terminal_type_index_stop": stop, "last_terminal_type_index": last_type, "peak_private_bytes": max(peak, private_bytes()), "scope_warning": "Resource checkpoint only; not a sign or forest obstruction.", "hashes": {Path(__file__).name: digest(Path(__file__))}}
        checkpoint.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"]); print(f"checkpoint_sha256={digest(checkpoint)}")
        return 2
    except SignObstruction as error:
        payload = {"status": "EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA7_SOURCE8_SHARD", "terminal_type_index_start": start, "terminal_type_index_stop": stop, "witness": error.witness, "scope_warning": "Exact obstruction only in this exceptional first-crossing shard.", "hashes": {Path(__file__).name: digest(Path(__file__))}}
        obstruction.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"]); print(f"obstruction_sha256={digest(obstruction)}")
        return 3
    finally:
        if connection is not None: connection.close()
        stop_sampling.set(); sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
