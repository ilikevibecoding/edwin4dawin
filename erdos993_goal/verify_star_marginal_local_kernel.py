#!/usr/bin/env python3
"""Exact checks accompanying STAR_MARGINAL_SQUARE_THEOREM_2026-07-29.md."""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path

import sympy as sp


def choose(n: int, k: int) -> int:
    if k < 0 or k > n:
        return 0
    return comb(n, k)


def star_coefficient(a: int, n: int) -> int:
    return choose(a, n) + int(n == 1)


def local_coefficients(a: int, b: int, n: int) -> tuple[int, int, int, int]:
    u = star_coefficient(a, n)
    v = star_coefficient(b, n)
    c = choose(a + b - 1, n)
    p = v + a * c + n * choose(a, n)
    q = u + b * c + n * choose(b, n)
    return u, v, p, q


def symbolic_exception_check() -> dict[str, object]:
    a, b = sp.symbols("a b", integer=True, positive=True)
    aa, bb = sp.symbols("A B", nonnegative=True)
    p0, q0 = a + 1, b + 1
    p1 = b + 1 + a * (a + b)
    q1 = a + 1 + b * (a + b)

    differences = {
        "0,0": sp.expand(2 * p0 * q0 - 4 * a - 4 * b),
        "0,1": sp.expand(
            p0 * q1
            + p1 * q0
            - 4 * a * (a + 1)
            - 4 * b * (b + 1)
        ),
        "1,1": sp.expand(
            2 * p1 * q1
            - 4 * a * (a + 1) ** 2
            - 4 * b * (b + 1) ** 2
        ),
    }

    shifted: dict[str, str] = {}
    term_counts: dict[str, int] = {}
    for key, expression in differences.items():
        polynomial = sp.Poly(
            sp.expand(expression.subs({a: aa + 1, b: bb + 1})),
            aa,
            bb,
        )
        assert all(coefficient >= 0 for _, coefficient in polynomial.terms())
        shifted[key] = str(polynomial.as_expr())
        term_counts[key] = len(polynomial.terms())

    return {
        "status": "PASS",
        "shifted_differences": shifted,
        "term_counts": term_counts,
    }


def exhaustive_kernel_check(max_a: int) -> dict[str, object]:
    checks = 0
    minimum_positive_ratio: tuple[int, int, int, int, int, int] | None = None
    equality_count = 0

    for a in range(1, max_a + 1):
        for b in range(1, max_a + 1):
            degree = a + b - 1
            rows = [local_coefficients(a, b, n) for n in range(degree + 1)]
            for p in range(degree + 1):
                up, vp, pp, qp = rows[p]
                for q in range(p, degree + 1):
                    uq, vq, pq, qq = rows[q]
                    left = pp * qq + pq * qp
                    right = 4 * a * up * uq + 4 * b * vp * vq
                    checks += 1
                    if left < right:
                        raise AssertionError((a, b, p, q, left, right))
                    if left == right:
                        equality_count += 1
                    elif right > 0:
                        candidate = (left, right, a, b, p, q)
                        if (
                            minimum_positive_ratio is None
                            or left * minimum_positive_ratio[1]
                            < minimum_positive_ratio[0] * right
                        ):
                            minimum_positive_ratio = candidate

    ratio_record = None
    if minimum_positive_ratio is not None:
        left, right, a, b, p, q = minimum_positive_ratio
        ratio_record = {
            "ratio": left / right,
            "left": left,
            "right": right,
            "a": a,
            "b": b,
            "p": p,
            "q": q,
        }

    return {
        "status": "PASS",
        "max_a": max_a,
        "checks": checks,
        "equality_count": equality_count,
        "minimum_positive_ratio": ratio_record,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-a", type=int, default=50)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("star_marginal_local_kernel_20260729.json"),
    )
    args = parser.parse_args()

    report = {
        "theorem": "star-forest marginal-square local kernel",
        "symbolic_exception_check": symbolic_exception_check(),
        "exhaustive_kernel_check": exhaustive_kernel_check(args.max_a),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
