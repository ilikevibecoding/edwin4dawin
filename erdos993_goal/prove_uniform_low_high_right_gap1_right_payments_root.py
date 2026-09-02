#!/usr/bin/env python3
"""Exact product-ratio payments for the right gap-1 quartic directions.

This module certifies the three product terms that remain after pairing the
T*L and L^2 terms.  It uses separate x>=y and y>=x arguments.  The second
region has a projective corner (k -> infinity while (k+x)/(k+y) -> 0), so a
two-chart blow-up resolves that corner before exact tensor-Bernstein replay.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import pickle
from collections import defaultdict
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap1_right_payments_exact_root_20260827.json"
CACHES = {
    "s1": (
        "uniform_low_high_right_gap1_s1_product_coefficients_root.pkl",
        "DD96A7CF6135E771BB94AE367DADE60DE3DACE19F660FDF7E563A09F9C262807",
    ),
    "s2": (
        "uniform_low_high_right_gap1_s2_product_coefficients_root.pkl",
        "7C6262B39B392782810510E6D8DC2570E973AEAF542E6E6EAD39E568EAC778D8",
    ),
    "s3": (
        "uniform_low_high_right_gap1_s3_product_coefficients_root.pkl",
        "A0347E38E31C3FE3507DDCC010F397DF5F8C72BC566A3802571A33629F1EA726",
    ),
    "s4": (
        "uniform_low_high_right_gap1_s4_product_coefficients_root.pkl",
        "FC9F9CB888F044B8DC39DC5EB2940191CE3FFE2B53BBEE9F14FEF3354B87D4CF",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ordered_hash(values) -> str:
    encoded = "\n".join(str(value) for value in values).encode("ascii")
    return hashlib.sha256(encoded).hexdigest().upper()


def positive_sparse_summary(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    values = [coefficient for _, coefficient in polynomial.terms()]
    assert values and all(value.is_Integer and value > 0 for value in values)
    return {
        "terms": len(values),
        "minimum": int(min(values)),
        "ordered_coefficients_sha256": ordered_hash(values),
    }


def compactify_nonnegative(base: sp.Poly, u, x, U, X):
    """Homogenize u,x to U=u/(1+u), X=x/(1+x), term by term."""
    du, dx, _ = base.degree_list()
    terms = defaultdict(lambda: sp.S.Zero)
    for (a, b, c), coefficient in base.terms():
        for i in range(du - a + 1):
            for j in range(dx - b + 1):
                terms[(a + i, b + j, c)] += (
                    coefficient
                    * (-1) ** (i + j)
                    * math.comb(du - a, i)
                    * math.comb(dx - b, j)
                )
    return sp.Poly.from_dict(dict(terms), (U, X, base.gens[2]))


def remove_first_axis_monomial(polynomial: sp.Poly):
    minimum = min(monomial[0] for monomial, _ in polynomial.terms())
    variable = polynomial.gens[0]
    residual = sp.Poly(
        sp.cancel(polynomial.as_expr() / variable**minimum),
        *polynomial.gens,
    )
    return minimum, residual


def certify_patch(coefficients, degrees, maximum_depth=40):
    stack = [(coefficients, 0)]
    leaves = []
    deepest = 0
    while stack:
        patch, depth = stack.pop()
        minimum, index = minimum_with_index(patch)
        if minimum >= 0:
            leaves.append(patch)
            deepest = max(deepest, depth)
            continue
        if depth >= maximum_depth:
            raise AssertionError((minimum, index, depth))
        interiority = [
            min(position, degree - position) / degree if degree else 0
            for position, degree in zip(index, degrees)
        ]
        if max(interiority) > 0:
            axis = max(range(len(degrees)), key=interiority.__getitem__)
        else:
            axis = depth % len(degrees)
        left, right = split_bernstein_midpoint(patch, axis)
        stack.append((right, depth + 1))
        stack.append((left, depth + 1))
    all_values = [value for patch in leaves for value in patch.flat]
    assert all(value >= 0 for value in all_values)
    return {
        "leaves": len(leaves),
        "maximum_depth": deepest,
        "leaf_coefficients": len(all_values),
        "leaf_coefficients_sha256": ordered_hash(all_values),
    }


def chart_certificate(polynomial: sp.Poly):
    degrees, coefficients = tensor_bernstein_fast(
        polynomial.as_expr(), polynomial.gens
    )
    minimum, index = minimum_with_index(coefficients)
    result = {
        "degrees": list(map(int, degrees)),
        "coefficients": int(coefficients.size),
        "initial_minimum": str(minimum),
        "initial_minimum_index": list(map(int, index)),
        "initial_coefficients_sha256": ordered_hash(coefficients.flat),
    }
    result.update(certify_patch(coefficients, degrees))
    return result


def main() -> int:
    cache_hashes = {}
    rows = {}
    for label, (name, expected) in CACHES.items():
        path = HERE / name
        actual = sha256(path)
        assert actual == expected
        cache_hashes[name] = actual
        with path.open("rb") as stream:
            rows[label] = pickle.load(stream)

    symbols = {
        str(symbol): symbol
        for expression in rows["s4"].values()
        for symbol in expression.free_symbols
    }
    k, x, y = symbols["k"], symbols["x"], symbols["y"]
    u, z, r = sp.symbols("u z r", nonnegative=True)
    U, X, A, Q, R, B, S, T = sp.symbols(
        "U X A Q R B S T", nonnegative=True
    )
    N, M = k + x, k + y

    def pieces(label):
        row = rows[label]
        return (
            row[("T", "R")],
            -row[("L", "R")],
            -row[("R", "R")],
        )

    beta4, _, delta4 = pieces("s4")
    scale_relations = {
        "s1": 4 * M,
        "s2": 2 * (3 * M**2 - 1),
        "s3": 4 * M,
        "s4": sp.S.One,
    }
    for label, scale in scale_relations.items():
        beta, _, delta = pieces(label)
        assert sp.cancel(beta - scale * beta4) == 0
        assert sp.cancel(delta - scale * delta4) == 0

    denominator = (y + 2) * (y + 3)
    beta_prefactor = N * (N - 1) * (N + 1) * (M + 1) ** 2 / (2 * denominator)
    difference_prefactor = N**2 * (N + 1) * (M + 1) ** 2 / (2 * denominator)
    beta_kernel = sp.cancel(beta4 / beta_prefactor)
    difference_kernel = sp.cancel((beta4 - delta4) / difference_prefactor)
    discriminants = {}
    for name, kernel, expected_leading in (
        ("beta", beta_kernel, 2 * N),
        ("beta_minus_delta", difference_kernel, 2 * (N - 2)),
    ):
        polynomial = sp.Poly(kernel, y)
        assert polynomial.degree() == 2
        a, b, c = polynomial.all_coeffs()
        assert sp.expand(a - expected_leading) == 0
        reserve = sp.factor(4 * a * c - b**2)
        discriminants[name] = positive_sparse_summary(
            reserve.subs(k, u + 8), (u, x)
        )
    delta_kernel = sp.cancel(
        delta4 * denominator / (N * (N + 1) * (M + 1) ** 3)
    )
    delta_positive = positive_sparse_summary(
        sp.fraction(sp.cancel(delta_kernel))[0].subs(k, u + 8),
        (u, x, y),
    )

    common_powers = {"s1": 1, "s2": 2, "s3": 2, "s4": 2}
    lower_degrees = {"s1": 2, "s2": 2, "s3": 2, "s4": 2}
    certificates = {}
    for label in ("s1", "s2", "s3", "s4"):
        beta, gamma, delta = pieces(label)

        # x>=y: W=L/R>=1, U=T/L, and U>=1+(k-1)M/N.
        high_expression = sp.cancel(
            beta * (1 + (k - 1) * M / N) - gamma - delta
        )
        high_numerator, high_denominator = sp.fraction(high_expression)
        high_sparse = positive_sparse_summary(
            high_numerator.subs({k: u + 8, x: y + z}),
            (u, y, z),
        )

        # y>=x: r=N/M in (0,1], V=T/R, W=L/R.  We use
        # V>=1+(k-1)r (+C(k-1,2)r^2 for s4) and W<=r^7.
        lower = 1 + (k - 1) * r
        if lower_degrees[label] == 2:
            lower += (k - 1) * (k - 2) * r**2 / 2
        common = (
            N * (N + 1) * (M + 1) ** common_powers[label]
            / (2 * (x + 2) * (y + 2) * (y + 3))
        )
        if label in ("s1", "s3"):
            common *= M
        assert all(
            sp.cancel(piece / common).is_polynomial(k, x, y)
            for piece in (beta, gamma, delta)
        )
        reduced = sp.cancel((beta * lower - delta - gamma * r**7) / common)
        substituted = sp.cancel(reduced.subs(y, N / r - k))
        low_numerator, low_denominator = sp.fraction(substituted)
        base = sp.Poly(sp.expand(low_numerator.subs(k, u + 8)), u, x, r)
        compact = compactify_nonnegative(base, u, x, U, X)

        # Blow up the corner a=1-U=0, r=0 with the charts r=aQ and a=rQ.
        chart_r_le_a_raw = sp.Poly(
            sp.expand(compact.as_expr().subs({U: 1 - A, r: A * Q})),
            A, Q, X,
        )
        factor_a, chart_r_le_a = remove_first_axis_monomial(chart_r_le_a_raw)
        chart_a_le_r_raw = sp.Poly(
            sp.expand(compact.as_expr().subs({U: 1 - R * Q, r: R})),
            R, Q, X,
        )
        factor_r, chart_a_le_r = remove_first_axis_monomial(chart_a_le_r_raw)
        # The second chart has one remaining projective corner at
        # (1-R,Q)=(0,0).  Resolve it by the two charts Q=(1-R)T and
        # 1-R=QT.
        chart_q_le_b_raw = sp.Poly(
            sp.expand(chart_a_le_r.as_expr().subs({R: 1 - B, Q: B * T})),
            B, T, X,
        )
        factor_b, chart_q_le_b = remove_first_axis_monomial(chart_q_le_b_raw)
        chart_b_le_q_raw = sp.Poly(
            sp.expand(chart_a_le_r.as_expr().subs({R: 1 - S * T, Q: S})),
            S, T, X,
        )
        factor_s, chart_b_le_q = remove_first_axis_monomial(chart_b_le_q_raw)
        certificates[label] = {
            "x_at_least_y": {
                "positive_denominator": str(sp.factor(high_denominator)),
                "sparse_certificate": high_sparse,
            },
            "y_at_least_x": {
                "ratio_lower_degree": lower_degrees[label],
                "W_upper_bound": "((x+k)/(y+k))^7",
                "positive_denominator": str(sp.factor(low_denominator)),
                "projective_degrees": list(map(int, compact.degree_list())),
                "r_at_most_a_chart": {
                    "removed_a_power": factor_a,
                    **chart_certificate(chart_r_le_a),
                },
                "a_at_most_r_chart": {
                    "removed_r_power": factor_r,
                    "q_at_most_one_minus_r_chart": {
                        "removed_one_minus_r_power": factor_b,
                        **chart_certificate(chart_q_le_b),
                    },
                    "one_minus_r_at_most_q_chart": {
                        "removed_q_power": factor_s,
                        **chart_certificate(chart_b_le_q),
                    },
                },
            },
        }
        print(label, json.dumps(certificates[label], sort_keys=True), flush=True)

    payload = {
        "schema": "uniform-low-high-right-gap1-right-payments-root-v1",
        "status": "PASS_EXACT_ALL_RANK_RIGHT_GAP1_RIGHT_PRODUCT_PAYMENTS",
        "theorem": (
            "For each of the four positive powers of the right gap-1 slack, "
            "beta*T*R-gamma*L*R-delta*R^2 is strictly positive for k>=8 "
            "and x,y>=0."
        ),
        "universal_beta_and_delta": {
            "scale_relations": {key: str(value) for key, value in scale_relations.items()},
            "negative_discriminant_certificates": discriminants,
            "delta_positive": delta_positive,
        },
        "coefficient_certificates": certificates,
        "cache_sha256": cache_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves only the T*R/L*R/R^2 block.  The T*L/L^2 block "
            "and the reconstruction of the complete quartic remain separate."
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
