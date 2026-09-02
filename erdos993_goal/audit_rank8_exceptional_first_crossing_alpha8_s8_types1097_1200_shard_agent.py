#!/usr/bin/env python3
"""Independent raw-multiplicity audit of alpha8/source8/types1097..1200."""

from __future__ import annotations

import json
import sqlite3
import tempfile
import threading
import time
from pathlib import Path

import audit_rank8_exceptional_first_crossing_alpha8_s8_types948_1096_shard_agent as common


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_shard_agent.py"
REPORT = ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_shard_exact_agent_20260823.json"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_keys_exact_agent_20260823.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_shard_independent_audit_agent_20260823.json"
CHECKPOINT = ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_audit_resource_checkpoint_agent_20260823.json"
OBSTRUCTION = ROOT / "rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_audit_obstruction_agent_20260823.json"
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

    def sample() -> None:
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, common.private_bytes())

    def gate() -> None:
        nonlocal peak
        peak = max(peak, common.private_bytes())
        if peak >= ABORT_LIMIT:
            raise common.ResourceGate(f"audit reached 384 MiB gate: {peak}")

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    database_hash = common.digest(DATABASE)
    try:
        report = json.loads(REPORT.read_text(encoding="utf-8"))
        assert report["status"] == "PASS_EXACT_RESOURCE_GATED_NO_GAP_RANK8_ALPHA8_SOURCE8_TYPES1097_1200_SHARD_AGENT"
        assert report["hashes"][DATABASE.name] == database_hash
        lower, terminals = common.load_jets()
        states = common.raw_states(lower)
        gate()

        raw = 0
        minimum = maximum = None
        with tempfile.TemporaryDirectory(prefix="rank8_alpha8_s8_1097_1200_audit_agent_") as temporary:
            connection = common.prepare_database(Path(temporary) / "independent.sqlite3")
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

            for relative in range(RELATIVE_START, RELATIVE_STOP + 1):
                terminal = terminals[relative - 1]
                type_index = 947 + relative
                raw_sources = list(states[SOURCE_ALPHA])
                for component in terminals[:relative]:
                    raw_sources.extend(
                        common.multiply(base, component)
                        for base in states[SOURCE_ALPHA - TERMINAL_ALPHA]
                    )
                expected_type_raw = common.RAW_COEFFICIENTS[SOURCE_ALPHA] + relative * common.RAW_COEFFICIENTS[0]
                assert len(raw_sources) == expected_type_raw
                for source in raw_sources:
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
                    raw += 1
                    minimum = value if minimum is None else min(minimum, value)
                    maximum = value if maximum is None else max(maximum, value)
                    batch.append((SOURCE_ALPHA, type_index, common.encode(source), common.encode(product), str(value)))
                    if len(batch) == 2500:
                        flush()
                if type_index % 25 == 0 or type_index == TYPE_STOP:
                    flush()
                    connection.commit()
                    gate()
                    print(
                        f"audit-component={type_index}/{TYPE_STOP} raw={raw} "
                        f"private_MiB={peak/1024**2:.3f} elapsed={time.perf_counter()-started:.3f}s",
                        flush=True,
                    )
            flush()
            connection.commit()
            connection.execute("INSERT OR IGNORE INTO products SELECT source_alpha,product FROM keys")
            connection.commit()
            keys = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
            products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
            multiplicity = connection.execute("SELECT SUM(multiplicity) FROM keys").fetchone()[0]
            connection.execute("ATTACH DATABASE ? AS recurrence", (str(DATABASE.resolve()),))
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
        assert raw == multiplicity == EXPECTED_RAW == aggregate["independently_counted_raw_multisets"]
        assert keys == aggregate["canonical_check_keys"]
        assert products == aggregate["distinct_crossing_jets"]
        assert raw - keys == aggregate["raw_to_canonical_compression"]
        assert keys - products == aggregate["canonical_key_to_product_collisions"]
        assert minimum == aggregate["minimum_Q8"] > 0 and maximum == aggregate["maximum_Q8"]
        assert aggregate["negative_Q8"] == aggregate["zero_Q8"] == 0
        assert common.digest(DATABASE) == database_hash

        stop_sampling.set()
        sampler.join(timeout=1)
        gate()
        elapsed = time.perf_counter() - started
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha8-s8-types1097-1200-shard-independent-audit-agent-v1",
            "status": "PASS_INDEPENDENT_BIDIRECTIONAL_NO_GAP_RANK8_ALPHA8_SOURCE8_TYPES1097_1200_SHARD_AUDIT_AGENT",
            "method": (
                "independent list-valued unbounded-knapsack DP for all lower-band raw multisets; "
                "explicit ordered alpha8 terminal-prefix insertion; exact local Q8; both SQLite "
                "EXCEPT directions for keys and products"
            ),
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
                "abort_limit_private_bytes": ABORT_LIMIT,
                "hard_limit_private_bytes": HARD_LIMIT,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "elapsed_seconds": elapsed,
            },
            "scope_warning": "Independent audit only for the second alpha8/source8 shard; union certification and all other open cells remain.",
            "hashes": {
                REPORT.name: common.digest(REPORT),
                DATABASE.name: common.digest(DATABASE),
                SOURCE.name: common.digest(SOURCE),
                common.JETS.name: common.digest(common.JETS),
                common.CLASSIFICATION.name: common.digest(common.CLASSIFICATION),
                COMMON.name: common.digest(COMMON),
                Path(__file__).name: common.digest(Path(__file__)),
            },
        }
        OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        CHECKPOINT.unlink(missing_ok=True)
        OBSTRUCTION.unlink(missing_ok=True)
        print(payload["status"])
        print(f"raw={raw} keys={keys} products={products} neg=0 zero=0 min_Q8={minimum} max_Q8={maximum}")
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"audit_sha256={common.digest(OUTPUT)}")
        return 0
    except common.ResourceGate as error:
        stop_sampling.set()
        sampler.join(timeout=1)
        payload = {
            "status": "ABORTED_CLEANLY_RANK8_ALPHA8_SOURCE8_TYPES1097_1200_AUDIT_AGENT_RESOURCE_GATE",
            "reason": str(error),
            "peak_private_bytes": max(peak, common.private_bytes()),
            "scope_warning": "Resource checkpoint only; not a sign or forest obstruction.",
            "hashes": {Path(__file__).name: common.digest(Path(__file__))},
        }
        CHECKPOINT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        return 2
    except common.SignObstruction as error:
        payload = {
            "status": "EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA8_SOURCE8_TYPES1097_1200_AUDIT_AGENT",
            "witness": error.witness,
            "scope_warning": "Exact independent product-jet obstruction in the stated shard; no broader conclusion is asserted.",
            "hashes": {Path(__file__).name: common.digest(Path(__file__))},
        }
        OBSTRUCTION.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(payload["status"])
        return 3
    finally:
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
