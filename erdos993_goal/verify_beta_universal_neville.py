#!/usr/bin/env python3
"""Audit the two closed Neville formulas for the universal beta triangle.

The universal upper connection W is defined by

  4^p (x+7/2)_p = sum_r W[r,p] x^r (x+r+5)_(p-r).

This program obtains W from the beta/Newton factorization, checks that its
truncations are independent of the ambient size, and verifies the proposed
Neville parameters of W and of checker(W^-1).
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction as F
from math import prod
from pathlib import Path

from fast_bottom_forward import beta_coefficients, matmul
from probe_beta_newton_coordinates import beta_newton_lower, inverse_lower_unit
from probe_confluent_transition_sections import inverse_matrix
from probe_newton_full_neville_patterns import neville_parameters


OUT = Path("beta_universal_neville_20260803.json")


def universal_w(q: int):
    n = q - 1
    upper = matmul(inverse_lower_unit(beta_newton_lower(q)), beta_coefficients(q))
    return [
        [upper[r][p] / prod(range(r + 5, n + 5)) for p in range(q)]
        for r in range(q)
    ]


def w_multiplier(column: int, row: int):
    return F(
        2 * (row + 3) ** column * (2 * row + 5 - 2 * column),
        (row + 4) ** (column + 1),
    )


def checker_inverse_multiplier(column: int, row: int):
    return F(
        (2 * column + 7) * (row + 4) ** column,
        (2 * row + 1) * (row + 3) ** column,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-q", type=int, default=50)
    args = parser.parse_args()
    previous = None
    w_checks = inverse_checks = nesting_checks = 0
    records = []
    for q in range(2, args.max_q + 1):
        w = universal_w(q)
        if previous is not None:
            for i in range(q - 1):
                for j in range(q - 1):
                    assert w[i][j] == previous[i][j]
                    nesting_checks += 1
        previous = w

        w_neville, _ = neville_parameters([list(row) for row in zip(*w)])
        for column, level in enumerate(w_neville):
            for row, value in level:
                assert value == w_multiplier(column, row)
                assert value > 0
                w_checks += 1

        inverse = inverse_matrix(w)
        checker = [
            [(-1 if (i + j) % 2 else 1) * inverse[i][j] for j in range(q)]
            for i in range(q)
        ]
        inverse_neville, _ = neville_parameters(
            [list(row) for row in zip(*checker)]
        )
        for column, level in enumerate(inverse_neville):
            for row, value in level:
                assert value == checker_inverse_multiplier(column, row)
                assert value > 0
                inverse_checks += 1

        records.append(
            {
                "q": q,
                "w_formula_checks": sum(len(level) for level in w_neville),
                "inverse_formula_checks": sum(
                    len(level) for level in inverse_neville
                ),
            }
        )
        print(f"q={q} PASS", flush=True)

    report = {
        "status": "PASS",
        "range": [2, args.max_q],
        "nesting_checks": nesting_checks,
        "w_neville_formula_checks": w_checks,
        "checker_inverse_neville_formula_checks": inverse_checks,
        "w_formula": (
            "2*(r+3)^c*(2*r+5-2*c)/(r+4)^(c+1)"
        ),
        "checker_inverse_formula": (
            "(2*c+7)*(r+4)^c/((2*r+1)*(r+3)^c)"
        ),
        "scope": (
            "Exact finite audit of formulas whose all-order derivation is "
            "being developed from the rational connection identity."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"PASS wrote {OUT}")


if __name__ == "__main__":
    main()
