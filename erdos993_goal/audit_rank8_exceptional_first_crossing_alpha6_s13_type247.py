#!/usr/bin/env python3
"""Independent exact audit of alpha6 source13 terminal type247 pilot."""

from __future__ import annotations

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
SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha6_s13_type247_exact.py"
ALGEBRA_DEPENDENCY = ROOT / "audit_rank8_exceptional_first_crossing_alpha4.py"
MEMORY_DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
REPORT = ROOT / "rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_exact_20260820.json"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_keys_exact_20260820.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_audit_exact_20260820.json"
CHECKPOINT = ROOT / "rank8_exceptional_first_crossing_alpha6_s13_type247_audit_resource_checkpoint_20260820.json"
OBSTRUCTION = ROOT / "rank8_exceptional_first_crossing_alpha6_s13_type247_audit_obstruction_20260820.json"
SOURCE_ALPHA = 13
TERMINAL_ALPHA = 6
TOTAL_ALPHA = 19
TERMINAL_TYPE_INDEX = 247
RETAINED_RANK = 9
ABORT_LIMIT = 448 * 1024**2


class ResourceGate(RuntimeError):
    pass


class SignObstruction(RuntimeError):
    def __init__(self, witness):
        super().__init__("negative independent Q8")
        self.witness = witness


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q8(polynomial):
    return (
        16 * polynomial[8] * polynomial[8]
        - polynomial[7] * polynomial[8]
        - 18 * polynomial[7] * polynomial[9]
    )


def load_first_247():
    rows = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            rows.append(
                (
                    int(row["alpha"]),
                    tuple(int(row[f"i{rank}"]) for rank in range(10)),
                )
            )
    assert len(rows) == 1215
    selected = tuple(row for row in rows if row[0] <= TERMINAL_ALPHA)
    assert len(selected) == TERMINAL_TYPE_INDEX
    assert tuple(alpha for alpha, _ in selected) == (
        (1,) * 2 + (2,) * 2 + (3,) * 5 + (4,) * 15 + (5,) * 48 + (6,) * 175
    )
    return selected


def prepare_database(path):
    connection = sqlite3.connect(path)
    connection.execute("PRAGMA journal_mode=DELETE")
    connection.execute("PRAGMA synchronous=NORMAL")
    connection.execute("PRAGMA temp_store=FILE")
    connection.execute("PRAGMA cache_size=-16384")
    connection.execute(
        "CREATE TABLE keys ("
        "source_alpha INTEGER NOT NULL, largest_type INTEGER NOT NULL, "
        "source TEXT NOT NULL, product TEXT NOT NULL, q8 TEXT NOT NULL, "
        "multiplicity INTEGER NOT NULL, "
        "PRIMARY KEY(source_alpha,largest_type,source,product,q8)) WITHOUT ROWID"
    )
    connection.execute(
        "CREATE TABLE products ("
        "source_alpha INTEGER NOT NULL, product TEXT NOT NULL, "
        "PRIMARY KEY(source_alpha,product)) WITHOUT ROWID"
    )
    return connection


