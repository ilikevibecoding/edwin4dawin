#!/usr/bin/env python3
"""Exact symbolic replay of the rank-eight full/full split-variance identity."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import random

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_full_full_split_variance_identity_exact_20260820.json"
K = 7


def convolution(left, right, rank):
    return sum(math.comb(rank, j) * left[j] * right[rank - j] for j in range(rank + 1))


def symbolic_replay() -> dict:
    a = sp.symbols("a0:10", nonzero=True)
    b = sp.symbols("b0:10", nonzero=True)
    h = sp.symbols("h")
    c7 = convolution(a, b, 7)
    c8 = convolution(a, b, 8)
    c9 = convolution(a, b, 9)

    first_numerator = 0
    second_numerator = 0
    payment_numerator = 0
    for j in range(K + 1):
        r = K - j
        weight = math.comb(K, j) * a[j] * b[r]
        A = a[j + 1] / a[j]
        A_next = a[j + 2] / a[j + 1]
        B = b[r + 1] / b[r]
        B_next = b[r + 2] / b[r + 1]
        S = A + B
        D = A * (A - A_next) + B * (B - B_next)
        first_numerator += weight * S
        second_numerator += weight * (S**2 - D)
        payment_numerator += weight * (D - h * S)

    first_remainder = sp.cancel(first_numerator - c8)
    second_remainder = sp.cancel(second_numerator - c9)
    assert first_remainder == 0
    assert second_remainder == 0

    mean = first_numerator / c7
    second_moment = sum(
        math.comb(K, j) * a[j] * b[K - j]
        * (a[j + 1] / a[j] + b[K - j + 1] / b[K - j]) ** 2
        for j in range(K + 1)
    ) / c7
    expected_payment = payment_numerator / c7
    variance = second_moment - mean**2
    lhs = c8**2 - c7 * c9 - h * c7 * c8
    rhs = c7**2 * (expected_payment - variance)
    final_remainder = sp.cancel(lhs - rhs)
    assert final_remainder == 0
    return {
        "first_derivative_remainder": str(first_remainder),
        "second_derivative_remainder": str(second_remainder),
        "margin_remainder": str(final_remainder),
        "split_support_size": K + 1,
    }


def exact_numeric_replay(cases: int = 512) -> dict:
    rng = random.Random(993_8_7)
    minimum_margin = None
    maximum_absolute_remainder = 0
    for _ in range(cases):
        left = [rng.randint(1, 50) for _ in range(10)]
        right = [rng.randint(1, 50) for _ in range(10)]
        h = rng.randint(0, 7)
        c7 = convolution(left, right, 7)
        c8 = convolution(left, right, 8)
        c9 = convolution(left, right, 9)
        weights = [math.comb(7, j) * left[j] * right[7 - j] for j in range(8)]
        probabilities = [Fraction(weight, c7) for weight in weights]
        splits = []
        payments = []
        for j in range(8):
            r = 7 - j
            A = Fraction(left[j + 1], left[j])
            A_next = Fraction(left[j + 2], left[j + 1])
            B = Fraction(right[r + 1], right[r])
            B_next = Fraction(right[r + 2], right[r + 1])
            S = A + B
            D = A * (A - A_next) + B * (B - B_next)
            splits.append(S)
            payments.append(D - h * S)
        mean = sum(p * s for p, s in zip(probabilities, splits))
        variance = sum(p * s * s for p, s in zip(probabilities, splits)) - mean * mean
        expected_payment = sum(p * d for p, d in zip(probabilities, payments))
        lhs = c8 * c8 - c7 * c9 - h * c7 * c8
        rhs = Fraction(c7 * c7) * (expected_payment - variance)
        remainder = Fraction(lhs) - rhs
        maximum_absolute_remainder = max(maximum_absolute_remainder, abs(remainder))
        minimum_margin = lhs if minimum_margin is None else min(minimum_margin, lhs)
    assert maximum_absolute_remainder == 0
    return {
        "cases": cases,
        "seed": 993_8_7,
        "maximum_absolute_remainder": 0,
        "minimum_sample_margin": minimum_margin,
        "sample_sign_is_not_a_theorem": True,
    }


def main() -> None:
    symbolic = symbolic_replay()
    numeric = exact_numeric_replay()
    payload = {
        "schema": "rank8-full-full-split-variance-identity-v1",
        "status": "PASS_EXACT_RANK8_FULL_FULL_SPLIT_VARIANCE_IDENTITY_NOT_CONE_THEOREM",
        "rank": 8,
        "split_total_rank": 7,
        "factorial_convolution": "c_k=sum_j binom(k,j) a_j b_(k-j)",
        "identity": "c8^2-c7*c9-h*c7*c8 = c7^2*(E[P]-Var(S))",
        "definitions": {
            "weights": "Pr(J=j)=binom(7,j)a_j b_(7-j)/c7",
            "A": "A_j=a_(j+1)/a_j",
            "B": "B_r=b_(r+1)/b_r",
            "S": "S_j=A_j+B_(7-j)",
            "P": "P_j=A_j*(deltaA_j-h)+B_(7-j)*(deltaB_(7-j)-h)",
        },
        "equivalent_cone_target": "Var(S)<=E[P]",
        "high_high_specialization": "P is termwise nonnegative, but its expectation still must pay Var(S)",
        "low_cases_warning": "delta1<h can make individual payments signed; delta1+delta2>=2h must be retained jointly",
        "symbolic_replay": symbolic,
        "exact_numeric_replay": numeric,
        "scope_warning": "This is an exact reduction, not a proof of any full/full cone, forest Q8, PGC, or Problem 993.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REPORT", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
