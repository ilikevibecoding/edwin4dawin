#!/usr/bin/env python3
"""Explore exact mixed payments for four simultaneous boundary gaps."""

from __future__ import annotations

import argparse
import gzip
import json
import math
import os
from pathlib import Path

from sympy.polys.domains import QQ
from sympy.polys.fields import field


BASES = ("T", "L", "R")
PRODUCTS = (
    ("T", "T"), ("T", "L"), ("T", "R"),
    ("L", "L"), ("L", "R"), ("R", "R"),
)
HERE = Path(__file__).resolve().parent
CACHE = HERE / "uniform_low_high_four_gap_symbolic_rows_cache_root_20260827.json.gz"


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


SLACK_ZERO = (0, 0, 0, 0)  # p, b, q, s


def polynomial_add(*values):
    result = {}
    for value in values:
        for monomial, coefficient in value.items():
            result[monomial] = result.get(monomial, 0) + coefficient
            if result[monomial] == 0:
                del result[monomial]
    return result


def polynomial_scale(value, scalar):
    if scalar == 0:
        return {}
    return {
        monomial: coefficient * scalar
        for monomial, coefficient in value.items()
        if coefficient * scalar != 0
    }


def polynomial_multiply(left, right):
    result = {}
    for first, first_value in left.items():
        for second, second_value in right.items():
            monomial = tuple(first[index] + second[index] for index in range(4))
            result[monomial] = result.get(monomial, 0) + first_value * second_value
            if result[monomial] == 0:
                del result[monomial]
    return result


def polynomial_row(row):
    return {
        basis: tuple({SLACK_ZERO: value} if value != 0 else {} for value in row[basis])
        for basis in BASES
    }


def polynomial_row_add(*rows):
    return {
        basis: tuple(polynomial_add(*(row[basis][index] for row in rows))
                     for index in range(3))
        for basis in BASES
    }


def polynomial_row_scale(row, scalar):
    return {
        basis: tuple(polynomial_multiply(value, scalar) for value in row[basis])
        for basis in BASES
    }


def polynomial_cross(first, second):
    return polynomial_add(
        polynomial_scale(polynomial_multiply(first[1], second[1]), 2),
        polynomial_scale(polynomial_multiply(first[0], second[2]), -1),
        polynomial_scale(polynomial_multiply(first[2], second[0]), -1),
        polynomial_scale(polynomial_multiply(first[0], second[1]), -1),
        polynomial_scale(polynomial_multiply(first[1], second[0]), -1),
    )


def polynomial_form(row):
    return polynomial_add(
        polynomial_multiply(row[1], row[1]),
        polynomial_scale(polynomial_multiply(row[0], row[2]), -1),
        polynomial_scale(polynomial_multiply(row[0], row[1]), -1),
    )


def polynomial_product_row(first, second, whole, tail, capacity):
    if first == second:
        return polynomial_add(
            polynomial_scale(polynomial_form(whole[first]), capacity),
            polynomial_cross(whole[first], tail[first]),
        )
    return polynomial_add(
        polynomial_scale(polynomial_cross(whole[first], whole[second]), capacity),
        polynomial_cross(whole[first], tail[second]),
        polynomial_cross(whole[second], tail[first]),
    )


def promote(target, value):
    return target.from_expr(value.as_expr()) if hasattr(value, "as_expr") else target(value)


def coefficient_dictionary(value, coefficient_field):
    if value == 0:
        return {}
    assert value.denom.degree() == 0
    denominator = value.denom[(0, 0, 0, 0)]
    result = {}
    for (p_degree, b_degree, q_degree, s_degree), coefficient in value.numer.terms():
        result[(b_degree, p_degree, q_degree, s_degree)] = coefficient / denominator
    return result


def encode_polynomial(value):
    return [
        [list(monomial), int(coefficient.numerator), int(coefficient.denominator)]
        for monomial, coefficient in value.terms()
    ]


def decode_polynomial(value, base_field):
    return base_field.ring.from_dict({
        tuple(monomial): QQ(numerator, denominator)
        for monomial, numerator, denominator in value
    })


def store_rows(rows):
    payload = {
        "schema": "uniform-low-high-four-gap-symbolic-rows-cache-root-v1",
        "products": {
            "*".join(product): [
                {
                    "key": list(key),
                    "numerator": encode_polynomial(coefficient.numer),
                    "denominator": encode_polynomial(coefficient.denom),
                }
                for key, coefficient in sorted(row.items())
            ]
            for product, row in rows.items()
        },
    }
    temporary = CACHE.with_suffix(CACHE.suffix + ".tmp")
    with gzip.open(temporary, "wt", encoding="utf-8") as stream:
        json.dump(payload, stream, separators=(",", ":"))
    os.replace(temporary, CACHE)


