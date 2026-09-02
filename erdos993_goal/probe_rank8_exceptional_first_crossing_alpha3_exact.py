#!/usr/bin/env python3
"""Exact terminal-alpha-three band of rank-eight exceptional first crossing."""

from __future__ import annotations

import csv
import hashlib
import json
import threading
import time
from pathlib import Path

from probe_rank8_exceptional_first_crossing_alpha2_exact import (
    LIMIT,
    RETAINED_RANK,
    digest,
    multiply,
    private_bytes,
    q8,
)


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
DEPENDENCY = ROOT / "probe_rank8_exceptional_first_crossing_alpha2_exact.py"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha3_exact_20260820.json"
THRESHOLD = 14
TERMINAL_ALPHA = 3
SOURCES = (11, 12, 13)


def load_jets_through_alpha3() -> tuple[tuple[int, tuple[int, ...], int], ...]:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert (
        classification["status"]
        == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    )
    assert classification["distinct_exceptional_jets"] == 1215
    assert [classification["distinct_by_alpha"][str(alpha)] for alpha in range(1, 4)] == [
        2,
        2,
        5,
    ]
    assert classification["hashes"][JETS.name] == digest(JETS)

    rows: list[tuple[int, tuple[int, ...], int]] = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            alpha = int(row["alpha"])
            polynomial = tuple(
                int(row[f"i{rank}"]) for rank in range(RETAINED_RANK + 1)
            )
            value = int(row["q8"])
            assert polynomial[0] == 1
            assert value == q8(polynomial)
            rows.append((alpha, polynomial, value))
    assert len(rows) == len(set(rows)) == 1215
    assert rows == sorted(rows)
    selected = tuple(row for row in rows if row[0] <= TERMINAL_ALPHA)
    assert len(selected) == 9
    assert tuple(alpha for alpha, _, _ in selected) == (1, 1, 2, 2, 3, 3, 3, 3, 3)
    assert all(value == 0 for _, _, value in selected)
    return selected


