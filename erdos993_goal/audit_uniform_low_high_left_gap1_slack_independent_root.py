#!/usr/bin/env python3
"""Independent exact audit of the all-rank left gap-1 theorem.

The quartic product rows and every regional reserve are reconstructed here
without importing the theorem producer.
"""

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
OUTPUT = HERE / "uniform_low_high_left_gap1_slack_independent_audit_root_20260827.json"
DEPENDENCIES = {
    "prove_uniform_low_high_left_gap1_slack_root.py":
        "089B45E3BDC4149CE4CF1DE19AEAEE3F8057C848CF6CB127263B54C4F80D50D2",
    "uniform_low_high_left_gap1_slack_exact_root_20260827.json":
        "ED93FB61FE756B2B0186549B260F96FF9B9BEE36303492F185C9404B2B2153EA",
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


def quadratic(row):
    return row[1] ** 2 - row[0] * row[2] - row[0] * row[1]


def polar(first, second):
    return (
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def scalar_product(first, second, whole, tail, capacity):
    if first == second:
        return capacity * quadratic(whole[first]) + polar(whole[first], tail[first])
    return (
        capacity * polar(whole[first], whole[second])
        + polar(whole[first], tail[second])
        + polar(whole[second], tail[first])
    )


def combine(*rows):
    return {
        basis: tuple(sum(row[basis][index] for row in rows) for index in range(3))
        for basis in BASES
    }


def multiply(row, scalar):
    return {
        basis: tuple(scalar * value for value in row[basis])
        for basis in BASES
    }


def promote(target, value):
    return target.from_expr(value.as_expr()) if hasattr(value, "as_expr") else target(value)


def coefficients_in_slack(value, coefficient_field):
    if value == 0:
        return [coefficient_field.zero]
    assert value.denom.degree() == 0
    denominator = value.denom[(0,)]
    result = [coefficient_field.zero for _ in range(value.numer.degree() + 1)]
    for (power,), coefficient in value.numer.terms():
        result[power] = coefficient / denominator
    return result


def independent_rows(base_field, k, x, y):
    N, M = k + x, k + y
    zero = (base_field.zero,) * 3
    total_root, left_root, right_root = N + M - k + 1, x + 1, y + 1
    whole0 = {
        "T": tuple((N + 1) * (M + 1) * value / (N * M)
                   for value in (1, total_root, total_root * (total_root - 1))),
        "L": tuple(-(N + 1) * value / (N * M)
                   for value in (1, left_root, left_root * (left_root - 1))),
        "R": tuple(-(M + 1) * value / (N * M)
                   for value in (1, right_root, right_root * (right_root - 1))),
    }
    right_previous = (M + 1) / M
    excluded = {
        "T": zero,
        "L": zero,
        "R": (
            right_previous * (
                1 + (k - 1) * (N + 1) / (y + 2)
                + (k - 1) * (k - 2) * (N**2 - 1)
                / (2 * (y + 2) * (y + 3))
            ),
            right_previous * (
                y + 1 + k * (N + 1)
                + k * (k - 1) * (N**2 - 1) / (2 * (y + 2))
            ),
            right_previous * (
                y * (y + 1) + (k + 1) * (N + 1) * (y + 1)
                + k * (k + 1) * (N**2 - 1) / 2
            ),
        ),
    }
    tail0 = combine(whole0, multiply(excluded, -1))

    # Contributions of left degrees zero, one, and at least two.
    degree0 = {
        "T": zero,
        "L": zero,
        "R": (
            right_previous,
            right_previous * (y + 1),
            right_previous * y * (y + 1),
        ),
    }
    previous = (
        right_previous / (y + 2),
        right_previous,
        right_previous * (y + 1),
    )
    degree1_unit = {
        "T": zero,
        "L": zero,
        "R": tuple((k - 1 + index) * previous[index] for index in range(3)),
    }
    degree2plus = combine(
        whole0, multiply(degree0, -1), multiply(degree1_unit, -(N + 1))
    )

    slack_field, s = field("s", base_field)
    lift = lambda row: {
        basis: tuple(promote(slack_field, value) for value in row[basis])
        for basis in BASES
    }
    tail0_s = lift(tail0)
    degree0_s, degree1_s, degree2plus_s = map(
        lift, (degree0, degree1_unit, degree2plus)
    )
    N_s = promote(slack_field, N)
    scale2 = ((N_s + s) ** 2 - 1) / (N_s**2 - 1)
    whole = combine(
        degree0_s,
        multiply(degree1_s, N_s + 1 + s),
        multiply(degree2plus_s, scale2),
    )
    tail = multiply(tail0_s, scale2)
    rows = {
        product: coefficients_in_slack(
            scalar_product(*product, whole, tail, N_s - 2), base_field
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


def ratio_row(rank, terminal, gap1=0):
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
    left_ratios, left = ratio_row(rank, x, gap1=slack)
    _, right = ratio_row(rank, y)
    left_tail = [0, 0, 0, *left[3:]]
    whole = [convolution(left, right, degree)
             for degree in (rank - 1, rank, rank + 1)]
    tail = [convolution(left_tail, right, degree)
            for degree in (rank - 1, rank, rank + 1)]
    return left_ratios[2] * quadratic(whole) + polar(whole, tail)


def main() -> int:
    dependency_hashes = {}
    for name, expected in DEPENDENCIES.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        dependency_hashes[name] = actual
    theorem = json.loads(
        (HERE / "uniform_low_high_left_gap1_slack_exact_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    zero_audit = json.loads(
        (HERE / "uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    assert theorem["status"] == "PASS_EXACT_ALL_RANK_LEFT_GAP1_SLACK_STRONG_BOUNDARY"
    assert zero_audit["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_TWO_PARAMETER_ZERO_SLACK_STRONG_BOUNDARY_AUDIT"

    # Exact paired-endpoint convexity identity behind the reciprocal bound.
    A, K, t = sp.symbols("A K t")
    difference = (
        1 / (A + 2) + 1 / (A + K)
        - 1 / (A + 2 + t) - 1 / (A + K - t)
    )
    positive_form = (
        t * (K - 2 - t) * (2 * A + K + 2)
        / ((A + 2) * (A + K) * (A + K - t) * (A + t + 2))
    )
    assert sp.cancel(difference - positive_form) == 0

    F, k, x, y = field("k,x,y", QQ)
    rows = independent_rows(F, k, x, y)
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
    lower = sum(
        math.prod(k - 1 - index for index in range(power))
        * (M / N) ** power / math.factorial(power)
        for power in range(4)
    )
    ratio7 = (N / M) ** 7
    paired = (
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
        certificates[f"slack_degree_{degree}"] = {
            "product_form": "alpha*T*L+beta*T*R-gamma*L*R-delta*R^2",
            "alpha_positive": summary(shifted(alpha)),
            "beta_minus_delta_positive": summary(shifted(beta - delta)),
            "x_at_least_y": {
                "beta_positive": summary(high(beta)),
                "delta_nonnegative_reserve": summary(high(
                    beta * lower - gamma - delta
                )),
                "delta_negative_reserve": summary(high(
                    beta * lower - gamma
                )),
            },
            "y_at_least_x": {
                "delta_nonnegative_gamma_nonnegative_reserve": summary(low(
                    beta - delta - gamma * ratio7
                )),
                "delta_negative_gamma_negative_reserve": summary(low(
                    beta - delta + delta * paired
                )),
                "delta_negative_gamma_nonnegative_reserve": summary(low(
                    beta - delta + delta * paired - gamma * ratio7
                )),
            },
        }
        print("AUDIT PASS SLACK DEGREE", degree, flush=True)
    assert certificates == theorem["positive_coefficient_certificates"]

    direct_checks = []
    for row in theorem["direct_exact_checks"]:
        value = direct(
            row["rank"], row["x"], row["y"], row["left_gap1_slack"]
        )
        assert str(value) == row["strong_auxiliary"] and value > 0
        direct_checks.append({**row, "independent_value": str(value)})

    payload = {
        "schema": "uniform-low-high-left-gap1-slack-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_LEFT_GAP1_SLACK_AUDIT",
        "verified": {
            "independent_quartic_product_row_reconstruction": True,
            "all_four_certificate_dictionaries_equal_producer": True,
            "paired_endpoint_reciprocal_bound_identity": True,
            "zero_slack_constant_source": "pinned independent zero-slack audit",
        },
        "independent_direct_checks": direct_checks,
        "dependencies_sha256": dependency_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This independently certifies the isolated left gap-1 translated "
            "boundary theorem, not simultaneous arbitrary gaps or the full conjecture."
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
