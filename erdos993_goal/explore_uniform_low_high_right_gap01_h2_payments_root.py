#!/usr/bin/env python3
"""Explore the exact H2 payment for a right gap-0 lift over right gap-1.

This is an algebraic diagnostic.  It uses nested canonical fraction fields so
the gap-1 coefficients of H2 can be extracted without heuristic expansion.
"""

from __future__ import annotations

import pickle
import math
from fractions import Fraction
from pathlib import Path

import sympy as sp
from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_uniform_low_high_right_gap01_normalized_lift_root import (
    PRODUCTS,
    build_gap1_basis,
    product_coefficient,
)


HERE = Path(__file__).resolve().parent


def outer_coefficients(value, coefficient_field):
    """Return coefficients of a polynomial fraction with constant denominator."""
    if value == 0:
        return [coefficient_field.zero]
    assert value.denom.degree() == 0, value.denom
    denominator = value.denom[(0,)]
    degree = value.numer.degree()
    result = [coefficient_field.zero for _ in range(degree + 1)]
    for (power,), coefficient in value.numer.terms():
        result[power] = coefficient / denominator
    return result


def main() -> int:
    F, k, x, y = field("k,x,y", QQ)
    K, s = field("s", F)
    N, M, left_high, whole, tail = build_gap1_basis(k, x, y, s)
    def promote(value):
        return K.from_expr(value.as_expr()) if hasattr(value, "as_expr") else K(value)
    left_high = {
        basis: tuple(promote(value) for value in row)
        for basis, row in left_high.items()
    }
    whole = {
        basis: tuple(promote(value) for value in row)
        for basis, row in whole.items()
    }
    tail = {
        basis: tuple(promote(value) for value in row)
        for basis, row in tail.items()
    }
    direction_whole = {
        basis: tuple(whole[basis][index] - left_high[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    direction_tail = {
        basis: tuple(tail[basis][index] - left_high[basis][index]
                     for index in range(3))
        for basis in ("T", "L", "R")
    }
    rho = M + 1 + s
    reduced_direction_whole = {
        basis: tuple(value / rho for value in row)
        for basis, row in direction_whole.items()
    }
    reduced_direction_tail = {
        basis: tuple(value / rho for value in row)
        for basis, row in direction_tail.items()
    }
    base_rows = {}
    square_rows = {}
    for product in PRODUCTS:
        base = product_coefficient(*product, whole, tail, N - 2)
        normalized_square = product_coefficient(
            *product, direction_whole, direction_tail, N - 2
        )
        square = product_coefficient(
            *product, reduced_direction_whole, reduced_direction_tail, N - 2
        )
        assert normalized_square == rho**2 * square
        base_rows[product] = outer_coefficients(base, F)
        square_rows[product] = outer_coefficients(square, F)
        print(
            "PRODUCT", product,
            "BASE_DEGREE", len(base_rows[product]) - 1,
            "RAW_T2_DEGREE", len(square_rows[product]) - 1,
            flush=True,
        )

    maximum = max(len(row) for row in square_rows.values()) - 1
    print("RAW_T2_MAXIMUM_GAP1_DEGREE", maximum, flush=True)

    # Cross-check the extracted base rows against all four accepted caches.
    D = M**2 - 1
    cache_rows = {}
    for degree in range(1, 5):
        name = HERE / f"uniform_low_high_right_gap1_s{degree}_product_coefficients_root.pkl"
        with name.open("rb") as stream:
            cache = pickle.load(stream)
        scale = (N * M) ** 2 * (D if degree == 1 else D**2)
        target_symbols = {
            "k": k.as_expr(), "x": x.as_expr(), "y": y.as_expr()
        }
        cache_rows[degree] = {
            product: F.from_expr(expression.xreplace({
                symbol: target_symbols[str(symbol)]
                for symbol in expression.free_symbols
            }))
            for product, expression in cache.items()
        }
        for product in PRODUCTS:
            value = (
                base_rows[product][degree]
                if degree < len(base_rows[product]) else F.zero
            )
            assert value * scale == cache_rows[degree][product], (degree, product)
    print("PASS base rows equal accepted gap1 caches", flush=True)
    right_factors = ((M - 1)**2, 2 * (M - 1), F.one)
    for product in (("T", "R"), ("R", "R")):
        common = cache_rows[4][product] / ((N * M) ** 2 * D**2)
        for degree, factor_value in enumerate(right_factors):
            assert square_rows[product][degree] == factor_value * common
    print(
        "PASS raw right block is positive sigma-squared scaling of accepted s4 block",
        flush=True,
    )

    # Report sparse sign diagnostics for the three new left-involving products.
    ks, xs, ys = sp.symbols("k x y")
    u = sp.Symbol("u", nonnegative=True)
    for degree in range(maximum + 1):
        print("DEGREE", degree, flush=True)
        for product in (("T", "L"), ("L", "L"), ("L", "R")):
            value = (
                square_rows[product][degree]
                if degree < len(square_rows[product]) else F.zero
            )
            expression = sp.cancel(value.as_expr()).subs({ks: u + 8})
            numerator, denominator = sp.fraction(expression)
            polynomial = sp.Poly(sp.expand(numerator), u, xs, ys)
            coefficients = [coefficient for _, coefficient in polynomial.terms()]
            print(
                " ", product,
                "zero", value == 0,
                "denominator", sp.factor(denominator),
                "terms", len(coefficients),
                "negative", sum(1 for coefficient in coefficients
                                if coefficient.is_negative),
                "minimum", min(coefficients) if coefficients else 0,
                flush=True,
            )

    z = sp.Symbol("z", nonnegative=True)
    ksp, xsp, ysp = sp.symbols("k x y")
    Nsp, Msp = ksp + xsp, ksp + ysp
    def truncated_ratio(numerator, denominator):
        return (
            1 + (ksp - 1) * numerator / denominator
            + (ksp - 1) * (ksp - 2) * numerator**2 / (2 * denominator**2)
            + (ksp - 1) * (ksp - 2) * (ksp - 3) * numerator**3
            / (6 * denominator**3)
        )
    lower_t_over_l = truncated_ratio(Msp, Nsp)
    lower_t_over_r = truncated_ratio(Nsp, Msp)
    lower_t_over_l4 = lower_t_over_l + (
        (ksp - 1) * (ksp - 2) * (ksp - 3) * (ksp - 4) * Msp**4
        / (24 * Nsp**4)
    )
    lower_t_over_l7 = sum(
        sp.prod(ksp - 1 - index for index in range(power))
        * (Msp / Nsp) ** power / math.factorial(power)
        for power in range(8)
    )

    def value_at(product, degree):
        row = square_rows[product]
        value = row[degree] if degree < len(row) else F.zero
        return sp.cancel(value.as_expr())

    def sparse_candidate(name, expression, substitutions, variables):
        numerator, denominator = sp.fraction(sp.cancel(expression.subs(substitutions)))
        polynomial = sp.Poly(sp.expand(numerator), *variables)
        coefficients = [coefficient for _, coefficient in polynomial.terms()]
        print(
            "CANDIDATE", name,
            "terms", len(coefficients),
            "negative", sum(1 for coefficient in coefficients
                            if coefficient.is_negative),
            "minimum", min(coefficients) if coefficients else 0,
            "denominator", sp.factor(denominator),
            flush=True,
        )

    for degree in (1, 2):
        alpha = value_at(("T", "L"), degree)
        beta = value_at(("T", "R"), degree)
        epsilon = value_at(("L", "L"), degree)
        gamma = -value_at(("L", "R"), degree)
        delta = -value_at(("R", "R"), degree)
        for label, bound in ():
            candidate = sp.cancel(alpha * bound + epsilon - gamma)
            numeric = sp.lambdify((ksp, xsp, ysp), candidate, "math")
            witness = None
            minimum = None
            for rank_value in range(8, 25):
                for y_value in range(0, 41):
                    for z_value in range(0, 41):
                        value = numeric(rank_value, y_value + z_value, y_value)
                        if minimum is None or value < minimum:
                            minimum = value
                            witness = (rank_value, y_value, z_value)
            exact_minimum = sp.cancel(candidate.subs({
                ksp: witness[0], ysp: witness[1],
                xsp: witness[1] + witness[2],
            }))
            print(
                "HIGH_GRID", f"d{degree}_{label}",
                "minimum", exact_minimum, "witness", witness,
                flush=True,
            )
        sparse_candidate(
            f"d{degree}_high_ratio_seventh",
            alpha * lower_t_over_l + epsilon
            - gamma * (Msp / Nsp) ** 7,
            {ksp: u + 8, xsp: ysp + z}, (u, ysp, z),
        )
        continue
        del beta, delta
        sparse_candidate(
            f"d{degree}_high_full_degree4",
            alpha * lower_t_over_l4 + epsilon - gamma,
            {ksp: u + 8, xsp: ysp + z}, (u, ysp, z),
        )
        sparse_candidate(
            f"d{degree}_high_gamma_nonpositive",
            -gamma,
            {ksp: u + 8, xsp: ysp + z}, (u, ysp, z),
        )
        sparse_candidate(
            f"d{degree}_epsilon_sign",
            -epsilon if degree == 1 else epsilon,
            {ksp: u + 8}, (u, xsp, ysp),
        )
        sparse_candidate(
            f"d{degree}_high_without_gamma",
            alpha * lower_t_over_l + epsilon,
            {ksp: u + 8, xsp: ysp + z}, (u, ysp, z),
        )
        if degree == 1:
            sparse_candidate(
                "d1_low_with_epsilon",
                alpha * lower_t_over_r + epsilon - gamma,
                {ksp: u + 8, ysp: xsp + z}, (u, xsp, z),
            )
        else:
            sparse_candidate(
                "d2_low_without_epsilon",
                alpha * lower_t_over_r - gamma,
                {ksp: u + 8, ysp: xsp + z}, (u, xsp, z),
            )

    for rank, xv, yv, sv in (
        (8, 0, 0, 1), (8, 3, 11, 29), (11, 1, 100, 43),
        (15, 29, 2, 5), (23, 7, 31, 71),
    ):
        _, Mv, av, cv, vv = build_gap1_basis(
            Fraction(rank), Fraction(xv), Fraction(yv), Fraction(sv)
        )
        dc = {
            basis: tuple(cv[basis][i] - av[basis][i] for i in range(3))
            for basis in ("T", "L", "R")
        }
        dv = {
            basis: tuple(vv[basis][i] - av[basis][i] for i in range(3))
            for basis in ("T", "L", "R")
        }
        bases = {
            product: product_coefficient(*product, cv, vv, rank + xv - 2)
            for product in PRODUCTS
        }
        squares = {
            product: product_coefficient(*product, dc, dv, rank + xv - 2)
            for product in PRODUCTS
        }
        weights = {
            "T": math.prod(xv + yv + rank + j for j in range(2, rank + 1)),
            "L": math.prod(xv + j for j in range(2, rank + 1)),
            "R": math.prod(yv + j for j in range(2, rank + 1)),
        }
        def weighted(rows, selected):
            return sum(
                rows[product] * weights[product[0]] * weights[product[1]]
                for product in selected
            )
        left_products = (("T", "L"), ("L", "L"), ("L", "R"))
        right_products = (("T", "R"), ("R", "R"))
        left_base = weighted(bases, left_products)
        right_base = weighted(bases, right_products)
        square_total = weighted(squares, PRODUCTS)
        raw_square_total = square_total / (Mv + 1 + sv)**2
        print(
            "PAYMENT_LIFT_SPOT", rank, xv, yv, sv,
            "normalized_positive", square_total > 0,
            "raw_positive", raw_square_total > 0,
            flush=True,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
