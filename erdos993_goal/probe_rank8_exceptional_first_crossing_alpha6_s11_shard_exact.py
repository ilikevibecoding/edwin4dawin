#!/usr/bin/env python3
"""Exact source-alpha11 alpha6 first-crossing shard, selected by sealed range."""

from __future__ import annotations

import argparse, csv, json, sqlite3, threading, time
from pathlib import Path

from probe_rank8_exceptional_first_crossing_alpha2_exact import (
    LIMIT, RETAINED_RANK, digest, multiply, private_bytes, q8,
)

ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
DESIGN = ROOT / "rank8_exceptional_first_crossing_alpha6_streaming_design_exact_20260820.json"
DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
THRESHOLD, SOURCE_ALPHA, TERMINAL_ALPHA = 14, 11, 6
ABORT_LIMIT = 448 * 1024**2
SHARDS = {
    "types73_115": {"start": 73, "stop": 115, "raw": 742180},
    "types116_149": {"start": 116, "stop": 149, "raw": 747847},
    "types150_177": {"start": 150, "stop": 177, "raw": 722638},
    "types178_202": {"start": 178, "stop": 202, "raw": 726700},
    "types203_225": {"start": 203, "stop": 225, "raw": 736460},
    "types226_246": {"start": 226, "stop": 246, "raw": 729246},
    "type247": {"start": 247, "stop": 247, "raw": 36079},
}


class ResourceGate(RuntimeError): pass
class SignObstruction(RuntimeError):
    def __init__(self, witness): super().__init__("nonpositive exact Q8"); self.witness = witness


def encode(polynomial): return ",".join(str(value) for value in polynomial)


def load_jets():
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert [classification["distinct_by_alpha"][str(a)] for a in range(1, 7)] == [2, 2, 5, 15, 48, 175]
    assert classification["hashes"][JETS.name] == digest(JETS)
    rows = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            alpha = int(row["alpha"]); polynomial = tuple(int(row[f"i{r}"]) for r in range(10)); value = int(row["q8"])
            assert polynomial[0] == 1 and value == q8(polynomial)
            rows.append((alpha, polynomial, value))
    assert len(rows) == len(set(rows)) == 1215 and rows == sorted(rows)
    selected = tuple(row for row in rows if row[0] <= TERMINAL_ALPHA)
    assert len(selected) == 247
    assert tuple(a for a, _, _ in selected) == ((1,)*2 + (2,)*2 + (3,)*5 + (4,)*15 + (5,)*48 + (6,)*175)
    assert all(value == 0 for _, _, value in selected)
    return selected


def paths(label):
    stem = f"rank8_exceptional_first_crossing_alpha6_s11_{label}"
    return {kind: ROOT / f"{stem}_{suffix}" for kind, suffix in {
        "database": "keys_exact_20260820.sqlite3", "output": "exact_20260820.json",
        "checkpoint": "resource_checkpoint_20260820.json", "obstruction": "obstruction_20260820.json",
    }.items()}


