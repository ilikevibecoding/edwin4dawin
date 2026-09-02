#!/usr/bin/env python3
"""Numerical samplewise test of the rank-one Laguerre/Haar lift.

The exact transformed seeds are averages over signed-permutation product
matrices.  This probe asks whether the required reverse pencil is already
stable for each coupled permutation sample.  A robust failure would show
that stability is created only after averaging; no failure would motivate a
samplewise determinantal proof.  Numerical evidence only.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import numpy as np
from scipy.special import roots_genlaguerre


OUT = Path("rankone_laguerre_sample_pencil_probe_20260802.json")


def path_inverse(n: int) -> np.ndarray:
    return np.array(
        [
            [((min(i, j) + 1) * (n - max(i, j))) / (n + 1) for j in range(n)]
            for i in range(n)
        ],
        dtype=float,
    )


def direct_determinant_coefficients(matrix: np.ndarray) -> np.ndarray:
    """Ascending coefficients of det(I-xM), dropping numerical zero modes."""
    eigenvalues = np.linalg.eigvalsh(matrix)
    nonzero = [value for value in eigenvalues if abs(value) > 1e-9]
    coefficients = np.array([1.0])
    for value in nonzero:
        coefficients = np.polynomial.polynomial.polymul(coefficients, [1.0, -value])
    return coefficients


def derivative(coefficients: np.ndarray, order: int) -> np.ndarray:
    result = coefficients.copy()
    for _ in range(order):
        if len(result) <= 1:
            return np.array([0.0])
        result = np.array([k * result[k] for k in range(1, len(result))])
    return result


def affine(coefficients: np.ndarray, base: float, direction: float) -> np.ndarray:
    result = np.zeros(len(coefficients))
    for power, coefficient in enumerate(coefficients):
        for j in range(power + 1):
            result[j] += (
                coefficient
                * math.comb(power, j)
                * base ** (power - j)
                * direction**j
            )
    return np.trim_zeros(result, "b") if np.any(result) else np.array([0.0])


def add(a: np.ndarray, b: np.ndarray, scale: float = 1.0) -> np.ndarray:
    size = max(len(a), len(b))
    result = np.zeros(size)
    result[: len(a)] += a
    result[: len(b)] += scale * b
    return np.trim_zeros(result, "b") if np.any(result) else np.array([0.0])


def derivative_sum_line(
    left_seed: np.ndarray,
    right_seed: np.ndarray,
    order: int,
    bases: tuple[int, int],
    directions: tuple[int, int],
) -> np.ndarray:
    result = np.array([0.0])
    for k in range(order + 1):
        left = affine(derivative(left_seed, k), bases[0], directions[0])
        right = affine(derivative(right_seed, order - k), bases[1], directions[1])
        term = np.polynomial.polynomial.polymul(left, right)
        result = add(result, term, math.comb(order, k))
    return result


def robust_nonreal(coefficients: np.ndarray) -> tuple[int, float]:
    coefficients = np.trim_zeros(coefficients, "b")
    if len(coefficients) <= 2:
        return 0, 0.0
    coefficients = coefficients / np.max(np.abs(coefficients))
    roots = np.roots(coefficients[::-1])
    max_imaginary = float(max(abs(root.imag) for root in roots))
    count = sum(abs(root.imag) > 1e-5 * (1 + abs(root.real)) for root in roots)
    return int(count), max_imaginary


def coupled_seeds(n: int, permutation: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    inverse = path_inverse(n)
    previous_inverse = np.zeros((n, n))
    previous_inverse[: n - 1, : n - 1] = path_inverse(n - 1)
    current_a = -inverse
    previous_a = -previous_inverse

    # rev_n[1F1(-n;3;x)] has roots reciprocal to the positive roots of
    # L_n^(2)(x); an overall positive scale is immaterial here.
    laguerre_roots, _ = roots_genlaguerre(n, 2)
    positive_roots = 1.0 / laguerre_roots
    sqrt_l = np.diag(np.sqrt(positive_roots))
    current_permuted = current_a[np.ix_(permutation, permutation)]
    previous_permuted = previous_a[np.ix_(permutation, permutation)]
    current_matrix = sqrt_l @ current_permuted @ sqrt_l
    previous_matrix = sqrt_l @ previous_permuted @ sqrt_l

    current = np.pad(direct_determinant_coefficients(current_matrix), (2, 0))
    previous = np.pad(direct_determinant_coefficients(previous_matrix), (2, 0))
    return current, previous


def main() -> None:
    rng = random.Random(993_200_007)
    records = []
    witnesses = []
    samples = 100
    lines_per_sample = 4

    for m in range(1, 7):
        N = 3 * m + 3
        n = N - 2
        b = 2 * m + 1
        d = b + 2
        failures = 0
        worst_imaginary = 0.0
        for sample in range(samples):
            perm_left = np.array(rng.sample(range(n), n))
            perm_right = np.array(rng.sample(range(n), n))
            g_left, h_left = coupled_seeds(n, perm_left)
            g_right, h_right = coupled_seeds(n, perm_right)
            for trial in range(lines_per_sample):
                bases = (rng.randint(-10, 10), rng.randint(-10, 10))
                directions = (rng.randint(1, 8), rng.randint(1, 8))
                u = np.array([rng.randint(-10, 10), rng.randint(1, 8)], dtype=float)
                a_line = derivative_sum_line(g_left, g_right, d, bases, directions)
                b_line = derivative_sum_line(h_left, h_right, b, bases, directions)
                pencil = add(b_line, np.polynomial.polynomial.polymul(a_line, u))
                count, max_imaginary = robust_nonreal(pencil)
                worst_imaginary = max(worst_imaginary, max_imaginary)
                failures += bool(count)
                if count and len(witnesses) < 30:
                    witnesses.append(
                        {
                            "m": m,
                            "sample": sample,
                            "trial": trial,
                            "perm_left": perm_left.tolist(),
                            "perm_right": perm_right.tolist(),
                            "bases": bases,
                            "directions": directions,
                            "u": u.tolist(),
                            "nonreal": count,
                            "max_imaginary": max_imaginary,
                        }
                    )
        record = {
            "m": m,
            "N": N,
            "n": n,
            "lines": samples * lines_per_sample,
            "failures": failures,
            "worst_imaginary": worst_imaginary,
        }
        records.append(record)
        print(record, flush=True)

    total = sum(record["failures"] for record in records)
    report = {
        "kind": "rankone_laguerre_sample_pencil_probe",
        "date": "2026-08-02",
        "status": "SAMPLEWISE_PENCIL_FALSE" if total else "NO_SAMPLEWISE_FAILURE_FOUND",
        "m_range": [1, 6],
        "samples_per_m": samples,
        "lines_per_sample": lines_per_sample,
        "total_lines": sum(record["lines"] for record in records),
        "total_failures": total,
        "records": records,
        "first_witnesses": witnesses,
        "warning": "Floating-point diagnostic only; robust failures should be independently certified exactly.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "first_witnesses": "omitted", "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
