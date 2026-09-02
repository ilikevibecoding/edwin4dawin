#!/usr/bin/env python3
"""Independent exponent/multiplicity audit of an alpha7/source8 shard."""

from __future__ import annotations

import argparse
import json
import sqlite3
import tempfile
import threading
import time
from pathlib import Path

from audit_rank8_exceptional_first_crossing_alpha4 import encode, multiply
from audit_rank8_exceptional_first_crossing_alpha7_s7_shard import digest, load_jets, prepare_database, q8
from probe_rank8_exceptional_first_crossing_alpha2_exact import LIMIT, private_bytes


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha7_s8_shard_exact.py"
DEPENDENCY = ROOT / "audit_rank8_exceptional_first_crossing_alpha7_s7_shard.py"
TYPE_START_ALL = 248
SOURCE_ALPHA = 8
TERMINAL_ALPHA = 7
ABORT_LIMIT = 448 * 1024**2


class ResourceGate(RuntimeError): pass


class SignObstruction(RuntimeError):
    def __init__(self, witness):
        super().__init__("nonpositive Q8 in independent alpha7/source8 audit")
        self.witness = witness


def paths(start, stop):
    stem = f"rank8_exceptional_first_crossing_alpha7_s8_types{start}_{stop}"
    return ROOT / f"{stem}_exact_20260820.json", ROOT / f"{stem}_keys_exact_20260820.sqlite3", ROOT / f"{stem}_audit_exact_20260820.json", ROOT / f"{stem}_audit_resource_checkpoint_20260820.json", ROOT / f"{stem}_audit_obstruction_20260820.json"


def raw_lower_products(lower):
    identity = (1,) + (0,) * 9
    states = [[] for _ in range(SOURCE_ALPHA + 1)]
    states[0].append(identity)
    for weight, component in lower:
        for alpha in range(weight, SOURCE_ALPHA + 1):
            states[alpha].extend(multiply(source, component) for source in tuple(states[alpha - weight]))
    assert len(states[8]) == 2209 and len(states[1]) == 2
    return states


