#!/usr/bin/env python3
"""Independent exact replay of the all-rank right gap-1 slack theorem.

The producer obtains the four slack directions by differentiating coefficient
vectors.  This audit instead builds the complete quadratic-in-slack rows
directly, extracts each power, and compares all six T,L,R products exactly.
It then independently replays the sparse and tensor-Bernstein positivity
certificates without importing any producer implementation.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
import pickle
from pathlib import Path

import numpy as np
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap1_slack_independent_audit_root_20260827.json"

PINNED = {
    "uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json":
        "507C9BC153F158A1D956676808FA09EA9C9B3DC3A4ECC2E9D4894A2A243AD8F2",
    "explore_uniform_low_high_right_gap1_slack_symbolic_fast_root.py":
        "EE631E3E3D1E4D210E951F7BB81D6C27BCAF4DBA6D7BA39FF8A301DC709D3D5B",
    "uniform_low_high_right_gap1_slack_symbolic_fast_probe_root_20260827.json":
        "01EED7B84E2701F40893FE5520A206A7109E7DC08899122063E5DBADFD58E5BF",
    "prove_uniform_low_high_right_gap1_left_payments_root.py":
        "54DD1B0AD13A546ABA7B883151CB6A235F602D1D4927629969050D8E7E0A5A9F",
    "uniform_low_high_right_gap1_left_payments_exact_root_20260827.json":
        "A6E1ACAA021464FD4664E7920C5F833D914BF560C59CA35B953389CC4A4AE431",
    "prove_uniform_low_high_right_gap1_right_payments_root.py":
        "0614B267C6D40EDCF7A1F8990CE2D3F62AD46CC8A7A0D40D3EE6F1FC02BBF75B",
    "uniform_low_high_right_gap1_right_payments_exact_root_20260827.json":
        "EDD5C780AEAAC98E98AE874213473AFA2D22F0B170DE1B8BAAAE78ECC2EF5309",
    "prove_uniform_low_high_right_gap1_slack_root.py":
        "62D71D2C460C16B14209218F4622409537EA62317B7C748C68ACF30CA8206037",
    "uniform_low_high_right_gap1_slack_exact_root_20260827.json":
        "AB958CE36ED840E4CA9A10B70979BAEA464113B1632D4BBA1E2E86FB881D0684",
}

CACHES = {
    "s1": ("uniform_low_high_right_gap1_s1_product_coefficients_root.pkl",
           "DD96A7CF6135E771BB94AE367DADE60DE3DACE19F660FDF7E563A09F9C262807"),
    "s2": ("uniform_low_high_right_gap1_s2_product_coefficients_root.pkl",
           "7C6262B39B392782810510E6D8DC2570E973AEAF542E6E6EAD39E568EAC778D8"),
    "s3": ("uniform_low_high_right_gap1_s3_product_coefficients_root.pkl",
           "A0347E38E31C3FE3507DDCC010F397DF5F8C72BC566A3802571A33629F1EA726"),
    "s4": ("uniform_low_high_right_gap1_s4_product_coefficients_root.pkl",
           "FC9F9CB888F044B8DC39DC5EB2940191CE3FFE2B53BBEE9F14FEF3354B87D4CF"),
}

PRODUCTS = (("T", "T"), ("T", "L"), ("T", "R"),
            ("L", "L"), ("L", "R"), ("R", "R"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ordered_hash(values) -> str:
    return hashlib.sha256(
        "\n".join(str(value) for value in values).encode("ascii")
    ).hexdigest().upper()


def quadratic(row):
    return sp.expand(row[1] ** 2 - row[0] * row[2] - row[0] * row[1])


def bilinear(first, second):
    return sp.expand(
        2 * first[1] * second[1]
        - first[0] * second[2] - first[2] * second[0]
        - first[0] * second[1] - first[1] * second[0]
    )


def product_coefficient(first, second, whole, tail, capacity):
    """Coefficient of a quadratic product in capacity*Q(whole)+B(whole,tail)."""
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


def build_independent_rows(k, x, y, s):
    """Build c(s),v(s) directly and extract the four rescaled directions."""
    N, M = k + x, k + y
    D = M**2 - 1
    zero = (sp.S.Zero,) * 3
    rs, rl, rr = N + M - k + 1, x + 1, y + 1

    base = {
        "T": tuple((N + 1) * (M + 1) * q / (N * M)
                   for q in (1, rs, rs * (rs - 1))),
        "L": tuple(-(N + 1) * q / (N * M)
                   for q in (1, rl, rl * (rl - 1))),
        "R": tuple(-(M + 1) * q / (N * M)
                   for q in (1, rr, rr * (rr - 1))),
    }

    left_previous = (N + 1) / N
    left_high = {
        "T": zero,
        "L": (left_previous,
              left_previous * (x + 1),
              left_previous * x * (x + 1)),
        "R": zero,
    }
    before_first = (
        left_previous / (x + 2),
        left_previous,
        left_previous * (x + 1),
    )
    first = {
        "T": zero,
        "L": tuple((k - 1 + index) * before_first[index]
                   for index in range(3)),
        "R": zero,
    }

    right_previous = (M + 1) / M
    removed_head = {
        "T": zero,
        "L": zero,
        "R": (
            right_previous * (
                1 + (k - 1) * (N + 1) / (y + 2)
                + ((k - 1) * (k - 2) / 2) * (N**2 - 1)
                  / ((y + 2) * (y + 3))
            ),
            right_previous * (
                y + 1 + k * (N + 1)
                + (k * (k - 1) / 2) * (N**2 - 1) / (y + 2)
            ),
            right_previous * (
                y * (y + 1) + (k + 1) * (N + 1) * (y + 1)
                + (k * (k + 1) / 2) * (N**2 - 1)
            ),
        ),
    }

    base_tail = {
        basis: tuple(base[basis][i] - removed_head[basis][i]
                     for i in range(3))
        for basis in ("T", "L", "R")
    }
    remainder_whole = {
        basis: tuple(base[basis][i] - left_high[basis][i]
                     - (M + 1) * first[basis][i]
                     for i in range(3))
        for basis in ("T", "L", "R")
    }
    remainder_tail = {
        basis: tuple(base_tail[basis][i] - left_high[basis][i]
                     - (M + 1) * first[basis][i]
                     for i in range(3))
        for basis in ("T", "L", "R")
    }
    multiplier = (D + 2 * M * s + s**2) / D
    whole = {
        basis: tuple(left_high[basis][i] + (M + 1 + s) * first[basis][i]
                     + multiplier * remainder_whole[basis][i]
                     for i in range(3))
        for basis in ("T", "L", "R")
    }
    tail = {
        basis: tuple(left_high[basis][i] + (M + 1 + s) * first[basis][i]
                     + multiplier * remainder_tail[basis][i]
                     for i in range(3))
        for basis in ("T", "L", "R")
    }

    rows = {f"s{degree}": {} for degree in range(1, 5)}
    for product in PRODUCTS:
        polynomial = sp.Poly(product_coefficient(
            *product, whole, tail, N - 2
        ), s)
        for degree in range(1, 5):
            scale = (N * M) ** 2 * (D if degree == 1 else D**2)
            rows[f"s{degree}"][product] = sp.cancel(
                polynomial.coeff_monomial(s**degree) * scale
            )
    return rows


def rational_positive_summary(expression, variables):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    polynomial = sp.Poly(sp.expand(numerator), *variables)
    values = [coefficient for _, coefficient in polynomial.terms()]
    assert values and all(value.is_Integer and value > 0 for value in values)
    return {
        "positive_denominator": str(sp.factor(denominator)),
        "terms": len(values),
        "minimum": int(min(values)),
        "ordered_coefficients_sha256": ordered_hash(values),
    }


def sparse_positive_summary(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    values = [coefficient for _, coefficient in polynomial.terms()]
    assert values and all(value.is_Integer and value > 0 for value in values)
    return {
        "terms": len(values),
        "minimum": int(min(values)),
        "ordered_coefficients_sha256": ordered_hash(values),
    }


def compactify_direct(polynomial, u, x, U, X):
    """Projectively compactify two nonnegative axes by direct substitution."""
    du, dx, _ = polynomial.degree_list()
    expression = sp.cancel(
        (1 - U) ** du * (1 - X) ** dx
        * polynomial.as_expr().subs({u: U / (1 - U), x: X / (1 - X)})
    )
    numerator, denominator = sp.fraction(expression)
    assert sp.expand(denominator) == 1
    return sp.Poly(sp.expand(numerator), U, X, polynomial.gens[2])


def remove_axis_factor(polynomial):
    power = min(monomial[0] for monomial, _ in polynomial.terms())
    residual = sp.Poly(
        sp.cancel(polynomial.as_expr() / polynomial.gens[0] ** power),
        *polynomial.gens,
    )
    return int(power), residual


def bernstein_coefficients_independent(polynomial):
    """Direct separable power-to-Bernstein conversion on the unit cube."""
    degrees = tuple(int(value) for value in polynomial.degree_list())
    shape = tuple(value + 1 for value in degrees)
    array = np.empty(shape, dtype=object)
    array.fill(sp.S.Zero)
    for monomial, coefficient in polynomial.terms():
        array[monomial] = coefficient
    for axis, degree in enumerate(degrees):
        source = np.moveaxis(array, axis, 0)
        target = np.empty_like(source)
        for endpoint in range(degree + 1):
            accumulator = np.empty(source.shape[1:], dtype=object)
            accumulator.fill(sp.S.Zero)
            for exponent in range(endpoint + 1):
                accumulator += source[exponent] * sp.Rational(
                    math.comb(endpoint, exponent),
                    math.comb(degree, exponent),
                )
            target[endpoint] = accumulator
        array = np.moveaxis(target, 0, axis)
    return degrees, array


def minimum_entry(array):
    position = min(range(array.size), key=lambda i: array.flat[i])
    return sp.factor(array.flat[position]), tuple(
        int(value) for value in np.unravel_index(position, array.shape)
    )


def bisect_patch_independent(array, axis):
    source = np.moveaxis(array, axis, 0)
    degree = source.shape[0] - 1
    pyramid = [source[index].copy() for index in range(degree + 1)]
    low = np.empty_like(source)
    high = np.empty_like(source)
    low[0], high[degree] = pyramid[0], pyramid[-1]
    for level in range(1, degree + 1):
        pyramid = [
            (pyramid[index] + pyramid[index + 1]) / 2
            for index in range(len(pyramid) - 1)
        ]
        low[level], high[degree - level] = pyramid[0], pyramid[-1]
    return np.moveaxis(low, 0, axis), np.moveaxis(high, 0, axis)


def certify_patch_independent(coefficients, degrees):
    pending = [(coefficients, 0)]
    leaves = []
    deepest = 0
    while pending:
        patch, depth = pending.pop()
        minimum, index = minimum_entry(patch)
        if minimum >= 0:
            leaves.append(patch)
            deepest = max(deepest, depth)
            continue
        assert depth < 40, (minimum, index, depth)
        interiority = [
            min(position, degree - position) / degree if degree else 0
            for position, degree in zip(index, degrees)
        ]
        if max(interiority) > 0:
            axis = max(range(len(degrees)), key=interiority.__getitem__)
        else:
            axis = depth % len(degrees)
        low, high = bisect_patch_independent(patch, axis)
        pending.append((high, depth + 1))
        pending.append((low, depth + 1))
    values = [value for patch in leaves for value in patch.flat]
    assert all(value >= 0 for value in values)
    return {
        "leaves": len(leaves),
        "maximum_depth": deepest,
        "leaf_coefficients": len(values),
        "leaf_coefficients_sha256": ordered_hash(values),
    }


def chart_summary(polynomial):
    degrees, coefficients = bernstein_coefficients_independent(polynomial)
    minimum, index = minimum_entry(coefficients)
    summary = {
        "degrees": list(degrees),
        "coefficients": int(coefficients.size),
        "initial_minimum": str(minimum),
        "initial_minimum_index": list(index),
        "initial_coefficients_sha256": ordered_hash(coefficients.flat),
    }
    summary.update(certify_patch_independent(coefficients, degrees))
    return summary


def coefficient_row(rank, terminal, slack=0):
    ratios = [terminal + rank + 1 + slack, terminal + rank - 1 + slack]
    ratios.extend(terminal + rank - index for index in range(2, rank + 1))
    coefficients = [1]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    return ratios, coefficients


def convolution(first, second, degree):
    return sum(math.comb(degree, i) * first[i] * second[degree - i]
               for i in range(degree + 1))


def direct_strong(rank, x, y, slack):
    left_ratios, left = coefficient_row(rank, x)
    _, right = coefficient_row(rank, y, slack)
    left_tail = [0, 0, 0, *left[3:]]
    whole = [convolution(left, right, d) for d in (rank - 1, rank, rank + 1)]
    tail = [convolution(left_tail, right, d) for d in (rank - 1, rank, rank + 1)]
    return left_ratios[2] * quadratic(whole) + bilinear(whole, tail)


def main() -> int:
    pinned_hashes = {}
    for name, expected in PINNED.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        pinned_hashes[name] = actual
    producer = json.loads((HERE / "uniform_low_high_right_gap1_slack_exact_root_20260827.json").read_text(encoding="utf-8"))
    probe = json.loads((HERE / "uniform_low_high_right_gap1_slack_symbolic_fast_probe_root_20260827.json").read_text(encoding="utf-8"))
    left_report = json.loads((HERE / "uniform_low_high_right_gap1_left_payments_exact_root_20260827.json").read_text(encoding="utf-8"))
    right_report = json.loads((HERE / "uniform_low_high_right_gap1_right_payments_exact_root_20260827.json").read_text(encoding="utf-8"))
    zero = json.loads((HERE / "uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json").read_text(encoding="utf-8"))
    assert producer["status"] == "PASS_EXACT_ALL_RANK_RIGHT_GAP1_SLACK_STRONG_BOUNDARY"
    assert probe["status"] == "PASS_EXACT_RIGHT_GAP1_SLACK_MEMORY_LEAN_COEFFICIENT_PROBE"
    assert left_report["status"] == "PASS_EXACT_ALL_RANK_RIGHT_GAP1_LEFT_PRODUCT_PAYMENTS"
    assert right_report["status"] == "PASS_EXACT_ALL_RANK_RIGHT_GAP1_RIGHT_PRODUCT_PAYMENTS"
    assert zero["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_TWO_PARAMETER_ZERO_SLACK_STRONG_BOUNDARY_AUDIT"

    k, x, y, s = sp.symbols("k x y s", real=True)
    u, z, r = sp.symbols("u z r", nonnegative=True)
    U, X, A, Q, R, B, S, T = sp.symbols(
        "U X A Q R B S T", nonnegative=True
    )
    N, M = k + x, k + y
    rows = build_independent_rows(k, x, y, s)
    cache_hashes = {}
    for label, (name, expected) in CACHES.items():
        path = HERE / name
        assert sha256(path) == expected
        cache_hashes[name] = expected
        with path.open("rb") as stream:
            cached = pickle.load(stream)
        assert set(cached) == set(PRODUCTS)
        for product in PRODUCTS:
            assert sp.cancel(rows[label][product] - cached[product]) == 0, (
                label, product
            )
        assert rows[label][("T", "T")] == 0
    print("PASS independent direct quartic reconstruction", flush=True)

    left_certificates = {}
    for label in ("s1", "s2", "s3", "s4"):
        alpha = rows[label][("T", "L")]
        epsilon = rows[label][("L", "L")]
        total = sp.cancel(alpha + epsilon)
        summary = {
            "alpha_plus_epsilon": rational_positive_summary(
                total.subs(k, u + 8), (u, x, y)
            )
        }
        if label == "s1":
            summary["alpha"] = rational_positive_summary(
                alpha.subs(k, u + 8), (u, x, y)
            )
        else:
            summary["epsilon"] = rational_positive_summary(
                epsilon.subs(k, u + 8), (u, x, y)
            )
            reserve = sp.cancel(
                (x + M + 2) * total - epsilon * (k - 1) * M
            )
            summary["union_bound_reserve"] = rational_positive_summary(
                reserve.subs(k, u + 8), (u, x, y)
            )
        for key, value in summary.items():
            assert value == left_report["coefficient_certificates"][label][key]
        left_certificates[label] = summary
        print("PASS independent left payment", label, flush=True)

    def right_pieces(label):
        return (
            rows[label][("T", "R")],
            -rows[label][("L", "R")],
            -rows[label][("R", "R")],
        )

    beta4, _, delta4 = right_pieces("s4")
    scales = {
        "s1": 4 * M,
        "s2": 2 * (3 * M**2 - 1),
        "s3": 4 * M,
        "s4": sp.S.One,
    }
    for label, scale in scales.items():
        beta, _, delta = right_pieces(label)
        assert sp.cancel(beta - scale * beta4) == 0
        assert sp.cancel(delta - scale * delta4) == 0

    denominator = (y + 2) * (y + 3)
    beta_prefactor = N * (N - 1) * (N + 1) * (M + 1) ** 2 / (2 * denominator)
    difference_prefactor = N**2 * (N + 1) * (M + 1) ** 2 / (2 * denominator)
    universal = {}
    for name, kernel, leading in (
        ("beta", sp.cancel(beta4 / beta_prefactor), 2 * N),
        ("beta_minus_delta", sp.cancel((beta4 - delta4) / difference_prefactor), 2 * (N - 2)),
    ):
        polynomial = sp.Poly(kernel, y)
        assert polynomial.degree() == 2
        aa, bb, cc = polynomial.all_coeffs()
        assert sp.expand(aa - leading) == 0
        universal[name] = sparse_positive_summary(
            sp.factor(4 * aa * cc - bb**2).subs(k, u + 8), (u, x)
        )
        assert universal[name] == right_report["universal_beta_and_delta"]["negative_discriminant_certificates"][name]
    delta_kernel = sp.cancel(
        delta4 * denominator / (N * (N + 1) * (M + 1) ** 3)
    )
    delta_numerator = sp.fraction(delta_kernel)[0]
    delta_summary = sparse_positive_summary(
        delta_numerator.subs(k, u + 8), (u, x, y)
    )
    assert delta_summary == right_report["universal_beta_and_delta"]["delta_positive"]
    print("PASS independent universal right signs", flush=True)

    right_certificates = {}
    for label in ("s1", "s2", "s3", "s4"):
        beta, gamma, delta = right_pieces(label)
        high = sp.cancel(beta * (1 + (k - 1) * M / N) - gamma - delta)
        high_numerator, high_denominator = sp.fraction(high)
        high_summary = sparse_positive_summary(
            high_numerator.subs({k: u + 8, x: y + z}), (u, y, z)
        )
        expected_high = right_report["coefficient_certificates"][label]["x_at_least_y"]
        assert str(sp.factor(high_denominator)) == expected_high["positive_denominator"]
        assert high_summary == expected_high["sparse_certificate"]

        lower = 1 + (k - 1) * r + (k - 1) * (k - 2) * r**2 / 2
        common_power = 1 if label == "s1" else 2
        common = N * (N + 1) * (M + 1) ** common_power / (
            2 * (x + 2) * (y + 2) * (y + 3)
        )
        if label in ("s1", "s3"):
            common *= M
        reduced = sp.cancel((beta * lower - delta - gamma * r**7) / common)
        substituted = sp.cancel(reduced.subs(y, N / r - k))
        low_numerator, low_denominator = sp.fraction(substituted)
        base = sp.Poly(sp.expand(low_numerator.subs(k, u + 8)), u, x, r)
        compact = compactify_direct(base, u, x, U, X)

        chart_r_le_a_raw = sp.Poly(
            sp.expand(compact.as_expr().subs({U: 1 - A, r: A * Q})), A, Q, X
        )
        factor_a, chart_r_le_a = remove_axis_factor(chart_r_le_a_raw)
        chart_a_le_r_raw = sp.Poly(
            sp.expand(compact.as_expr().subs({U: 1 - R * Q, r: R})), R, Q, X
        )
        factor_r, chart_a_le_r = remove_axis_factor(chart_a_le_r_raw)
        chart_q_le_b_raw = sp.Poly(
            sp.expand(chart_a_le_r.as_expr().subs({R: 1 - B, Q: B * T})), B, T, X
        )
        factor_b, chart_q_le_b = remove_axis_factor(chart_q_le_b_raw)
        chart_b_le_q_raw = sp.Poly(
            sp.expand(chart_a_le_r.as_expr().subs({R: 1 - S * T, Q: S})), S, T, X
        )
        factor_s, chart_b_le_q = remove_axis_factor(chart_b_le_q_raw)

        low_summary = {
            "ratio_lower_degree": 2,
            "W_upper_bound": "((x+k)/(y+k))^7",
            "positive_denominator": str(sp.factor(low_denominator)),
            "projective_degrees": list(map(int, compact.degree_list())),
            "r_at_most_a_chart": {
                "removed_a_power": factor_a,
                **chart_summary(chart_r_le_a),
            },
            "a_at_most_r_chart": {
                "removed_r_power": factor_r,
                "q_at_most_one_minus_r_chart": {
                    "removed_one_minus_r_power": factor_b,
                    **chart_summary(chart_q_le_b),
                },
                "one_minus_r_at_most_q_chart": {
                    "removed_q_power": factor_s,
                    **chart_summary(chart_b_le_q),
                },
            },
        }
        expected_low = right_report["coefficient_certificates"][label]["y_at_least_x"]
        assert low_summary == expected_low
        right_certificates[label] = {
            "x_at_least_y": {
                "positive_denominator": str(sp.factor(high_denominator)),
                "sparse_certificate": high_summary,
            },
            "y_at_least_x": low_summary,
        }
        print("PASS independent right payment", label, flush=True)

    direct_checks = []
    t_symbol, l_symbol, r_symbol = sp.symbols("T L R")
    for rank, x_value, y_value in (
        (8, 0, 0), (8, 19, 4), (9, 1, 37), (11, 23, 2),
        (14, 0, 61), (18, 41, 9), (24, 5, 33), (31, 17, 0),
    ):
        samples = [direct_strong(rank, x_value, y_value, slack)
                   for slack in range(5)]
        polynomial = sp.Poly(
            sp.interpolate([(index, value) for index, value in enumerate(samples)], s), s
        )
        coefficients = [polynomial.coeff_monomial(s**degree) for degree in range(5)]
        assert all(value > 0 for value in coefficients)
        products = {
            "T": math.prod(x_value + y_value + rank + j for j in range(2, rank + 1)),
            "L": math.prod(x_value + j for j in range(2, rank + 1)),
            "R": math.prod(y_value + j for j in range(2, rank + 1)),
        }
        D_value = (rank + y_value) ** 2 - 1
        substitutions = {k: rank, x: x_value, y: y_value}
        for degree in range(1, 5):
            reconstructed = sum(
                expression.subs(substitutions) * products[first] * products[second]
                for (first, second), expression in rows[f"s{degree}"].items()
            )
            scale = (rank + x_value) ** 2 * (rank + y_value) ** 2
            scale *= D_value if degree == 1 else D_value**2
            assert sp.cancel(reconstructed - coefficients[degree] * scale) == 0
        assert direct_strong(rank, x_value, y_value, 7) == polynomial.eval(7)
        direct_checks.append({
            "rank": rank,
            "x": x_value,
            "y": y_value,
            "quartic_power_coefficients": [str(value) for value in coefficients],
        })
    print("PASS independent direct evaluations", len(direct_checks), flush=True)

    payload = {
        "schema": "uniform-low-high-right-gap1-slack-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_RIGHT_GAP1_SLACK_AUDIT",
        "theorem": producer["theorem"],
        "independent_reconstruction": {
            "method": (
                "directly build c(s)=left_high+(M+1+s)first+"
                "((M^2-1+2Ms+s^2)/(M^2-1))tail and likewise v(s); "
                "extract all six quadratic T,L,R products"
            ),
            "cache_comparisons": 24,
            "constant_term": "pinned independent two-parameter zero-slack audit",
        },
        "independent_left_certificates": left_certificates,
        "independent_right_certificates": right_certificates,
        "independent_direct_checks": direct_checks,
        "pinned_sha256": pinned_hashes,
        "cache_sha256": cache_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This independently closes only the second ordinary right-row gap "
            "coordinate on the translated low/high boundary; it is not a proof "
            "of the full Erdos problem."
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
