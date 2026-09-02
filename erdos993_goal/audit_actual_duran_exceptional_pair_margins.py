#!/usr/bin/env python3
"""Exact finite audit of the actual Durán exceptional-pair margins.

For the coefficient polynomial Q_D of the genuine monic-Laguerre window,
the Pochhammer zero-count theorem analytically guarantees at least m-2
negative real roots.  This script isolates such roots exactly, removes them
by Vieta interval arithmetic, and certifies the two residual Jacobi margins.
The audit is finite evidence; it does not replace the missing all-parameter
inequality.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "actual_duran_exceptional_pair_margins_exact_20260809.json"
Z = sp.symbols("z")


def elementary(values: list[sp.Rational]) -> list[sp.Expr]:
    result: list[sp.Expr] = [sp.Integer(1)]
    for value in values:
        result.append(sp.Integer(0))
        for index in range(len(result) - 1, 0, -1):
            result[index] = sp.expand(result[index] + value * result[index - 1])
    return result


def gamma_from_lambda(values: list[sp.Rational]) -> list[sp.Expr]:
    return [(-1) ** h * value for h, value in enumerate(elementary(values))]


def duran_polynomial(N: int, gamma: list[sp.Expr]) -> sp.Poly:
    m = len(gamma) - 1
    return sp.Poly(
        sp.expand(
            sum(
                gamma[h] * sp.ff(N, h) / 4**h * sp.rf(Z, m - h)
                for h in range(m + 1)
            )
        ),
        Z,
    )


def primitive_digest(poly: sp.Poly) -> str:
    primitive = sp.primitive(poly.as_expr(), Z)[1]
    return hashlib.sha256(str(primitive).encode("utf-8")).hexdigest()


def interval_product(
    intervals: list[tuple[sp.Rational, sp.Rational]],
) -> tuple[sp.Rational, sp.Rational]:
    lower = upper = sp.Integer(1)
    for left, right in intervals:
        candidates = (lower * left, lower * right, upper * left, upper * right)
        lower, upper = min(candidates), max(candidates)
    return sp.Rational(lower), sp.Rational(upper)


def divide_point_by_interval(
    numerator: sp.Rational, denominator: tuple[sp.Rational, sp.Rational]
) -> tuple[sp.Rational, sp.Rational]:
    left, right = denominator
    assert left * right > 0
    candidates = (sp.cancel(numerator / left), sp.cancel(numerator / right))
    return min(candidates), max(candidates)


def one_case(
    m: int,
    parity: int,
    alpha: int,
    slack: int,
    u: sp.Rational,
    v: sp.Rational,
    negative_lambdas: list[sp.Rational],
) -> dict[str, object]:
    assert len(negative_lambdas) == m - 2
    assert 0 < u <= 1 and 0 < v <= 1
    assert all(value < 0 for value in negative_lambdas)
    p = alpha + 4 * m - 3 + slack
    if p % 2 != parity:
        p += 1
    n = p // 2
    beta = sp.Rational(-1, 2) if parity == 0 else sp.Rational(1, 2)
    N = p + alpha
    s = n - m + 2

    gamma = gamma_from_lambda([u, v, *negative_lambdas])
    q = duran_polynomial(N, gamma)
    assert q.degree() == m
    raw_intervals = q.intervals(eps=sp.Rational(1, 10**45))
    real_intervals: list[tuple[sp.Rational, sp.Rational]] = []
    for interval, multiplicity in raw_intervals:
        assert multiplicity == 1
        real_intervals.append((sp.Rational(interval[0]), sp.Rational(interval[1])))
    negative = [item for item in real_intervals if item[1] < 0]
    assert len(negative) >= m - 2
    benign = negative[: m - 2]

    leading = sp.Rational(q.LC())
    total_sum = sp.cancel(-q.nth(m - 1) / leading)
    total_product = sp.cancel(((-1) ** m) * q.nth(0) / leading)
    benign_sum_lower = sum((left for left, _ in benign), start=sp.Integer(0))
    benign_sum_upper = sum((right for _, right in benign), start=sp.Integer(0))
    residual_sum = (
        sp.cancel(total_sum - benign_sum_upper),
        sp.cancel(total_sum - benign_sum_lower),
    )
    benign_product = interval_product(benign)
    residual_product = divide_point_by_interval(total_product, benign_product)

    g1 = (1 + residual_sum[0], 1 + residual_sum[1])
    g2 = residual_product
    first_margin = (
        sp.cancel((s - 1) * (s + beta - 1) - g2[1]),
        sp.cancel((s - 1) * (s + beta - 1) - g2[0]),
    )
    factor = s + beta - 1
    assert factor > 0
    second_margin = (
        sp.cancel(factor * (s + beta - g1[1]) + g2[0]),
        sp.cancel(factor * (s + beta - g1[0]) + g2[1]),
    )
    assert first_margin[0] > 0
    assert second_margin[0] > 0

    return {
        "m": m,
        "parity": "even" if parity == 0 else "odd",
        "p": p,
        "alpha": alpha,
        "slack": slack,
        "n": n,
        "beta": str(beta),
        "N": N,
        "s": s,
        "u": str(u),
        "v": str(v),
        "negative_lambdas": [str(value) for value in negative_lambdas],
        "real_roots": len(real_intervals),
        "negative_real_roots": len(negative),
        "certified_benign_roots": len(benign),
        "residual_sum_interval_decimal": [
            str(sp.N(residual_sum[0], 18)),
            str(sp.N(residual_sum[1], 18)),
        ],
        "residual_product_interval_decimal": [
            str(sp.N(g2[0], 18)),
            str(sp.N(g2[1], 18)),
        ],
        "first_margin_lower_decimal": str(sp.N(first_margin[0], 18)),
        "second_margin_lower_decimal": str(sp.N(second_margin[0], 18)),
        "primitive_sha256": primitive_digest(q),
    }


def main() -> None:
    rng = random.Random(99346)
    positive = [
        sp.Rational(1, 1000),
        sp.Rational(1, 20),
        sp.Rational(1, 3),
        sp.Rational(1, 2),
        sp.Integer(1),
    ]
    negative = [
        -sp.Rational(1, 1000),
        -sp.Rational(1, 20),
        -sp.Integer(1),
        -sp.Integer(20),
        -sp.Integer(1000),
    ]
    cases: list[dict[str, object]] = []
    for m in range(2, 13):
        for parity in (0, 1):
            # Repeated and alternating extreme faces.
            cases.append(
                one_case(
                    m,
                    parity,
                    0,
                    0,
                    sp.Rational(1, 1000),
                    sp.Rational(1, 20),
                    [-sp.Integer(1000)] * (m - 2),
                )
            )
            cases.append(
                one_case(
                    m,
                    parity,
                    3,
                    2,
                    sp.Rational(1, 100),
                    sp.Integer(1),
                    [
                        -sp.Integer(1000) if j % 2 == 0 else -sp.Rational(1, 1000)
                        for j in range(m - 2)
                    ],
                )
            )
            # Three deterministic pseudorandom grid inputs.
            for _ in range(3):
                cases.append(
                    one_case(
                        m,
                        parity,
                        rng.choice([0, 1, 4, 9]),
                        rng.choice([0, 1, 3, 8]),
                        rng.choice(positive),
                        rng.choice(positive),
                        [rng.choice(negative) for _ in range(m - 2)],
                    )
                )

    minimum_first = min(cases, key=lambda case: sp.Rational(case["first_margin_lower_decimal"]))
    minimum_second = min(cases, key=lambda case: sp.Rational(case["second_margin_lower_decimal"]))
    digest_input = ";".join(str(case["primitive_sha256"]) for case in cases)
    payload = {
        "kind": "actual_duran_exceptional_pair_margins_exact_audit",
        "date": "2026-08-09",
        "status": "PASS_EXACT_ACTUAL_DURAN_EXCEPTIONAL_PAIR_AUDIT",
        "scope": "finite exact evidence only",
        "cases": len(cases),
        "factor_lengths": "2..12",
        "parities": ["even", "odd"],
        "method": (
            "Exact Sturm isolation of m-2 negative roots followed by rational Vieta "
            "interval bounds for the residual quadratic and both Durán/Jacobi margins."
        ),
        "all_first_margins_positive": True,
        "all_second_margins_positive": True,
        "minimum_first_margin_case": minimum_first,
        "minimum_second_margin_case": minimum_second,
        "combined_primitive_digest_sha256": hashlib.sha256(
            digest_input.encode("ascii")
        ).hexdigest(),
        "cases_detail": cases,
        "remaining_theorem": (
            "Prove the two positive residual-margin inequalities uniformly from the "
            "actual PF coefficient polynomial; this audit is not that proof."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in payload.items() if key != "cases_detail"}, indent=2))
    print(json.dumps({"output": str(REPORT)}, indent=2))


if __name__ == "__main__":
    main()
