#!/usr/bin/env python3
"""Exact large-parent proof for all seven small-broom k=3 rows.

For |A|=n>=10 this proves every ell=1..7 row on both parent-mark faces.  It uses
the exact order/edge/wedge/four-vertex-subtree formulas for forest independent
sets, elementary induced-subforest bounds, and a two-variable exact Bernstein
certificate for the remaining order polynomial.  Orders n<10 are separate.
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
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from explore_rank4_three_halves_grouped import tensor_bernstein_fast


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k3_large_order_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K3_LARGE_ORDER_ROOT"
CELLS = tuple((ell, 3) for ell in range(1, 8))
CUTOFF = 10


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def choose_polynomial(order, rank):
    product = sp.Integer(1)
    for offset in range(rank):
        product *= order - offset
    return sp.expand(product / sp.factorial(rank))


def forest_rows(prefix, maximum):
    order, edges, wedges, trees4 = sp.symbols(
        f"n{prefix} e{prefix} q{prefix} t{prefix}", integer=True, nonnegative=True
    )
    row = [sp.Integer(1), order]
    if maximum >= 2:
        row.append(sp.expand(choose_polynomial(order, 2) - edges))
    if maximum >= 3:
        row.append(sp.expand(
            choose_polynomial(order, 3) - (order - 2) * edges + wedges
        ))
    if maximum >= 4:
        row.append(sp.expand(
            choose_polynomial(order, 4)
            - edges * choose_polynomial(order - 2, 2)
            + wedges * (order - 4)
            + edges * (edges - 1) / 2
            - trees4
        ))
    return tuple(row), (order, edges, wedges, trees4)


def exact_cells():
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    targets = {}
    for ell in range(1, 8):
        xrow, urow, yrow, zrow = child_rows(ell, k)
        child_rules = {}
        for rank in range(1, 7):
            child_rules.update({
                rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
            })
        degrees, coefficients = tensor_binomial(
            sp.expand(expression.subs(child_rules)), (k,)
        )
        assert degrees == (6,)
        targets[(ell, 3)] = coefficients[(3,)]

    araw = (sp.Integer(1), *sp.symbols("a1:7"))
    braw = (sp.Integer(1), *sp.symbols("b1:6"))
    craw = (sp.Integer(1), *sp.symbols("c1:6"))
    draw = (sp.Integer(1), *sp.symbols("d1:5"))
    arow, astats = forest_rows("a", 4)
    brow, bstats = forest_rows("b", 3)
    crow, cstats = forest_rows("c", 3)
    drow, dstats = forest_rows("d", 2)
    motif_rules = {}
    for raw, motif in ((araw, arow), (braw, brow), (craw, crow), (draw, drow)):
        motif_rules.update({raw[index]: value for index, value in enumerate(motif)})

    faces = {}
    for epsilon in (0, 1):
        partition_rules = {}
        for rank in range(1, 7):
            partition_rules.update({
                rows["W"][rank]: at(araw, rank),
                rows["P"][rank]: at(araw, rank) + at(braw, rank - 1),
                rows["V"][rank]: at(araw, rank) + at(craw, rank - 1),
                rows["E"][rank]: (
                    at(araw, rank) + at(braw, rank - 1) + at(craw, rank - 1)
                    + epsilon * at(draw, rank - 2)
                ),
            })
        faces[epsilon] = {
            index: sp.expand(target.subs(partition_rules).subs(motif_rules))
            for index, target in targets.items()
        }
    return faces, astats, bstats, cstats, dstats

def main() -> None:
    faces, astats, bstats, cstats, dstats = exact_cells()
    na, ea, qa, ta = astats
    nb, eb, qb, _tb = bstats
    nc, ec, qc, _tc = cstats
    nd, ed, _qd, _td = dstats
    x, y, t = sp.symbols("x y t", nonnegative=True)

    adjacent_rows = []
    for index, expression in faces[0].items():
        # q counts incident edge pairs, hence q<=C(e,2); the three q
        # coefficients are negative for n>=10.  The four-vertex-subtree
        # coefficient is positive.
        assert sp.diff(expression, qa) == -42 * na + sp.diff(expression, qa).subs(na, 0)
        assert sp.diff(expression, qa).subs(na, CUTOFF) < 0
        assert sp.diff(expression, qb) == -16
        assert sp.diff(expression, qc) == -36
        assert sp.diff(expression, ta) == 36
        lowered = sp.expand(expression.subs({
            qa: ea * (ea - 1) / 2,
            qb: eb * (eb - 1) / 2,
            qc: ec * (ec - 1) / 2,
            ta: 0,
        }))

        # C-edge block: ec*(6n+36c+K+18-18ec), nonnegative because ec<=c.
        without_ec = sp.expand(lowered.subs(ec, 0))
        ec_block = sp.factor(lowered - without_ec)
        ec_quotient = sp.factor(ec_block / ec)
        ec_floor = sp.expand(ec_quotient.subs(ec, nc))
        assert all(value > 0 for value in sp.Poly(ec_floor, na, nc).coeffs())

        # B-edge block is concave on 0<=eb<=nb.  Its value at eb=nb is the
        # lower endpoint for n>=10.  The quotient below proves this exactly.
        without_eb = sp.expand(without_ec.subs(eb, 0))
        eb_block = sp.factor(without_ec - without_eb)
        eb_endpoint = sp.expand(eb_block.subs(eb, nb))
        eb_difference = sp.factor(eb_block - eb_endpoint)
        eb_quotient = sp.factor(eb_difference / (nb - eb))
        eb_floor = sp.expand(
            eb_quotient.subs({eb: 0, nb: na}).subs(na, CUTOFF + t)
        )
        assert all(value >= 0 for value in sp.Poly(eb_floor, t).all_coeffs())

        # A-edge block is concave on 0<=ea<=na-1.  Its value at ea=na-1 is
        # the lower endpoint.  The quotient is minimized at ea=nb=nc=0.
        base = sp.expand(without_eb + eb_endpoint)
        without_ea = sp.expand(base.subs(ea, 0))
        ea_block = sp.factor(base - without_ea)
        ea_endpoint = sp.expand(ea_block.subs(ea, na - 1))
        ea_difference = sp.factor(ea_block - ea_endpoint)
        ea_quotient = sp.factor(ea_difference / (na - 1 - ea))
        ea_origin = sp.expand(ea_quotient.subs({ea: 0, nb: 0, nc: 0}))
        ea_delta = sp.Poly(sp.expand(ea_quotient - ea_origin), ea, nb, nc)
        ea_delta_cutoff_coefficients = [
            sp.Poly(sp.expand(value.subs(na, CUTOFF + t)), t).all_coeffs()
            for value in ea_delta.coeffs()
        ]
        assert all(
            coefficient >= 0
            for row in ea_delta_cutoff_coefficients
            for coefficient in row
        )
        ea_floor = sp.expand(ea_origin.subs(na, CUTOFF + t))
        assert all(value >= 0 for value in sp.Poly(ea_floor, t).all_coeffs())

        order_lower = sp.expand(without_ea + eb_endpoint + ea_endpoint)
        normalized = sp.expand(
            order_lower.subs({nb: na * x, nc: na * y}).subs(na, CUTOFF + t)
        )
        degrees, controls = tensor_bernstein_fast(normalized, (x, y))
        control_rows = list(controls.flat)
        power_rows = [
            sp.Poly(control, t).all_coeffs() for control in control_rows
        ]
        assert all(value >= 0 for row in power_rows for value in row)
        stream = "".join(
            f"{position}:{sp.sstr(value)};"
            for position, value in enumerate(control_rows)
        )
        adjacent_rows.append({
            "ell": index[0],
            "k_index": index[1],
            "ec_floor": sp.sstr(ec_floor),
            "eb_endpoint_difference_quotient": sp.sstr(eb_quotient),
            "eb_cutoff_floor": sp.sstr(eb_floor),
            "ea_endpoint_difference_quotient": sp.sstr(ea_quotient),
            "ea_cutoff_floor": sp.sstr(ea_floor),
            "bernstein_degrees_order_fractions": list(degrees),
            "bernstein_controls": len(control_rows),
            "minimum_control_at_cutoff": str(min(
                sp.expand(control.subs(t, 0)) for control in control_rows
            )),
            "minimum_power_coefficient": str(min(
                value for row in power_rows for value in row
            )),
            "bernstein_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        })

    # The nonadjacent face differs by an explicitly positive correction.
    # Its floor uses ea<=na and nd<=na; all omitted terms are nonnegative.
    nonadjacent_rows = []
    for index in CELLS:
        correction = sp.expand(faces[1][index] - faces[0][index])
        polynomial = sp.Poly(correction, na, ea, nc, nd, ed)
        lambda_n = polynomial.coeff_monomial((1, 0, 0, 0, 0))
        rho = -polynomial.coeff_monomial((0, 0, 0, 1, 0))
        constant = polynomial.coeff_monomial((0, 0, 0, 0, 0))
        floor = sp.expand(5 * na**2 + (lambda_n - 10 - rho) * na + constant)
        slack = sp.expand(correction - floor)
        expected_slack = sp.expand(
            10 * (na - ea)
            + rho * (na - nd)
            + 10 * nc
            + 16 * ed
            + 2 * na * nd
            + 8 * nd * (na - nd)
        )
        assert sp.expand(slack - expected_slack) == 0
        assert all(value > 0 for value in sp.Poly(floor, na).coeffs())
        nonadjacent_rows.append({
            "ell": index[0],
            "k_index": index[1],
            "exact_correction": sp.sstr(correction),
            "nonnegative_slack_decomposition": sp.sstr(expected_slack),
            "positive_floor": sp.sstr(floor),
        })

    report = {
        "marker": MARKER,
        "cutoff_A_order": CUTOFF,
        "small_lengths": [1, 7],
        "k_index": 3,
        "cells_per_face": len(CELLS),
        "proved_cells_total": 2 * len(CELLS),
        "forest_bounds": [
            "0<=|B|,|C|,|D|<=n",
            "0<=e_A<=n-1 and 0<=e_B<=|B|, 0<=e_C<=|C|",
            "q_X<=e_X(e_X-1)/2 for X=A,B,C",
        ],
        "adjacent_face": adjacent_rows,
        "nonadjacent_correction": nonadjacent_rows,
        "status": "exact large-parent theorem for n>=10 on all seven small-broom k=3 rows and both faces",
        "scope": (
            "Internal-spine/broom ordinary-parent g1, ell=1..7, integer "
            "collision-leaf count, parent remainder order n>=10, and only "
            "k-Newton index 3. The finite n<10 base, indices 0..2, other "
            "modes, and the full conjecture remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "cutoff_A_order": CUTOFF,
        "proved_cells_total": report["proved_cells_total"],
        "adjacent_minima": [
            {
                "index": [row["ell"], row["k_index"]],
                "control_at_cutoff": row["minimum_control_at_cutoff"],
                "power_coefficient": row["minimum_power_coefficient"],
            }
            for row in adjacent_rows
        ],
        "nonadjacent_floors": [row["positive_floor"] for row in nonadjacent_rows],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
