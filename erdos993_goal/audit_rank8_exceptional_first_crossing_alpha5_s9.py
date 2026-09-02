#!/usr/bin/env python3
"""Independent bidirectional audit of the alpha5/source9 pilot."""

from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
import tempfile
import threading
import time
from pathlib import Path

from audit_rank8_exceptional_first_crossing_alpha4 import divide_once, encode, multiply
from probe_rank8_exceptional_first_crossing_alpha2_exact import LIMIT, private_bytes


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha5_s9_exact.py"
SOURCE_DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
AUDIT_DEPENDENCY = ROOT / "audit_rank8_exceptional_first_crossing_alpha4.py"
REPORT = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_exact_20260820.json"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_keys_exact_20260820.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_audit_exact_20260820.json"
CHECKPOINT = ROOT / "rank8_exceptional_first_crossing_alpha5_s9_audit_resource_checkpoint_20260820.json"
RETAINED_RANK = 9
TERMINAL_ALPHA = 5
SOURCE_ALPHA = 9
TOTAL_ALPHA = 14
ABORT_LIMIT = 480 * 1024**2


class ResourceGate(RuntimeError):
    pass


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q8(polynomial: tuple[int, ...]) -> int:
    return (
        16 * polynomial[8] * polynomial[8]
        - polynomial[7] * polynomial[8]
        - 18 * polynomial[7] * polynomial[9]
    )


def load_first_seventy_two() -> tuple[tuple[int, tuple[int, ...]], ...]:
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
    assert len(selected) == 72
    assert tuple(alpha for alpha, _ in selected) == (
        (1,) * 2 + (2,) * 2 + (3,) * 5 + (4,) * 15 + (5,) * 48
    )
    return selected


