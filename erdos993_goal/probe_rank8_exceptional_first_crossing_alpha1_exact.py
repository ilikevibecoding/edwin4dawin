#!/usr/bin/env python3
"""Exact smallest-band pilot for rank-eight exceptional first crossing.

This intentionally runs only the alpha split source=13, terminal=1.  It is
the first nonempty band of the full threshold-14 recurrence, not a complete
exceptional-only first-crossing certificate.
"""

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
OUTPUT = ROOT / "rank8_exceptional_first_crossing_alpha1_pilot_exact_20260820.json"
LIMIT = 512 * 1024**2
THRESHOLD = 14
RETAINED_RANK = 9


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
    # Ordinary independence-polynomial convolution, truncated exactly at i9.
    return tuple(
        sum(left[index] * right[rank - index] for index in range(rank + 1))
        for rank in range(RETAINED_RANK + 1)
    )


def load_alpha1_jets() -> tuple[tuple[int, tuple[int, ...], int], ...]:
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert (
        classification["status"]
        == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    )
    assert classification["distinct_exceptional_jets"] == 1215
    assert classification["distinct_by_alpha"]["1"] == 2
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
    alpha1 = tuple(row for row in rows if row[0] == 1)
    assert alpha1 == (
        (1, (1, 1, 0, 0, 0, 0, 0, 0, 0, 0), 0),
        (1, (1, 2, 0, 0, 0, 0, 0, 0, 0, 0), 0),
    )
    return alpha1


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
        jets = load_alpha1_jets()

        # S[r,a] is represented in place after type r is closed.  Ascending
        # alpha realizes S[r,a] = S[r-1,a] union J_r*S[r,a-alpha(J_r)], so
        # arbitrary repetition is exact while component permutations vanish.
        identity = (1,) + (0,) * RETAINED_RANK
        states = {alpha: set() for alpha in range(THRESHOLD)}
        states[0].add(identity)
        covering_rows: list[dict[str, object]] = []

        for component_index, (component_alpha, component, _) in enumerate(jets, 1):
            assert component_alpha == 1
            for target_alpha in range(component_alpha, THRESHOLD):
                source_alpha = target_alpha - component_alpha
                for source in tuple(states[source_alpha]):
                    states[target_alpha].add(multiply(source, component))

            # This pilot is exactly the source=13, terminal=1 split.
            source_alpha = THRESHOLD - component_alpha
            assert source_alpha == 13
            for source in states[source_alpha]:
                product = multiply(source, component)
                value = q8(product)
                # i1=14+m where m is the multiplicity of the (1+2x) type.
                second_type_multiplicity = product[1] - THRESHOLD
                assert 0 <= second_type_multiplicity <= THRESHOLD
                covering_rows.append(
                    {
                        "canonical_largest_type_index": component_index,
                        "source_alpha": source_alpha,
                        "terminal_alpha": component_alpha,
                        "total_alpha": source_alpha + component_alpha,
                        "alpha1_second_type_multiplicity": second_type_multiplicity,
                        "product_i0_through_i9": list(product),
                        "Q8": value,
                    }
                )
                if value < 0:
                    raise AssertionError(
                        "exceptional first-crossing obstruction in exact alpha1 pilot",
                        covering_rows[-1],
                    )

        covering_rows.sort(key=lambda row: row["alpha1_second_type_multiplicity"])
        state_counts = {str(alpha): len(states[alpha]) for alpha in range(THRESHOLD)}
        crossing_products = {
            tuple(row["product_i0_through_i9"]) for row in covering_rows
        }
        assert state_counts == {str(alpha): alpha + 1 for alpha in range(THRESHOLD)}
        assert len(covering_rows) == len(crossing_products) == 15
        assert [row["alpha1_second_type_multiplicity"] for row in covering_rows] == list(
            range(15)
        )
        assert all(row["total_alpha"] == 14 for row in covering_rows)
        assert all(row["Q8"] > 0 for row in covering_rows)

        peak = max(peak, private_bytes())
        elapsed = time.perf_counter() - started
        payload = {
            "schema": "rank8-exceptional-first-crossing-alpha1-pilot-v1",
            "status": "PASS_EXACT_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALPHA1_PILOT",
            "scope": {
                "certified_alpha_split": {"source": 13, "terminal": 1, "total": 14},
                "terminal_component_types": 2,
                "workers": 1,
                "warning": (
                    "This certifies only the smallest alpha1 first-crossing band; "
                    "it is not the complete exceptional-only first-crossing theorem."
                ),
            },
            "exact_reduction": {
                "state_key": "(alpha,i1,...,i9), with i0=1 implicit",
                "partial_alpha_range": [0, 13],
                "component_alpha_range": [1, 9],
                "crossing_alpha_range": [14, 22],
                "product_recurrence": "c_k=sum_{j=0}^k a_j*b_{k-j}, 0<=k<=9",
                "type_recurrence": (
                    "S[r,a]=S[r-1,a] union {truncate9(P*J_r): "
                    "P in S[r,a-alpha(J_r)]}"
                ),
                "crossing_rule": (
                    "after closing type r, test truncate9(P*J_r) for P in S[r,s], "
                    "s<=13 and s+alpha(J_r)>=14"
                ),
                "symmetry": (
                    "each exceptional multiset is assigned to its unique largest "
                    "sorted jet type; ascending alpha permits all repetitions"
                ),
                "Q8": "16*i8^2-i7*i8-18*i7*i9",
            },
            "pilot": {
                "partial_state_counts_by_alpha": state_counts,
                "partial_states_total": sum(state_counts.values()),
                "ordered_covering_checks": len(covering_rows),
                "distinct_crossing_jets": len(crossing_products),
                "negative_Q8": 0,
                "zero_Q8": sum(row["Q8"] == 0 for row in covering_rows),
                "minimum_Q8": min(row["Q8"] for row in covering_rows),
                "maximum_Q8": max(row["Q8"] for row in covering_rows),
                "rows": covering_rows,
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
        assert peak < LIMIT
        OUTPUT.write_text(
            json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        print(payload["status"])
        print(f"checks={len(covering_rows)} negative=0 zero=0")
        print(
            f"min_Q8={payload['pilot']['minimum_Q8']} "
            f"max_Q8={payload['pilot']['maximum_Q8']}"
        )
        print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}")
        print(f"report_sha256={digest(OUTPUT)}")
        return 0
    finally:
        stop_sampling.set()
        sampler.join(timeout=1)


if __name__ == "__main__":
    raise SystemExit(main())
