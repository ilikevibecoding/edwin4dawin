#!/usr/bin/env python3
"""Crude order-only lower-bound probe for the h+k=2 g1 diagonal.

Positive monomials involving rank>=2 independent-set coefficients are dropped;
negative ones use i_r<=C(order,r).  The resulting bound is safe but deliberately
coarse.  This file is diagnostic only.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from explore_rank4_three_halves_grouped import tensor_bernstein_fast


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_diagonal2_crude_order_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_DIAGONAL2_CRUDE_ORDER_ROOT"
CELLS = ((0, 2), (1, 1), (2, 0))


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def choose(order, rank):
    product = sp.Integer(1)
    for offset in range(rank):
        product *= order - offset
    return sp.expand(product / sp.factorial(rank))


def main() -> None:
    expression, rows = ordinary_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    child_rules = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        child_rules.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    degrees, newton_cells = tensor_binomial(
        sp.expand(expression.subs(child_rules)), (h, k)
    )
    assert degrees == (6, 6)

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    n, nb, nc, nd = sp.symbols("n nb nc nd", nonnegative=True)
    orders = {a: n, b: nb, c: nc, d: nd}
    variable_metadata = {}
    for row, order in orders.items():
        for rank, variable in enumerate(row[1:], 1):
            variable_metadata[variable] = (order, rank)
    variables = tuple(variable_metadata)
    x, y, z, t = sp.symbols("x y z t", nonnegative=True)

    faces = []
    for epsilon in (0, 1):
        partition_rules = {}
        for rank in range(1, 7):
            partition_rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        cell_bounds = []
        for index in CELLS:
            partitioned = sp.Poly(
                sp.expand(newton_cells[index].subs(partition_rules)), *variables
            )
            lower = sp.Integer(0)
            kept_positive = dropped_positive = bounded_negative = 0
            dropped_positive_terms = []
            for powers, coefficient in partitioned.terms():
                factors = []
                has_high_rank = False
                for variable, power in zip(variables, powers):
                    if not power:
                        continue
                    order, rank = variable_metadata[variable]
                    has_high_rank |= rank >= 2
                    factors.append((choose(order, rank) if rank >= 2 else order) ** power)
                term = coefficient
                for factor in factors:
                    term *= factor
                if coefficient > 0 and has_high_rank:
                    dropped_positive += 1
                    dropped_positive_terms.append({
                        "coefficient": str(coefficient),
                        "monomial": "*".join(
                            str(variable) if power == 1 else f"{variable}^{power}"
                            for variable, power in zip(variables, powers) if power
                        ),
                    })
                    continue
                if coefficient > 0:
                    kept_positive += 1
                else:
                    bounded_negative += 1
                lower += term
            lower = sp.expand(lower)
            cutoff_rows = []
            for cutoff in (10, 20, 40, 80, 160):
                normalized = sp.expand(
                    lower.subs({nb: n * x, nc: n * y, nd: n * z}).subs(n, cutoff + t)
                )
                box = (x, y) if epsilon == 0 else (x, y, z)
                bernstein_degrees, controls = tensor_bernstein_fast(normalized, box)
                rows_power = [sp.Poly(value, t).all_coeffs() for value in controls.flat]
                negative = sum(
                    any(coefficient < 0 for coefficient in power)
                    for power in rows_power
                )
                cutoff_rows.append({
                    "cutoff": cutoff,
                    "bernstein_degrees": list(bernstein_degrees),
                    "controls": int(controls.size),
                    "negative_control_polynomials": negative,
                    "all_nonnegative": negative == 0,
                })
            cell_bounds.append({
                "h_index": index[0],
                "k_index": index[1],
                "kept_positive_order_monomials": kept_positive,
                "dropped_positive_high_rank_monomials": dropped_positive,
                "dropped_positive_terms": dropped_positive_terms,
                "bounded_negative_monomials": bounded_negative,
                "lower_bound": sp.sstr(lower),
                "cutoffs": cutoff_rows,
            })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "cells": cell_bounds,
        })

    report = {
        "marker": MARKER,
        "faces": faces,
        "status": "safe crude order-bound probe; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": [
            {
                "geometry": face["geometry"],
                "cells": [
                    {
                        "index": [cell["h_index"], cell["k_index"]],
                        "cutoffs": [
                            [row["cutoff"], row["negative_control_polynomials"]]
                            for row in cell["cutoffs"]
                        ],
                        "dropped_positive": cell["dropped_positive_high_rank_monomials"],
                    }
                    for cell in face["cells"]
                ],
            }
            for face in faces
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
