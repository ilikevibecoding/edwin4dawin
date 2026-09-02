#!/usr/bin/env python3
"""Exact coarse component-mode bounds for q=2 unique sum15."""

import json
from pathlib import Path

import sympy as sp

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H, P, at, choose, interval_cells, unique_expressions,
)


HERE = Path(__file__).resolve().parent


def generic_rows():
    t = sp.symbols("t", integer=True, nonnegative=True)
    x = sp.symbols("x0:8", nonnegative=True)
    h = sp.symbols("h0:7", nonnegative=True)
    p = tuple(sp.expand(sum(
        sp.binomial(t, j) * at(x, rank - j) for j in range(rank + 1)
    )) for rank in range(8))
    expression = unique_expressions(interval_cells(P, H))[14]
    twice = sp.expand(sp.expand_func(
        (2 * expression)
        .subs({P[rank]: p[rank] for rank in range(8)})
        .subs({H[rank]: h[rank] for rank in range(7)})
        .subs({x[0]: 1, h[0]: 1})
    ))
    assert sp.degree(twice, t) == 5
    rows = [sp.expand(sum(
        (-1) ** (rank - j) * sp.binomial(rank, j) * twice.subs(t, j)
        for j in range(rank + 1)
    )) for rank in range(6)]
    return x, h, rows


def mode_bounds(x, h, rows, mode):
    e, t = sp.symbols("e t", nonnegative=True)
    order_x = e + (2 if mode == "distinct" else 1)
    exact = {
        x[1]: order_x,
        x[2]: choose(order_x, 2) - e,
        h[1]: e,
        h[2]: choose(e, 2) - (e - 2),
    }
    variables = (*x[3:6], *h[3:5])
    lower = {}
    upper = {}
    for rank in range(3, 6):
        lower[x[rank]] = (
            choose(order_x, rank) - e * choose(order_x - 2, rank - 2)
        )
        upper[x[rank]] = choose(order_x, rank)
    for rank in range(3, 5):
        lower[h[rank]] = (
            choose(e, rank) - (e - 2) * choose(e - 2, rank - 2)
        )
        upper[h[rank]] = choose(e, rank)

    reports = []
    for index, row in enumerate(rows):
        expression = sp.expand(row.subs(exact))
        polynomial = sp.Poly(expression, *variables)
        bound = 0
        endpoints = []
        mixed = []
        for monomial, coefficient in polynomial.terms():
            shifted = sp.Poly(sp.expand(coefficient.subs(e, t + 13)), t)
            if all(value >= 0 for value in shifted.coeffs()):
                endpoint = lower
                endpoints.append("lower")
            elif all(value <= 0 for value in shifted.coeffs()):
                endpoint = upper
                endpoints.append("upper")
            else:
                mixed.append((monomial, str(coefficient)))
                continue
            term = coefficient
            for variable, power in zip(variables, monomial):
                term *= endpoint[variable] ** power
            bound += term
        if mixed:
            reports.append({"row": index, "mixed": mixed})
            continue
        bound = sp.factor(bound)
        shifted_bound = sp.Poly(sp.expand(bound.subs(e, t + 13)), t)
        reports.append({
            "row": index,
            "bound": str(bound),
            "shifted_coefficients": [str(value) for value in shifted_bound.all_coeffs()],
            "negative_shifted_coefficients": sum(
                1 for value in shifted_bound.coeffs() if value < 0
            ),
            "endpoint_counts": {
                "lower": endpoints.count("lower"),
                "upper": endpoints.count("upper"),
            },
        })
    return reports


def main():
    x, h, rows = generic_rows()
    report = {
        mode: mode_bounds(x, h, rows, mode)
        for mode in ("distinct", "shared")
    }
    output = HERE / "iso_n5_disconnected_m5_sum15_q2_coarse_probe_root_20260830.json"
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