def load_rows(base_field):
    with gzip.open(CACHE, "rt", encoding="utf-8") as stream:
        payload = json.load(stream)
    assert payload["schema"] == "uniform-low-high-four-gap-symbolic-rows-cache-root-v1"
    rows = {}
    for label, entries in payload["products"].items():
        product = tuple(label.split("*"))
        rows[product] = {
            tuple(entry["key"]): base_field.new(
                decode_polynomial(entry["numerator"], base_field),
                decode_polynomial(entry["denominator"], base_field),
            )
            for entry in entries
        }
    assert set(rows) == set(PRODUCTS)
    return rows


def build_rows(base_field, k, x, y):
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
    left_previous, right_previous = (N + 1) / N, (M + 1) / M
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
    tail0 = add(whole0, scale(excluded, -1))

    left_degree0 = {
        "T": zero,
        "L": zero,
        "R": (
            right_previous,
            right_previous * (y + 1),
            right_previous * y * (y + 1),
        ),
    }
    left_degree1_unit = {
        "T": zero,
        "L": zero,
        "R": tuple(
            (k - 1 + index) * value
            for index, value in enumerate((
                right_previous / (y + 2),
                right_previous,
                right_previous * (y + 1),
            ))
        ),
    }
    left_degree1 = scale(left_degree1_unit, N + 1)
    right_degree0 = {
        "T": zero,
        "L": (
            left_previous,
            left_previous * (x + 1),
            left_previous * x * (x + 1),
        ),
        "R": zero,
    }
    right_degree1_unit = {
        "T": zero,
        "L": tuple(
            (k - 1 + index) * value
            for index, value in enumerate((
                left_previous / (x + 2),
                left_previous,
                left_previous * (x + 1),
            ))
        ),
        "R": zero,
    }
    right_degree1 = scale(right_degree1_unit, M + 1)
    bulk = add(
        whole0,
        scale(left_degree0, -1), scale(left_degree1, -1),
        scale(right_degree0, -1), scale(right_degree1, -1),
    )
    tail_bulk = add(
        tail0, scale(right_degree0, -1), scale(right_degree1, -1)
    )

    blocks = list(map(polynomial_row, (
        left_degree0, left_degree1, right_degree0, right_degree1,
        bulk, tail_bulk,
    )))
    left0, left1, right0, right1, bulk_p, tail_bulk_p = blocks
    one = {SLACK_ZERO: base_field.one}
    p_term = {(1, 0, 0, 0): base_field.one}
    b_term = {(0, 1, 0, 0): base_field.one}
    q_term = {(0, 0, 1, 0): base_field.one}
    s_term = {(0, 0, 0, 1): base_field.one}
    left_one = polynomial_add(
        one, p_term, polynomial_scale(b_term, 1 / (N + 1))
    )
    left_two = polynomial_multiply(
        left_one, polynomial_add(one, polynomial_scale(b_term, 1 / (N - 1)))
    )
    right_one = polynomial_multiply(
        polynomial_add(one, q_term),
        polynomial_add(one, polynomial_scale(s_term, 1 / (M + 1))),
    )
    right_two = polynomial_multiply(
        right_one,
        polynomial_add(one, polynomial_scale(s_term, 1 / (M - 1))),
    )
    whole = polynomial_row_add(
        polynomial_row_scale(left0, right_two),
        polynomial_row_scale(left1, polynomial_multiply(left_one, right_two)),
        polynomial_row_scale(right0, left_two),
        polynomial_row_scale(right1, polynomial_multiply(right_one, left_two)),
        polynomial_row_scale(bulk_p, polynomial_multiply(left_two, right_two)),
    )
    tail = polynomial_row_add(
        polynomial_row_scale(right0, left_two),
        polynomial_row_scale(right1, polynomial_multiply(right_one, left_two)),
        polynomial_row_scale(tail_bulk_p, polynomial_multiply(left_two, right_two)),
    )
    rows = {}
    for product in PRODUCTS:
        polynomial = polynomial_product_row(*product, whole, tail, N - 2)
        rows[product] = {
            (monomial[1], monomial[0], monomial[2], monomial[3]): coefficient
            for monomial, coefficient in polynomial.items()
        }
    return rows


