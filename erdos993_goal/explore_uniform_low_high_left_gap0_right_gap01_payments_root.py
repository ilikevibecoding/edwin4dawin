#!/usr/bin/env python3
"""Explore left-gap0 H2 payments over the simultaneous right-gap01 face."""

from __future__ import annotations

import math
import sympy as sp

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_uniform_low_high_right_gap01_normalized_lift_root import (
    PRODUCTS,
    build_gap1_basis,
    bilinear,
    product_coefficient,
)


BASES = ("T", "L", "R")


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


def form_pair_coefficient(left, right, first, second):
    return pair_coefficient(left, right, first, second)


def add(*rows):
    return {
        basis: tuple(sum(row[basis][index] for row in rows) for index in range(3))
        for basis in BASES
    }


def scale(row, scalar):
    return {basis: tuple(scalar * value for value in row[basis]) for basis in BASES}


def main():
    F, k, x, y = field("k,x,y", QQ)
    S, s = field("s", F)
    N, M, left_high, whole, tail = build_gap1_basis(k, x, y, s)
    left_high = {basis: tuple(promote(S, value) for value in row)
                 for basis, row in left_high.items()}
    whole = {basis: tuple(promote(S, value) for value in row)
             for basis, row in whole.items()}
    tail = {basis: tuple(promote(S, value) for value in row)
            for basis, row in tail.items()}
    N, M = promote(S, N), promote(S, M)
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
            capacity * form_pair_coefficient(d0, e, *product)
            + pair_coefficient(d0, w, *product)
            + pair_coefficient(e, tail, *product)
        )
        h2 = product_coefficient(*product, e, w, capacity)
        for degree, value in enumerate((h0, h1, h2)):
            rows[degree][product] = outer_coefficients(value, F)

    maximum = max(len(row) for degree in rows.values() for row in degree.values()) - 1
    print("MAXIMUM_S_DEGREE", maximum, flush=True)
    for product in PRODUCTS:
        for sdegree in range(maximum + 1):
            values = []
            for qdegree in range(3):
                row = rows[qdegree][product]
                values.append(row[sdegree] if sdegree < len(row) else F.zero)
            assert values[1] == values[0] + values[2]
            print(
                "Q_IDENTITY", product, sdegree,
                "q0_equals_q2", values[0] == values[2],
                flush=True,
            )
    G, ug, xg, yg = field("u,x,y", QQ)
    def shifted(value):
        return G.from_expr(value.as_expr().subs({
            k.as_expr(): ug.as_expr() + 8,
            x.as_expr(): xg.as_expr(), y.as_expr(): yg.as_expr(),
        }))
    def positive_row(label, value):
        transformed = shifted(value)
        numerator = [coefficient for _, coefficient in transformed.numer.terms()]
        denominator = [coefficient for _, coefficient in transformed.denom.terms()]
        negatives = sum(1 for coefficient in numerator if coefficient < 0)
        print(
            "LEFT_CERT", label, "NUM", len(numerator), "NEG", negatives,
            "MIN", min(numerator), "DEN_NEG",
            sum(1 for coefficient in denominator if coefficient < 0),
            flush=True,
        )
        return negatives == 0 and all(coefficient > 0 for coefficient in denominator)
    for qdegree in (0, 2):
        for sdegree in range(maximum + 1):
            alpha = rows[qdegree][("T", "L")][sdegree]
            epsilon = rows[qdegree][("L", "L")][sdegree]
            total_at_one = alpha + epsilon
            assert positive_row(f"q{qdegree}_s{sdegree}_alpha_plus_epsilon", total_at_one)
            if sdegree <= 1:
                assert positive_row(f"q{qdegree}_s{sdegree}_alpha", alpha)
            else:
                assert positive_row(f"q{qdegree}_s{sdegree}_epsilon", epsilon)
                M0 = k + y
                reserve = (x + M0 + 2) * total_at_one - epsilon * (k - 1) * M0
                assert positive_row(f"q{qdegree}_s{sdegree}_union_reserve", reserve)
    H, uh, yh, zh = field("u,y,z", QQ)
    J, ul, xl, zl = field("u,x,z", QQ)
    def region_value(value, region):
        if region == "high":
            expression = value.as_expr().subs({
                k.as_expr(): uh.as_expr() + 8,
                x.as_expr(): yh.as_expr() + zh.as_expr(),
                y.as_expr(): yh.as_expr(),
            })
            return H.from_expr(expression)
        expression = value.as_expr().subs({
            k.as_expr(): ul.as_expr() + 8,
            x.as_expr(): xl.as_expr(),
            y.as_expr(): xl.as_expr() + zl.as_expr(),
        })
        return J.from_expr(expression)
    def right_summary(label, value, region):
        transformed = region_value(value, region)
        numerator = [coefficient for _, coefficient in transformed.numer.terms()]
        denominator = [coefficient for _, coefficient in transformed.denom.terms()]
        print(
            "RIGHT_CERT", label, "NUM", len(numerator),
            "NEG", sum(1 for coefficient in numerator if coefficient < 0),
            "MIN", min(numerator), "DEN_NEG",
            sum(1 for coefficient in denominator if coefficient < 0),
            flush=True,
        )
    N0, M0 = k + x, k + y
    high_lower = 1 + (k - 1) * M0 / N0
    low_lower = (
        1 + (k - 1) * N0 / M0
        + (k - 1) * (k - 2) * (N0 / M0) ** 2 / 2
        + (k - 1) * (k - 2) * (k - 3) * (N0 / M0) ** 3 / 6
    )
    for qdegree in (0, 2):
        for sdegree in range(maximum + 1):
            beta = rows[qdegree][("T", "R")][sdegree]
            gamma = -rows[qdegree][("L", "R")][sdegree]
            delta = -rows[qdegree][("R", "R")][sdegree]
            right_summary(
                f"q{qdegree}_s{sdegree}_high",
                beta * high_lower - gamma - delta,
                "high",
            )
            right_summary(
                f"q{qdegree}_s{sdegree}_low",
                beta * low_lower - delta - gamma * (N0 / M0) ** 7,
                "low",
            )
            right_summary(
                f"q{qdegree}_s{sdegree}_low_drop_gamma",
                beta * low_lower - delta,
                "low",
            )
            right_summary(
                f"q{qdegree}_s{sdegree}_beta",
                beta,
                "low",
            )
            right_summary(
                f"q{qdegree}_s{sdegree}_beta_high",
                beta,
                "high",
            )
            right_summary(
                f"q{qdegree}_s{sdegree}_delta",
                delta,
                "low",
            )
    for qdegree in range(3):
        print("RIGHT_TOP_Q_DEGREE", qdegree, flush=True)
        for sdegree in range(maximum + 1):
            print(" S_DEGREE", sdegree, flush=True)
            for product in PRODUCTS:
                values = rows[qdegree][product]
                value = values[sdegree] if sdegree < len(values) else F.zero
                if value == 0:
                    print("  ", product, "ZERO", flush=True)
                    continue
                # Substitute k=u+8 directly in the fraction field.
                G, u, xx, yy = field("u,x,y", QQ)
                expression = G.from_expr(value.as_expr().subs({
                    k.as_expr(): u.as_expr() + 8,
                    x.as_expr(): xx.as_expr(), y.as_expr(): yy.as_expr(),
                }))
                coefficients = [coefficient for _, coefficient in expression.numer.terms()]
                print(
                    "  ", product,
                    "NUM", len(coefficients),
                    "NEG", sum(1 for coefficient in coefficients if coefficient < 0),
                    "MIN", min(coefficients),
                    flush=True,
                )

    print("PAYMENT_GROUPING_SCAN", flush=True)
    for qdegree in range(3):
        for sdegree in range(maximum + 1):
            values = {
                product: (
                    rows[qdegree][product][sdegree]
                    if sdegree < len(rows[qdegree][product]) else F.zero
                )
                for product in PRODUCTS
            }
            alpha = values[("T", "L")]
            beta = values[("T", "R")]
            epsilon = values[("L", "L")]
            gamma = -values[("L", "R")]
            delta = -values[("R", "R")]
            funcs = {
                name: sp.lambdify(
                    (k.as_expr(), x.as_expr(), y.as_expr()), expression.as_expr(),
                    "math",
                )
                for name, expression in {
                    "alpha": alpha, "beta": beta, "epsilon": epsilon,
                    "gamma": gamma, "delta": delta,
                }.items()
            }
            metrics = {
                name: {"negative": 0, "minimum": None, "witness": None}
                for name in ("total", "left_A", "right_A", "left_B", "right_B")
            }
            for rank in range(8, 15):
                for xv in range(17):
                    for yv in range(17):
                        coefficients = {name: func(rank, xv, yv)
                                        for name, func in funcs.items()}
                        T = math.prod(xv + yv + rank + j for j in range(2, rank + 1))
                        L = math.prod(xv + j for j in range(2, rank + 1))
                        R = math.prod(yv + j for j in range(2, rank + 1))
                        a, b, e0, g, d = (
                            coefficients["alpha"], coefficients["beta"],
                            coefficients["epsilon"], coefficients["gamma"],
                            coefficients["delta"],
                        )
                        candidates = {
                            "left_A": a * T * L + e0 * L * L,
                            "right_A": b * T * R - g * L * R - d * R * R,
                            "left_B": a * T * L + e0 * L * L - g * L * R,
                            "right_B": b * T * R - d * R * R,
                        }
                        candidates["total"] = candidates["left_A"] + candidates["right_A"]
                        for name, value in candidates.items():
                            row = metrics[name]
                            if value < 0:
                                row["negative"] += 1
                            if row["minimum"] is None or value < row["minimum"]:
                                row["minimum"] = value
                                row["witness"] = (rank, xv, yv)
            print("GROUP", qdegree, sdegree, metrics, flush=True)


if __name__ == "__main__":
    main()