def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("start", type=int); parser.add_argument("stop", type=int); args = parser.parse_args()
    start, stop = args.start, args.stop
    report_path, database, output, checkpoint, obstruction = paths(start, stop)
    started = time.perf_counter(); peak = private_bytes(); stop_sampling = threading.Event()
    def sample():
        nonlocal peak
        while not stop_sampling.wait(0.01): peak = max(peak, private_bytes())
    def gate():
        nonlocal peak
        peak = max(peak, private_bytes())
        if peak >= ABORT_LIMIT: raise ResourceGate(f"audit reached 448 MiB gate: {peak}")
    sampler = threading.Thread(target=sample, daemon=True); sampler.start()
    recurrence_hash = digest(database)
    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
        assert report["status"] == "PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA7_SOURCE8_SHARD"
        assert report["scope"]["terminal_type_index_start"] == start and report["scope"]["terminal_type_index_stop"] == stop
        assert report["resources"]["peak_private_bytes"] < ABORT_LIMIT and report["hashes"][database.name] == recurrence_hash
        jets = load_jets(); lower = tuple(row for row in jets if row[0] < TERMINAL_ALPHA); terminals = tuple(polynomial for alpha, polynomial in jets if alpha == TERMINAL_ALPHA)
        raw_states = raw_lower_products(lower); lower8 = tuple(raw_states[8]); lower1 = tuple(raw_states[1])
        with tempfile.TemporaryDirectory(prefix="rank8_alpha7_s8_audit_") as temporary:
            connection = prepare_database(Path(temporary) / "independent.sqlite3")
            raw = 0; minimum = maximum = None; batch = []
            def flush():
                if not batch: return
                connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?,1) ON CONFLICT(source_alpha,largest_type,source,product,q8) DO UPDATE SET multiplicity=multiplicity+1", batch)
                batch.clear(); gate()
            def record(source, terminal, type_index):
                nonlocal raw, minimum, maximum
                product = multiply(source, terminal); value = q8(product)
                if value <= 0: raise SignObstruction({"classification": "zero_Q8" if value == 0 else "negative_Q8", "source_alpha": 8, "terminal_alpha": 7, "terminal_type_index": type_index, "source_i0_through_i9": list(source), "terminal_i0_through_i9": list(terminal), "product_i0_through_i9": list(product), "Q8": value})
                raw += 1; minimum = value if minimum is None else min(minimum, value); maximum = value if maximum is None else max(maximum, value)
                batch.append((8, type_index, encode(source), encode(product), str(value)))
                if len(batch) == 2500: flush()
            for type_index in range(start, stop + 1):
                relative = type_index - TYPE_START_ALL + 1; terminal = terminals[relative - 1]
                for source in lower8: record(source, terminal, type_index)
                for component in terminals[:relative]:
                    for base in lower1: record(multiply(base, component), terminal, type_index)
                if type_index % 50 == 0 or type_index == stop:
                    flush(); connection.commit(); gate(); print(f"audit-component={type_index}/{stop} raw={raw} private_MiB={peak/1024**2:.3f} elapsed={time.perf_counter()-started:.3f}s", flush=True)
            flush(); connection.commit(); connection.execute("INSERT OR IGNORE INTO products SELECT source_alpha,product FROM keys"); connection.commit()
            canonical = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]; products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
            connection.execute("ATTACH DATABASE ? AS recurrence", (str(database.resolve()),)); columns = "source_alpha,largest_type,source,product,q8"
            assert connection.execute(f"SELECT {columns} FROM keys EXCEPT SELECT {columns} FROM recurrence.keys LIMIT 1").fetchone() is None
            assert connection.execute(f"SELECT {columns} FROM recurrence.keys EXCEPT SELECT {columns} FROM keys LIMIT 1").fetchone() is None
            assert connection.execute("SELECT source_alpha,product FROM products EXCEPT SELECT source_alpha,product FROM recurrence.products LIMIT 1").fetchone() is None
            assert connection.execute("SELECT source_alpha,product FROM recurrence.products EXCEPT SELECT source_alpha,product FROM products LIMIT 1").fetchone() is None
            connection.execute("DETACH DATABASE recurrence"); connection.close()
        assert digest(database) == recurrence_hash
        row = report["aggregate"]
        assert raw == row["independently_counted_raw_multisets"] and canonical == row["canonical_check_keys"] and products == row["distinct_crossing_jets"]
        assert raw - canonical == row["raw_to_canonical_compression"] and canonical - products == row["canonical_key_to_product_collisions"]
        assert row["negative_Q8"] == row["zero_Q8"] == 0 and minimum == row["minimum_Q8"] and maximum == row["maximum_Q8"]
        stop_sampling.set(); sampler.join(timeout=1); gate(); elapsed = time.perf_counter() - started
        payload = {"schema": "rank8-exceptional-first-crossing-alpha7-s8-shard-audit-v1", "status": "PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA7_SOURCE8_SHARD_AUDIT", "method": "independent list-valued lower exponent DP for 2209 alpha8 and 2 alpha1 multisets, prefix alpha7 convolution, then both SQLite EXCEPT directions for keys and products", "shard": {"source_alpha": 8, "terminal_alpha": 7, "terminal_type_index_start": start, "terminal_type_index_stop": stop, "independently_enumerated_multisets": raw, "canonical_check_keys": canonical, "distinct_crossing_jets": products, "raw_to_canonical_compression": raw-canonical, "canonical_key_to_product_collisions": canonical-products, "negative_Q8": 0, "zero_Q8": 0, "minimum_Q8": minimum, "maximum_Q8": maximum}, "resources": {"workers": 1, "abort_limit_private_bytes": ABORT_LIMIT, "hard_limit_private_bytes": LIMIT, "peak_private_bytes": peak, "peak_private_MiB": peak/1024**2, "elapsed_seconds": elapsed}, "scope_warning": "Independent audit only for this source-alpha8 terminal-alpha7 block.", "hashes": {report_path.name: digest(report_path), database.name: digest(database), SOURCE.name: digest(SOURCE), DEPENDENCY.name: digest(DEPENDENCY), JETS.name: digest(JETS), CLASSIFICATION.name: digest(CLASSIFICATION), Path(__file__).name: digest(Path(__file__))}}
        output.write_text(json.dumps(payload, indent=2, sort_keys=True)+"\n", encoding="utf-8")
        if checkpoint.exists(): checkpoint.unlink()
        if obstruction.exists(): obstruction.unlink()
        print(payload["status"]); print(f"raw={raw} keys={canonical} products={products} neg=0 zero=0 min_Q8={minimum} max_Q8={maximum}"); print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}"); print(f"audit_sha256={digest(output)}")
        return 0
    except ResourceGate as error:
        stop_sampling.set(); sampler.join(timeout=1); payload={"status":"ABORTED_CLEANLY_RANK8_ALPHA7_SOURCE8_SHARD_AUDIT_RESOURCE_GATE","reason":str(error),"peak_private_bytes":max(peak,private_bytes()),"scope_warning":"Resource checkpoint only; not a sign or forest obstruction.","hashes":{Path(__file__).name:digest(Path(__file__))}}; checkpoint.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8"); print(payload["status"]); print(f"checkpoint_sha256={digest(checkpoint)}"); return 2
    except SignObstruction as error:
        payload={"status":"EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA7_SOURCE8_SHARD_AUDIT","witness":error.witness,"scope_warning":"Exact audit obstruction only for this shard.","hashes":{Path(__file__).name:digest(Path(__file__))}}; obstruction.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8"); print(payload["status"]); print(f"obstruction_sha256={digest(obstruction)}"); return 3
    finally:
        stop_sampling.set(); sampler.join(timeout=1)


if __name__ == "__main__": raise SystemExit(main())
