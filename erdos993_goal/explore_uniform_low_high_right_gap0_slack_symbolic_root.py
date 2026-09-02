#!/usr/bin/env python3
"""Symbolically expose the all-rank right gap-0 slack coefficients."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap0_slack_symbolic_probe_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def margin(row):
    return sp.expand(row[1] ** 2 - row[0] * row[2] - row[0] * row[1])


def polar(left, right):
    return sp.expand(
        2 * left[1] * right[1]
        - left[0] * right[2] - left[2] * right[0]
        - left[0] * right[1] - left[1] * right[0]
    )


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
    tail = tuple(sp.cancel(c[index] - head[index]) for index in range(3))
    left_prev = (N + 1) * L / N
    left = (
        left_prev,
        left_prev * (x + 1),
        left_prev * x * (x + 1),
    )
    c_direction = tuple(sp.cancel(c[index] - left[index]) for index in range(3))
    tail_direction = tuple(sp.cancel(tail[index] - left[index]) for index in range(3))
    q_coefficients = {
        1: (
            (N - 2) * polar(c, c_direction)
            + polar(c, tail_direction) + polar(c_direction, tail)
        ),
        2: (N - 2) * margin(c_direction) + polar(c_direction, tail_direction),
    }
    rows = []
    for degree in (1, 2):
        scaled = sp.cancel(q_coefficients[degree] * (N * M) ** 2)
        product_poly = sp.Poly(scaled, T, L, R)
        terms = []
        print("Q_DEGREE", degree, "PRODUCT_TERMS", len(product_poly.terms()), flush=True)
        for monomial, coefficient in product_poly.terms():
            numerator, denominator = sp.fraction(sp.cancel(coefficient))
            shifted = sp.Poly(sp.expand(numerator.subs(k, t + 8)), t, x, y)
            values = []
            for _, value in shifted.terms():
                assert value.is_Integer
                values.append(int(value))
            item = {
                "product_monomial_TLR": list(monomial),
                "coefficient_factored": str(sp.factor(coefficient)),
                "denominator_factored": str(sp.factor(denominator)),
                "shifted_numerator_term_count": len(values),
                "shifted_numerator_minimum_coefficient": min(values),
                "shifted_numerator_negative_coefficients": sum(value < 0 for value in values),
            }
            terms.append(item)
            print(
                item["product_monomial_TLR"], "MIN",
                item["shifted_numerator_minimum_coefficient"], "NEG",
                item["shifted_numerator_negative_coefficients"],
                item["coefficient_factored"], flush=True,
            )
        rows.append({"q_degree": degree, "product_terms": terms})
    payload = {
        "schema": "uniform-low-high-right-gap0-slack-symbolic-probe-root-v1",
        "status": "PASS_EXACT_FOUR_PRODUCT_STRUCTURE_PROBE",
        "parameterization": "q=s/(y+k+1)>=0 for extra right gap-0 slack s",
        "identity": "c(q)=c+q(c-a), v(q)=v+q(v-a_tail)",
        "q_coefficients": rows,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Structural probe only; signs require pairwise payments and independent audit.",
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
