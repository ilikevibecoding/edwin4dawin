#!/usr/bin/env python3
"""Independent per-cell bidirectional audit of remaining alpha5 crossings."""

from __future__ import annotations

import hashlib
import json
import sqlite3
import tempfile
import threading
import time
from pathlib import Path

from audit_rank8_exceptional_first_crossing_alpha4 import divide_once, encode, multiply
from audit_rank8_exceptional_first_crossing_alpha5_s9 import (
    load_first_seventy_two,
    prepare_database,
)
from probe_rank8_exceptional_first_crossing_alpha2_exact import LIMIT, private_bytes


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
SOURCE = ROOT / "probe_rank8_exceptional_first_crossing_alpha5_s10_13_exact.py"
BASE_DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
PILOT_DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha5_s9_exact.py"
AUDIT_DEPENDENCY = ROOT / "audit_rank8_exceptional_first_crossing_alpha5_s9.py"
ALGEBRA_DEPENDENCY = ROOT / "audit_rank8_exceptional_first_crossing_alpha4.py"
REPORT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_exact_20260820.json"
DATABASE = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_keys_exact_20260820.sqlite3"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_audit_exact_20260820.json"
CHECKPOINT = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_audit_resource_checkpoint_20260820.json"
OBSTRUCTION = ROOT / "rank8_exceptional_first_crossing_alpha5_s10_13_audit_obstruction_20260820.json"
RETAINED_RANK = 9
TERMINAL_ALPHA = 5
SOURCES = (10, 11, 12, 13)
ABORT_LIMIT = 480 * 1024**2


class ResourceGate(RuntimeError):
    pass


class SignObstruction(RuntimeError):
    def __init__(self, witness):
        super().__init__("negative independent Q8")
        self.witness = witness


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q8(polynomial: tuple[int, ...]) -> int:
    return (
        16 * polynomial[8] * polynomial[8]
        - polynomial[7] * polynomial[8]
        - 18 * polynomial[7] * polynomial[9]
    )


def enumerate_cell(connection, jets, source_alpha, check_memory):
    total_alpha = source_alpha + TERMINAL_ALPHA
    weights = tuple(alpha for alpha, _ in jets)
    identity = (1,) + (0,) * RETAINED_RANK
    powers = []
    for weight, polynomial in jets:
        row = [identity]
        for _ in range(total_alpha // weight):
            row.append(multiply(row[-1], polynomial))
        powers.append(tuple(row))

    raw = negative = zero = 0
    minimum = maximum = None
    batch = []
    cell_started = time.perf_counter()

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
                raise SignObstruction(
                    {
                        "source_alpha": source_alpha,
                        "total_alpha": total_alpha,
                        "exponents": list(exponents),
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
                    source_alpha,
                    largest_zero_based + 1,
                    encode(source),
                    encode(product),
                    str(value),
                )
            )
            if len(batch) == 5000:
                flush()
            if raw % 100000 == 0:
                print(
                    f"audit-source={source_alpha} raw={raw} "
                    f"elapsed={time.perf_counter()-cell_started:.3f}s",
                    flush=True,
                )
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

    visit(0, total_alpha, identity, ())
    flush()
    connection.execute(
        "INSERT OR IGNORE INTO products SELECT source_alpha,product FROM keys"
    )
    connection.commit()
    canonical = connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0]
    products = connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    return {
        "source_alpha": source_alpha,
        "terminal_alpha": TERMINAL_ALPHA,
        "total_alpha": total_alpha,
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
        "elapsed_seconds": time.perf_counter() - cell_started,
    }


def assert_cell_equality(connection, source_alpha):
    connection.execute("ATTACH DATABASE ? AS recurrence", (str(DATABASE.resolve()),))
    columns = "source_alpha,largest_type,source,product,q8"
    assert connection.execute(
        f"SELECT {columns} FROM keys EXCEPT "
        f"SELECT {columns} FROM recurrence.keys WHERE source_alpha=? LIMIT 1",
        (source_alpha,),
    ).fetchone() is None
    assert connection.execute(
        f"SELECT {columns} FROM recurrence.keys WHERE source_alpha=? EXCEPT "
        f"SELECT {columns} FROM keys LIMIT 1",
        (source_alpha,),
    ).fetchone() is None
    assert connection.execute(
        "SELECT source_alpha,product FROM products EXCEPT "
        "SELECT source_alpha,product FROM recurrence.products WHERE source_alpha=? LIMIT 1",
        (source_alpha,),
    ).fetchone() is None
    assert connection.execute(
        "SELECT source_alpha,product FROM recurrence.products WHERE source_alpha=? EXCEPT "
        "SELECT source_alpha,product FROM products LIMIT 1",
        (source_alpha,),
    ).fetchone() is None
    connection.execute("DETACH DATABASE recurrence")