def main() -> int:
    started = time.perf_counter()
    peak = private_bytes()
    stop_sampling = threading.Event()

    def sample() -> None:
        nonlocal peak
        while not stop_sampling.wait(0.01):
            peak = max(peak, private_bytes())

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        jets = load_jets_through_alpha3()
        identity = (1,) + (0,) * RETAINED_RANK
        states = {alpha: set() for alpha in range(THRESHOLD)}
        states[0].add(identity)
        rows_by_source: dict[int, list[dict[str, object]]] = {
            source: [] for source in SOURCES
        }

        for component_index, (component_alpha, component, _) in enumerate(jets, 1):
            for target_alpha in range(component_alpha, THRESHOLD):
                for source in tuple(states[target_alpha - component_alpha]):
                    states[target_alpha].add(multiply(source, component))
            peak = max(peak, private_bytes())
            if peak >= LIMIT:
                raise MemoryError(
                    f"private-byte cap reached after closing type {component_index}: {peak}"
                )

            if component_alpha != TERMINAL_ALPHA:
                continue
            for source_alpha in SOURCES:
                for source in states[source_alpha]:
                    product = multiply(source, component)
                    value = q8(product)
                    row = {
                        "canonical_largest_type_index": component_index,
                        "source_alpha": source_alpha,
                        "terminal_alpha": TERMINAL_ALPHA,
                        "total_alpha": source_alpha + TERMINAL_ALPHA,
                        "source_i0_through_i9": list(source),
                        "product_i0_through_i9": list(product),
                        "Q8": value,
                    }
                    rows_by_source[source_alpha].append(row)
                    if value < 0:
                        raise AssertionError(
                            "exceptional first-crossing obstruction in exact alpha3 band",
                            row,
                        )
                peak = max(peak, private_bytes())
                if peak >= LIMIT:
                    raise MemoryError(
                        f"private-byte cap reached in source cell {source_alpha}: {peak}"
                    )

        state_counts = {str(alpha): len(states[alpha]) for alpha in range(THRESHOLD)}
        cells: dict[str, dict[str, object]] = {}
        all_values: list[int] = []
        union_products = set()
        for source_alpha in SOURCES:
            cell_rows = rows_by_source[source_alpha]
            cell_rows.sort(
                key=lambda row: (
                    row["canonical_largest_type_index"],
                    row["source_i0_through_i9"],
                )
            )
            values = [int(row["Q8"]) for row in cell_rows]
            products = {tuple(row["product_i0_through_i9"]) for row in cell_rows}
            union_products.update(products)
            assert values and min(values) > 0
            all_values.extend(values)
            cells[str(source_alpha)] = {
                "source_alpha": source_alpha,
                "terminal_alpha": TERMINAL_ALPHA,
                "total_alpha": source_alpha + TERMINAL_ALPHA,
                "ordered_covering_checks": len(cell_rows),
                "distinct_crossing_jets": len(products),
                "crossing_product_collisions": len(cell_rows) - len(products),
                "negative_Q8": sum(value < 0 for value in values),
                "zero_Q8": sum(value == 0 for value in values),
                "minimum_Q8": min(values),
                "maximum_Q8": max(values),
                "rows": cell_rows,
            }

        stop_sampling.set()
        sampler.join(timeout=1)
        peak = max(peak, private_bytes())
        elapsed = time.perf_counter() - started
        assert peak < LIMIT
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha3-v1",
            "status": "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA3_BAND",
            "scope": {
                "certified_cells": [
                    {
                        "source": source,
                        "terminal": TERMINAL_ALPHA,
                        "total": source + TERMINAL_ALPHA,
                    }
                    for source in SOURCES
                ],
                "terminal_component_type_indices": [5, 6, 7, 8, 9],
                "workers": 1,
                "warning": (
                    "This certifies the complete terminal-alpha3 band only; "
                    "terminal-alpha bands 4 through 9 remain."
                ),
            },
            "exact_recurrence": {
                "state_key": "(alpha,i1,...,i9), with i0=1 implicit",
                "product": "c_k=sum_{j=0}^k a_j*b_{k-j}, 0<=k<=9",
                "type_closure": (
                    "S[r,a]=S[r-1,a] union {truncate9(P*J_r): "
                    "P in S[r,a-alpha(J_r)]}"
                ),
                "symmetry": (
                    "each multiset is tested under its unique largest sorted type; "
                    "ascending alpha closes arbitrary repetitions"
                ),
                "Q8": "16*i8^2-i7*i8-18*i7*i9",
            },
            "partial_state_counts_by_alpha_after_type9": state_counts,
            "partial_states_total_after_type9": sum(state_counts.values()),
            "cells": cells,
            "aggregate": {
                "ordered_covering_checks": sum(
                    int(cell["ordered_covering_checks"]) for cell in cells.values()
                ),
                "distinct_cell_crossing_jets_sum": sum(
                    int(cell["distinct_crossing_jets"]) for cell in cells.values()
                ),
                "distinct_crossing_jets_union": len(union_products),
                "crossing_product_collisions_within_cells": sum(
                    int(cell["crossing_product_collisions"]) for cell in cells.values()
                ),
                "negative_Q8": sum(value < 0 for value in all_values),
                "zero_Q8": sum(value == 0 for value in all_values),
                "minimum_Q8": min(all_values),
                "maximum_Q8": max(all_values),
            },
            "resources": {
                "limit_private_bytes": LIMIT,
                "peak_private_bytes": peak,
                "peak_private_MiB": peak / 1024**2,
                "elapsed_seconds": elapsed,
            },
            "hashes": {
                JETS.name: digest(JETS),
                CLASSIFICATION.name: digest(CLASSIFICATION),
                DEPENDENCY.name: digest(DEPENDENCY),
                Path(__file__).name: digest(Path(__file__)),
            },
        }
        OUTPUT.write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        print(payload["status"])
        for source_alpha in SOURCES:
            cell = cells[str(source_alpha)]
            print(
                f"source={source_alpha} total={source_alpha+TERMINAL_ALPHA} "
                f"checks={cell['ordered_covering_checks']} "
                f"products={cell['distinct_crossing_jets']} "
                f"collisions={cell['crossing_product_collisions']} "
                f"negative={cell['negative_Q8']} zero={cell['zero_Q8']} "
                f"min_Q8={cell['minimum_Q8']} max_Q8={cell['maximum_Q8']}"
            )
        print(
            f"states={sum(state_counts.values())} elapsed_seconds={elapsed:.6f} "
            f"peak_private_bytes={peak}"
        )
        print(f"report_sha256={digest(OUTPUT)}")
        return 0
    finally:
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
