#!/usr/bin/env python3
"""Exact replay of the all-order raw two-pair selector factorization."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUT = HERE / "all_order_raw_two_pair_selector_exact_20260810.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def sigma4_weight(subset: frozenset[str], pair_a: frozenset[str], pair_b: frozenset[str]) -> int:
    assert len(subset) == 4
    return 24 - 2 * int(pair_a <= subset) - 2 * int(pair_b <= subset) + int(
        pair_a <= subset and pair_b <= subset
    )


def claimed_weight(subset: frozenset[str], d: int, pair_a: frozenset[str], pair_b: frozenset[str]) -> int:
    return (
        math.factorial(d)
        - math.factorial(d - 2) * int(pair_a <= subset)
        - math.factorial(d - 2) * int(pair_b <= subset)
        + math.factorial(d - 4) * int(pair_a <= subset and pair_b <= subset)
    )


def main() -> None:
    checks = []
    coefficient_checks = 0
    for M in range(0, 13):
        ordinary = [f"x{i}" for i in range(M)]
        pair_a = frozenset(("a1", "a2"))
        pair_b = frozenset(("b1", "b2"))
        ground = ordinary + ["a1", "a2", "b1", "b2"]
        for d in range(4, M + 5):
            by_type = {}
            for raw_subset in itertools.combinations(ground, d):
                subset = frozenset(raw_subset)
                # Coefficient of the squarefree product e_(d-4) *_sf Sigma_4:
                # sum Sigma_4(T) over all four-subsets T of the final d-set.
                convolution = math.factorial(d - 4) * sum(
                    sigma4_weight(frozenset(T), pair_a, pair_b)
                    for T in itertools.combinations(subset, 4)
                )
                claimed = claimed_weight(subset, d, pair_a, pair_b)
                assert convolution == claimed
                assert claimed > 0
                coefficient_checks += 1
                typ = (int(pair_a <= subset), int(pair_b <= subset))
                by_type.setdefault(str(typ), claimed)
                assert by_type[str(typ)] == claimed
            checks.append({"M": M, "d": d, "weights_by_completed_pairs": by_type})

    report = {
        "status": "PASS",
        "theorem": (
            "Sigma_(M,d)=(d-4)! MAP(e_(d-4)(V) Sigma_(M,4)); hence Sigma_(M,d) "
            "is real stable by elementary-symmetric stability and Sinclair squarefree-product closure."
        ),
        "coefficient_formula": (
            "d! -(d-2)!*1[pair A completed] -(d-2)!*1[pair B completed] "
            "+(d-4)!*1[both completed]"
        ),
        "strict_coefficient_positivity": True,
        "finite_exact_replay": {
            "M_range": "0..12",
            "d_range": "4..M+4",
            "cells": len(checks),
            "coefficient_checks": coefficient_checks,
            "checks": checks,
        },
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": "PASS",
                "report": str(OUT),
                "cells": len(checks),
                "coefficient_checks": coefficient_checks,
            }
        )
    )


if __name__ == "__main__":
    main()