def main() -> int:
    started = time.perf_counter()
    peak = private_bytes()
    stop_sampling = threading.Event()
    completed_cells = {}

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
    recurrence_hash_before = digest(DATABASE)
    try:
        report = json.loads(REPORT.read_text(encoding="utf-8"))
        assert (
            report["status"]
            == "PASS_EXACT_RESOURCE_GATED_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_S10_13"
        )
        assert report["scope"]["workers"] == 1
        assert report["resources"]["peak_private_bytes"] < ABORT_LIMIT
        assert report["resources"]["maximum_projected_private_bytes"] < ABORT_LIMIT
        assert report["hashes"] == {
            JETS.name: digest(JETS),
            CLASSIFICATION.name: digest(CLASSIFICATION),
            BASE_DEPENDENCY.name: digest(BASE_DEPENDENCY),
            PILOT_DEPENDENCY.name: digest(PILOT_DEPENDENCY),
            DATABASE.name: recurrence_hash_before,
            SOURCE.name: digest(SOURCE),
        }
        jets = load_first_seventy_two()
        for source_alpha in SOURCES:
            with tempfile.TemporaryDirectory(
                prefix=f"rank8_alpha5_s{source_alpha}_audit_"
            ) as temporary:
                connection = prepare_database(Path(temporary) / "independent.sqlite3")
                try:
                    cell = enumerate_cell(connection, jets, source_alpha, check_memory)
                    assert_cell_equality(connection, source_alpha)
                finally:
                    connection.close()
            reported = report["cells"][str(source_alpha)]
            assert cell["canonical_check_keys"] == reported["ordered_covering_checks"]
            assert cell["distinct_crossing_jets"] == reported["distinct_crossing_jets"]
            assert cell["canonical_key_to_product_collisions"] == reported[
                "canonical_key_to_product_collisions"
            ]
            assert cell["negative_Q8"] == reported["negative_Q8"] == 0
            assert cell["zero_Q8"] == reported["zero_Q8"] == 0
            assert cell["minimum_Q8"] == reported["minimum_Q8"]
            assert cell["maximum_Q8"] == reported["maximum_Q8"]
            completed_cells[str(source_alpha)] = cell
            print(
                f"audit-source={source_alpha} PASS raw={cell['independently_enumerated_multisets']} "
                f"keys={cell['canonical_check_keys']} products={cell['distinct_crossing_jets']} "
                f"elapsed={cell['elapsed_seconds']:.3f}s",
                flush=True,
            )
            check_memory()

        expected = {
            "10": (225208, 180725, 145976, 44483, 34749),
            "11": (444416, 339587, 267050, 104829, 72537),
            "12": (890360, 664641, 517716, 225719, 146925),
            "13": (1773184, 1273768, 975902, 499416, 297866),
        }
        for source, values in expected.items():
            cell = completed_cells[source]
            assert (
                cell["independently_enumerated_multisets"],
                cell["canonical_check_keys"],
                cell["distinct_crossing_jets"],
                cell["multiset_to_canonical_key_collisions"],
                cell["canonical_key_to_product_collisions"],
            ) == values
        assert digest(DATABASE) == recurrence_hash_before

        stop_sampling.set()
        sampler.join(timeout=1)
        check_memory()
        elapsed = time.perf_counter() - started
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha5-s10-13-independent-audit-v1",
            "status": "PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA5_S10_13_AUDIT",
            "method": (
                "for each source separately, directly enumerate all exponent vectors "
                "of the 72 alpha<=5 types at the crossing total, select/deconvolve "
                "the unique largest alpha5 type, and compare exact key/product tables "
                "in both relational directions before deleting the temporary database"
            ),
            "cells": completed_cells,
            "aggregate": {
                "independently_enumerated_multisets": sum(
                    int(cell["independently_enumerated_multisets"])
                    for cell in completed_cells.values()
                ),
                "canonical_check_keys": sum(
                    int(cell["canonical_check_keys"]) for cell in completed_cells.values()
                ),
                "distinct_cell_crossing_jets_sum": sum(
                    int(cell["distinct_crossing_jets"]) for cell in completed_cells.values()
                ),
                "multiset_to_canonical_key_collisions": sum(
                    int(cell["multiset_to_canonical_key_collisions"])
                    for cell in completed_cells.values()
                ),
                "canonical_key_to_product_collisions": sum(
                    int(cell["canonical_key_to_product_collisions"])
                    for cell in completed_cells.values()
                ),
                "negative_Q8": 0,
                "zero_Q8": 0,
                "minimum_Q8": min(
                    int(cell["minimum_Q8"]) for cell in completed_cells.values()
                ),
                "maximum_Q8": max(
                    int(cell["maximum_Q8"]) for cell in completed_cells.values()
                ),
            },
            "resources": {
                "hard_limit_private_bytes": LIMIT,
                "abort_limit_private_bytes": ABORT_LIMIT,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "elapsed_seconds": elapsed,
            },
            "scope_warning": (
                "This audit covers alpha5 sources10 through13 only. Source9 is in "
                "its sealed pilot; alpha6 through9 remain."
            ),
            "hashes": {
                REPORT.name: digest(REPORT),
                DATABASE.name: digest(DATABASE),
                SOURCE.name: digest(SOURCE),
                BASE_DEPENDENCY.name: digest(BASE_DEPENDENCY),
                PILOT_DEPENDENCY.name: digest(PILOT_DEPENDENCY),
                AUDIT_DEPENDENCY.name: digest(AUDIT_DEPENDENCY),
                ALGEBRA_DEPENDENCY.name: digest(ALGEBRA_DEPENDENCY),
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
        aggregate = payload["aggregate"]
        print(payload["status"])
        print(
            f"raw={aggregate['independently_enumerated_multisets']} "
            f"keys={aggregate['canonical_check_keys']} "
            f"products={aggregate['distinct_cell_crossing_jets_sum']} "
            f"multiset_key_collisions={aggregate['multiset_to_canonical_key_collisions']} "
            f"key_product_collisions={aggregate['canonical_key_to_product_collisions']} "
            "negative=0 zero=0"
        )
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"audit_sha256={digest(OUTPUT)}")
        return 0
    except ResourceGate as error:
        stop_sampling.set()
        sampler.join(timeout=1)
        checkpoint = {
            "status": "ABORTED_CLEANLY_RANK8_ALPHA5_S10_13_AUDIT_RESOURCE_GATE",
            "reason": str(error),
            "completed_cells": completed_cells,
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
    except SignObstruction as error:
        obstruction = {
            "status": "EXACT_NEGATIVE_Q8_OBSTRUCTION_RANK8_ALPHA5_S10_13_AUDIT",
            "witness": error.witness,
            "completed_cells": completed_cells,
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
