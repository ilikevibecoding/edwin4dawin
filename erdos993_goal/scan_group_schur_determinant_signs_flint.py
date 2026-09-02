#!/usr/bin/env python3
"""Fast exact determinant-sign scan for the group Q^2 Schur tail."""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path

from flint import fmpz_mat


OUT = Path("group_schur_determinant_sign_scan_20260803.json")


def catalan(n: int) -> int:
    return comb(2 * n, n) // (n + 1)


def toeplitz_u(limit: int) -> fmpz_mat:
    return fmpz_mat(
        limit + 1,
        limit + 1,
        [
            catalan(row - column) if row > column else 0
            for row in range(limit + 1)
            for column in range(limit + 1)
        ],
    )


def binomial_antidiagonal(order: int, limit: int) -> fmpz_mat:
    return fmpz_mat(
        limit + 1,
        limit + 1,
        [
            comb(order, row) if row + column == order else 0
            for row in range(limit + 1)
            for column in range(limit + 1)
        ],
    )


def group_matrix(m: int) -> fmpz_mat:
    d, limit = 2 * m + 5, 3 * m + 5
    t = toeplitz_u(limit)
    tt = t.transpose()
    t2 = t * t
    return (
        binomial_antidiagonal(d, limit)
        - 2 * (t * binomial_antidiagonal(d - 2, limit) * tt)
        + t2 * binomial_antidiagonal(d - 4, limit) * t2.transpose()
    )


def sign(value) -> int:
    return 1 if value > 0 else -1 if value < 0 else 0


def leading_block(a: fmpz_mat, size: int) -> fmpz_mat:
    return fmpz_mat(size, size, [a[i, j] for i in range(size) for j in range(size)])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-m", type=int, default=40)
    args = parser.parse_args()

    records = []
    for m in range(1, args.max_m + 1):
        d = 2 * m + 5
        a = group_matrix(m)
        det_full = a.det()
        det_core = leading_block(a, d + 1).det()
        assert det_full and det_core
        schur_sign = sign(det_full) * sign(det_core)
        reversal_sign = -1 if (m * (m - 1) // 2) % 2 else 1
        reversed_sign = schur_sign * reversal_sign
        old_prediction = 1 if m <= 2 or m % 2 == 0 else -1
        records.append(
            {
                "m": m,
                "reversed_schur_determinant_sign": reversed_sign,
                "old_prediction": old_prediction,
                "matches_old_prediction": reversed_sign == old_prediction,
            }
        )
        print(m, reversed_sign, "match" if reversed_sign == old_prediction else "transition", flush=True)

    report = {
        "status": "PASS_EXACT_GROUP_SCHUR_DETERMINANT_SIGN_SCAN",
        "m_range": [1, args.max_m],
        "transition_sizes": [
            record["m"] for record in records if not record["matches_old_prediction"]
        ],
        "records": records,
        "scope": "Exact determinant signs only; this is not a real-stability test.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
