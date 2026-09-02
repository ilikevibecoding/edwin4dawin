#!/usr/bin/env python3
"""Exact binomial-basis certificates for the mixed family (1^s,a).

Let

  U=(1+2x)^s(1+x)^a,
  K=U+x(1+2x)^s,
  L=(1+x)^(s+a).

For a fixed k define

  E_k(s,a)=a Delta_k(K,L)-(a-1)Delta_k(U,L).

E_k is a polynomial of total coordinate degree at most 2k.  Expanding
after s=S+1 and a=A+2,

  E_k(S+1,A+2)=sum c_ij binom(S,i)binom(A,j),

the coefficients c_ij are mixed forward differences at (0,0).
If all are nonnegative, this is a rigorous certificate that

  Delta_k(K,L) >= (1-1/a) Delta_k(U,L)

for every integer s>=1 and a>=2 at that fixed rank.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from math import comb
from pathlib import Path


def choose(n: int, j: int) -> int:
    return comb(n, j) if 0 <= j <= n else 0


def u_coeff(s: int, a: int, j: int) -> int:
    if j < 0:
        return 0
    return sum(
        2 ** (j - t) * choose(s, j - t) * choose(a, t)
        for t in range(j + 1)
    )


def v_coeff(s: int, j: int) -> int:
    return 2 ** (j - 1) * choose(s, j - 1) if j >= 1 else 0


def delta(
    s: int,
    a: int,
    k: int,
    include_exceptional_center: bool,
) -> int:
    values = {}
    for j in (k - 1, k, k + 1):
        value = u_coeff(s, a, j)
        if include_exceptional_center:
            value += v_coeff(s, j)
        values[j] = value
    m = s + a
    return (
        values[k] ** 2
        - values[k - 1] * values[k + 1]
        + values[k] * (choose(m, k) + choose(m, k - 1))
        - values[k + 1]
        * (choose(m, k - 1) + choose(m, k - 2))
    )


def cleared_difference(s: int, a: int, k: int) -> int:
    delta_k = delta(s, a, k, True)
    delta_u = delta(s, a, k, False)
    return a * delta_k - (a - 1) * delta_u


def first_difference_column(values: list[int]) -> list[int]:
    """Return [f(0), Delta f(0), Delta^2 f(0), ...]."""
    current = values[:]
    out = []
    while current:
        out.append(current[0])
        current = [
            current[i + 1] - current[i]
            for i in range(len(current) - 1)
        ]
    return out


def certificate(k: int) -> dict:
    degree = 2 * k
    values = [
        [
            cleared_difference(s_index + 1, a_index + 2, k)
            for a_index in range(degree + 1)
        ]
        for s_index in range(degree + 1)
    ]

    # First take all forward differences in S at S=0.
    s_differences = [[0] * (degree + 1) for _ in range(degree + 1)]
    for a_index in range(degree + 1):
        column = first_difference_column(
            [values[s_index][a_index] for s_index in range(degree + 1)]
        )
        for s_order, value in enumerate(column):
            s_differences[s_order][a_index] = value

    # Then take all forward differences in A at A=0.
    coefficients = [
        first_difference_column(s_differences[s_order])
        for s_order in range(degree + 1)
    ]

    negative = []
    zero_count = 0
    positive_count = 0
    minimum_positive = None
    minimum_location = None
    maximum = 0
    for i, row in enumerate(coefficients):
        for j, value in enumerate(row):
            if value < 0:
                negative.append({"i": i, "j": j, "coefficient": value})
            elif value == 0:
                zero_count += 1
            else:
                positive_count += 1
                if minimum_positive is None or value < minimum_positive:
                    minimum_positive = value
                    minimum_location = [i, j]
                maximum = max(maximum, value)

    coefficient_hash = hashlib.sha256(
        json.dumps(
            coefficients,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()

    support_holes = []
    support_outliers = []
    lowest_diagonal_failures = []
    if k >= 4:
        support_min = k - 3
        support_max = 2 * k
        for i, row in enumerate(coefficients):
            for j, value in enumerate(row):
                expected_positive = support_min <= i + j <= support_max
                if expected_positive and value <= 0:
                    support_holes.append([i, j, value])
                if not expected_positive and value != 0:
                    support_outliers.append([i, j, value])
        for i in range(support_min + 1):
            j = support_min - i
            expected = 2 ** (i + 1) * (k + 2 ** (i + 1) + 1)
            if coefficients[i][j] != expected:
                lowest_diagonal_failures.append(
                    {
                        "i": i,
                        "j": j,
                        "actual": coefficients[i][j],
                        "expected": expected,
                    }
                )

    return {
        "k": k,
        "rank_r": k + 1,
        "degree_bound": degree,
        "coefficient_count": (degree + 1) ** 2,
        "positive_count": positive_count,
        "zero_count": zero_count,
        "negative_count": len(negative),
        "first_negative": negative[0] if negative else None,
        "minimum_positive": minimum_positive,
        "minimum_positive_location": minimum_location,
        "maximum_coefficient": maximum,
        "coefficient_sha256": coefficient_hash,
        "support_hole_count": len(support_holes),
        "first_support_hole": support_holes[0] if support_holes else None,
        "support_outlier_count": len(support_outliers),
        "first_support_outlier":
            support_outliers[0] if support_outliers else None,
        "lowest_diagonal_formula_failure_count":
            len(lowest_diagonal_failures),
        "first_lowest_diagonal_formula_failure":
            (
                lowest_diagonal_failures[0]
                if lowest_diagonal_failures
                else None
            ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--k-min", type=int, default=1)
    parser.add_argument("--k-max", type=int, default=50)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rows = []
    first_failure = None
    for k in range(args.k_min, args.k_max + 1):
        row = certificate(k)
        rows.append(row)
        print(
            f"k={k}: positive={row['positive_count']:,}; "
            f"zero={row['zero_count']:,}; "
            f"negative={row['negative_count']:,}",
            flush=True,
        )
        if row["negative_count"] and first_failure is None:
            first_failure = row
            break

    report = {
        "status": (
            "NEGATIVE_BASIS_COEFFICIENT"
            if first_failure
            else "PASS_FIXED_RANK_CERTIFICATES"
        ),
        "parameters": {
            "k_min": args.k_min,
            "k_max": args.k_max,
        },
        "ranks_completed": len(rows),
        "first_failure": first_failure,
        "certificates": rows,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if first_failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
