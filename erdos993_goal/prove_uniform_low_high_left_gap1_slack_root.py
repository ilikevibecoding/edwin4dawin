#!/usr/bin/env python3
"""Exact all-rank theorem for arbitrary left gap-1 slack."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp
from sympy.polys.domains import QQ
from sympy.polys.fields import field


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_left_gap1_slack_exact_root_20260827.json"
DEPENDENCIES = {
    "prove_uniform_low_high_zero_slack_two_parameter_strong_boundary_root.py":
        "3AF989ED0E4D38215E6702117C659827161E784C8382FA5A614F518438A19415",
    "uniform_low_high_zero_slack_two_parameter_strong_boundary_exact_root_20260826.json":
        "DC71A44F38291A444927B1B98351B8A30640379EF190AC2CBC21CDBE87D0DEB8",
    "audit_uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_root.py":
        "8B9494C7E28D2A750869E722F139512D8CD6C03FFF563B2D4B5F809DA32D6150",
    "uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json":
        "507C9BC153F158A1D956676808FA09EA9C9B3DC3A4ECC2E9D4894A2A243AD8F2",
}
BASES = ("T", "L", "R")
PRODUCTS = (
    ("T", "T"), ("T", "L"), ("T", "R"),
    ("L", "L"), ("L", "R"), ("R", "R"),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ordered_hash(values) -> str:
    return hashlib.sha256(
        "\n".join(str(value) for value in values).encode("ascii")
    ).hexdigest().upper()


def form(row):
    return row[1] ** 2 - row[0] * row[2] - row[0] * row[1]


def cross(first, second):
    return (
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def product_row(first, second, whole, tail, capacity):
    if first == second:
        return capacity * form(whole[first]) + cross(whole[first], tail[first])
    return (
        capacity * cross(whole[first], whole[second])
        + cross(whole[first], tail[second])
        + cross(whole[second], tail[first])
    )


def add(*rows):
    return {
        basis: tuple(sum(row[basis][index] for row in rows) for index in range(3))
        for basis in BASES
    }


def scale(row, scalar):
    return {
        basis: tuple(scalar * value for value in row[basis])
        for basis in BASES
    }


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


def build_rows(base_field, k, x, y):
    N, M = k + x, k + y
    zero = (base_field.zero,) * 3
    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    whole_zero = {
        "T": tuple((N + 1) * (M + 1) * value / (N * M)
                   for value in (1, rs, rs * (rs - 1))),
        "L": tuple(-(N + 1) * value / (N * M)
                   for value in (1, rl, rl * (rl - 1))),
        "R": tuple(-(M + 1) * value / (N * M)
                   for value in (1, rr, rr * (rr - 1))),
    }
    removed = {
        "T": zero,
        "L": zero,
        "R": (
            (M + 1) / M * (
                1 + (k - 1) * (N + 1) / (y + 2)
                + (k - 1) * (k - 2) * (N**2 - 1)
                / (2 * (y + 2) * (y + 3))
            ),
            (M + 1) / M * (
                y + 1 + k * (N + 1)
                + k * (k - 1) * (N**2 - 1) / (2 * (y + 2))
            ),
            (M + 1) / M * (
                y * (y + 1) + (k + 1) * (N + 1) * (y + 1)
                + k * (k + 1) * (N**2 - 1) / 2
            ),
        ),
    }
    tail_zero = add(whole_zero, scale(removed, -1))
    right_previous = (M + 1) / M
    right_high = {
        "T": zero,
        "L": zero,
        "R": (
            right_previous,
            right_previous * (y + 1),
            right_previous * y * (y + 1),
        ),
    }
    prior = (
        right_previous / (y + 2),
        right_previous,
        right_previous * (y + 1),
    )
    first = {
        "T": zero,
        "L": zero,
        "R": tuple((k - 1 + index) * prior[index] for index in range(3)),
    }
    remainder = add(
        whole_zero, scale(right_high, -1), scale(first, -(N + 1))
    )

    slack_field, s = field("s", base_field)
    lift = lambda row: {
        basis: tuple(promote(slack_field, value) for value in row[basis])
        for basis in BASES
    }
    whole_zero_s, tail_zero_s = map(lift, (whole_zero, tail_zero))
    right_high_s, first_s, remainder_s = map(lift, (right_high, first, remainder))
    N_s = promote(slack_field, N)
    D = N_s**2 - 1
    multiplier = (D + 2 * N_s * s + s**2) / D
    whole = add(
        right_high_s,
        scale(first_s, N_s + 1 + s),
        scale(remainder_s, multiplier),
    )
    tail = scale(tail_zero_s, multiplier)
    for basis in BASES:
        for index in range(3):
            assert sp.cancel(
                whole[basis][index].as_expr().subs(s.as_expr(), 0)
                - whole_zero_s[basis][index].as_expr()
            ) == 0
            assert sp.cancel(
                tail[basis][index].as_expr().subs(s.as_expr(), 0)
                - tail_zero_s[basis][index].as_expr()
            ) == 0
    rows = {
        product: outer_coefficients(
            product_row(*product, whole, tail, N_s - 2), base_field
        )
        for product in PRODUCTS
    }
    assert max(len(row) for row in rows.values()) == 5
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


def coefficient_row(rank, terminal, gap1=0):
    ratios = [terminal + rank + 1 + gap1, terminal + rank - 1 + gap1]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree):
    return sum(
        math.comb(degree, index) * first[index] * second[degree - index]
        for index in range(degree + 1)
    )


def direct(rank, x, y, slack):
    left_ratios, left = coefficient_row(rank, x, gap1=slack)
    _, right = coefficient_row(rank, y)
    left_tail = [0, 0, 0, *left[3:]]
    whole = [
        convolution(left, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    ]
    tail = [
        convolution(left_tail, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    ]
    return left_ratios[2] * form(whole) + cross(whole, tail)


def main() -> int:
    dependency_hashes = {}
    for name, expected in DEPENDENCIES.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        dependency_hashes[name] = actual
    zero = json.loads(
        (HERE / "uniform_low_high_zero_slack_two_parameter_strong_boundary_exact_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    zero_audit = json.loads(
        (HERE / "uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    assert zero["status"] == "PASS_EXACT_ALL_RANK_TWO_PARAMETER_ZERO_SLACK_STRONG_BOUNDARY"
    assert zero_audit["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_TWO_PARAMETER_ZERO_SLACK_STRONG_BOUNDARY_AUDIT"

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

    def coefficient(product, degree):
        row = rows[product]
        return row[degree] if degree < len(row) else F.zero

    N, M = k + x, k + y
    U3 = sum(
        math.prod(k - 1 - index for index in range(power))
        * (M / N) ** power / math.factorial(power)
        for power in range(4)
    )
    ratio7 = (N / M) ** 7
    reciprocal_pair = (
        (k - 1) * N / 2
        * (1 / (x + y + k + 2) + 1 / (x + y + 2 * k))
    )
    certificates = {}
    for degree in range(1, 5):
        assert coefficient(("T", "T"), degree) == 0
        assert coefficient(("L", "L"), degree) == 0
        alpha = coefficient(("T", "L"), degree)
        beta = coefficient(("T", "R"), degree)
        gamma = -coefficient(("L", "R"), degree)
        delta = -coefficient(("R", "R"), degree)
        row = {
            "product_form": "alpha*T*L+beta*T*R-gamma*L*R-delta*R^2",
            "alpha_positive": summary(shifted(alpha)),
            "beta_minus_delta_positive": summary(shifted(beta - delta)),
            "x_at_least_y": {
                "beta_positive": summary(high(beta)),
                "delta_nonnegative_reserve": summary(high(
                    beta * U3 - gamma - delta
                )),
                "delta_negative_reserve": summary(high(
                    beta * U3 - gamma
                )),
            },
            "y_at_least_x": {
                "delta_nonnegative_gamma_nonnegative_reserve": summary(low(
                    beta - delta - gamma * ratio7
                )),
                "delta_negative_gamma_negative_reserve": summary(low(
                    beta - delta + delta * reciprocal_pair
                )),
                "delta_negative_gamma_nonnegative_reserve": summary(low(
                    beta - delta + delta * reciprocal_pair - gamma * ratio7
                )),
            },
        }
        certificates[f"slack_degree_{degree}"] = row
        print("PASS SLACK DEGREE", degree, flush=True)

    exact_checks = []
    for rank, xv, yv, slack in (
        (8, 0, 0, 1), (8, 3, 11, 17), (9, 1, 100, 7),
        (13, 29, 2, 100), (20, 7, 31, 3),
    ):
        T = math.prod(xv + yv + rank + index for index in range(2, rank + 1))
        L = math.prod(xv + index for index in range(2, rank + 1))
        R = math.prod(yv + index for index in range(2, rank + 1))
        product_values = {"T": T, "L": L, "R": R}
        substitutions = {k.as_expr(): rank, x.as_expr(): xv, y.as_expr(): yv}
        assembled = sp.S.Zero
        for degree in range(5):
            coefficient_value = sp.S.Zero
            for first, second in PRODUCTS:
                value = coefficient((first, second), degree)
                coefficient_value += (
                    value.as_expr().subs(substitutions)
                    * product_values[first] * product_values[second]
                )
            assembled += slack**degree * coefficient_value
        direct_value = direct(rank, xv, yv, slack)
        assert assembled.is_Integer and int(assembled) == direct_value
        assert direct_value > 0
        exact_checks.append({
            "rank": rank, "x": xv, "y": yv,
            "left_gap1_slack": slack,
            "strong_auxiliary": str(direct_value),
        })

    payload = {
        "schema": "uniform-low-high-left-gap1-slack-exact-root-v1",
        "status": "PASS_EXACT_ALL_RANK_LEFT_GAP1_SLACK_STRONG_BOUNDARY",
        "theorem": (
            "For every integer k>=8 and real x,y,s>=0, with left ratios "
            "(x+k+1+s,x+k-1+s,x+k-2,...,x) and right ratios "
            "(y+k+1,y+k-1,y+k-2,...,y), the complete strong auxiliary "
            "(x+k-2)M(c)+B(c,v) is strictly positive."
        ),
        "slack_degree": 4,
        "constant_coefficient": "positive by the independently audited zero-slack theorem",
        "positive_coefficient_certificates": certificates,
        "bounds": {
            "x_at_least_y": (
                "T/L is bounded below by the cubic binomial truncation; "
                "R/L<=1; split on the sign of delta"
            ),
            "y_at_least_x": (
                "L/T<=(N/M)^7 and 1-R/T is bounded by the paired-endpoint "
                "union sum (k-1)N/2*(1/(x+y+k+2)+1/(x+y+2k)); "
                "split on the signs of delta and gamma"
            ),
        },
        "direct_exact_checks": exact_checks,
        "dependencies_sha256": dependency_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves the isolated left gap-1 direction on the translated "
            "low/high boundary. Simultaneous interaction with other positive "
            "gap coordinates and the full Erdos conjecture remain separate."
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
