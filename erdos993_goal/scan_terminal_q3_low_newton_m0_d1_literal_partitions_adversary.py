#!/usr/bin/env python3
"""Exact partition-quotiented search for the literal d=1 terminal-m0 face.

Search evidence only.  Arm permutations are quotiented by integer partitions;
no independent H/K endpoint relaxation is used.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from functools import lru_cache
from pathlib import Path

from prove_balanced_subdivided_star_d1_m0_hk_exchange_adversary import (
    objective,
    rows,
)
from scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary import (
    balanced_motifs,
    exact_coefficients,
)


ROOT = Path(__file__).resolve().parent
DEFAULT_OUTPUT = ROOT / "terminal_q3_low_newton_m0_d1_literal_partitions_exact_search_20260829.json"
DEPENDENCY = ROOT / "prove_balanced_subdivided_star_d1_m0_hk_exchange_adversary.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


@lru_cache(maxsize=None)
def partitions(total: int, parts: int, minimum: int = 1) -> tuple[tuple[int, ...], ...]:
    if parts == 0:
        return ((),) if total == 0 else ()
    output = []
    maximum_first = total // parts
    for first in range(minimum, maximum_first + 1):
        for tail in partitions(total - first, parts - 1, first):
            output.append((first,) + tail)
    return tuple(output)


def is_one_three_long(shape: tuple[int, ...]) -> bool:
    return sum(value not in (1, 3) for value in shape) <= 1


def scan(maximum_order: int) -> dict[str, object]:
    shapes = supported = 0
    global_minimum = None
    global_unretained_minimum = None
    negative = []
    unretained_negative = []
    non_one_three_long = []
    exchange_sign_examples: dict[str, object] = {}
    for N in range(15, maximum_order + 1):
        for R in range(1, N - 1):
            T = N - 1 - R
            A2, B2, B3, _ = balanced_motifs(1, R)
            for Y in range(1, min(R, T) + 1):
                tau = B3 + (R - 1) * (Y - 1)
                coefficients = {
                    j: exact_coefficients(N, j, 1, R, T, Y, B2, A2, tau)
                    for j in range(4, N + 1)
                }
                local: dict[int, tuple[int, tuple[int, ...]]] = {}
                local_unretained: dict[int, tuple[int, tuple[int, ...]]] = {}
                for shape in partitions(T, Y):
                    maximum = N + 1
                    H, K = rows(shape, R - Y, maximum)
                    F = [H[k] + (K[k - 1] if k else 0) for k in range(maximum + 1)]
                    shapes += 1
                    for j in range(4, N + 1):
                        if F[j] == 0:
                            continue
                        data = coefficients[j]
                        A, B = data["Cf"], data["Cb"]
                        D = B + data["Ch"]
                        unretained_value = objective(H, K, j, A, B, D)
                        old_record = (unretained_value, shape)
                        if j not in local_unretained or old_record < local_unretained[j]:
                            local_unretained[j] = old_record
                        # Exact U0 row is f_(j+1)+h_j+f_j+h_(j-1).
                        # The earlier shared-q3 certificate dropped h_(j-1),
                        # even though its coefficient Cf is positive.
                        value = unretained_value + data["Cf"] * H[j - 1]
                        supported += 1
                        record = (value, shape)
                        if j not in local or record < local[j]:
                            local[j] = record
                for j, (value, shape) in local.items():
                    record = (value, N, j, R, T, Y, shape)
                    if global_minimum is None or record < global_minimum:
                        global_minimum = record
                    if value < 0:
                        negative.append(record)
                    if not is_one_three_long(shape):
                        non_one_three_long.append(record)
                # Replay the deliberately weaker certificate separately so
                # the exact obstruction remains visible in the report.
                for j, (old, shape) in local_unretained.items():
                    old_record = (old, N, j, R, T, Y, shape)
                    if global_unretained_minimum is None or old_record < global_unretained_minimum:
                        global_unretained_minimum = old_record
                    if old < 0:
                        unretained_negative.append(old_record)
    return {
        "orders": [15, maximum_order],
        "partition_shapes": shapes,
        "supported_rank_checks": supported,
        "global_minimum": global_minimum,
        "global_unretained_minimum": global_unretained_minimum,
        "negative_minima": len(negative),
        "first_negative_minima": negative[:20],
        "unretained_negative_cells": len(unretained_negative),
        "first_unretained_negative_cells": unretained_negative[:20],
        "non_one_three_long_minima": len(non_one_three_long),
        "first_non_one_three_long_minima": non_one_three_long[:20],
        "exchange_sign_examples": exchange_sign_examples,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--order", type=int, default=35)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    result = scan(args.order)
    payload = {
        "schema": "terminal-q3-low-newton-m0-d1-literal-partitions-search-v1",
        "status": (
            "SEARCH_EXACT_NO_NEGATIVE_D1_LITERAL_PARTITION_MINIMA"
            if result["negative_minima"] == 0
            else "SEARCH_EXACT_NEGATIVE_D1_LITERAL_PARTITION_MINIMA_FOUND"
        ),
        "result": result,
        "dependency_sha256": sha256(DEPENDENCY),
        "scope_warning": (
            "This is a finite exact search, not an all-order terminal-m0 proof."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, args.output)
    print(payload["status"])
    for key, value in result.items():
        print(key, value)
    print("source_sha256", payload["source_sha256"])
    print("report_sha256", sha256(args.output))


if __name__ == "__main__":
    main()
