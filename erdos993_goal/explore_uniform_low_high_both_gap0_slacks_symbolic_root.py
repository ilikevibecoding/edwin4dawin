#!/usr/bin/env python3
"""Exact structural probe for simultaneous left/right first-gap slacks."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_both_gap0_slacks_symbolic_probe_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def margin(row):
    return sp.expand(row[1] ** 2 - row[0] * row[2] - row[0] * row[1])


def polar(first, second):
    return sp.expand(
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def shifted_sign(expression, rank, shift, variables):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    polynomial = sp.Poly(sp.expand(numerator.subs(rank, shift + 8)), *variables)
    values = []
    for _, coefficient in polynomial.terms():
        assert coefficient.is_Integer
        values.append(int(coefficient))
    assert values
    return {
        "denominator": str(sp.factor(denominator)),
        "terms": len(values),
        "minimum": min(values),
        "negative": sum(value < 0 for value in values),
    }


def main() -> int:
    k, x, y = sp.symbols("k x y", real=True)
    t = sp.Symbol("t", nonnegative=True)
    T, L, R = sp.symbols("T L R", positive=True)
    N, M = x + k, y + k
    ws = (N + 1) * (M + 1) * T
    wl = (N + 1) * L
    wr = (M + 1) * R
    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    c = (
        (ws - wl - wr) / (N * M),
        (ws * rs - wl * rl - wr * rr) / (N * M),
        (
            ws * rs * (rs - 1)
            - wl * rl * (rl - 1)
            - wr * rr * (rr - 1)
        ) / (N * M),
    )
    left_prev = (N + 1) * L / N
    left = (left_prev, left_prev * (x + 1), left_prev * x * (x + 1))
    right_prev = (M + 1) * R / M
    right = (right_prev, right_prev * (y + 1), right_prev * y * (y + 1))
    head = (
        right_prev * (
            1 + (k - 1) * (N + 1) / (y + 2)
            + ((k - 1) * (k - 2) / 2) * (N ** 2 - 1)
            / ((y + 2) * (y + 3))
        ),
        right_prev * (
            y + 1 + k * (N + 1)
            + (k * (k - 1) / 2) * (N ** 2 - 1) / (y + 2)
        ),
        right_prev * (
            y * (y + 1) + (k + 1) * (N + 1) * (y + 1)
            + (k * (k + 1) / 2) * (N ** 2 - 1)
        ),
    )
    v = tuple(sp.cancel(c[index] - head[index]) for index in range(3))
    left_direction = tuple(sp.cancel(c[index] - right[index]) for index in range(3))
    right_direction = tuple(sp.cancel(c[index] - left[index]) for index in range(3))
    cross_direction = tuple(
        sp.cancel(c[index] - left[index] - right[index]) for index in range(3)
    )
    right_tail_direction = tuple(sp.cancel(v[index] - left[index]) for index in range(3))
    capacity = N - 2
    cross_coefficients = {
        "p1_q1": (
            capacity * (polar(c, cross_direction) + polar(right_direction, left_direction))
            + polar(c, right_tail_direction) + polar(right_direction, v)
            + polar(left_direction, right_tail_direction) + polar(cross_direction, v)
        ),
        "p1_q2": (
            capacity * polar(right_direction, cross_direction)
            + polar(right_direction, right_tail_direction)
            + polar(cross_direction, right_tail_direction)
        ),
        "p2_q1": (
            capacity * polar(left_direction, cross_direction)
            + polar(left_direction, right_tail_direction)
            + polar(cross_direction, v)
        ),
        "p2_q2": (
            capacity * margin(cross_direction)
            + polar(cross_direction, right_tail_direction)
        ),
    }
    ratio_lower = (
        1 + (k - 1) * N / M
        + ((k - 1) * (k - 2) / 2) * (N / M) ** 2
        + ((k - 1) * (k - 2) * (k - 3) / 6) * (N / M) ** 3
    )
    rows = []
    for label, coefficient in cross_coefficients.items():
        polynomial = sp.Poly(sp.cancel(coefficient * (N * M) ** 2), T, L, R)
        monomials = {monomial for monomial, _ in polynomial.terms()}
        alpha = sp.cancel(polynomial.coeff_monomial(T * L))
        beta = sp.cancel(polynomial.coeff_monomial(T * R))
        gamma = sp.cancel(-polynomial.coeff_monomial(L * R))
        delta = sp.cancel(-polynomial.coeff_monomial(R ** 2))
        record = {
            "coefficient": label,
            "product_monomials_TLR": [list(item) for item in sorted(monomials, reverse=True)],
            "alpha": shifted_sign(alpha, k, t, (t, x, y)),
            "beta": shifted_sign(beta, k, t, (t, x, y)),
            "payment_one_cubic": shifted_sign(
                sp.cancel(alpha * ratio_lower - gamma), k, t, (t, x, y)
            ),
            "payment_two_unit": shifted_sign(
                sp.cancel(beta - delta), k, t, (t, x, y)
            ),
        }
        rows.append(record)
        print(label, json.dumps(record, sort_keys=True), flush=True)
    payload = {
        "schema": "uniform-low-high-both-gap0-slacks-symbolic-probe-root-v1",
        "status": "PASS_EXACT_SIMULTANEOUS_GAP0_CROSS_COEFFICIENT_PROBE",
        "normalization": "p=s_left/(x+k+1), q=s_right/(y+k+1)",
        "cross_coefficients": rows,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Structural probe only until every sign payment is proved and audited.",
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
