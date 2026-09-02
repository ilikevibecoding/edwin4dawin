#!/usr/bin/env python3
"""Exact resource-gated producer for alpha8/source8 terminal types1097..1200."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path

import probe_rank8_exceptional_first_crossing_alpha8_s8_types948_1096_shard_agent as common


ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_keys_exact_agent_20260823.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_shard_exact_agent_20260823.json"
CHECKPOINT = ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_resource_checkpoint_agent_20260823.json"
OBSTRUCTION = ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_obstruction_agent_20260823.json"
COMMON = Path(common.__file__).resolve()

SOURCE_ALPHA = 8
TERMINAL_ALPHA = 8
TYPE_START = 1097
TYPE_STOP = 1200
RELATIVE_START = 150
RELATIVE_STOP = 253
EXPECTED_RAW = 396_292
ABORT_LIMIT = 384 * 1024**2
HARD_LIMIT = 448 * 1024**2


def main() -> int:
    started = time.perf_counter()
    peak = common.private_bytes()
    stop_sampling = threading.Event()
    connection: sqlite3.Connection | None = None
    last_type = TYPE_START - 1

    def sample() -> None:
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, common.private_bytes())

    def gate() -> None:
        nonlocal peak
        peak = max(peak, common.private_bytes())
        if peak >= ABORT_LIMIT:
            raise common.ResourceGate(f"producer reached 384 MiB gate: {peak}")

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        design = json.loads(common.DESIGN.read_text(encoding="utf-8"))
        design_audit = json.loads(common.DESIGN_AUDIT.read_text(encoding="utf-8"))
        assert design_audit["hashes"][common.DESIGN.name] == common.digest(common.DESIGN)
        cell = design["bands"]["8"]["source_cells"][str(SOURCE_ALPHA)]
        shard = cell["shards"][1]
        assert cell["terminal_type_indices"] == [948, 1200]
        assert shard["terminal_type_index_start"] == TYPE_START
        assert shard["terminal_type_index_stop"] == TYPE_STOP
        assert shard["relative_terminal_type_start"] == RELATIVE_START
        assert shard["relative_terminal_type_stop"] == RELATIVE_STOP
        assert shard["raw_multiset_count"] == EXPECTED_RAW
        assert shard["projection_below_abort_gate"] is True
        assert ABORT_LIMIT < HARD_LIMIT

        lower, terminals = common.load_jets()
        identity = (1,) + (0,) * common.RETAINED_RANK
        states = [set() for _ in range(SOURCE_ALPHA + 1)]
        states[0].add(identity)
        for weight, component in lower:
            for alpha in range(weight, SOURCE_ALPHA + 1):
                for source in tuple(states[alpha - weight]):
                    states[alpha].add(common.multiply(source, component))
            gate()
        assert all(
            0 < len(states[alpha]) <= common.RAW_COEFFICIENTS[alpha]
            for alpha in range(SOURCE_ALPHA + 1)
        )
        low = tuple(sorted(states[SOURCE_ALPHA]))
        bases = tuple(sorted(states[0]))

        connection = common.prepare_database(DATABASE)
        raw_total = checks = 0
        minimum = maximum = None
        per_type = []
        for relative in range(RELATIVE_START, RELATIVE_STOP + 1):
            terminal = terminals[relative - 1]
            type_index = 947 + relative
            last_type = type_index
            sources = set(low)
            sources.update(
                common.multiply(base, component)
                for component in terminals[:relative]
                for base in bases
            )
            ordered_sources = tuple(sorted(sources))
            key_batch = []
            product_batch = []
            type_min = type_max = None
            for source in ordered_sources:
                product = common.multiply(source, terminal)
                value = common.q8(product)
                if value <= 0:
                    raise common.SignObstruction(
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
                product_text = common.encode(product)
                key_batch.append((SOURCE_ALPHA, type_index, common.encode(source), product_text, str(value)))
                product_batch.append((SOURCE_ALPHA, product_text))
                if len(key_batch) == 2500:
                    connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)", key_batch)
                    connection.executemany("INSERT OR IGNORE INTO products VALUES (?,?)", product_batch)
                    key_batch.clear()
                    product_batch.clear()
                    gate()
            if key_batch:
                connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)", key_batch)
                connection.executemany("INSERT OR IGNORE INTO products VALUES (?,?)", product_batch)
            type_raw = common.RAW_COEFFICIENTS[SOURCE_ALPHA] + relative * common.RAW_COEFFICIENTS[0]
            raw_total += type_raw
            checks += len(ordered_sources)
            minimum = type_min if minimum is None else min(minimum, type_min)
            maximum = type_max if maximum is None else max(maximum, type_max)
            per_type.append(
                {
                    "terminal_type_index": type_index,
                    "terminal_relative_alpha8_type": relative,
                    "raw_multisets": type_raw,
                    "canonical_checks": len(ordered_sources),
                    "minimum_Q8": type_min,
                    "maximum_Q8": type_max,
                }
            )
            if type_index % 25 == 0 or type_index == TYPE_STOP:
                connection.commit()
                gate()
                print(
                    f"component={type_index}/{TYPE_STOP} raw={raw_total} checks={checks} "
                    f"private_MiB={peak/1024**2:.3f} elapsed={time.perf_counter()-started:.3f}s",
                    flush=True,
                )

        connection.commit()
        keys = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
        products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        assert raw_total == EXPECTED_RAW and keys == checks and minimum is not None and minimum > 0
        aggregate = {
            "source_alpha": SOURCE_ALPHA,
            "terminal_alpha": TERMINAL_ALPHA,
            "total_alpha": SOURCE_ALPHA + TERMINAL_ALPHA,
            "terminal_type_index_start": TYPE_START,
            "terminal_type_index_stop": TYPE_STOP,
            "terminal_type_count": TYPE_STOP - TYPE_START + 1,
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
            "schema": "rank8-exceptional-first-crossing-alpha8-s8-types1097-1200-shard-agent-v1",
            "status": "PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA8_SOURCE8_TYPES1097_1200_SHARD_AGENT",
            "theorem": "Every exceptional-only first crossing with terminal alpha8/source alpha8/type1097..1200 has literal Q8>0.",
            "coverage": {
                "source_alpha": SOURCE_ALPHA,
                "terminal_alpha": TERMINAL_ALPHA,
                "total_alpha": SOURCE_ALPHA + TERMINAL_ALPHA,
                "terminal_type_indices": [TYPE_START, TYPE_STOP],
                "relative_terminal_type_indices": [RELATIVE_START, RELATIVE_STOP],
                "terminal_type_count": TYPE_STOP - TYPE_START + 1,
                "gaps_within_shard": 0,
                "overlaps_within_shard": 0,
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
            "scope_warning": "Completes only the second alpha8/source8 shard; union certification and all other open cells remain.",
            "hashes": {
                common.JETS.name: common.digest(common.JETS),
                common.CLASSIFICATION.name: common.digest(common.CLASSIFICATION),
                common.DESIGN.name: common.digest(common.DESIGN),
                common.DESIGN_AUDIT.name: common.digest(common.DESIGN_AUDIT),
                COMMON.name: common.digest(COMMON),
                DATABASE.name: common.digest(DATABASE),
                Path(__file__).name: common.digest(Path(__file__)),
            },
        }
        OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        CHECKPOINT.unlink(missing_ok=True)
        OBSTRUCTION.unlink(missing_ok=True)
        print(payload["status"])
        print(f"raw={raw_total} keys={keys} products={products} neg=0 zero=0 min_Q8={minimum} max_Q8={maximum}")
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"database_sha256={common.digest(DATABASE)}")
        print(f"report_sha256={common.digest(OUTPUT)}")
        return 0
    except common.ResourceGate as error:
        stop_sampling.set()
        sampler.join(timeout=1)
        payload = {
            "status": "ABORTED_CLEANLY_RANK8_ALPHA8_SOURCE8_TYPES1097_1200_AGENT_RESOURCE_GATE",
            "reason": str(error),
            "last_terminal_type_index": last_type,
            "peak_private_bytes": max(peak, common.private_bytes()),
            "scope_warning": "Resource checkpoint only; not a sign or forest obstruction.",
            "hashes": {Path(__file__).name: common.digest(Path(__file__))},
        }
        CHECKPOINT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        return 2
    except common.SignObstruction as error:
        payload = {
            "status": "EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA8_SOURCE8_TYPES1097_1200_AGENT",
            "witness": error.witness,
            "scope_warning": "Exact product-jet obstruction in the stated shard; no broader conclusion is asserted.",
            "hashes": {Path(__file__).name: common.digest(Path(__file__))},
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
