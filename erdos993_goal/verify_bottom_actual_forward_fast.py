#!/usr/bin/env python3
"""Large exact audit of the actual-size forward-difference matrices.

The construction in :mod:`fast_bottom_forward` is cross-checked against the
original symbolic definition at small sizes, then used for exhaustive minors
through size 10 and complete two-sided Neville elimination through size 30.
"""

from __future__ import annotations

import json
from itertools import combinations
from math import comb
from pathlib import Path

import sympy as sp

from fast_bottom_forward import determinant, shifted_forward
from explore_bottom_forward_shifted_closure import shifted_forward as symbolic_forward


OUT = Path("bottom_actual_forward_fast_certificate_20260803.json")


def neville(matrix):
    work = [row[:] for row in matrix]
    multipliers = []
    for column in range(len(work) - 1):
        for row in range(len(work) - 1, column, -1):
            multiplier = work[row][column] / work[row - 1][column]
            multipliers.append(multiplier)
            for j in range(column, len(work)):
                work[row][j] -= multiplier * work[row - 1][j]
    pivots = [work[i][i] for i in range(len(work))]
    return multipliers, pivots


def exhaustive_positive_minors(matrix):
    n = len(matrix)
    positive = zero = negative = 0
    by_order = []
    for order in range(1, n + 1):
        local = 0
        for rows in combinations(range(n), order):
            for columns in combinations(range(n), order):
                value = determinant([[matrix[i][j] for j in columns] for i in rows])
                positive += value > 0
                zero += value == 0
                negative += value < 0
                local += 1
        by_order.append(local)
    assert zero == negative == 0
    assert positive == comb(2 * n, n) - 1
    return positive, by_order


def main() -> None:
    equivalence_checks = 0
    for n in range(1, 5):
        fast = shifted_forward(n, 0)
        symbolic = symbolic_forward(n, 0)
        for i in range(n):
            for j in range(n):
                value = sp.Rational(fast[i][j].numerator, fast[i][j].denominator)
                assert value == symbolic[i, j]
                equivalence_checks += 1

    exhaustive = []
    for n in range(1, 11):
        positive, by_order = exhaustive_positive_minors(shifted_forward(n, 0))
        exhaustive.append({"n": n, "positive_minors": positive, "by_order": by_order})
        print(f"n={n} exhaustive_positive_minors={positive}", flush=True)

    neville_records = []
    positive_neville_parameters = 0
    for n in range(1, 31):
        matrix = shifted_forward(n, 0)
        transpose = [list(row) for row in zip(*matrix)]
        parameters = []
        for orientation in (matrix, transpose):
            multipliers, pivots = neville(orientation)
            assert all(value > 0 for value in multipliers + pivots)
            parameters.extend(multipliers + pivots)
        positive_neville_parameters += len(parameters)
        neville_records.append({"n": n, "positive_parameters": len(parameters)})

    report = {
        "kind": "bottom_actual_forward_fast_certificate",
        "status": "PASS_EXACT_FORWARD_STP_AUDIT",
        "symbolic_equivalence_checks_n_le_4": equivalence_checks,
        "exhaustive_minor_range": [1, 10],
        "exhaustive_positive_minors": sum(item["positive_minors"] for item in exhaustive),
        "neville_range": [1, 30],
        "positive_two_sided_neville_parameters": positive_neville_parameters,
        "exhaustive_records": exhaustive,
        "neville_records": neville_records,
        "scope": (
            "The small-size equivalence is exact and all audits use rational "
            "arithmetic.  The finite ranges are evidence for, not a proof of, "
            "strict total positivity in every size."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])


if __name__ == "__main__":
    main()
