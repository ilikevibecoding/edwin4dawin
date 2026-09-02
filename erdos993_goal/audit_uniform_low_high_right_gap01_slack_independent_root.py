#!/usr/bin/env python3
"""Independent exact audit of the simultaneous right gap0+gap1 theorem.

The H2 rows are reconstructed directly from the zero-slack T/L/R vectors and
the factored gap1 direction.  This module does not import either producer.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import pickle
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap01_slack_independent_audit_root_20260827.json"
DEPENDENCIES = {
    "prove_uniform_low_high_right_gap01_slack_root.py":
        "57BDA0D6A2A1D4C713D66EEBA1EEF5706AB433B115D08DD8E5484B227B930BEC",
    "uniform_low_high_right_gap01_slack_exact_root_20260827.json":
        "F5864694119A2BE825AA25E5F54ACCB94C09BC6F263622A22FA7A50948F38723",
    "probe_uniform_low_high_right_gap01_h2_field_root.py":
        "606EE39FED2325291825665C33CC947EB4CE0A70F7E68A771D8E0C35ED38C833",
    "uniform_low_high_right_gap01_h2_field_probe_root_20260827.json":
        "BD1C1159462C6731B8C37228DA7B376C8D365F8EE5A417D9CECD8B31F38D4F4C",
    "uniform_low_high_right_gap01_normalized_lift_probe_root_20260827.json":
        "5C4AE307561634F6E583FEE6F2C3FC4C1333465E09C6BAB39235C2B202DC8501",
    "uniform_low_high_right_gap1_rows_interpolation_audit_root_20260827.json":
        "598A179F63D5CB1354B79EDAB1469B57FEBD2E8A2571B28163FA29AC450E9088",
    "uniform_low_high_right_gap1_payments_sparse_audit_root_20260827.json":
        "087A2A14F69F349E550F118F91AA24C1A7CAD32904ED82AF922C981E7DD9591D",
    "uniform_low_high_right_gap0_slack_independent_audit_root_20260827.json":
        "57ACB1006AE195F36710BBD5BB411EF6937AAA157413C464FFE0439784D90F4B",
    "uniform_low_high_right_gap1_right_payments_exact_root_20260827.json":
        "EDD5C780AEAAC98E98AE874213473AFA2D22F0B170DE1B8BAAAE78ECC2EF5309",
    "uniform_low_high_right_gap1_s4_product_coefficients_root.pkl":
        "FC9F9CB888F044B8DC39DC5EB2940191CE3FFE2B53BBEE9F14FEF3354B87D4CF",
}
BASES = ("T", "L", "R")
PRODUCTS = (("T", "T"), ("T", "L"), ("T", "R"),
            ("L", "L"), ("L", "R"), ("R", "R"))


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


def independent_raw_rows(base_field, k0, x0, y0):
    slack_field, s = field("s", base_field)
    k = slack_field.from_expr(k0.as_expr())
    x = slack_field.from_expr(x0.as_expr())
    y = slack_field.from_expr(y0.as_expr())
    N, M = k + x, k + y
    zero = (slack_field.zero,) * 3
    rs, rl, rr = N + M - k + 1, x + 1, y + 1
    c = {
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
    v = add(c, scale(removed, -1))
    c_tail = add(c, scale(left_high, -1), scale(first, -(M + 1)))
    v_tail = add(v, scale(left_high, -1), scale(first, -(M + 1)))
    D = M**2 - 1
    sigma = M - 1 + s
    direction = add(first, scale(c_tail, sigma / D))
    tail_direction = add(first, scale(v_tail, sigma / D))
    rows = {
        product: outer_coefficients(
            product_row(*product, direction, tail_direction, N - 2),
            base_field,
        )
        for product in PRODUCTS
    }
    assert max(len(row) for row in rows.values()) == 3
    return rows


def summary(value):
    numerator_values = [coefficient for _, coefficient in value.numer.terms()]
    denominator_values = [coefficient for _, coefficient in value.denom.terms()]
    assert numerator_values and all(coefficient > 0 for coefficient in numerator_values)
    assert denominator_values and all(coefficient > 0 for coefficient in denominator_values)
    return {
        "numerator_terms": len(numerator_values),
        "numerator_minimum": str(min(numerator_values)),
        "numerator_ordered_coefficients_sha256": ordered_hash(numerator_values),
        "denominator_terms": len(denominator_values),
        "denominator_minimum": str(min(denominator_values)),
        "denominator_ordered_coefficients_sha256": ordered_hash(denominator_values),
    }


def coefficient_row(rank, terminal, gap0=0, gap1=0):
    ratios = [terminal + rank + 1 + gap0 + gap1,
              terminal + rank - 1 + gap1]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree):
    return sum(math.comb(degree, index) * first[index] * second[degree - index]
               for index in range(degree + 1))


def direct(rank, x, y, gap0, gap1):
    left_ratios, left = coefficient_row(rank, x)
    _, right = coefficient_row(rank, y, gap0=gap0, gap1=gap1)
    left_tail = [0, 0, 0, *left[3:]]
    whole = [convolution(left, right, degree)
             for degree in (rank - 1, rank, rank + 1)]
    tail = [convolution(left_tail, right, degree)
            for degree in (rank - 1, rank, rank + 1)]
    return left_ratios[2] * form(whole) + cross(whole, tail)


def main() -> int:
    dependency_hashes = {}
    for name, expected in DEPENDENCIES.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        dependency_hashes[name] = actual
    theorem = json.loads(
        (HERE / "uniform_low_high_right_gap01_slack_exact_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    producer = json.loads(
        (HERE / "uniform_low_high_right_gap01_h2_field_probe_root_20260827.json")
        .read_text(encoding="utf-8")
    )
    assert theorem["status"] == "PASS_EXACT_ALL_RANK_SIMULTANEOUS_RIGHT_GAP01_STRONG_BOUNDARY"
    assert producer["status"] == "PASS_EXACT_ALL_RANK_RIGHT_GAP01_H2_PAYMENT_CERTIFICATE"

    # Independent abstract replay of H(q)=(1+q)H0+q(1+q)H2 for Q(A)=0.
    U, c0, c1, c2, v0, v1, v2, a, r, cap, q = field(
        "c0,c1,c2,v0,v1,v2,a,r,cap,q", QQ
    )
    c, v = (c0, c1, c2), (v0, v1, v2)
    null = (a, a * (r + 1), a * r * (r + 1))
    assert form(null) == 0
    cq = tuple(c[i] + q * (c[i] - null[i]) for i in range(3))
    vq = tuple(v[i] + q * (v[i] - null[i]) for i in range(3))
    hq = cap * form(cq) + cross(cq, vq)
    h0 = cap * form(c) + cross(c, v)
    d = tuple(c[i] - null[i] for i in range(3))
    w = tuple(v[i] - null[i] for i in range(3))
    h2 = cap * form(d) + cross(d, w)
    assert hq == (1 + q) * h0 + q * (1 + q) * h2

    certificates = {"x_at_least_y": {}, "y_at_least_x": {}}
    high, u, y, z = field("u,y,z", QQ)
    kh, xh, yh = u + 8, y + z, y
    rows = independent_raw_rows(high, kh, xh, yh)
    Nh, Mh = kh + xh, kh + yh
    lower_u = sum(
        math.prod(kh - 1 - index for index in range(power))
        * (Mh / Nh) ** power / math.factorial(power)
        for power in range(4)
    )
    for degree in (1, 2):
        alpha = rows[("T", "L")][degree]
        epsilon = rows[("L", "L")][degree]
        gamma = -rows[("L", "R")][degree]
        certificates["x_at_least_y"][f"degree_{degree}_drop_negative_gamma"] = summary(
            alpha * lower_u + epsilon
        )
        certificates["x_at_least_y"][f"degree_{degree}_gamma_reserve"] = summary(
            alpha * lower_u + epsilon - gamma * (Mh / Nh) ** 7
        )

    low, ul, x, zl = field("u,x,z", QQ)
    kl, xl, yl = ul + 8, x, x + zl
    rows = independent_raw_rows(low, kl, xl, yl)
    Nl, Ml = kl + xl, kl + yl
    lower_v = sum(
        math.prod(kl - 1 - index for index in range(power))
        * (Nl / Ml) ** power / math.factorial(power)
        for power in range(4)
    )
    epsilon1, epsilon2 = rows[("L", "L")][1:3]
    certificates["y_at_least_x"]["degree_1_negative_epsilon"] = summary(-epsilon1)
    certificates["y_at_least_x"]["degree_2_positive_epsilon"] = summary(epsilon2)
    for degree in (1, 2):
        alpha = rows[("T", "L")][degree]
        epsilon = rows[("L", "L")][degree]
        gamma = -rows[("L", "R")][degree]
        reserve = alpha * lower_v + epsilon - gamma if degree == 1 else alpha * lower_v - gamma
        certificates["y_at_least_x"][f"degree_{degree}_reserve"] = summary(reserve)
    assert certificates == producer["left_product_certificates"]

    # Independently reconstruct the positive right block scaling.
    generic, k, xg, yg = field("k,x,y", QQ)
    rows = independent_raw_rows(generic, k, xg, yg)
    N, M, D = k + xg, k + yg, (k + yg) ** 2 - 1
    with (HERE / "uniform_low_high_right_gap1_s4_product_coefficients_root.pkl").open("rb") as stream:
        cache = pickle.load(stream)
    targets = {"k": k.as_expr(), "x": xg.as_expr(), "y": yg.as_expr()}
    cache = {
        product: generic.from_expr(expression.xreplace({
            symbol: targets[str(symbol)] for symbol in expression.free_symbols
        }))
        for product, expression in cache.items()
    }
    for product in (("T", "R"), ("R", "R")):
        common = cache[product] / ((N * M) ** 2 * D**2)
        for degree, factor_value in enumerate(((M - 1) ** 2, 2 * (M - 1), generic.one)):
            assert rows[product][degree] == factor_value * common

    direct_checks = []
    for row in theorem["direct_exact_checks"]:
        value = direct(
            row["rank"], row["x"], row["y"],
            row["right_gap0_slack"], row["right_gap1_slack"],
        )
        assert str(value) == row["strong_auxiliary"] and value > 0
        direct_checks.append({**row, "independent_value": str(value)})

    payload = {
        "schema": "uniform-low-high-right-gap01-slack-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_SIMULTANEOUS_RIGHT_GAP01_AUDIT",
        "verified": {
            "abstract_quadratic_factorization": True,
            "independently_reconstructed_H2_degree": 2,
            "left_certificate_summaries_equal_producer": True,
            "right_s4_payment_scaling": True,
            "constant_H2_sign_source": "pinned independent right-gap0 audit",
            "base_H0_sign_sources": "pinned independent right-gap1 row and payment audits",
        },
        "independent_direct_checks": direct_checks,
        "dependencies_sha256": dependency_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This independently certifies the simultaneous right gap0+gap1 "
            "translated boundary theorem, not the full Erdos conjecture."
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