def sign(value):
    if value == 0:
        return "zero", 0, 0
    numerator = [coefficient for _, coefficient in value.numer.terms()]
    denominator = [coefficient for _, coefficient in value.denom.terms()]
    if not denominator or any(coefficient <= 0 for coefficient in denominator):
        return "bad_denominator", len(numerator), min(numerator)
    negatives = sum(coefficient < 0 for coefficient in numerator)
    zeros = sum(coefficient == 0 for coefficient in numerator)
    return ("positive" if negatives == 0 and zeros == 0 else "mixed"), len(numerator), min(numerator)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-index", type=int, default=1)
    parser.add_argument("--stop-index", type=int)
    arguments = parser.parse_args()
    F, k, x, y = field("k,x,y", QQ)
    if CACHE.exists():
        rows = load_rows(F)
        print("LOADED_SYMBOLIC_ROWS_CACHE", CACHE.name, flush=True)
    else:
        rows = build_rows(F, k, x, y)
        store_rows(rows)
        print("STORED_SYMBOLIC_ROWS_CACHE", CACHE.name, flush=True)
    keys = sorted({key for row in rows.values() for key in row if key[0] >= 1})
    print("NONZERO_MIXED_KEYS", len(keys), flush=True)
    start_index = max(1, arguments.start_index)
    stop_index = min(len(keys), arguments.stop_index or len(keys))
    assert start_index <= stop_index
    selected_keys = keys[start_index - 1:stop_index]
    print("CHECK_SHARD", start_index, stop_index, flush=True)
    G, u, xg, yg = field("u,x,y", QQ)
    H, uh, yh, zh = field("u,y,z", QQ)
    J, ul, xl, zl = field("u,x,z", QQ)
    K, uk, xk, wk = field("u,x,w", QQ)

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

    def low_scaled(value):
        return K.from_expr(value.as_expr().subs({
            k.as_expr(): uk.as_expr() + 8,
            x.as_expr(): xk.as_expr(),
            y.as_expr(): (
                xk.as_expr() + wk.as_expr() * (uk.as_expr() + xk.as_expr() + 8)
            ),
        }))

    def low_status(value):
        ordinary = sign(low(value))[0]
        if ordinary == "positive":
            return ordinary
        scaled = sign(low_scaled(value))[0]
        return "positive" if scaled == "positive" else f"{ordinary}/{scaled}"

    def coefficient(product, key):
        return rows[product].get(key, F.zero)

    N, M = k + x, k + y
    lower = sum(
        math.prod(k - 1 - index for index in range(power))
        * (M / N) ** power / math.factorial(power)
        for power in range(4)
    )
    ratio7 = (N / M) ** 7
    tight_left7 = (N / (N + M)) ** 7
    tight_right7 = (M / (N + M)) ** 7
    paired = (
        (k - 1) * N / 2
        * (1 / (x + y + k + 2) + 1 / (x + y + 2 * k))
    )
    left_union = (k - 1) * M / (x + y + k + 2)
    failures = []
    routes = {}
    for index, key in enumerate(selected_keys, start_index):
        assert coefficient(("T", "T"), key) == 0
        alpha = coefficient(("T", "L"), key)
        beta = coefficient(("T", "R"), key)
        epsilon = coefficient(("L", "L"), key)
        gamma = -coefficient(("L", "R"), key)
        delta = -coefficient(("R", "R"), key)
        total = alpha + epsilon
        left_a = (
            sign(shifted(total))[0] == "positive"
            and sign(shifted(alpha))[0] == "positive"
        )
        left_b = (
            sign(shifted(total))[0] == "positive"
            and sign(shifted(epsilon))[0] == "positive"
            and sign(shifted(total - epsilon * left_union))[0] == "positive"
        )
        left_zero = alpha == 0 and epsilon == 0
        right_zero = beta == 0 and gamma == 0 and delta == 0
        right_checks = {
            "low_beta_minus_delta": low_status(beta - delta),
            "high_beta": sign(high(beta))[0],
            "high_delta": sign(high(delta))[0],
            "high_minus_delta": sign(high(-delta))[0],
            "high_delta_nonnegative_reserve": sign(
                high(beta * lower - gamma - delta)
            )[0],
            "high_delta_negative_reserve": sign(
                high(beta * lower - gamma)
            )[0],
            "low_delta_nonnegative_gamma_nonnegative_reserve": low_status(
                beta - delta - gamma * ratio7
            ),
            "low_delta_negative_gamma_negative_reserve": low_status(
                beta - delta + delta * paired
            ),
            "low_delta_negative_gamma_nonnegative_reserve": low_status(
                beta - delta + delta * paired - gamma * ratio7
            ),
            "low_beta": low_status(beta),
            "low_delta_negative_drop_delta_gamma_nonnegative_reserve": low_status(
                beta - gamma * ratio7
            ),
            "low_tight_delta_nonnegative_gamma_nonnegative_reserve": low_status(
                beta - gamma * tight_left7 - delta * tight_right7
            ),
            "low_tight_delta_nonnegative_gamma_negative_reserve": low_status(
                beta - delta * tight_right7
            ),
            "low_tight_delta_negative_gamma_nonnegative_reserve": low_status(
                beta - gamma * tight_left7
            ),
            "low_gamma": low_status(gamma),
            "low_minus_gamma": low_status(-gamma),
            "low_delta": low_status(delta),
            "low_minus_delta": low_status(-delta),
        }
        high_delta_nonnegative_possible = right_checks["high_minus_delta"] != "positive"
        high_delta_negative_possible = right_checks["high_delta"] != "positive"
        high_ok = (
            right_checks["high_beta"] == "positive"
            and (
                not high_delta_nonnegative_possible
                or right_checks["high_delta_nonnegative_reserve"] == "positive"
            )
            and (
                not high_delta_negative_possible
                or right_checks["high_delta_negative_reserve"] == "positive"
            )
        )
        low_delta_nonnegative_possible = right_checks["low_minus_delta"] != "positive"
        low_delta_negative_possible = right_checks["low_delta"] != "positive"
        low_gamma_nonnegative_possible = right_checks["low_minus_gamma"] != "positive"
        low_gamma_negative_possible = right_checks["low_gamma"] != "positive"
        low_cases = {
            "delta_nonnegative_gamma_nonnegative": (
                not (low_delta_nonnegative_possible and low_gamma_nonnegative_possible)
                or right_checks[
                    "low_delta_nonnegative_gamma_nonnegative_reserve"
                ] == "positive"
                or right_checks[
                    "low_tight_delta_nonnegative_gamma_nonnegative_reserve"
                ] == "positive"
            ),
            "delta_nonnegative_gamma_negative": (
                not (low_delta_nonnegative_possible and low_gamma_negative_possible)
                or right_checks["low_beta_minus_delta"] == "positive"
                or right_checks[
                    "low_tight_delta_nonnegative_gamma_negative_reserve"
                ] == "positive"
            ),
            "delta_negative_gamma_nonnegative": (
                not (low_delta_negative_possible and low_gamma_nonnegative_possible)
                or right_checks[
                    "low_delta_negative_gamma_nonnegative_reserve"
                ] == "positive"
                or right_checks[
                    "low_delta_negative_drop_delta_gamma_nonnegative_reserve"
                ] == "positive"
                or right_checks[
                    "low_tight_delta_negative_gamma_nonnegative_reserve"
                ] == "positive"
            ),
            "delta_negative_gamma_negative": (
                not (low_delta_negative_possible and low_gamma_negative_possible)
                or right_checks[
                    "low_delta_negative_gamma_negative_reserve"
                ] == "positive"
                or right_checks["low_beta"] == "positive"
            ),
        }
        low_ok = all(low_cases.values())
        right_ok = right_zero or (high_ok and low_ok)
        left_ok = left_zero or left_a or left_b
        if not (left_ok and right_ok and not (left_zero and right_zero)):
            failures.append({
                "key": key,
                "left_zero": left_zero,
                "left_a": left_a,
                "left_b": left_b,
                "right_zero": right_zero,
                "right_ok": right_ok,
                "right_routes": {
                    "high": high_ok,
                    "low": low_ok,
                    "low_cases": low_cases,
                },
                "regional_signs": {
                    "high_delta_nonnegative_possible": high_delta_nonnegative_possible,
                    "high_delta_negative_possible": high_delta_negative_possible,
                    "low_delta_nonnegative_possible": low_delta_nonnegative_possible,
                    "low_delta_negative_possible": low_delta_negative_possible,
                    "low_gamma_nonnegative_possible": low_gamma_nonnegative_possible,
                    "low_gamma_negative_possible": low_gamma_negative_possible,
                },
                "raw": {
                    "alpha": sign(shifted(alpha)),
                    "epsilon": sign(shifted(epsilon)),
                    "beta": sign(shifted(beta)),
                    "gamma": sign(shifted(gamma)),
                    "delta": sign(shifted(delta)),
                },
            })
            print("FAIL", failures[-1], flush=True)
            if len(failures) >= 20:
                break
        else:
            route = "left_zero" if left_zero else ("left_a" if left_a else "left_b")
            routes[route] = routes.get(route, 0) + 1
        if index % 10 == 0:
            print("CHECKED", index, "FAILURES", len(failures), flush=True)
    print("ROUTES", routes, flush=True)
    print("FAILURE_COUNT", len(failures), flush=True)
    if not failures:
        if start_index == 1 and stop_index == len(keys):
            print("PASS_EXACT_FOUR_GAP_MIXED_PAYMENT_EXPLORATION", flush=True)
        else:
            print(
                "PASS_EXACT_FOUR_GAP_MIXED_PAYMENT_EXPLORATION_SHARD",
                start_index, stop_index, flush=True,
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