def prepare_database(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.execute("PRAGMA journal_mode=DELETE")
    connection.execute("PRAGMA synchronous=NORMAL")
    connection.execute("PRAGMA temp_store=FILE")
    connection.execute("PRAGMA cache_size=-32768")
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


def enumerate_multisets(connection, jets, check_memory):
    weights = tuple(alpha for alpha, _ in jets)
    identity = (1,) + (0,) * RETAINED_RANK
    powers = []
    for weight, polynomial in jets:
        row = [identity]
        for _ in range(TOTAL_ALPHA // weight):
            row.append(multiply(row[-1], polynomial))
        powers.append(tuple(row))

    raw = negative = zero = 0
    minimum = maximum = None
    batch = []

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

    def visit(index, remaining, product, exponents):
        nonlocal raw, negative, zero, minimum, maximum
        if index == len(jets):
            if remaining:
                return
            terminal_indices = [
                position for position in range(24, 72) if exponents[position] > 0
            ]
            if not terminal_indices:
                return
            largest_zero_based = max(terminal_indices)
            source = divide_once(product, jets[largest_zero_based][1])
            value = q8(product)
            if value < 0:
                raise AssertionError(
                    "independent alpha5/source9 multiset obstruction",
                    exponents,
                    product,
                    value,
                )
            raw += 1
            negative += value < 0
            zero += value == 0
            minimum = value if minimum is None else min(minimum, value)
            maximum = value if maximum is None else max(maximum, value)
            batch.append(
                (
                    SOURCE_ALPHA,
                    largest_zero_based + 1,
                    encode(source),
                    encode(product),
                    str(value),
                )
            )
            if len(batch) == 5000:
                flush()
            return
        weight = weights[index]
        for exponent in range(remaining // weight + 1):
            next_product = (
                product
                if exponent == 0
                else multiply(product, powers[index][exponent])
            )
            visit(
                index + 1,
                remaining - exponent * weight,
                next_product,
                exponents + (exponent,),
            )

    visit(0, TOTAL_ALPHA, identity, ())
    flush()
    connection.execute(
        "INSERT OR IGNORE INTO products SELECT source_alpha,product FROM keys"
    )
    connection.commit()
    canonical = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
    products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    max_multisets_key = connection.execute("SELECT MAX(multiplicity) FROM keys").fetchone()[0]
    max_keys_product = connection.execute(
        "SELECT MAX(c) FROM (SELECT COUNT(*) c FROM keys GROUP BY product)"
    ).fetchone()[0]
    max_multisets_product = connection.execute(
        "SELECT MAX(c) FROM (SELECT SUM(multiplicity) c FROM keys GROUP BY product)"
    ).fetchone()[0]
    return {
        "source_alpha": SOURCE_ALPHA,
        "terminal_alpha": TERMINAL_ALPHA,
        "total_alpha": TOTAL_ALPHA,
        "independently_enumerated_multisets": raw,
        "canonical_check_keys": canonical,
        "distinct_crossing_jets": products,
        "multiset_to_canonical_key_collisions": raw - canonical,
        "canonical_key_to_product_collisions": canonical - products,
        "maximum_multisets_per_canonical_key": max_multisets_key,
        "maximum_canonical_keys_per_product": max_keys_product,
        "maximum_multisets_per_product": max_multisets_product,
        "negative_Q8": negative,
        "zero_Q8": zero,
        "minimum_Q8": int(minimum),
        "maximum_Q8": int(maximum),
    }


def assert_bidirectional_equality(connection):
    before = digest(DATABASE)
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
    assert digest(DATABASE) == before


def main() -> int:
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
            raise ResourceGate(f"audit reached 480 MiB safety gate: {peak}")

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        report = json.loads(REPORT.read_text(encoding="utf-8"))
        assert (
            report["status"]
            == "PASS_EXACT_RESOURCE_GATED_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_S9_PILOT"
        )
        assert report["scope"]["certified_cell"] == {
            "source": 9,
            "terminal": 5,
            "total": 14,
        }
        assert report["scope"]["workers"] == 1
        assert report["resources"]["peak_private_bytes"] < ABORT_LIMIT
        assert report["resources"]["maximum_projected_private_bytes"] < ABORT_LIMIT
        assert report["hashes"] == {
            JETS.name: digest(JETS),
            CLASSIFICATION.name: digest(CLASSIFICATION),
            SOURCE_DEPENDENCY.name: digest(SOURCE_DEPENDENCY),
            DATABASE.name: digest(DATABASE),
            SOURCE.name: digest(SOURCE),
        }
        jets = load_first_seventy_two()
        with tempfile.TemporaryDirectory(prefix="rank8_alpha5_s9_audit_") as temporary:
            connection = prepare_database(Path(temporary) / "independent.sqlite3")
            try:
                cell = enumerate_multisets(connection, jets, check_memory)
                assert_bidirectional_equality(connection)
            finally:
                connection.close()
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
        ) == (107784, 89865, 74384, 17919, 15481)

        stop_sampling.set()
        sampler.join(timeout=1)
        check_memory()
        elapsed = time.perf_counter() - started
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha5-s9-independent-audit-v1",
            "status": "PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_S9_AUDIT",
            "method": (
                "directly enumerate every total-alpha14 exponent vector of the 72 "
                "alpha<=5 types with an alpha5 component, select its unique largest "
                "alpha5 type, deconvolve one copy, and compare exact key/product "
                "tables in both relational directions"
            ),
            "cell": cell,
            "resources": {
                "hard_limit_private_bytes": LIMIT,
                "abort_limit_private_bytes": ABORT_LIMIT,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "elapsed_seconds": elapsed,
            },
            "scope_warning": (
                "Only alpha5/source9 is audited. Sources10 through13 and alpha6 "
                "through9 remain; collisions are equivalence compression, not gaps."
            ),
            "hashes": {
                REPORT.name: digest(REPORT),
                DATABASE.name: digest(DATABASE),
                SOURCE.name: digest(SOURCE),
                SOURCE_DEPENDENCY.name: digest(SOURCE_DEPENDENCY),
                AUDIT_DEPENDENCY.name: digest(AUDIT_DEPENDENCY),
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
        print(payload["status"])
        print(
            f"multisets={cell['independently_enumerated_multisets']} "
            f"checks={cell['canonical_check_keys']} products={cell['distinct_crossing_jets']} "
            f"multiset_key_collisions={cell['multiset_to_canonical_key_collisions']} "
            f"key_product_collisions={cell['canonical_key_to_product_collisions']} "
            "negative=0 zero=0"
        )
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"audit_sha256={digest(OUTPUT)}")
        return 0
    except ResourceGate as error:
        stop_sampling.set()
        sampler.join(timeout=1)
        checkpoint = {
            "status": "ABORTED_CLEANLY_RANK8_ALPHA5_S9_AUDIT_RESOURCE_GATE",
            "reason": str(error),
            "peak_private_bytes": max(peak, private_bytes()),
            "abort_limit_private_bytes": ABORT_LIMIT,
            "scope_warning": "This is a resource checkpoint, not a sign obstruction.",
            "hashes": {Path(__file__).name: digest(Path(__file__))},
        }
        CHECKPOINT.write_text(
            json.dumps(checkpoint, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        print(checkpoint["status"])
        print(f"checkpoint_sha256={digest(CHECKPOINT)}")
        return 2
    finally:
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