def prepare_database(path):
    if path.exists(): path.unlink()
    connection = sqlite3.connect(path)
    connection.execute("PRAGMA journal_mode=DELETE"); connection.execute("PRAGMA synchronous=FULL")
    connection.execute("PRAGMA temp_store=FILE"); connection.execute("PRAGMA cache_size=-16384")
    connection.execute("CREATE TABLE keys (source_alpha INTEGER NOT NULL, largest_type INTEGER NOT NULL, source TEXT NOT NULL, product TEXT NOT NULL, q8 TEXT NOT NULL, PRIMARY KEY(source_alpha,largest_type,source,product,q8)) WITHOUT ROWID")
    connection.execute("CREATE TABLE products (source_alpha INTEGER NOT NULL, product TEXT NOT NULL, PRIMARY KEY(source_alpha,product)) WITHOUT ROWID")
    connection.execute("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)"); connection.commit()
    return connection


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("shard", choices=tuple(SHARDS)); args = parser.parse_args()
    label, config = args.shard, SHARDS[args.shard]
    start_type, stop_type, artifacts = config["start"], config["stop"], paths(label)
    started, peak, stop_sampling = time.perf_counter(), private_bytes(), threading.Event()
    connection = states = None; last_component = 0; history = []; per_type = []; checks = 0; minimum = maximum = None
    def sample():
        nonlocal peak
        while not stop_sampling.wait(0.01): peak = max(peak, private_bytes())
    def gate():
        nonlocal peak
        actual = private_bytes(); peak = max(peak, actual)
        if actual >= ABORT_LIMIT: raise ResourceGate(f"448 MiB gate: actual={actual}")
        return actual
    sampler = threading.Thread(target=sample, daemon=True); sampler.start()
    try:
        design = json.loads(DESIGN.read_text(encoding="utf-8")); assert design["products_enumerated"] == 0
        source_design = design["exact_counts"]["source_cells"][str(SOURCE_ALPHA)]
        design_shard = next(row for row in source_design["audit_shards"] if row["terminal_type_index_start"] == start_type)
        assert design_shard["terminal_type_index_stop"] == stop_type and design_shard["raw_multiset_upper_bound"] == config["raw"]
        assert design_shard["projected_peak_private_bytes"] < ABORT_LIMIT
        jets = load_jets(); connection = prepare_database(artifacts["database"])
        identity = (1,) + (0,) * RETAINED_RANK; states = {alpha: set() for alpha in range(THRESHOLD)}; states[0].add(identity)
        for component_index, (component_alpha, component, _) in enumerate(jets, 1):
            if component_index > stop_type: break
            last_component = component_index
            for target in range(component_alpha, THRESHOLD):
                for source in tuple(states[target-component_alpha]): states[target].add(multiply(source, component))
            history.append({"component_index": component_index, "component_alpha": component_alpha, "distinct_states": sum(len(v) for v in states.values()), "private_bytes": gate()})
            if component_index < start_type: continue
            type_checks = 0; type_min = type_max = None; key_batch = []; product_batch = []
            def flush():
                if not key_batch: return
                before = connection.total_changes; connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?)", key_batch)
                assert connection.total_changes - before == len(key_batch)
                connection.executemany("INSERT OR IGNORE INTO products VALUES (?,?)", product_batch)
                key_batch.clear(); product_batch.clear(); gate()
            for source in states[SOURCE_ALPHA]:
                product = multiply(source, component); value = q8(product)
                if value <= 0: raise SignObstruction({"source_alpha": SOURCE_ALPHA, "terminal_alpha": 6, "total_alpha": 17, "terminal_type_index": component_index, "source_i0_through_i9": list(source), "terminal_i0_through_i9": list(component), "product_i0_through_i9": list(product), "Q8": value})
                type_checks += 1; type_min = value if type_min is None else min(type_min, value); type_max = value if type_max is None else max(type_max, value)
                source_text, product_text = encode(source), encode(product)
                key_batch.append((SOURCE_ALPHA, component_index, source_text, product_text, str(value))); product_batch.append((SOURCE_ALPHA, product_text))
                if len(key_batch) == 2500: flush()
            flush(); checks += type_checks; minimum = type_min if minimum is None else min(minimum, type_min); maximum = type_max if maximum is None else max(maximum, type_max)
            per_type.append({"terminal_type_index": component_index, "terminal_relative_alpha6_type": component_index-72, "canonical_checks": type_checks, "negative_Q8": 0, "zero_Q8": 0, "minimum_Q8": type_min, "maximum_Q8": type_max})
            if component_index % 15 == 0 or component_index == stop_type:
                connection.commit(); print(f"shard={label} component={component_index}/{stop_type} checks={checks} private_MiB={private_bytes()/1024**2:.3f}", flush=True)
        assert last_component == stop_type and len(per_type) == stop_type-start_type+1
        connection.commit(); database_checks = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]; database_products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        assert checks == database_checks and minimum is not None and minimum > 0
        state_counts = {str(a): len(states[a]) for a in range(THRESHOLD)}
        aggregate = {"source_alpha": 11, "terminal_alpha": 6, "total_alpha": 17, "terminal_type_index_start": start_type, "terminal_type_index_stop": stop_type, "terminal_type_count": len(per_type), "ordered_covering_checks": database_checks, "distinct_crossing_jets": database_products, "canonical_key_to_product_collisions": database_checks-database_products, "negative_Q8": 0, "zero_Q8": 0, "minimum_Q8": minimum, "maximum_Q8": maximum}
        connection.execute("INSERT INTO meta VALUES ('result',?)", (json.dumps({"status": f"PASS_EXACT_RANK8_ALPHA6_S11_{label.upper()}_KEYS", "state_counts": state_counts, "aggregate": aggregate}, sort_keys=True, separators=(",", ":")),)); connection.commit(); connection.close(); connection = None
        stop_sampling.set(); sampler.join(timeout=1); peak = max(peak, private_bytes()); elapsed = time.perf_counter()-started; assert peak < ABORT_LIMIT < LIMIT
        payload = {"schema": f"rank8-exceptional-first-crossing-alpha6-s11-{label}-v1", "status": f"PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA6_S11_{label.upper()}",
            "scope": {"certified_shard": {"source": 11, "terminal": 6, "total": 17, "terminal_type_index_start": start_type, "terminal_type_index_stop": stop_type}, "workers": 1, "warning": "Exactly one predesigned source-alpha11 shard; source alpha12 excluded."},
            "partial_state_counts_after_terminal_stop": state_counts, "partial_states_total_after_terminal_stop": sum(state_counts.values()), "raw_multiset_crossing_count_design": config["raw"], "per_terminal_type": per_type, "aggregate": aggregate,
            "resources": {"workers": 1, "abort_limit_private_bytes": ABORT_LIMIT, "hard_limit_private_bytes": LIMIT, "design_projected_peak_private_bytes": design_shard["projected_peak_private_bytes"], "design_projected_peak_private_MiB": design_shard["projected_peak_private_MiB"], "peak_private_bytes": peak, "peak_private_MiB": peak/1024**2, "elapsed_seconds": elapsed, "history": history},
            "hashes": {JETS.name: digest(JETS), CLASSIFICATION.name: digest(CLASSIFICATION), DESIGN.name: digest(DESIGN), DEPENDENCY.name: digest(DEPENDENCY), artifacts["database"].name: digest(artifacts["database"]), Path(__file__).name: digest(Path(__file__))}}
        artifacts["output"].write_text(json.dumps(payload, indent=2, sort_keys=True)+"\n", encoding="utf-8")
        if artifacts["checkpoint"].exists(): artifacts["checkpoint"].unlink()
        if artifacts["obstruction"].exists(): artifacts["obstruction"].unlink()
        print(payload["status"]); print(f"checks={database_checks} products={database_products} collisions={database_checks-database_products} negative=0 zero=0 min_Q8={minimum} max_Q8={maximum}"); print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}"); print(f"database_sha256={digest(artifacts['database'])}"); print(f"report_sha256={digest(artifacts['output'])}"); return 0
    except ResourceGate as error:
        stop_sampling.set(); sampler.join(timeout=1); counts = {str(a): len(states[a]) for a in range(THRESHOLD)} if states else {}
        checkpoint = {"status": f"ABORTED_CLEANLY_RANK8_ALPHA6_S11_{label.upper()}_RESOURCE_GATE", "reason": str(error), "last_component_index": last_component, "partial_state_counts": counts, "partial_states_total": sum(counts.values()), "preserved_canonical_key_count": connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0] if connection else 0, "peak_private_bytes": max(peak, private_bytes()), "abort_limit_private_bytes": ABORT_LIMIT, "scope_warning": "Resource checkpoint, not sign obstruction.", "hashes": {Path(__file__).name: digest(Path(__file__))}}
        artifacts["checkpoint"].write_text(json.dumps(checkpoint, indent=2, sort_keys=True)+"\n", encoding="utf-8"); print(checkpoint["status"]); print(f"checkpoint_sha256={digest(artifacts['checkpoint'])}"); return 2
    except SignObstruction as error:
        obstruction = {"status": f"EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA6_S11_{label.upper()}", "witness": error.witness, "scope_warning": "Exact exceptional-product obstruction in this source-alpha11 shard.", "hashes": {Path(__file__).name: digest(Path(__file__))}}
        artifacts["obstruction"].write_text(json.dumps(obstruction, indent=2, sort_keys=True)+"\n", encoding="utf-8"); print(obstruction["status"]); print(f"obstruction_sha256={digest(artifacts['obstruction'])}"); return 3
    finally:
        if connection is not None: connection.close()
        stop_sampling.set(); sampler.join(timeout=1)


if __name__ == "__main__": raise SystemExit(main())
