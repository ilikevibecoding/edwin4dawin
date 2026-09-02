#!/usr/bin/env python3
"""Numerically test Lorentzian Hessian signatures for homogenized F_a."""

from __future__ import annotations

import argparse
import json
from itertools import product
from math import comb, factorial
from pathlib import Path

import numpy as np


def homogenized_factor(a: int) -> dict[tuple[int, int, int], int]:
    degree = 2 * a
    coeffs: dict[tuple[int, int, int], int] = {}
    for i in range(a + 1):
        for j in range(a + 1):
            key = (i, j, degree - i - j)
            coeffs[key] = coeffs.get(key, 0) + comb(a, i) * comb(a, j)
    for j in range(a + 1):
        key = (1, j, degree - 1 - j)
        coeffs[key] = coeffs.get(key, 0) + comb(a, j)
    for i in range(a + 1):
        key = (i, 1, degree - 1 - i)
        coeffs[key] = coeffs.get(key, 0) + comb(a, i)
    return coeffs


def compositions(total: int):
    for i in range(total + 1):
        for j in range(total - i + 1):
            yield i, j, total - i - j


def falling(n: int, r: int) -> int:
    if r < 0 or n < r:
        return 0
    return factorial(n) // factorial(n - r)


def hessian_after_derivative(
    coeffs: dict[tuple[int, int, int], int],
    derivative: tuple[int, int, int],
) -> np.ndarray:
    out = np.zeros((3, 3), dtype=float)
    for row in range(3):
        for col in range(3):
            extra = [0, 0, 0]
            extra[row] += 1
            extra[col] += 1
            exponent = tuple(
                derivative[t] + extra[t] for t in range(3)
            )
            value = coeffs.get(exponent, 0)
            multiplier = 1
            for n, r in zip(exponent, derivative):
                multiplier *= falling(n, r)
            # The remaining quadratic derivative contributes the Hessian
            # factor 2 on a square and 1 on a mixed monomial.
            if row == col:
                multiplier *= 2
            out[row, col] = value * multiplier
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--a-max", type=int, default=12)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    checks = 0
    first_failure = None
    worst_second_eigenvalue = None
    worst_item = None
    for a in range(1, args.a_max + 1):
        coeffs = homogenized_factor(a)
        degree = 2 * a
        for derivative in compositions(degree - 2):
            matrix = hessian_after_derivative(coeffs, derivative)
            eigenvalues = np.linalg.eigvalsh(matrix)
            checks += 1
            second = float(eigenvalues[-2])
            if worst_second_eigenvalue is None or second > worst_second_eigenvalue:
                worst_second_eigenvalue = second
                worst_item = {
                    "a": a,
                    "derivative": derivative,
                    "eigenvalues": eigenvalues.tolist(),
                    "hessian": matrix.tolist(),
                }
            if second > 1e-8 and first_failure is None:
                first_failure = worst_item

    report = {
        "status": "HESSIAN_FAILURE" if first_failure else "PASS_NOT_PROOF",
        "a_max": args.a_max,
        "checks": checks,
        "first_failure": first_failure,
        "worst_second_eigenvalue": worst_second_eigenvalue,
        "worst_item": worst_item,
        "note": "M-convex support is not tested by this numerical probe.",
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if first_failure else 0


if __name__ == "__main__":
    raise SystemExit(main())
