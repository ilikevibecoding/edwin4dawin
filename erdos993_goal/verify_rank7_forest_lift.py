#!/usr/bin/env python3
"""Exact conditional lift of the rank-seven Q7 reserve from trees to forests.

This replay deliberately separates the finite structural lift from its two
all-order inputs.  It proves:

* every tree factor which is not already in the rank-seven high/low cone is
  one of the stream-extracted exceptional jets;
* adjoining any exceptional jet to either full cone preserves Q7;
* a forest made only of exceptional components has Q7>=0 when its total
  independence number first reaches 12.

Together with (i) Q7 for every tree of alpha>=12 and (ii) closure of all
three full/full cones, these statements imply Q7 for every forest of
alpha>=12.

The first-crossing computation uses SQLite as an exact disk-backed set, so
resident memory does not scale with the number of reachable forest jets.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import sqlite3
import time
from pathlib import Path

from flint import fmpz_mpoly_ctx

from explore_rank7_three_halves_convolution import (
    factorial_convolution,
    high_factor,
    low_factor,
    rank7_margin,
)
from verify_rank4_three_halves_forest_certificate import polynomial_statistics


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank7_exceptional_small_tree_jets_exact_20260816.tsv"
CLASSIFICATION = ROOT / "rank7_exceptional_small_tree_jets_exact_20260816.json"
DB = ROOT / "rank7_first_crossing_states_exact_20260816.sqlite3"
REPORT = ROOT / "rank7_forest_lift_conditional_exact_20260816.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q7(polynomial: tuple[int, ...]) -> int:
    return (
        14 * polynomial[7] * polynomial[7]
        - polynomial[6] * polynomial[7]
        - 16 * polynomial[6] * polynomial[8]
    )


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * 9
    for i, a in enumerate(left):
        if not a:
            continue
        for j in range(9 - i):
            b = right[j]
            if b:
                out[i + j] += a * b
    return tuple(out)


def load_exceptional_jets() -> tuple[tuple[int, tuple[int, ...]], ...]:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_STREAM_RANK7_EXCEPTIONAL_SMALL_TREE_JETS"
    assert classification["tree_occurrences"] == 9_114_285
    assert classification["distinct_exceptional_jets"] == 307
    assert classification["hashes"][JETS.name] == sha256(JETS)
    rows: list[tuple[int, tuple[int, ...]]] = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            alpha = int(row["alpha"])
            polynomial = tuple(int(row[f"i{rank}"]) for rank in range(9))
            claimed = int(row["q7"])
            assert polynomial[0] == 1
            assert polynomial[1] >= alpha
            assert q7(polynomial) == claimed
            assert alpha <= 6 or claimed < 0
            rows.append((alpha, polynomial))
    assert len(rows) == len(set(rows)) == 307
    assert sum(alpha <= 6 for alpha, _ in rows) == 247
    assert sum(alpha == 7 for alpha, _ in rows) == 56
    assert sum(alpha == 8 for alpha, _ in rows) == 4
    return tuple(rows)


def full_context(mode: str):
    if mode == "high":
        context = fmpz_mpoly_ctx.get(
            ("h", "t", "d0", "d1", "d2", "d3", "d4", "d5", "d6"),
            "degrevlex",
        )
        h, t, *slacks = context.gens()
        factor = high_factor(h, t, slacks, context.constant(1))
    elif mode == "low":
        context = fmpz_mpoly_ctx.get(
            ("a", "b", "t", "d0", "d2", "d3", "d4", "d5", "d6"),
            "degrevlex",
        )
        a, b, t, *slacks = context.gens()
        h = a + b
        factor = low_factor(h, a, t, slacks, context.constant(1))
    else:
        raise ValueError(mode)
    return context, h, factor


def scaled_fixed(polynomial: tuple[int, ...], h, zero):
    return [
        math.factorial(rank) * 2**rank * coefficient * h**rank
        for rank, coefficient in enumerate(polynomial)
    ]


def fixed_full_certificate(mode: str) -> dict[str, object]:
    jets = load_exceptional_jets()
    context, h, full = full_context(mode)
    zero = context.constant(0)
    total_terms = 0
    minimum = None
    maximum = None
    by_alpha: dict[int, dict[str, int | None]] = {}
    start = time.monotonic()
    for index, (alpha, polynomial) in enumerate(jets, 1):
        fixed = scaled_fixed(polynomial, h, zero)
        product = factorial_convolution(fixed, full, zero)
        margin = rank7_margin(product, h)
        stats = polynomial_statistics(margin)
        assert stats["negative"] == 0, (mode, alpha, polynomial, stats)
        assert stats["minimum"] >= 0, (mode, alpha, polynomial, stats)
        total_terms += stats["terms"]
        minimum = stats["minimum"] if minimum is None else min(minimum, stats["minimum"])
        maximum = stats["maximum"] if maximum is None else max(maximum, stats["maximum"])
        group = by_alpha.setdefault(alpha, {"cases": 0, "terms": 0, "minimum": None})
        group["cases"] += 1
        group["terms"] += stats["terms"]
        old_minimum = group["minimum"]
        group["minimum"] = stats["minimum"] if old_minimum is None else min(old_minimum, stats["minimum"])
        if index % 25 == 0 or index == len(jets):
            print(f"fixed-{mode} {index}/{len(jets)} terms={total_terms}", flush=True)
    return {
        "mode": mode,
        "cases": len(jets),
        "terms": total_terms,
        "negative_coefficients": 0,
        "minimum_coefficient": minimum,
        "maximum_coefficient": maximum,
        "by_alpha": {str(key): value for key, value in sorted(by_alpha.items())},
        "elapsed_seconds": round(time.monotonic() - start, 3),
    }


STATE_COLUMNS = ",".join(f"i{rank} TEXT NOT NULL" for rank in range(9))
STATE_KEYS = ",".join(["alpha"] + [f"i{rank}" for rank in range(9)])


def encode_state(alpha: int, polynomial: tuple[int, ...]) -> tuple[object, ...]:
    # Decimal text avoids SQLite's signed-64-bit limit while remaining exact.
    return (alpha, *(str(value) for value in polynomial))


def decode_polynomial(row: tuple[object, ...]) -> tuple[int, ...]:
    return tuple(int(value) for value in row)


def crossing_certificate(rebuild: bool = True) -> dict[str, object]:
    jets = load_exceptional_jets()
    if rebuild and DB.exists():
        DB.unlink()
    connection = sqlite3.connect(DB)
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA synchronous=NORMAL")
    connection.execute("PRAGMA temp_store=FILE")
    connection.execute("PRAGMA cache_size=-131072")  # at most 128 MiB
    connection.execute(
        f"CREATE TABLE IF NOT EXISTS states (alpha INTEGER NOT NULL,{STATE_COLUMNS},"
        f"PRIMARY KEY ({STATE_KEYS})) WITHOUT ROWID"
    )
    connection.execute(
        f"CREATE TABLE IF NOT EXISTS crossings (alpha INTEGER NOT NULL,{STATE_COLUMNS},"
        f"PRIMARY KEY ({STATE_KEYS})) WITHOUT ROWID"
    )
    connection.execute(
        "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
    )
    if not rebuild:
        saved = dict(connection.execute("SELECT key,value FROM meta"))
        if saved.get("status") == "PASS":
            result = json.loads(saved["result"])
            connection.close()
            return result
        raise RuntimeError("existing crossing database is incomplete; rerun with --rebuild")

    connection.execute(
        f"INSERT INTO states ({STATE_KEYS}) VALUES ({','.join('?' for _ in range(10))})",
        encode_state(0, (1, 0, 0, 0, 0, 0, 0, 0, 0)),
    )
    connection.commit()

    crossing_checks = 0
    crossing_minimum = None
    crossing_witness = None
    start = time.monotonic()

    # Process component types in fixed sorted order.  Ascending alpha gives
    # the unbounded-knapsack closure for repetitions of the current type.
    for component_index, (component_alpha, component) in enumerate(jets):
        for target_alpha in range(component_alpha, 12):
            source_alpha = target_alpha - component_alpha
            cursor = connection.execute(
                "SELECT i0,i1,i2,i3,i4,i5,i6,i7,i8 FROM states WHERE alpha=?",
                (source_alpha,),
            )
            batch = []
            for row in cursor:
                product = multiply(decode_polynomial(row), component)
                batch.append(encode_state(target_alpha, product))
                if len(batch) == 10_000:
                    connection.executemany(
                        f"INSERT OR IGNORE INTO states ({STATE_KEYS}) VALUES ({','.join('?' for _ in range(10))})",
                        batch,
                    )
                    batch.clear()
            if batch:
                connection.executemany(
                    f"INSERT OR IGNORE INTO states ({STATE_KEYS}) VALUES ({','.join('?' for _ in range(10))})",
                    batch,
                )

        # Every multiset whose largest type is this component is represented
        # by deleting one copy and taking the now-closed source state.
        for source_alpha in range(max(0, 12 - component_alpha), 12):
            total_alpha = source_alpha + component_alpha
            cursor = connection.execute(
                "SELECT i0,i1,i2,i3,i4,i5,i6,i7,i8 FROM states WHERE alpha=?",
                (source_alpha,),
            )
            for row in cursor:
                product = multiply(decode_polynomial(row), component)
                value = q7(product)
                assert value >= 0, (
                    component_index, source_alpha, component_alpha, component, product, value
                )
                crossing_checks += 1
                connection.execute(
                    f"INSERT OR IGNORE INTO crossings ({STATE_KEYS}) VALUES ({','.join('?' for _ in range(10))})",
                    encode_state(total_alpha, product),
                )
                if crossing_minimum is None or value < crossing_minimum:
                    crossing_minimum = value
                    crossing_witness = {
                        "component_index": component_index,
                        "source_alpha": source_alpha,
                        "component_alpha": component_alpha,
                        "total_alpha": total_alpha,
                        "component": list(component),
                        "product": list(product),
                        "Q7": value,
                    }
        connection.commit()
        if (component_index + 1) % 10 == 0 or component_index + 1 == len(jets):
            counts = dict(connection.execute("SELECT alpha,COUNT(*) FROM states GROUP BY alpha"))
            print(
                f"crossing component={component_index+1}/{len(jets)} "
                f"states={sum(counts.values())} checks={crossing_checks}",
                flush=True,
            )

    state_counts = {
        str(alpha): count
        for alpha, count in connection.execute(
            "SELECT alpha,COUNT(*) FROM states GROUP BY alpha ORDER BY alpha"
        )
    }
    assert set(map(int, state_counts)) == set(range(12))
    assert crossing_minimum is not None and crossing_witness is not None
    crossing_counts = {
        str(alpha): count
        for alpha, count in connection.execute(
            "SELECT alpha,COUNT(*) FROM crossings GROUP BY alpha ORDER BY alpha"
        )
    }
    assert set(map(int, crossing_counts)).issubset(set(range(12, 23)))
    result = {
        "exceptional_component_types": len(jets),
        "partial_state_counts_by_alpha": state_counts,
        "partial_states_total": sum(state_counts.values()),
        "ordered_covering_checks": crossing_checks,
        "distinct_crossing_jets": sum(crossing_counts.values()),
        "distinct_crossing_jets_by_alpha": crossing_counts,
        "required_crossing_envelope": [12, 22],
        "realized_crossing_range": [min(map(int, crossing_counts)), max(map(int, crossing_counts))],
        "why_no_alpha_20_to_22_rows": (
            "the exact exceptional classification has maximum component alpha 8, "
            "so a first crossing from a partial alpha at most 11 has total alpha at most 19"
        ),
        "negative_crossings": 0,
        "minimum_Q7": crossing_minimum,
        "minimum_witness": crossing_witness,
        "elapsed_seconds": round(time.monotonic() - start, 3),
    }
    connection.execute("INSERT OR REPLACE INTO meta VALUES ('status','PASS')")
    connection.execute(
        "INSERT OR REPLACE INTO meta VALUES ('result',?)", (json.dumps(result, sort_keys=True),)
    )
    connection.commit()
    connection.close()
    return result


def write_report(parts: dict[str, object]) -> dict[str, object]:
    required_parts = ("fixed_high", "fixed_low", "first_crossing")
    complete = all(key in parts for key in required_parts)
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_STREAM_RANK7_EXCEPTIONAL_SMALL_TREE_JETS"
    report = {
        "status": (
            "PASS_EXACT_CONDITIONAL_ALL_FOREST_RANK7_Q7_LIFT"
            if complete
            else "INCOMPLETE_RANK7_FOREST_Q7_LIFT_REPLAY"
        ),
        "conditional_theorem": (
            "If Q7>=0 for every tree with alpha>=12 and the rank-seven "
            "high/high, low/high, and low/low convolution cones are "
            "nonnegative, then Q7>=0 for every forest with alpha>=12."
        ),
        "exceptional_tree_classification": {
            "all_order_bound": (
                "A tree with alpha<=11 has order<=22 by bipartiteness; "
                "the streaming extractor exhausts all 9,114,285 trees "
                "through order 22."
            ),
            "distinct_exceptional_jets": 307,
            "definition": "alpha<=6 or Q7<0",
            "alpha_counts": {"1": 2, "2": 2, "3": 5, "4": 15, "5": 48, "6": 175, "7": 56, "8": 4},
            "no_exception_above_order_14": True,
            "classification_report": CLASSIFICATION.name,
        },
        **parts,
        "logic": [
            "Every component with alpha>=12 is full by the connected-tree input.",
            "Every component with alpha<=11 has order<=22 and is either full or one of the 307 exceptional jets.",
            "Start from any full component and adjoin full components by a convolution cone and exceptional components by fixed/full preservation.",
            "If every component is exceptional, order them by jet index; immediately before total alpha first reaches 12 the partial alpha is <=11, and the exhaustive crossing replay proves the new product is full.",
            "Adjoin all remaining components by the two preservation rules.",
        ],
        "missing_replay_parts": [key for key in required_parts if key not in parts],
        "still_required_inputs": [
            "an all-order proof of Q7>=0 for every connected tree with alpha>=12",
            "completed exact proofs of the full low/high and low/low off-face convolution cones",
        ],
        "hashes": {
            CLASSIFICATION.name: sha256(CLASSIFICATION),
            JETS.name: sha256(JETS),
            "extract_rank7_exceptional_small_tree_jets.rs": sha256(ROOT / "extract_rank7_exceptional_small_tree_jets.rs"),
            "replay_rank7_exceptional_small_tree_jets.py": sha256(ROOT / "replay_rank7_exceptional_small_tree_jets.py"),
            Path(__file__).name: sha256(Path(__file__)),
        },
    }
    if complete:
        assert parts["fixed_high"]["negative_coefficients"] == 0
        assert parts["fixed_low"]["negative_coefficients"] == 0
        assert parts["first_crossing"]["negative_crossings"] == 0
        assert parts["fixed_high"]["cases"] == classification["distinct_exceptional_jets"]
        assert parts["fixed_low"]["cases"] == classification["distinct_exceptional_jets"]
        assert parts["first_crossing"]["exceptional_component_types"] == classification["distinct_exceptional_jets"]
        database = sqlite3.connect(f"file:{DB.as_posix()}?mode=ro", uri=True)
        saved = dict(database.execute("SELECT key,value FROM meta"))
        assert saved["status"] == "PASS"
        assert json.loads(saved["result"]) == parts["first_crossing"]
        assert database.execute("SELECT COUNT(*) FROM states").fetchone()[0] == parts["first_crossing"]["partial_states_total"]
        assert database.execute("SELECT COUNT(*) FROM crossings").fetchone()[0] == parts["first_crossing"]["distinct_crossing_jets"]
        database.close()
        report["hashes"][DB.name] = sha256(DB)
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--case",
        choices=("fixed-high", "fixed-low", "crossing", "assemble", "all"),
        required=True,
    )
    parser.add_argument("--rebuild", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    parts: dict[str, object] = {}
    old = json.loads(REPORT.read_text(encoding="utf-8")) if REPORT.exists() else {}
    if args.case in ("fixed-high", "all"):
        parts["fixed_high"] = fixed_full_certificate("high")
    if args.case in ("fixed-low", "all"):
        parts["fixed_low"] = fixed_full_certificate("low")
    if args.case in ("crossing", "all"):
        parts["first_crossing"] = crossing_certificate(rebuild=args.rebuild or args.case == "all")
    if args.case == "assemble":
        for key in ("fixed_high", "fixed_low", "first_crossing"):
            assert key in old, f"missing {key}; run its replay first"
            parts[key] = old[key]
    elif old:
        for key in ("fixed_high", "fixed_low", "first_crossing"):
            if key not in parts and key in old:
                parts[key] = old[key]
    report = write_report(parts)
    print(report["status"])
    print(f"report_sha256={sha256(REPORT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
