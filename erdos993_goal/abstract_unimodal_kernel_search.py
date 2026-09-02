#!/usr/bin/env python3
"""Find an abstract unimodal convolution kernel exposing non-log-concavity.

For a fixed nonnegative sequence ``a``, this solves the finite linear program

    maximize epsilon
    subject to b >= 0, sum(b) = 1, b unimodal, and
               (a*b)[t-1] >= (a*b)[t] + epsilon,
               (a*b)[t+1] >= (a*b)[t] + epsilon.

The program is run over every possible mode and valley position for a range of
kernel lengths.  It is only a discovery tool: any reported floating-point
kernel must later be rationalized and checked with integer arithmetic.
"""

from __future__ import annotations

import argparse

import numpy as np
from scipy.optimize import linprog

from verify_perfect_matching_lc_failure import decorated_polynomial


def convolution_row(a: np.ndarray, m: int, degree: int) -> np.ndarray:
    """Return the row r with r @ b = coefficient ``degree`` of a*b."""

    row = np.zeros(m + 1)
    for j in range(m + 1):
        i = degree - j
        if 0 <= i < len(a):
            row[j] = a[i]
    return row


def solve_for_shape(
    a: np.ndarray, m: int, mode: int, valley: int
) -> tuple[float, np.ndarray] | None:
    """Solve one fixed-mode, fixed-valley LP."""

    # Variables are b[0],...,b[m],epsilon.
    rows: list[np.ndarray] = []
    rhs: list[float] = []

    # b[0] <= ... <= b[mode] >= ... >= b[m].
    for j in range(mode):
        row = np.zeros(m + 2)
        row[j] = 1.0
        row[j + 1] = -1.0
        rows.append(row)
        rhs.append(0.0)
    for j in range(mode, m):
        row = np.zeros(m + 2)
        row[j + 1] = 1.0
        row[j] = -1.0
        rows.append(row)
        rhs.append(0.0)

    previous = convolution_row(a, m, valley - 1)
    middle = convolution_row(a, m, valley)
    following = convolution_row(a, m, valley + 1)
    for difference in (middle - previous, middle - following):
        row = np.zeros(m + 2)
        row[: m + 1] = difference
        row[-1] = 1.0
        rows.append(row)
        rhs.append(0.0)

    objective = np.zeros(m + 2)
    objective[-1] = -1.0
    equality = np.zeros((1, m + 2))
    equality[0, : m + 1] = 1.0

    result = linprog(
        objective,
        A_ub=np.asarray(rows),
        b_ub=np.asarray(rhs),
        A_eq=equality,
        b_eq=np.asarray([1.0]),
        bounds=[(0.0, None)] * (m + 1) + [(None, None)],
        method="highs",
        options={
            "dual_feasibility_tolerance": 1e-10,
            "primal_feasibility_tolerance": 1e-10,
            "ipm_optimality_tolerance": 1e-12,
        },
    )
    if not result.success:
        return None
    return float(result.x[-1]), result.x[: m + 1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-degree", type=int, default=120)
    parser.add_argument("--min-degree", type=int, default=1)
    parser.add_argument("--top", type=int, default=20)
    args = parser.parse_args()

    original = decorated_polynomial()
    a = np.asarray(original, dtype=float)
    a /= a.max()
    best: list[tuple[float, int, int, int, np.ndarray]] = []

    for m in range(args.min_degree, args.max_degree + 1):
        for mode in range(m + 1):
            # Every nonzero convolution coefficient can be the middle.
            for valley in range(1, len(a) + m - 1):
                solved = solve_for_shape(a, m, mode, valley)
                if solved is None:
                    continue
                epsilon, kernel = solved
                if epsilon > 1e-11:
                    best.append((epsilon, m, mode, valley, kernel))
        if best:
            best.sort(key=lambda record: record[0], reverse=True)
            best = best[: args.top]
            print(
                f"degree {m}: best epsilon={best[0][0]:.12g}, "
                f"mode={best[0][2]}, valley={best[0][3]}",
                flush=True,
            )
            break
        if m % 10 == 0:
            print(f"degree {m}: no witness", flush=True)

    if not best:
        print("no witness in the requested range")
        return

    for rank, (epsilon, m, mode, valley, kernel) in enumerate(best, 1):
        support = [
            (j, float(value))
            for j, value in enumerate(kernel)
            if value > 1e-9
        ]
        print(
            f"\n#{rank}: degree={m}, mode={mode}, valley={valley}, "
            f"epsilon={epsilon:.16g}"
        )
        print("support:", support)
        print("kernel:", [float(value) for value in kernel])


if __name__ == "__main__":
    main()
