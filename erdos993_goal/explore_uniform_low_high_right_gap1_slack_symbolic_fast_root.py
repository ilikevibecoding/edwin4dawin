#!/usr/bin/env python3
"""Memory-lean exact probe for the right-row gap-1 slack.

The original probe expands quadratic forms in the formal product symbols
T,L,R before extracting their four surviving products.  This version keeps
the T,L,R coefficients separate throughout and applies the quadratic/bilinear
forms directly to those coefficient vectors.  It therefore certifies the
same scalar payments without ever materializing a large polynomial in T,L,R.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pickle
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap1_slack_symbolic_fast_probe_root_20260827.json"
BASES = ("T", "L", "R")
PRODUCTS = (("T", "T"), ("T", "L"), ("T", "R"),
            ("L", "L"), ("L", "R"), ("R", "R"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def margin(row):
    return row[1] ** 2 - row[0] * row[2] - row[0] * row[1]


def polar(first, second):
    return (
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def add(*rows):
    return {
        basis: tuple(sum(row[basis][index] for row in rows)
                     for index in range(3))
        for basis in BASES
    }


def scale(row, scalar):
    return {
        basis: tuple(scalar * value for value in row[basis])
        for basis in BASES
    }


def margin_coefficient(row, first: str, second: str):
    if first == second:
        return margin(row[first])
    return polar(row[first], row[second])


def polar_coefficient(left, right, first: str, second: str):
    if first == second:
        return polar(left[first], right[first])
    return (
        polar(left[first], right[second])
        + polar(left[second], right[first])
    )


def h_coefficient(label, first, second, *, capacity, D,
                  c, v, c1, c2, v1, v2):
    P = lambda a, b: polar_coefficient(a, b, first, second)
    Q = lambda a: margin_coefficient(a, first, second)
    if label == "s1":
        return capacity * P(c, c1) + P(c, v1) + P(c1, v)
    if label == "s2":
        return (
            capacity * (Q(c1) + D * P(c, c2))
            + D * P(c, v2) + P(c1, v1) + D * P(c2, v)
        )
    if label == "s3":
        return capacity * P(c1, c2) + P(c1, v2) + P(c2, v1)
    if label == "s4":
        return capacity * Q(c2) + P(c2, v2)
    raise ValueError(label)


def sign_summary(expression, rank, shift, variables):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    polynomial = sp.Poly(numerator.subs(rank, shift + 8), *variables)
    values = [int(coefficient) for _, coefficient in polynomial.terms()]
    assert values and all(sp.Integer(value) == value for value in values)
    return {
        "denominator": str(sp.factor(denominator)),
        "terms": len(values),
        "minimum": min(values),
        "negative": sum(value < 0 for value in values),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--coefficient", choices=("s1", "s2", "s3", "s4"))
    parser.add_argument("--load-cache", action="store_true")
    args = parser.parse_args()
    k, x, y = sp.symbols("k x y", real=True)
    u = sp.Symbol("u", nonnegative=True)
    N, M = x + k, y + k
    zero = (sp.S.Zero,) * 3

    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    c = {
        "T": tuple((N + 1) * (M + 1) * value / (N * M)
                   for value in (1, rs, rs * (rs - 1))),
        "L": tuple(-(N + 1) * value / (N * M)
                   for value in (1, rl, rl * (rl - 1))),
        "R": tuple(-(M + 1) * value / (N * M)
                   for value in (1, rr, rr * (rr - 1))),
    }

    left_prev = (N + 1) / N
    left_high_vector = (
        left_prev,
        left_prev * (x + 1),
        left_prev * x * (x + 1),
    )
    left_previous_high = (
        left_prev / (x + 2),
        left_prev,
        left_prev * (x + 1),
    )
    first_vector = tuple(
        (k - 1 + index) * left_previous_high[index]
        for index in range(3)
    )
    left_high = {"T": zero, "L": left_high_vector, "R": zero}
    first = {"T": zero, "L": first_vector, "R": zero}

    right_prev = (M + 1) / M
    head_vector = (
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
    head = {"T": zero, "L": zero, "R": head_vector}
    v = add(c, scale(head, -1))
    c_tail = add(c, scale(left_high, -1), scale(first, -(M + 1)))
    v_tail = add(v, scale(left_high, -1), scale(first, -(M + 1)))

    D = M**2 - 1
    c1 = add(scale(first, D), scale(c_tail, 2 * M))
    c2 = c_tail
    v1 = add(scale(first, D), scale(v_tail, 2 * M))
    v2 = v_tail
    capacity = N - 2
    ratio_lower = (
        1 + (k - 1) * N / M
        + ((k - 1) * (k - 2) / 2) * (N / M) ** 2
        + ((k - 1) * (k - 2) * (k - 3) / 6) * (N / M) ** 3
    )

    rows = []
    labels = (args.coefficient,) if args.coefficient else ("s1", "s2", "s3", "s4")
    for label in labels:
        print("BUILD", label, flush=True)
        cache = HERE / f"uniform_low_high_right_gap1_{label}_product_coefficients_root.pkl"
        if args.load_cache:
            with cache.open("rb") as stream:
                coefficients = pickle.load(stream)
        else:
            coefficients = {
                product: sp.cancel((N * M) ** 2 * h_coefficient(
                    label, *product, capacity=capacity, D=D,
                    c=c, v=v, c1=c1, c2=c2, v1=v1, v2=v2,
                ))
                for product in PRODUCTS
            }
            temporary_cache = cache.with_suffix(cache.suffix + ".tmp")
            with temporary_cache.open("wb") as stream:
                pickle.dump(coefficients, stream, protocol=pickle.HIGHEST_PROTOCOL)
            os.replace(temporary_cache, cache)
            print("CACHE", cache.name, sha256(cache), flush=True)
        nonzero = [product for product, value in coefficients.items()
                   if sp.cancel(value) != 0]
        print("NONZERO", label, nonzero, flush=True)
        assert ("T", "T") not in nonzero
        assert all(product in nonzero for product in (
            ("T", "L"), ("T", "R"), ("L", "R"), ("R", "R")
        ))
        alpha = coefficients[("T", "L")]
        beta = coefficients[("T", "R")]
        epsilon = coefficients[("L", "L")]
        gamma = -coefficients[("L", "R")]
        delta = -coefficients[("R", "R")]
        record = {
            "coefficient": label,
            "product_coefficient_cache": cache.name,
            "product_coefficient_cache_sha256": sha256(cache),
            "product_monomials_TLR": [list(item) for item in nonzero],
            "alpha": sign_summary(alpha, k, u, (u, x, y)),
            "beta": sign_summary(beta, k, u, (u, x, y)),
            "extra_L_squared": (
                sign_summary(epsilon, k, u, (u, x, y))
                if epsilon != 0 else {"identically_zero": True}
            ),
            "payment_one_cubic": sign_summary(
                alpha * ratio_lower - gamma, k, u, (u, x, y)
            ),
            "payment_two_unit": sign_summary(
                beta - delta, k, u, (u, x, y)
            ),
        }
        rows.append(record)
        print(label, json.dumps(record, sort_keys=True), flush=True)

    if args.coefficient:
        print("PASS_EXACT_RIGHT_GAP1_SLACK_SINGLE_COEFFICIENT_PROBE", flush=True)
        return 0
    payload = {
        "schema": "uniform-low-high-right-gap1-slack-symbolic-fast-probe-root-v1",
        "status": "PASS_EXACT_RIGHT_GAP1_SLACK_MEMORY_LEAN_COEFFICIENT_PROBE",
        "parameterization": "s>=0 added to the right ratio gap r1-r2",
        "slack_degree": 4,
        "positive_coefficient_rescaling": (
            "D*H1 and D^2*Hj for j=2,3,4, where D=(y+k)^2-1>0"
        ),
        "coefficient_rows": rows,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Structural probe only until all signs are proved and independently audited."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
