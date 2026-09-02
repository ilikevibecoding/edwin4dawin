#!/usr/bin/env python3
"""Exact structural probe for the next right-row gap coordinate (gap 1)."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap1_slack_symbolic_probe_root_20260827.json"


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


def sign_summary(expression, rank, shift, variables):
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
    left_high = (
        left_prev,
        left_prev * (x + 1),
        left_prev * x * (x + 1),
    )
    left_previous_high = (
        left_prev / (x + 2),
        left_prev,
        left_prev * (x + 1),
    )
    first_coefficient_contribution = tuple(
        (k - 1 + index) * left_previous_high[index] for index in range(3)
    )
    right_prev = (M + 1) * R / M
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
    c_tail = tuple(
        sp.cancel(
            c[index] - left_high[index]
            - (M + 1) * first_coefficient_contribution[index]
        ) for index in range(3)
    )
    v_tail = tuple(
        sp.cancel(
            v[index] - left_high[index]
            - (M + 1) * first_coefficient_contribution[index]
        ) for index in range(3)
    )
    # Clear D=M^2-1 before expanding the quadratic directions.  D is strictly
    # positive for k>=8,y>=0.  This avoids a large nested rational expansion.
    D = M ** 2 - 1
    c1_numerator = tuple(
        sp.expand(D * first_coefficient_contribution[i] + 2 * M * c_tail[i])
        for i in range(3)
    )
    c2_numerator = c_tail
    v1_numerator = tuple(
        sp.expand(D * first_coefficient_contribution[i] + 2 * M * v_tail[i])
        for i in range(3)
    )
    v2_numerator = v_tail
    capacity = N - 2
    coefficients = {
        # The stored coefficients are respectively D*H1 and D^2*Hj (j>=2).
        "s1": (
            capacity * polar(c, c1_numerator)
            + polar(c, v1_numerator) + polar(c1_numerator, v)
        ),
        "s2": (
            capacity * (
                margin(c1_numerator) + D * polar(c, c2_numerator)
            )
            + D * polar(c, v2_numerator)
            + polar(c1_numerator, v1_numerator)
            + D * polar(c2_numerator, v)
        ),
        "s3": (
            capacity * polar(c1_numerator, c2_numerator)
            + polar(c1_numerator, v2_numerator)
            + polar(c2_numerator, v1_numerator)
        ),
        "s4": (
            capacity * margin(c2_numerator)
            + polar(c2_numerator, v2_numerator)
        ),
    }
    ratio_lower = (
        1 + (k - 1) * N / M
        + ((k - 1) * (k - 2) / 2) * (N / M) ** 2
        + ((k - 1) * (k - 2) * (k - 3) / 6) * (N / M) ** 3
    )
    rows = []
    for label, coefficient in coefficients.items():
        polynomial = sp.Poly(sp.cancel(coefficient * (N * M) ** 2), T, L, R)
        monomials = {monomial for monomial, _ in polynomial.terms()}
        alpha = sp.cancel(polynomial.coeff_monomial(T * L))
        beta = sp.cancel(polynomial.coeff_monomial(T * R))
        gamma = sp.cancel(-polynomial.coeff_monomial(L * R))
        delta = sp.cancel(-polynomial.coeff_monomial(R ** 2))
        record = {
            "coefficient": label,
            "product_monomials_TLR": [list(item) for item in sorted(monomials, reverse=True)],
            "alpha": sign_summary(alpha, k, t, (t, x, y)),
            "beta": sign_summary(beta, k, t, (t, x, y)),
            "payment_one_cubic": sign_summary(
                sp.cancel(alpha * ratio_lower - gamma), k, t, (t, x, y)
            ),
            "payment_two_unit": sign_summary(
                sp.cancel(beta - delta), k, t, (t, x, y)
            ),
        }
        rows.append(record)
        print(label, json.dumps(record, sort_keys=True), flush=True)
    payload = {
        "schema": "uniform-low-high-right-gap1-slack-symbolic-probe-root-v1",
        "status": "PASS_EXACT_RIGHT_GAP1_SLACK_COEFFICIENT_PROBE",
        "parameterization": "s>=0 added to the right ratio gap r1-r2",
        "slack_degree": 4,
        "positive_coefficient_rescaling": "D*H1 and D^2*Hj for j=2,3,4, where D=(y+k)^2-1>0",
        "coefficient_rows": rows,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Structural probe only until all signs are proved and independently audited.",
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
