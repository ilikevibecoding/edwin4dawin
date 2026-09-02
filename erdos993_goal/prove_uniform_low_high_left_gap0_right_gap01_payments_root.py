#!/usr/bin/env python3
"""Exact payments for left gap0 over the simultaneous right gap01 face."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_uniform_low_high_right_gap01_normalized_lift_root import (
    PRODUCTS,
    bilinear,
    build_gap1_basis,
    product_coefficient,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_left_gap0_right_gap01_payments_root_20260827.json"
DEPENDENCIES = {
    "probe_uniform_low_high_right_gap01_normalized_lift_root.py":
        "446CD87FB6D5EA9D84B2927FEE6E198A677FE01E4EDF8852B242481A42441CC8",
    "uniform_low_high_right_gap01_slack_exact_root_20260827.json":
        "F5864694119A2BE825AA25E5F54ACCB94C09BC6F263622A22FA7A50948F38723",
    "uniform_low_high_right_gap01_slack_independent_audit_root_20260827.json":
        "1143E497957696A02299E1DD7C2EA5B4355173D28DC48D0FA0B8968A2776F11D",
}
BASES = ("T", "L", "R")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ordered_hash(values) -> str:
    return hashlib.sha256(
        "\n".join(str(value) for value in values).encode("ascii")
    ).hexdigest().upper()


def promote(target, value):
    return target.from_expr(value.as_expr()) if hasattr(value, "as_expr") else target(value)


def outer_coefficients(value, coefficient_field):
    if value == 0:
        return [coefficient_field.zero]
    assert value.denom.degree() == 0
    denominator = value.denom[(0,)]
    result = [coefficient_field.zero for _ in range(value.numer.degree() + 1)]
    for (power,), coefficient in value.numer.terms():
        result[power] = coefficient / denominator
    return result


def pair_coefficient(left, right, first, second):
    if first == second:
        return bilinear(left[first], right[first])
    return (
        bilinear(left[first], right[second])
        + bilinear(left[second], right[first])
    )


def add(*rows):
    return {
        basis: tuple(sum(row[basis][index] for row in rows) for index in range(3))
        for basis in BASES
    }


def scale(row, scalar):
    return {basis: tuple(scalar * value for value in row[basis]) for basis in BASES}


def build_rows(base_field, k0, x0, y0):
    S, s = field("s", base_field)
    N, M, left_high, whole, tail = build_gap1_basis(k0, x0, y0, s)
    left_high = {basis: tuple(promote(S, value) for value in row)
                 for basis, row in left_high.items()}
    whole = {basis: tuple(promote(S, value) for value in row)
             for basis, row in whole.items()}
    tail = {basis: tuple(promote(S, value) for value in row)
            for basis, row in tail.items()}
    N, M, x, y = map(lambda value: promote(S, value), (N, M, x0, y0))
    zero = (S.zero,) * 3
    right_previous = (M + 1) / M
    right_zero = {
        "T": zero, "L": zero,
        "R": (right_previous, right_previous * (y + 1),
              right_previous * y * (y + 1)),
    }
    multiplier = ((M + s) ** 2 - 1) / (M**2 - 1)
    right_only = scale(right_zero, multiplier)
    d0 = add(whole, scale(right_only, -1))
    e = add(whole, scale(left_high, -1), scale(right_only, -1))
    w = add(tail, scale(left_high, -1))
    capacity = N - 2
    rows = {degree: {} for degree in range(3)}
    for product in PRODUCTS:
        h0 = product_coefficient(*product, d0, tail, capacity)
        h1 = (
            capacity * pair_coefficient(d0, e, *product)
            + pair_coefficient(d0, w, *product)
            + pair_coefficient(e, tail, *product)
        )
        h2 = product_coefficient(*product, e, w, capacity)
        for degree, value in enumerate((h0, h1, h2)):
            rows[degree][product] = outer_coefficients(value, base_field)
    assert max(len(row) for degree in rows.values() for row in degree.values()) == 5
    for product in PRODUCTS:
        for sdegree in range(5):
            values = [
                rows[qdegree][product][sdegree]
                if sdegree < len(rows[qdegree][product])
                else base_field.zero
                for qdegree in range(3)
            ]
            assert values[1] == values[0] + values[2]
    return rows


def summary(value):
    numerator = [coefficient for _, coefficient in value.numer.terms()]
    denominator = [coefficient for _, coefficient in value.denom.terms()]
    assert numerator and all(coefficient > 0 for coefficient in numerator)
    assert denominator and all(coefficient > 0 for coefficient in denominator)
    return {
        "numerator_terms": len(numerator),
        "numerator_minimum": str(min(numerator)),
        "numerator_ordered_coefficients_sha256": ordered_hash(numerator),
        "denominator_terms": len(denominator),
        "denominator_minimum": str(min(denominator)),
        "denominator_ordered_coefficients_sha256": ordered_hash(denominator),
    }


def main():
    dependency_hashes = {}
    for name, expected in DEPENDENCIES.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        dependency_hashes[name] = actual
    base_audit = json.loads(
        (HERE / "uniform_low_high_right_gap01_slack_independent_audit_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    assert base_audit["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_SIMULTANEOUS_RIGHT_GAP01_AUDIT"

    F, k, x, y = field("k,x,y", QQ)
    rows = build_rows(F, k, x, y)
    G, u, xg, yg = field("u,x,y", QQ)
    H, uh, yh, zh = field("u,y,z", QQ)
    J, ul, xl, zl = field("u,x,z", QQ)

    def shifted(value):
        return G.from_expr(value.as_expr().subs({
            k.as_expr(): u.as_expr() + 8,
            x.as_expr(): xg.as_expr(), y.as_expr(): yg.as_expr(),
        }))

    def high(value):
        return H.from_expr(value.as_expr().subs({
            k.as_expr(): uh.as_expr() + 8,
            x.as_expr(): yh.as_expr() + zh.as_expr(),
            y.as_expr(): yh.as_expr(),
        }))

    def low(value):
        return J.from_expr(value.as_expr().subs({
            k.as_expr(): ul.as_expr() + 8,
            x.as_expr(): xl.as_expr(),
            y.as_expr(): xl.as_expr() + zl.as_expr(),
        }))

    N, M = k + x, k + y
    high_lower = 1 + (k - 1) * M / N
    low_lower = sum(
        math.prod(k - 1 - index for index in range(power))
        * (N / M) ** power / math.factorial(power)
        for power in range(4)
    )

    def coefficient(qdegree, product, sdegree):
        row = rows[qdegree][product]
        return row[sdegree] if sdegree < len(row) else F.zero

    certificates = {}
    for qdegree in (0, 2):
        for sdegree in range(5):
            label = f"q{qdegree}_s{sdegree}"
            alpha = coefficient(qdegree, ("T", "L"), sdegree)
            beta = coefficient(qdegree, ("T", "R"), sdegree)
            epsilon = coefficient(qdegree, ("L", "L"), sdegree)
            gamma = -coefficient(qdegree, ("L", "R"), sdegree)
            delta = -coefficient(qdegree, ("R", "R"), sdegree)
            total_at_one = alpha + epsilon
            left = {
                "alpha_plus_epsilon": summary(shifted(total_at_one)),
            }
            if sdegree <= 1:
                left["alpha"] = summary(shifted(alpha))
                left["argument"] = "alpha*U+epsilon=(alpha+epsilon)+alpha*(U-1)>0"
            else:
                left["epsilon"] = summary(shifted(epsilon))
                reserve = (x + M + 2) * total_at_one - epsilon * (k - 1) * M
                left["union_bound_reserve"] = summary(shifted(reserve))
                left["argument"] = (
                    "alpha*U+epsilon=U*((alpha+epsilon)-epsilon*(1-1/U))>0"
                )
            right = {
                "delta_positive": summary(shifted(delta)),
                "x_at_least_y_beta_positive": summary(high(beta)),
                "x_at_least_y_reserve": summary(high(
                    beta * high_lower - gamma - delta
                )),
                "y_at_least_x_drop_gamma_reserve": summary(low(
                    beta * low_lower - delta
                )),
                "y_at_least_x_gamma_reserve": summary(low(
                    beta * low_lower - delta - gamma * (N / M) ** 7
                )),
            }
            certificates[label] = {"left_block": left, "right_block": right}
            print("PASS", label, flush=True)

    payload = {
        "schema": "uniform-low-high-left-gap0-right-gap01-payments-root-v1",
        "status": "PASS_EXACT_ALL_RANK_LEFT_GAP0_OVER_RIGHT_GAP01_PAYMENTS",
        "claim": (
            "For q>=0, the left-gap0 quadratic payment K(q,s) is positive "
            "for every k>=8 and x,y,s>=0."
        ),
        "right_top_quadratic_identity": (
            "K1=K0+K2 coefficientwise, hence K(q,s)=(1+q)K0(s)+q(1+q)K2(s)."
        ),
        "coefficient_certificates": certificates,
        "bounds": {
            "left_block": "U=T/L with the standard union bound for 1-1/U",
            "right_x_at_least_y": "T/L>=1+(k-1)M/N and R/L<=1",
            "right_y_at_least_x": (
                "T/R>=cubic truncation of (1+N/M)^(k-1), and L/R<=(N/M)^7"
            ),
        },
        "dependencies_sha256": dependency_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "Payment certificate only; theorem assembly and independent audit are separate."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