def enumerate_sources(connection, jets, terminal, check_memory):
    weights = tuple(alpha for alpha, _ in jets)
    identity = (1,) + (0,) * RETAINED_RANK
    powers = []
    for weight, polynomial in jets:
        row = [identity]
        for _ in range(SOURCE_ALPHA // weight):
            row.append(multiply(row[-1], polynomial))
        powers.append(tuple(row))
    raw = negative = zero = 0
    minimum = maximum = None
    batch = []
    started = time.perf_counter()

    def flush():
        if not batch:
            return
        connection.executemany(
            "INSERT INTO keys VALUES (?,?,?,?,?,1) "
            "ON CONFLICT(source_alpha,largest_type,source,product,q8) "
            "DO UPDATE SET multiplicity=multiplicity+1",
            batch,
        )
        batch.clear()
        check_memory()

    def visit(index, remaining, source):
        nonlocal raw, negative, zero, minimum, maximum
        if index == len(jets):
            if remaining:
                return
            product = multiply(source, terminal)
            value = q8(product)
            if value < 0:
                raise SignObstruction(
                    {
                        "source_i0_through_i9": list(source),
                        "terminal_i0_through_i9": list(terminal),
                        "product_i0_through_i9": list(product),
                        "Q8": value,
                    }
                )
            raw += 1
            negative += value < 0
            zero += value == 0
            minimum = value if minimum is None else min(minimum, value)
            maximum = value if maximum is None else max(maximum, value)
            batch.append(
                (
                    SOURCE_ALPHA,
                    TERMINAL_TYPE_INDEX,
                    encode(source),
                    encode(product),
                    str(value),
                )
            )
            if len(batch) == 2500:
                flush()
            if raw % 50000 == 0:
                print(
                    f"audit-raw={raw} elapsed={time.perf_counter()-started:.3f}s",
                    flush=True,
                )
            return
        weight = weights[index]
        for exponent in range(remaining // weight + 1):
            next_source = (
                source
                if exponent == 0
                else multiply(source, powers[index][exponent])
            )
            visit(index + 1, remaining - exponent * weight, next_source)

    visit(0, SOURCE_ALPHA, identity)
    flush()
    connection.execute(
        "INSERT OR IGNORE INTO products SELECT source_alpha,product FROM keys"
    )
    connection.commit()
    canonical = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
    products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    return {
        "source_alpha": SOURCE_ALPHA,
        "terminal_alpha": TERMINAL_ALPHA,
        "total_alpha": TOTAL_ALPHA,
        "terminal_type_index": TERMINAL_TYPE_INDEX,
        "independently_enumerated_multisets": raw,
        "canonical_check_keys": canonical,
        "distinct_crossing_jets": products,
        "multiset_to_canonical_key_collisions": raw - canonical,
        "canonical_key_to_product_collisions": canonical - products,
        "maximum_multisets_per_canonical_key": connection.execute(
            "SELECT MAX(multiplicity) FROM keys"
        ).fetchone()[0],
        "maximum_canonical_keys_per_product": connection.execute(
            "SELECT MAX(c) FROM (SELECT COUNT(*) c FROM keys GROUP BY product)"
        ).fetchone()[0],
        "maximum_multisets_per_product": connection.execute(
            "SELECT MAX(c) FROM (SELECT SUM(multiplicity) c FROM keys GROUP BY product)"
        ).fetchone()[0],
        "negative_Q8": negative,
        "zero_Q8": zero,
        "minimum_Q8": int(minimum),
        "maximum_Q8": int(maximum),
        "elapsed_seconds": time.perf_counter() - started,
    }


def assert_equality(connection):
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


def main():
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
    recurrence_hash = digest(DATABASE)
    try:
        report = json.loads(REPORT.read_text(encoding="utf-8"))
        assert report["status"] == "PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA6_S13_TYPE247_PILOT"
        assert report["scope"]["certified_cell"] == {
            "source": 13,
            "terminal": 6,
            "total": 19,
            "terminal_type_index": 247,
        }
        assert report["resources"]["peak_private_bytes"] < ABORT_LIMIT
        assert report["resources"]["maximum_projected_private_bytes"] < ABORT_LIMIT
        assert report["hashes"][DATABASE.name] == recurrence_hash
        jets = load_first_247()
        terminal = jets[-1][1]
        assert list(terminal) == report["cell"]["terminal_i0_through_i9"]
        with tempfile.TemporaryDirectory(prefix="rank8_alpha6_type247_audit_") as temporary:
            connection = prepare_database(Path(temporary) / "independent.sqlite3")
            try:
                cell = enumerate_sources(connection, jets, terminal, check_memory)
                assert_equality(connection)
            finally:
                connection.close()
        assert digest(DATABASE) == recurrence_hash
        reported = report["cell"]
        assert cell["canonical_check_keys"] == reported["ordered_covering_checks"]
        assert cell["distinct_crossing_jets"] == reported["distinct_crossing_jets"]
        assert cell["canonical_key_to_product_collisions"] == reported[
            "canonical_key_to_product_collisions"
        ]
        assert cell["negative_Q8"] == reported["negative_Q8"] == 0
        assert cell["zero_Q8"] == reported["zero_Q8"] == 0
        assert cell["minimum_Q8"] == reported["minimum_Q8"]
        assert cell["maximum_Q8"] == reported["maximum_Q8"]
        assert (
            cell["independently_enumerated_multisets"],
            cell["canonical_check_keys"],
            cell["distinct_crossing_jets"],
            cell["multiset_to_canonical_key_collisions"],
            cell["canonical_key_to_product_collisions"],
        ) == (195031, 130341, 130341, 64690, 0)

        stop_sampling.set()
        sampler.join(timeout=1)
        check_memory()
        elapsed = time.perf_counter() - started
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha6-s13-type247-pilot-audit-v1",
            "status": "PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA6_S13_TYPE247_PILOT_AUDIT",
            "method": (
                "enumerate every source-alpha13 multiset of the first247 types, "
                "append terminal type247, and compare exact key/product tables in "
                "both relational directions"
            ),
            "cell": cell,
            "resources": {
                "workers": 1,
                "abort_limit_private_bytes": ABORT_LIMIT,
                "hard_limit_private_bytes": LIMIT,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "elapsed_seconds": elapsed,
            },
            "scope_warning": (
                "Only alpha6 source13 terminal type247 is audited. No other alpha6 "
                "type or source cell is certified."
            ),
            "hashes": {
                REPORT.name: digest(REPORT),
                DATABASE.name: digest(DATABASE),
                SOURCE.name: digest(SOURCE),
                ALGEBRA_DEPENDENCY.name: digest(ALGEBRA_DEPENDENCY),
                MEMORY_DEPENDENCY.name: digest(MEMORY_DEPENDENCY),
                JETS.name: digest(JETS),
                CLASSIFICATION.name: digest(CLASSIFICATION),
                Path(__file__).name: digest(Path(__file__)),
            },
        }
        OUTPUT.write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        if CHECKPOINT.exists():
            CHECKPOINT.unlink()
        if OBSTRUCTION.exists():
            OBSTRUCTION.unlink()
        print(payload["status"])
        print(
            f"raw={cell['independently_enumerated_multisets']} "
            f"keys={cell['canonical_check_keys']} products={cell['distinct_crossing_jets']} "
            f"multiset_key_collisions={cell['multiset_to_canonical_key_collisions']} "
            "negative=0 zero=0"
        )
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"audit_sha256={digest(OUTPUT)}")
        return 0
    except ResourceGate as error:
        stop_sampling.set()
        sampler.join(timeout=1)
        checkpoint = {
            "status": "ABORTED_CLEANLY_RANK8_ALPHA6_S13_TYPE247_AUDIT_RESOURCE_GATE",
            "reason": str(error),
            "peak_private_bytes": max(peak, private_bytes()),
            "scope_warning": "This is a resource checkpoint, not a sign obstruction.",
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        CHECKPOINT.write_text(
            json.dumps(checkpoint, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        print(checkpoint["status"])
        print(f"checkpoint_sha256={digest(CHECKPOINT)}")
        return 2
    except SignObstruction as error:
        obstruction = {
            "status": "EXACT_NEGATIVE_Q8_OBSTRUCTION_RANK8_ALPHA6_S13_TYPE247_AUDIT",
            "witness": error.witness,
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        OBSTRUCTION.write_text(
            json.dumps(obstruction, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        print(obstruction["status"])
        print(f"obstruction_sha256={digest(OBSTRUCTION)}")
        return 3
    finally:
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
