#!/usr/bin/env python3
"""Independent exact audit of the left-gap0 over right-gap01 theorem.

All payment rows are rebuilt directly from the T/L/R factorial vectors.  This
module imports neither the payment producer nor the theorem assembler.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_left_gap0_right_gap01_slack_independent_audit_root_20260827.json"
DEPENDENCIES = {
    "prove_uniform_low_high_left_gap0_right_gap01_slack_root.py":
        "C97D477F79EC86CD998293CC6957516C78A353A157A8B12C47068EE55409B6DB",
    "uniform_low_high_left_gap0_right_gap01_slack_exact_root_20260827.json":
        "0A5DA773954EFBAA876DF45FB95D63A6F6D799D779761DF91C7F955CD6BCE55D",
    "prove_uniform_low_high_left_gap0_right_gap01_payments_root.py":
        "8F9FC8E73461BDC4C2C1EC28C47B4309A36AB508760E3185283053B56EA28602",
    "uniform_low_high_left_gap0_right_gap01_payments_root_20260827.json":
        "587F99CD8025DC6433A5D87C2C975CBE04A6FECEB2075321B84413F0928159F7",
    "uniform_low_high_right_gap01_slack_independent_audit_root_20260827.json":
        "1143E497957696A02299E1DD7C2EA5B4355173D28DC48D0FA0B8968A2776F11D",
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


def pair_row(first, second, left, right):
    if first == second:
        return cross(left[first], right[first])
    return cross(left[first], right[second]) + cross(left[second], right[first])


def outer_coefficients(value, coefficient_field):
    if value == 0:
        return [coefficient_field.zero]
    assert value.denom.degree() == 0
    denominator = value.denom[(0,)]
    result = [coefficient_field.zero for _ in range(value.numer.degree() + 1)]
    for (power,), coefficient in value.numer.terms():
        result[power] = coefficient / denominator
    return result


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


def independent_rows(base_field, k0, x0, y0):
    slack_field, s = field("s", base_field)
    k = slack_field.from_expr(k0.as_expr())
    x = slack_field.from_expr(x0.as_expr())
    y = slack_field.from_expr(y0.as_expr())
    N, M = k + x, k + y
    zero = (slack_field.zero,) * 3
    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    whole_zero = {
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
        "L": (
            left_previous,
            left_previous * (x + 1),
            left_previous * x * (x + 1),
        ),
        "R": zero,
    }
    prior = (
        left_previous / (x + 2),
        left_previous,
        left_previous * (x + 1),
    )
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
    tail_zero = add(whole_zero, scale(removed, -1))
    whole_remainder = add(
        whole_zero, scale(left_high, -1), scale(first, -(M + 1))
    )
    tail_remainder = add(
        tail_zero, scale(left_high, -1), scale(first, -(M + 1))
    )
    D = M**2 - 1
    multiplier = (D + 2 * M * s + s**2) / D
    whole = add(
        left_high,
        scale(first, M + 1 + s),
        scale(whole_remainder, multiplier),
    )
    tail = add(
        left_high,
        scale(first, M + 1 + s),
        scale(tail_remainder, multiplier),
    )
    right_zero = {
        "T": zero,
        "L": zero,
        "R": (
            right_previous,
            right_previous * (y + 1),
            right_previous * y * (y + 1),
        ),
    }
    right_only = scale(right_zero, multiplier)
    d0 = add(whole, scale(right_only, -1))
    e = add(whole, scale(left_high, -1), scale(right_only, -1))
    w = add(tail, scale(left_high, -1))
    rows = {degree: {} for degree in range(3)}
    for product in PRODUCTS:
        values = (
            product_row(*product, d0, tail, N - 2),
            (N - 2) * pair_row(*product, d0, e)
            + pair_row(*product, d0, w)
            + pair_row(*product, e, tail),
            product_row(*product, e, w, N - 2),
        )
        for degree, value in enumerate(values):
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


def coefficient_row(rank, terminal, gap0=0, gap1=0):
    ratios = [
        terminal + rank + 1 + gap0 + gap1,
        terminal + rank - 1 + gap1,
    ]
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


def direct(rank, x, y, left_gap0, right_gap0, right_gap1):
    left_ratios, left = coefficient_row(rank, x, gap0=left_gap0)
    _, right = coefficient_row(rank, y, gap0=right_gap0, gap1=right_gap1)
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

    theorem = json.loads(
        (HERE / "uniform_low_high_left_gap0_right_gap01_slack_exact_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    producer = json.loads(
        (HERE / "uniform_low_high_left_gap0_right_gap01_payments_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    base_audit = json.loads(
        (HERE / "uniform_low_high_right_gap01_slack_independent_audit_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    assert theorem["status"] == "PASS_EXACT_ALL_RANK_LEFT_GAP0_OVER_RIGHT_GAP01_STRONG_BOUNDARY"
    assert producer["status"] == "PASS_EXACT_ALL_RANK_LEFT_GAP0_OVER_RIGHT_GAP01_PAYMENTS"
    assert base_audit["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_SIMULTANEOUS_RIGHT_GAP01_AUDIT"

    # Independent universal replay of H(p)=(1+p)H0+p(1+p)K.
    U, c0, c1, c2, v0, v1, v2, a, r, cap, p = field(
        "c0,c1,c2,v0,v1,v2,a,r,cap,p", QQ
    )
    c, v = (c0, c1, c2), (v0, v1, v2)
    null = (a, a * r, a * r * (r - 1))
    assert form(null) == 0
    d = tuple(c[index] - null[index] for index in range(3))
    cp = tuple(c[index] + p * d[index] for index in range(3))
    vp = tuple((1 + p) * v[index] for index in range(3))
    h = cap * form(cp) + cross(cp, vp)
    h0 = cap * form(c) + cross(c, v)
    payment = cap * form(d) + cross(d, v)
    assert h == (1 + p) * h0 + p * (1 + p) * payment

    F, k, x, y = field("k,x,y", QQ)
    rows = independent_rows(F, k, x, y)
    G, u, xg, yg = field("u,x,y", QQ)
    H, uh, yh, zh = field("u,y,z", QQ)
    J, ul, xl, zl = field("u,x,z", QQ)

    def shifted(value):
        return G.from_expr(value.as_expr().subs({
            k.as_expr(): u.as_expr() + 8,
            x.as_expr(): xg.as_expr(),
            y.as_expr(): yg.as_expr(),
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

    def coefficient(qdegree, product, sdegree):
        row = rows[qdegree][product]
        return row[sdegree] if sdegree < len(row) else F.zero

    N, M = k + x, k + y
    high_lower = 1 + (k - 1) * M / N
    low_lower = sum(
        math.prod(k - 1 - index for index in range(power))
        * (N / M) ** power / math.factorial(power)
        for power in range(4)
    )
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
            left = {"alpha_plus_epsilon": summary(shifted(total_at_one))}
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
            print("AUDIT PASS", label, flush=True)
    assert certificates == producer["coefficient_certificates"]

    direct_checks = []
    for row in theorem["direct_exact_checks"]:
        value = direct(
            row["rank"], row["x"], row["y"], row["left_gap0_slack"],
            row["right_gap0_slack"], row["right_gap1_slack"],
        )
        assert str(value) == row["strong_auxiliary"] and value > 0
        direct_checks.append({**row, "independent_value": str(value)})

    payload = {
        "schema": "uniform-low-high-left-gap0-right-gap01-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_LEFT_GAP0_OVER_RIGHT_GAP01_AUDIT",
        "verified": {
            "abstract_left_lift_factorization": True,
            "independent_payment_row_reconstruction": True,
            "right_top_identity_all_products_and_s_degrees": True,
            "all_ten_certificate_summaries_equal_producer": True,
            "base_sign_source": "pinned independent simultaneous right-gap01 audit",
        },
        "independent_direct_checks": direct_checks,
        "dependencies_sha256": dependency_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This independently certifies the three-coordinate translated "
            "boundary theorem, not the full Erdos conjecture."
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
