#!/usr/bin/env python3
"""Probe a coarse all-order certificate for the h+k=3 g1 diagonal.

This is exploratory.  It lowers the exact adjacent-face motif expressions by
the universal forest bounds on edges and incident edge pairs, then tests the
remaining order polynomial on 0<=|B|,|C|<=|A| with exact Bernstein controls.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from diagnose_iso_n5_g1_internal_ordinary_diagonal3_motif_root import (
    CELLS,
    at,
    forest_rows,
)
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from explore_rank4_three_halves_grouped import tensor_bernstein_fast


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_diagonal3_coarse_order_bound_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_DIAGONAL3_COARSE_ORDER_BOUND_ROOT"


def exact_cells():
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
    araw = (sp.Integer(1), *sp.symbols("a1:7"))
    braw = (sp.Integer(1), *sp.symbols("b1:6"))
    craw = (sp.Integer(1), *sp.symbols("c1:6"))
    draw = (sp.Integer(1), *sp.symbols("d1:5"))
    arow, astats = forest_rows("a", 4)
    brow, bstats = forest_rows("b", 3)
    crow, cstats = forest_rows("c", 3)
    drow, _dstats = forest_rows("d", 2)
    motif_rules = {}
    for raw, motif in ((araw, arow), (braw, brow), (craw, crow), (draw, drow)):
        motif_rules.update({raw[index]: value for index, value in enumerate(motif)})
    partition_rules = {}
    for rank in range(1, 7):
        partition_rules.update({
            rows["W"][rank]: at(araw, rank),
            rows["P"][rank]: at(araw, rank) + at(braw, rank - 1),
            rows["V"][rank]: at(araw, rank) + at(craw, rank - 1),
            rows["E"][rank]: at(araw, rank) + at(braw, rank - 1) + at(craw, rank - 1),
        })
    cells = {
        index: sp.expand(newton_cells[index].subs(partition_rules).subs(motif_rules))
        for index in CELLS
    }
    return cells, astats, bstats, cstats


def main() -> None:
    cells, astats, bstats, cstats = exact_cells()
    na, ea, qa, ta = astats
    nb, eb, qb, _tb = bstats
    nc, ec, qc, _tc = cstats
    x, y, t = sp.symbols("x y t", nonnegative=True)
    rows = []
    for cutoff in range(4, 21):
        cutoff_rows = []
        for index, expression in cells.items():
            polynomial = sp.Poly(expression, qa, qb, qc, ta)
            # Signs are exact and justify maximizing q's and dropping +36*ta.
            assert polynomial.degree(qa) == polynomial.degree(qb) == polynomial.degree(qc) == 1
            assert sp.diff(expression, qa).subs({na: cutoff}) < 0
            assert sp.diff(expression, qb) == -16
            assert sp.diff(expression, qc) == -36
            assert sp.diff(expression, ta) == 36
            lowered = sp.expand(expression.subs({
                qa: ea * (ea - 1) / 2,
                qb: eb * (eb - 1) / 2,
                qc: ec * (ec - 1) / 2,
                ta: 0,
            }))

            # The C-edge block is nonnegative for 0<=ec<=nc<=na.
            without_ec = sp.expand(lowered.subs(ec, 0))
            ec_block = sp.factor(lowered - without_ec)
            ec_quotient = sp.factor(ec_block / ec)
            ec_floor = sp.expand(ec_quotient.subs(ec, nc))
            assert all(value > 0 for value in sp.Poly(ec_floor, na, nc).coeffs())

            # The B-edge block is concave.  For na>=cutoff, test that its
            # endpoint eb=nb is the lower endpoint throughout 0<=nb<=na.
            without_eb = sp.expand(without_ec.subs(eb, 0))
            eb_block = sp.factor(without_ec - without_eb)
            eb_endpoint = sp.expand(eb_block.subs(eb, nb))
            eb_difference = sp.factor(eb_block - eb_endpoint)
            eb_quotient = sp.factor(eb_difference / (nb - eb))
            eb_floor = sp.expand(
                eb_quotient.subs({eb: 0, nb: na}).subs(na, cutoff + t)
            )
            eb_floor_coeffs = sp.Poly(eb_floor, t).coeffs()
            eb_ok = all(value >= 0 for value in eb_floor_coeffs)

            # The A-edge block is likewise concave; compare it with ea=na-1.
            base = sp.expand(without_eb + eb_endpoint)
            without_ea = sp.expand(base.subs(ea, 0))
            ea_block = sp.factor(base - without_ea)
            ea_endpoint = sp.expand(ea_block.subs(ea, na - 1))
            ea_difference = sp.factor(ea_block - ea_endpoint)
            ea_quotient = sp.factor(ea_difference / (na - 1 - ea))
            # The quotient is increasing in ea,nb,nc in all four rows, so its
            # cube minimum is the origin.  Verify that claim coefficientwise.
            ea_delta = sp.Poly(
                sp.expand(ea_quotient - ea_quotient.subs({ea: 0, nb: 0, nc: 0})),
                ea, nb, nc,
            )
            ea_monotone = all(value >= 0 for value in ea_delta.coeffs())
            ea_floor = sp.expand(
                ea_quotient.subs({ea: 0, nb: 0, nc: 0}).subs(na, cutoff + t)
            )
            ea_floor_coeffs = sp.Poly(ea_floor, t).coeffs()
            ea_ok = ea_monotone and all(value >= 0 for value in ea_floor_coeffs)

            order_lower = sp.expand(without_ea + eb_endpoint + ea_endpoint)
            normalized = sp.expand(
                order_lower.subs({nb: na * x, nc: na * y}).subs(na, cutoff + t)
            )
            degrees, controls = tensor_bernstein_fast(normalized, (x, y))
            control_rows = list(controls.flat)
            control_power_coefficients_nonnegative = [
                all(value >= 0 for value in sp.Poly(control, t).all_coeffs())
                for control in control_rows
            ]
            cutoff_rows.append({
                "h_index": index[0],
                "k_index": index[1],
                "eb_endpoint_valid": eb_ok,
                "ea_endpoint_valid": ea_ok,
                "bernstein_degrees_xy": list(degrees),
                "bernstein_controls": len(control_rows),
                "negative_control_polynomials": sum(
                    not value for value in control_power_coefficients_nonnegative
                ),
                "minimum_control_at_t0": str(min(
                    sp.expand(control.subs(t, 0)) for control in control_rows
                )),
                "all_order_certificate": (
                    eb_ok and ea_ok and all(control_power_coefficients_nonnegative)
                ),
            })
        rows.append({
            "cutoff": cutoff,
            "all_cells_certified": all(
                row["all_order_certificate"] for row in cutoff_rows
            ),
            "cells": cutoff_rows,
        })

    report = {
        "marker": MARKER,
        "cutoffs": rows,
        "first_successful_cutoff": next(
            (row["cutoff"] for row in rows if row["all_cells_certified"]), None
        ),
        "status": "coarse exact bound probe; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "first_successful_cutoff": report["first_successful_cutoff"],
        "rows": [
            {
                "cutoff": row["cutoff"],
                "all_cells_certified": row["all_cells_certified"],
                "negative_controls": [
                    cell["negative_control_polynomials"] for cell in row["cells"]
                ],
                "endpoints": [
                    [cell["eb_endpoint_valid"], cell["ea_endpoint_valid"]]
                    for cell in row["cells"]
                ],
            }
            for row in rows
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
