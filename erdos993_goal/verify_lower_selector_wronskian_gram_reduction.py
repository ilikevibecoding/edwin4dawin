"""Exact replay for the lower-selector Wronskian Gram reduction."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

from verify_lower_qsharp_reduction import path_gamma


HERE = Path(__file__).resolve().parent
REPORT = HERE / "lower_selector_wronskian_gram_exact_20260810.json"


def trim(a: list[int]) -> list[int]:
    out = list(a)
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def coeff(a: list[int], i: int) -> int:
    return a[i] if 0 <= i < len(a) else 0


def add(a: list[int], b: list[int], scale: int = 1) -> list[int]:
    return trim([coeff(a, i) + scale * coeff(b, i)
                 for i in range(max(len(a), len(b)))])


def conv(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return trim(out)


def derivative(a: list[int]) -> list[int]:
    return trim([i * a[i] for i in range(1, len(a))] or [0])


def wronskian(a: list[int], b: list[int]) -> list[int]:
    return add(conv(derivative(a), b), conv(a, derivative(b)), -1)


def first_nonzero(a: list[int]) -> int:
    return next(i for i, x in enumerate(a) if x != 0)


def routh_first_column(a: list[int]) -> list[Fraction] | None:
    """Return the exact Routh first column for ascending coefficients."""
    data = [int(x) for x in a]
    degree = len(data) - 1
    if degree == 0:
        return [Fraction(data[0])]
    width = (degree + 2) // 2
    older = [Fraction(data[degree - 2 * j] if degree - 2 * j >= 0 else 0)
             for j in range(width)]
    previous = [
        Fraction(data[degree - 1 - 2 * j]
                 if degree - 1 - 2 * j >= 0 else 0)
        for j in range(width)
    ]
    if older[0] <= 0 or previous[0] <= 0:
        return None
    first = [older[0], previous[0]]
    for _ in range(2, degree + 1):
        row = [
            (
                previous[0] * (older[j + 1] if j + 1 < width else 0)
                - older[0] * (previous[j + 1] if j + 1 < width else 0)
            ) / previous[0]
            for j in range(width)
        ]
        if row[0] <= 0:
            return None
        first.append(row[0])
        older, previous = previous, row
    return first


def main() -> None:
    cases = 0
    coefficient_checks = 0
    derivative_bound_checks = 0
    derivative_bound_failures: list[tuple[int, int, int, int]] = []
    weakened_bound_checks = 0
    decomposition_checks = 0
    central_surplus_checks = 0
    central_nontrivial_checks = 0
    max_forced_order = 0
    routh_hurwitz_cases = 0

    for N in range(5, 21):
        for s in range(2, 2 * N - 5):
            g0, g1, g2 = [path_gamma(N - q, s) for q in range(3)]
            w01 = wronskian(g0, g1)
            w02 = wronskian(g0, g2)
            w12 = wronskian(g1, g2)

            T = add(conv(g1, g1), conv(g0, g2), -1)
            S = add(conv(derivative(g1), derivative(g1)),
                    conv(derivative(g0), derivative(g2)), -1)
            D = add(conv(w02, w02), conv(w01, w12), -4)
            gram = add(conv(derivative(T), derivative(T)), conv(T, S), -4)
            assert D == gram

            t_order = first_nonzero(T)
            assert coeff(T, t_order) > 0
            assert all(x >= 0 for x in T)

            d_order = first_nonzero(D)
            assert d_order % 2 == 0
            assert all(x < 0 for x in D[d_order:] if x != 0)
            max_forced_order = max(max_forced_order, d_order)
            coefficient_checks += sum(x != 0 for x in D)
            positive_core = [-int(x) for x in D[d_order:]]
            routh_column = routh_first_column(positive_core)
            assert routh_column is not None
            assert all(x > 0 for x in routh_column)
            routh_hurwitz_cases += 1

            max_n = max(len(T) - 1, len(S) + 1)
            delta = [0] * (max_n + 1)
            for n in range(2, max_n + 1):
                floor_quarter = (n * n) // 4
                lhs = coeff(S, n - 2)
                rhs = floor_quarter * coeff(T, n)
                if lhs < rhs:
                    derivative_bound_failures.append((N, s, n, lhs - rhs))
                delta[n] = 4 * lhs - 4 * floor_quarter * coeff(T, n)
                derivative_bound_checks += 1
                weak_rhs = max(0, floor_quarter - 1) * coeff(T, n)
                assert lhs >= weak_rhs
                weakened_bound_checks += 1

            max_total = len(D) + 1
            for total in range(2, max_total + 1):
                first = sum(coeff(T, i) * coeff(delta, total - i)
                            for i in range(total + 1))
                second = Fraction(0)
                for i in range(total + 1):
                    j = total - i
                    eps_i = i & 1
                    eps_j = j & 1
                    factor = (i - j) ** 2 - eps_i - eps_j
                    second += Fraction(factor * coeff(T, i) * coeff(T, j), 2)
                exact = first + second
                assert exact.denominator == 1
                assert exact.numerator == -coeff(D, total - 2)
                decomposition_checks += 1

                if total % 4 == 2:
                    center = total // 2
                    surplus = exact + coeff(T, center) ** 2
                    if surplus > coeff(T, center) ** 2:
                        central_nontrivial_checks += 1
                    central_surplus_checks += 1

            cases += 1

    report = {
        "status": "PASS_EXACT_LOWER_SELECTOR_WRONSKIAN_GRAM_REDUCTION",
        "range": "5<=N<=20, 2<=s<=2N-6",
        "cases": cases,
        "negative_discriminant_coefficients": coefficient_checks,
        "derivative_coefficient_bounds": derivative_bound_checks,
        "false_derivative_bound_failures": len(derivative_bound_failures),
        "false_derivative_bound_failed_cells": len(
            {(N, s) for N, s, _, _ in derivative_bound_failures}
        ),
        "first_false_derivative_bound": [
            int(x) for x in derivative_bound_failures[0]
        ],
        "weakened_floor_minus_one_bound_checks": weakened_bound_checks,
        "exact_decompositions": decomposition_checks,
        "central_odd_surplus_checks": central_surplus_checks,
        "central_odd_nontrivial_checks": central_nontrivial_checks,
        "maximum_forced_even_order": max_forced_order,
        "exact_routh_hurwitz_cases": routh_hurwitz_cases,
        "scope": (
            "The Gram identity and decomposition are exact algebra. "
            "The proposed floor(n^2/4) derivative bound is false. "
            "The weakened floor(n^2/4)-1 bound is finite evidence only. "
            "Exact Routh positivity is also finite evidence, not an all-order proof."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
