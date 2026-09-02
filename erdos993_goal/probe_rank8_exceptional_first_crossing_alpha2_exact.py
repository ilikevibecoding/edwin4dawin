#!/usr/bin/env python3
"""Exact terminal-alpha-two band of rank-eight exceptional first crossing."""

from __future__ import annotations

import csv
import ctypes
import hashlib
import json
import threading
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha2_exact_20260820.json"
THRESHOLD = 14
RETAINED_RANK = 9
LIMIT = 512 * 1024**2


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.c_ulong),
        ("PageFaultCount", ctypes.c_ulong),
        ("PeakWorkingSetSize", ctypes.c_size_t),
        ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
        ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
    ]


def private_bytes() -> int:
    counters = PROCESS_MEMORY_COUNTERS_EX()
    counters.cb = ctypes.sizeof(counters)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    psapi = ctypes.WinDLL("psapi", use_last_error=True)
    kernel32.GetCurrentProcess.restype = ctypes.c_void_p
    psapi.GetProcessMemoryInfo.argtypes = (
        ctypes.c_void_p,
        ctypes.POINTER(PROCESS_MEMORY_COUNTERS_EX),
        ctypes.c_ulong,
    )
    psapi.GetProcessMemoryInfo.restype = ctypes.c_int
    ok = psapi.GetProcessMemoryInfo(
        kernel32.GetCurrentProcess(), ctypes.byref(counters), counters.cb
    )
    if not ok:
        raise ctypes.WinError()
    return int(counters.PrivateUsage)


def q8(polynomial: tuple[int, ...]) -> int:
    return (
        16 * polynomial[8] * polynomial[8]
        - polynomial[7] * polynomial[8]
        - 18 * polynomial[7] * polynomial[9]
    )


def multiply(
    left: tuple[int, ...], right: tuple[int, ...]
) -> tuple[int, ...]:
    return tuple(
        sum(left[index] * right[rank - index] for index in range(rank + 1))
        for rank in range(RETAINED_RANK + 1)
    )


def load_jets_through_alpha2() -> tuple[tuple[int, tuple[int, ...], int], ...]:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert (
        classification["status"]
        == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    )
    assert classification["distinct_exceptional_jets"] == 1215
    assert classification["distinct_by_alpha"]["1"] == 2
    assert classification["distinct_by_alpha"]["2"] == 2
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
    selected = tuple(row for row in rows if row[0] <= 2)
    assert selected == (
        (1, (1, 1, 0, 0, 0, 0, 0, 0, 0, 0), 0),
        (1, (1, 2, 0, 0, 0, 0, 0, 0, 0, 0), 0),
        (2, (1, 3, 1, 0, 0, 0, 0, 0, 0, 0), 0),
        (2, (1, 4, 3, 0, 0, 0, 0, 0, 0, 0), 0),
    )
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
        jets = load_jets_through_alpha2()
        identity = (1,) + (0,) * RETAINED_RANK
        states = {alpha: set() for alpha in range(THRESHOLD)}
        states[0].add(identity)
        rows_by_source: dict[int, list[dict[str, object]]] = {12: [], 13: []}

        # Fixed type order plus ascending alpha is the exact unbounded-multiset
        # recurrence.  Only types 3 and 4 belong to this terminal-alpha band.
        for component_index, (component_alpha, component, _) in enumerate(jets, 1):
            for target_alpha in range(component_alpha, THRESHOLD):
                for source in tuple(states[target_alpha - component_alpha]):
                    states[target_alpha].add(multiply(source, component))
            peak = max(peak, private_bytes())
            if peak >= LIMIT:
                raise MemoryError(
                    f"private-byte cap reached after closing type {component_index}: {peak}"
                )

            if component_alpha != 2:
                continue
            for source_alpha in (12, 13):
                for source in states[source_alpha]:
                    product = multiply(source, component)
                    value = q8(product)
                    row = {
                        "canonical_largest_type_index": component_index,
                        "source_alpha": source_alpha,
                        "terminal_alpha": component_alpha,
                        "total_alpha": source_alpha + component_alpha,
                        "source_i0_through_i9": list(source),
                        "product_i0_through_i9": list(product),
                        "Q8": value,
                    }
                    rows_by_source[source_alpha].append(row)
                    if value < 0:
                        raise AssertionError(
                            "exceptional first-crossing obstruction in exact alpha2 band",
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
        for source_alpha in (12, 13):
            cell_rows = rows_by_source[source_alpha]
            cell_rows.sort(
                key=lambda row: (
                    row["canonical_largest_type_index"],
                    row["source_i0_through_i9"],
                )
            )
            values = [int(row["Q8"]) for row in cell_rows]
            products = {tuple(row["product_i0_through_i9"]) for row in cell_rows}
            assert values and min(values) > 0
            all_values.extend(values)
            cells[str(source_alpha)] = {
                "source_alpha": source_alpha,
                "terminal_alpha": 2,
                "total_alpha": source_alpha + 2,
                "ordered_covering_checks": len(cell_rows),
                "distinct_crossing_jets": len(products),
                "negative_Q8": sum(value < 0 for value in values),
                "zero_Q8": sum(value == 0 for value in values),
                "minimum_Q8": min(values),
                "maximum_Q8": max(values),
                "rows": cell_rows,
            }

        # Freeze the sampler before recording the report so the printed and
        # serialized peak are the same final measurement.
        stop_sampling.set()
        sampler.join(timeout=1)
        peak = max(peak, private_bytes())
        elapsed = time.perf_counter() - started
        assert peak < LIMIT
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha2-v1",
            "status": "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA2_BAND",
            "scope": {
                "certified_cells": [
                    {"source": 12, "terminal": 2, "total": 14},
                    {"source": 13, "terminal": 2, "total": 15},
                ],
                "terminal_component_type_indices": [3, 4],
                "workers": 1,
                "warning": (
                    "This certifies the complete terminal-alpha2 band only; "
                    "terminal-alpha bands 3 through 9 remain."
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
            "partial_state_counts_by_alpha_after_type4": state_counts,
            "partial_states_total_after_type4": sum(state_counts.values()),
            "cells": cells,
            "aggregate": {
                "ordered_covering_checks": sum(
                    int(cell["ordered_covering_checks"]) for cell in cells.values()
                ),
                "distinct_cell_crossing_jets_sum": sum(
                    int(cell["distinct_crossing_jets"]) for cell in cells.values()
                ),
                "distinct_crossing_jets_union": len(
                    {
                        tuple(row["product_i0_through_i9"])
                        for cell in cells.values()
                        for row in cell["rows"]
                    }
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
                Path(__file__).name: digest(Path(__file__)),
            },
        }
        OUTPUT.write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        print(payload["status"])
        for source_alpha in (12, 13):
            cell = cells[str(source_alpha)]
            print(
                f"source={source_alpha} total={source_alpha+2} "
                f"checks={cell['ordered_covering_checks']} "
                f"products={cell['distinct_crossing_jets']} "
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
