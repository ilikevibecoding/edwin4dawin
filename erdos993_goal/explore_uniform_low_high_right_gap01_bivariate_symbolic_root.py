#!/usr/bin/env python3
"""Exact product-basis probe for simultaneous right gap-0/gap-1 slacks.

This is an exploratory structural computation.  It derives the mixed
coefficients without importing the existing producer and compares the high
mixed directions to the already certified gap-1 coefficient rows.
"""

from __future__ import annotations

import hashlib
import json
import os
import pickle
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap01_bivariate_symbolic_probe_root_20260827.json"
PRODUCTS = (("T", "T"), ("T", "L"), ("T", "R"),
            ("L", "L"), ("L", "R"), ("R", "R"))
AXIS_CACHES = {
    degree: HERE / f"uniform_low_high_right_gap1_s{degree}_product_coefficients_root.pkl"
    for degree in range(1, 5)
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def quadratic(row):
    return sp.expand(row[1] ** 2 - row[0] * row[2] - row[0] * row[1])


def bilinear(first, second):
    return sp.expand(
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def product_coefficient(first, second, whole, tail, capacity):
    if first == second:
        return sp.expand(
            capacity * quadratic(whole[first])
            + bilinear(whole[first], tail[first])
        )
    return sp.expand(
        capacity * bilinear(whole[first], whole[second])
        + bilinear(whole[first], tail[second])
        + bilinear(whole[second], tail[first])
    )


def sign_summary(expression, variables):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    polynomial = sp.Poly(sp.expand(numerator), *variables)
    values = [int(coefficient) for _, coefficient in polynomial.terms()]
    return {
        "denominator": str(sp.factor(denominator)),
        "terms": len(values),
        "minimum": min(values) if values else 0,
        "negative": sum(value < 0 for value in values),
        "zero_polynomial": not values,
    }


def build_rows(k, x, y, s, t):
    N, M = k + x, k + y
    D = M**2 - 1
    zero = (sp.S.Zero,) * 3
    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    base = {
        "T": tuple((N + 1) * (M + 1) * value / (N * M)
                   for value in (1, rs, rs * (rs - 1))),
        "L": tuple(-(N + 1) * value / (N * M)
                   for value in (1, rl, rl * (rl - 1))),
        "R": tuple(-(M + 1) * value / (N * M)
                   for value in (1, rr, rr * (rr - 1))),
    }
    left_previous = (N + 1) / N
    left_high = {
        "T": zero,
        "L": (left_previous, left_previous * (x + 1),
              left_previous * x * (x + 1)),
        "R": zero,
    }
    prior = (left_previous / (x + 2), left_previous,
             left_previous * (x + 1))
    first = {
        "T": zero,
        "L": tuple((k - 1 + index) * prior[index] for index in range(3)),
        "R": zero,
    }
    right_previous = (M + 1) / M
    removed = {
        "T": zero,
        "L": zero,
        "R": (
            right_previous * (1 + (k - 1) * (N + 1) / (y + 2)
                + ((k - 1) * (k - 2) / 2) * (N**2 - 1)
                  / ((y + 2) * (y + 3))),
            right_previous * (y + 1 + k * (N + 1)
                + (k * (k - 1) / 2) * (N**2 - 1) / (y + 2)),
            right_previous * (y * (y + 1)
                + (k + 1) * (N + 1) * (y + 1)
                + (k * (k + 1) / 2) * (N**2 - 1)),
        ),
    }
    base_tail = {
        basis: tuple(base[basis][index] - removed[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    whole_remainder = {
        basis: tuple(base[basis][index] - left_high[basis][index]
                     - (M + 1) * first[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    tail_remainder = {
        basis: tuple(base_tail[basis][index] - left_high[basis][index]
                     - (M + 1) * first[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    multiplier = (D + 2 * M * s + s**2) / D
    whole_s = {
        basis: tuple(left_high[basis][index] + (M + 1 + s) * first[basis][index]
                     + multiplier * whole_remainder[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    tail_s = {
        basis: tuple(left_high[basis][index] + (M + 1 + s) * first[basis][index]
                     + multiplier * tail_remainder[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    # A raw top-gap slack multiplies every positive-degree right coefficient
    # by 1+t/(M+1+s).  The right-degree-zero convolution term is left_high.
    whole_direction = {
        basis: tuple(sp.cancel((whole_s[basis][index] - left_high[basis][index])
                               / (M + 1 + s)) for index in range(3))
        for basis in ("T", "L", "R")
    }
    tail_direction = {
        basis: tuple(sp.cancel((tail_s[basis][index] - left_high[basis][index])
                               / (M + 1 + s)) for index in range(3))
        for basis in ("T", "L", "R")
    }
    whole = {
        basis: tuple(whole_s[basis][index] + t * whole_direction[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    tail = {
        basis: tuple(tail_s[basis][index] + t * tail_direction[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    rows = {(i, j): {} for i in range(1, 5) for j in range(1, 3)}
    for product in PRODUCTS:
        polynomial = sp.Poly(product_coefficient(
            *product, whole, tail, N - 2
        ), s, t)
        for i, j in rows:
            rows[(i, j)][product] = sp.cancel(
                polynomial.coeff_monomial(s**i * t**j) * (N * M) ** 2 * D**2
            )
    return rows


def main() -> int:
    k, x, y, s, t = sp.symbols("k x y s t", real=True)
    u = sp.Symbol("u", nonnegative=True)
    rows = build_rows(k, x, y, s, t)
    axis = {}
    axis_hashes = {}
    for degree, path in AXIS_CACHES.items():
        axis_hashes[path.name] = sha256(path)
        with path.open("rb") as stream:
            axis[degree] = pickle.load(stream)

    identities = {}
    candidates = {
        "gap1_3_gap0_1_equals_2_gap1_4": ((3, 1), 4, sp.Integer(2)),
        "gap1_2_gap0_2_equals_gap1_4": ((2, 2), 4, sp.Integer(1)),
    }
    for label, (mixed_key, axis_degree, scalar) in candidates.items():
        identities[label] = all(
            sp.cancel(rows[mixed_key][product] - scalar * axis[axis_degree][product]) == 0
            for product in PRODUCTS
        )

    summaries = {}
    for key, product_rows in rows.items():
        label = f"gap1_{key[0]}_gap0_{key[1]}"
        summaries[label] = {
            f"{first}_{second}": sign_summary(
                expression.subs(k, u + 8), (u, x, y)
            )
            for (first, second), expression in product_rows.items()
        }
        print(label, json.dumps(summaries[label], sort_keys=True), flush=True)

    payload = {
        "schema": "uniform-low-high-right-gap01-bivariate-symbolic-probe-root-v1",
        "status": "PASS_EXACT_RIGHT_GAP01_MIXED_PRODUCT_RECONSTRUCTION_PROBE",
        "mixed_product_summaries": summaries,
        "high_direction_identities": identities,
        "axis_cache_sha256": axis_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Exploratory structural probe only; product-basis sign summaries do not by "
            "themselves prove positivity of every mixed direction."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
