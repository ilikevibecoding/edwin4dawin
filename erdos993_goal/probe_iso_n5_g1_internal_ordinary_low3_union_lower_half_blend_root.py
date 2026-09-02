#!/usr/bin/env python3
"""Probe h+k<=1 with union lower bounds and half-blended upper bounds.

Positive high-rank coefficients use i_r>=C(n,r)-e*C(n-2,r-2), the union
bound over edge events.  Negative high-rank coefficients use the same valid
half-blended upper bound that closes h+k=2.  This is diagnostic only.
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
from prove_iso_n5_g1_internal_ordinary_diagonal2_large_order_root import (
    at,
    bonferroni_upper,
    choose_polynomial,
    multiplicity_upper,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_low3_union_lower_half_blend_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW3_UNION_LOWER_HALF_BLEND_ROOT"
CELLS = ((0, 0), (0, 1), (1, 0))
CUTOFF = 10
THETA = sp.Rational(1, 2)


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
    ea, qa, eb, ec, ed = sp.symbols("ea qa eb ec ed", nonnegative=True)
    low_rules = {
        a[1]: n,
        a[2]: n * (n - 1) / 2 - ea,
        a[3]: n * (n - 1) * (n - 2) / 6 - (n - 2) * ea + qa,
        b[1]: nb,
        b[2]: nb * (nb - 1) / 2 - eb,
        c[1]: nc,
        c[2]: nc * (nc - 1) / 2 - ec,
        d[1]: nd,
        d[2]: nd * (nd - 1) / 2 - ed,
    }
    edge_by_row = {a: ea, b: eb, c: ec, d: ed}
    remaining = {}
    for row, order, start in ((a, n, 4), (b, nb, 3), (c, nc, 3), (d, nd, 3)):
        for rank in range(start, len(row)):
            remaining[row[rank]] = (order, edge_by_row[row], rank)
    remaining_variables = tuple(remaining)
    base_variables = (n, nb, nc, nd, ea, qa, eb, ec, ed)
    variables = (*base_variables, *remaining_variables)
    x, y, z, u, v, s, w, r, t = sp.symbols(
        "x y z u v s w r t", nonnegative=True
    )

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
        cell_rows = []
        for index in CELLS:
            exact = sp.Poly(
                sp.expand(newton_cells[index].subs(partition_rules).subs(low_rules)),
                *variables,
            )
            lower = sp.Integer(0)
            positive_high = negative_high = 0
            for powers, coefficient in exact.terms():
                high_powers = powers[len(base_variables):]
                term = coefficient
                for variable, power in zip(base_variables, powers[:len(base_variables)]):
                    term *= variable**power
                if any(high_powers):
                    if coefficient > 0:
                        assert sum(high_powers) == 1
                        positive_high += 1
                    else:
                        negative_high += 1
                    for variable, power in zip(remaining_variables, high_powers):
                        if not power:
                            continue
                        order, edges, rank = remaining[variable]
                        if coefficient > 0:
                            bound = sp.expand(
                                choose_polynomial(order, rank)
                                - edges * choose_polynomial(order - 2, rank - 2)
                            )
                        else:
                            wedges = qa if order == n else edges * (edges - 1) / 2
                            bound = sp.expand(
                                THETA * multiplicity_upper(order, edges, rank)
                                + (1 - THETA) * bonferroni_upper(
                                    order, edges, wedges, rank
                                )
                            )
                        term *= bound**power
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
            }).subs(n, CUTOFF + t))
            box = (
                (x, y, u, v, s, w)
                if epsilon == 0
                else (x, y, z, u, v, s, w, r)
            )
            bernstein_degrees, controls = tensor_bernstein_fast(normalized, box)
            power_rows = [sp.Poly(value, t).all_coeffs() for value in controls.flat]
            negative_controls = sum(
                any(value < 0 for value in row) for row in power_rows
            )
            first_negative = [
                {
                    "flat_index": position,
                    "control": sp.sstr(value),
                    "negative_power_coefficients": [
                        str(coefficient)
                        for coefficient in sp.Poly(value, t).all_coeffs()
                        if coefficient < 0
                    ],
                }
                for position, value in enumerate(controls.flat)
                if any(
                    coefficient < 0
                    for coefficient in sp.Poly(value, t).all_coeffs()
                )
            ][:12]
            cell_rows.append({
                "h_index": index[0],
                "k_index": index[1],
                "positive_high_monomials": positive_high,
                "negative_high_monomials": negative_high,
                "bernstein_degrees": list(bernstein_degrees),
                "bernstein_controls": int(controls.size),
                "negative_control_polynomials": negative_controls,
                "first_negative_controls": first_negative,
                "all_nonnegative": negative_controls == 0,
            })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "cells": cell_rows,
        })

    report = {
        "marker": MARKER,
        "cutoff": CUTOFF,
        "theta": str(THETA),
        "faces": faces,
        "status": "safe union-lower/half-blend-upper probe; no theorem asserted",
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
                        "controls": cell["bernstein_controls"],
                        "negative": cell["negative_control_polynomials"],
                        "positive_high": cell["positive_high_monomials"],
                        "negative_high": cell["negative_high_monomials"],
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
