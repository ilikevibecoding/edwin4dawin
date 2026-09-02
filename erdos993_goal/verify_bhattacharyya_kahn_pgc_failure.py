#!/usr/bin/env python3
"""Exact negative control for the pendant GSB cascade.

Bhattacharyya--Kahn's bipartite graph has independence polynomial

    A_t = (2^t - 1) C(a,t) + C(b,t).

Attach a new leaf to one vertex on the b-vertex independent side.  Deleting
the leaf and its neighbour leaves the polynomial

    B_t = (2^t - 1) C(a,t) + C(b-1,t).

Thus the enlarged graph has coefficients Q_t=A_t+B_{t-1}.  The pendant
cascade is tested in its denominator-free form

    k B_{k-2} G_k(Q) >= (k-1) Q_{k-1} G_{k-1}(B).

This graph is bipartite but contains many cycles.  Its failure demonstrates
that any proof of the cascade for forests must use acyclicity.
"""

from __future__ import annotations

import json
from math import comb
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "bhattacharyya_kahn_pgc_failure_20260726.json"


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def bk_coefficients(a: int, b: int) -> list[int]:
    return [
        (2**t - 1) * choose(a, t) + choose(b, t)
        for t in range(max(a, b) + 1)
    ]


def coefficient(poly: list[int], k: int) -> int:
    return poly[k] if 0 <= k < len(poly) else 0


def gsb(poly: list[int], k: int) -> int:
    previous = coefficient(poly, k - 1)
    current = coefficient(poly, k)
    following = coefficient(poly, k + 1)
    return (
        k * current * current
        + previous * current
        - (k + 1) * previous * following
    )


def main() -> None:
    a, b = 95, 151
    old = bk_coefficients(a, b)
    deletion = bk_coefficients(a, b - 1)
    enlarged = [
        coefficient(old, t) + coefficient(deletion, t - 1)
        for t in range(max(len(old), len(deletion) + 1))
    ]

    alpha = max(t for t, value in enumerate(enlarged) if value)
    cutoff = (2 * alpha + 1) // 3
    failures = []
    for k in range(2, cutoff):
        left = k * coefficient(deletion, k - 2) * gsb(enlarged, k)
        right = (
            (k - 1)
            * coefficient(enlarged, k - 1)
            * gsb(deletion, k - 1)
        )
        difference = left - right
        if difference < 0:
            failures.append(
                {
                    "rank": k,
                    "left": left,
                    "right": right,
                    "difference": difference,
                    "digits_in_abs_difference": len(str(-difference)),
                }
            )

    assert alpha == 151
    assert cutoff == 101
    assert [item["rank"] for item in failures] == [68, 69, 70, 71, 72, 73]

    payload = {
        "status": "PASS (expected negative control reproduced)",
        "construction": {
            "a": a,
            "b": b,
            "old_coefficient_formula": "(2^t-1) C(a,t) + C(b,t)",
            "pendant_deletion_formula": "(2^t-1) C(a,t) + C(b-1,t)",
            "enlarged_formula": "Q_t=A_t+B_(t-1)",
            "graph_class": "bipartite with cycles",
        },
        "alpha_enlarged": alpha,
        "prefix_cutoff": cutoff,
        "tested_ranks": [2, cutoff - 1],
        "failure_ranks": [item["rank"] for item in failures],
        "failures": failures,
        "conclusion": (
            "PGC is false for general bipartite graphs with a pendant edge; "
            "the surviving conjecture is specifically for forests."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    print(payload["status"])
    print("alpha:", alpha, "cutoff:", cutoff)
    print("failure ranks:", payload["failure_ranks"])
    print("first difference:", failures[0]["difference"])
    print("output:", OUTPUT.name)


if __name__ == "__main__":
    main()
