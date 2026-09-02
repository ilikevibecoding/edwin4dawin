#!/usr/bin/env python3
"""Low-motif/order-box probe for the h+k=2 internal-ordinary g1 cells.

The rank-2 and A-rank-3 forest coefficients are substituted exactly.  Every
remaining negative independent-set coefficient uses i_r<=order^r/r!, while
positive monomials containing such a coefficient are dropped.  The resulting
safe lower bound is tested on a loose normalized forest-statistics box.  This
is diagnostic only.
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
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_diagonal2_low_motif_bound_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_DIAGONAL2_LOW_MOTIF_BOUND_ROOT"
CELLS = ((0, 2), (1, 1), (2, 0))


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def choose_polynomial(order, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    product = sp.Integer(1)
    for offset in range(rank):
        product *= order - offset
    return sp.expand(product / sp.factorial(rank))


def bonferroni_upper(order, edges, wedges, rank):
    """Two-term edge-event inclusion-exclusion upper bound for i_rank."""
    return sp.expand(
        choose_polynomial(order, rank)
        - edges * choose_polynomial(order - 2, rank - 2)
        + wedges * choose_polynomial(order - 3, rank - 3)
        + (edges * (edges - 1) / 2 - wedges)
        * choose_polynomial(order - 4, rank - 4)
    )


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
    brow = (sp.Integer(1), *sp.symbols("b1:6"))
    crow = (sp.Integer(1), *sp.symbols("c1:6"))
    drow = (sp.Integer(1), *sp.symbols("d1:5"))
    n, nb, nc, nd = sp.symbols("n nb nc nd", nonnegative=True)
    ea, qa, eb, ec, ed = sp.symbols("ea qa eb ec ed", nonnegative=True)
    low_rules = {
        a[1]: n,
        a[2]: n * (n - 1) / 2 - ea,
        a[3]: n * (n - 1) * (n - 2) / 6 - (n - 2) * ea + qa,
        brow[1]: nb,
        brow[2]: nb * (nb - 1) / 2 - eb,
        crow[1]: nc,
        crow[2]: nc * (nc - 1) / 2 - ec,
        drow[1]: nd,
        drow[2]: nd * (nd - 1) / 2 - ed,
    }
    remaining = {}
    edge_by_row = {a: ea, brow: eb, crow: ec, drow: ed}
    for row, order, start in (
        (a, n, 4), (brow, nb, 3), (crow, nc, 3), (drow, nd, 3)
    ):
        for rank in range(start, len(row)):
            remaining[row[rank]] = (order, edge_by_row[row], rank)
    remaining_variables = tuple(remaining)
    base_variables = (n, nb, nc, nd, ea, qa, eb, ec, ed)
    all_variables = (*base_variables, *remaining_variables)
    x, y, z, u, v, s, w, r, t = sp.symbols("x y z u v s w r t", nonnegative=True)
    theta = sp.symbols("theta", real=True)

    faces = []
    for epsilon in (0, 1):
        partition_rules = {}
        for rank in range(1, 7):
            partition_rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(brow, rank - 1),
                rows["V"][rank]: at(a, rank) + at(crow, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(brow, rank - 1) + at(crow, rank - 1)
                    + epsilon * at(drow, rank - 2)
                ),
            })
        cell_rows = []
        for index in (CELLS[0],):
            exact = sp.Poly(
                sp.expand(newton_cells[index].subs(partition_rules).subs(low_rules)),
                *all_variables,
            )
            lower = sp.Integer(0)
            dropped_positive = bounded_negative = retained = 0
            for powers, coefficient in exact.terms():
                remaining_powers = powers[len(base_variables):]
                contains_remaining = any(remaining_powers)
                if coefficient > 0 and contains_remaining:
                    dropped_positive += 1
                    continue
                term = coefficient
                for variable, power in zip(base_variables, powers[:len(base_variables)]):
                    term *= variable**power
                for variable, power in zip(remaining_variables, remaining_powers):
                    if not power:
                        continue
                    order, edges, rank = remaining[variable]
                    wedges = qa if order == n else edges * (edges - 1) / 2
                    bonferroni = bonferroni_upper(
                        order, edges, wedges, rank
                    )
                    multiplicity = sp.expand(
                        choose_polynomial(order, rank)
                        - edges * choose_polynomial(order - 2, rank - 2)
                        / sp.binomial(rank, 2)
                    )
                    blended_upper = sp.expand(
                        theta * multiplicity + (1 - theta) * bonferroni
                    )
                    term *= blended_upper**power
                if coefficient < 0 and contains_remaining:
                    bounded_negative += 1
                else:
                    retained += 1
                lower += term
            lower = sp.expand(lower)
            normalized = sp.expand(lower.subs({
                nb: n * x,
                nc: n * y,
                nd: n * z,
                ea: n * u,
                qa: n**2 * u**2 * v / 2,
                eb: n * x * s,
                ec: n * y * w,
                ed: n * z * r,
            }))
            box = (
                (x, y, u, v, s, w)
                if epsilon == 0
                else (x, y, z, u, v, s, w, r)
            )
            cutoff_rows = []
            for cutoff in (10,):
                shifted = sp.expand(normalized.subs(n, cutoff + t))
                bernstein_degrees, controls = tensor_bernstein_fast(shifted, box)
                powers = [sp.Poly(value, t).all_coeffs() for value in controls.flat]
                lower_theta = sp.Rational(0)
                upper_theta = sp.Rational(1)
                impossible = []
                for position, row in enumerate(powers):
                    for coefficient in row:
                        theta_poly = sp.Poly(coefficient, theta)
                        assert theta_poly.degree() <= 1
                        slope = theta_poly.coeff_monomial(theta)
                        intercept = theta_poly.coeff_monomial(1)
                        if slope > 0:
                            lower_theta = max(lower_theta, -intercept / slope)
                        elif slope < 0:
                            upper_theta = min(upper_theta, -intercept / slope)
                        elif intercept < 0:
                            impossible.append(position)
                feasible = bool(not impossible and lower_theta <= upper_theta)
                cutoff_rows.append({
                    "cutoff": cutoff,
                    "bernstein_degrees": list(bernstein_degrees),
                    "controls": int(controls.size),
                    "theta_feasible_interval": [
                        str(lower_theta), str(upper_theta)
                    ],
                    "theta_independent_negative_controls": len(set(impossible)),
                    "all_nonnegative_for_some_blend": feasible,
                })
            cell_rows.append({
                "h_index": index[0],
                "k_index": index[1],
                "dropped_positive_remaining_monomials": dropped_positive,
                "bounded_negative_remaining_monomials": bounded_negative,
                "retained_monomials": retained,
                "cutoffs": cutoff_rows,
            })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "cells": cell_rows,
        })

    report = {
        "marker": MARKER,
        "faces": faces,
        "status": "safe low-motif normalized-box probe; no theorem asserted",
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
                            [
                                row["cutoff"],
                                row["theta_feasible_interval"],
                                row["all_nonnegative_for_some_blend"],
                                row["controls"],
                            ]
                            for row in cell["cutoffs"]
                        ],
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
