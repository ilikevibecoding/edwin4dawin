#!/usr/bin/env python3
"""Exact n>=10 theorem for all seven small-broom k=2 rows.

After exact rank-2/A-rank-3 forest substitutions, every still-occurring high
independent-set coefficient has a negative scalar coefficient.  It is bounded
above by the half-and-half blend of two elementary counting bounds:

* the edge-incidence multiplicity bound;
* the two-term Bonferroni edge-event bound.

Both are valid upper bounds, hence so is their average.  The remaining lower
polynomial is certified on a normalized forest-statistics box by exact tensor
Bernstein coefficients after n=10+t.  Orders n<10 are separate.
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
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k2_large_order_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K2_LARGE_ORDER_ROOT"
CELLS = tuple((ell, 2) for ell in range(1, 8))
CUTOFF = 10
THETA = sp.Rational(1, 2)


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


def multiplicity_upper(order, edges, rank):
    return sp.expand(
        choose_polynomial(order, rank)
        - edges * choose_polynomial(order - 2, rank - 2)
        / sp.binomial(rank, 2)
    )


def bonferroni_upper(order, edges, wedges, rank):
    return sp.expand(
        choose_polynomial(order, rank)
        - edges * choose_polynomial(order - 2, rank - 2)
        + wedges * choose_polynomial(order - 3, rank - 3)
        + (edges * (edges - 1) / 2 - wedges)
        * choose_polynomial(order - 4, rank - 4)
    )


def main() -> None:
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    newton_cells = {}
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
        newton_cells[(ell, 2)] = coefficients[(2,)]

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    brow = (sp.Integer(1), *sp.symbols("b1:6"))
    crow = (sp.Integer(1), *sp.symbols("c1:6"))
    drow = (sp.Integer(1), *sp.symbols("d1:5"))
    n, nb, nc, nd = sp.symbols("n nb nc nd", integer=True, nonnegative=True)
    ea, qa, eb, ec, ed = sp.symbols(
        "ea qa eb ec ed", integer=True, nonnegative=True
    )
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
    edge_by_row = {a: ea, brow: eb, crow: ec, drow: ed}
    remaining = {}
    for row, order, start in (
        (a, n, 4), (brow, nb, 3), (crow, nc, 3), (drow, nd, 3)
    ):
        for rank in range(start, len(row)):
            remaining[row[rank]] = (order, edge_by_row[row], rank)
    remaining_variables = tuple(remaining)
    base_variables = (n, nb, nc, nd, ea, qa, eb, ec, ed)
    all_variables = (*base_variables, *remaining_variables)
    x, y, z, u, v, s, w, r, t = sp.symbols(
        "x y z u v s w r t", nonnegative=True
    )

    face_reports = []
    total_controls = total_zeros = 0
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
        cell_reports = []
        for index in CELLS:
            exact = sp.Poly(
                sp.expand(newton_cells[index].subs(partition_rules).subs(low_rules)),
                *all_variables,
            )
            lower = sp.Integer(0)
            bounded_negative = retained = 0
            for powers, coefficient in exact.terms():
                remaining_powers = powers[len(base_variables):]
                contains_remaining = any(remaining_powers)
                # This exact structural fact avoids needing lower bounds for
                # high coefficients or multiplying possibly signed relaxations.
                assert not (coefficient > 0 and contains_remaining)
                term = coefficient
                for variable, power in zip(base_variables, powers[:len(base_variables)]):
                    term *= variable**power
                for variable, power in zip(remaining_variables, remaining_powers):
                    if not power:
                        continue
                    order, edges, rank = remaining[variable]
                    wedges = qa if order == n else edges * (edges - 1) / 2
                    upper = sp.expand(
                        THETA * multiplicity_upper(order, edges, rank)
                        + (1 - THETA) * bonferroni_upper(
                            order, edges, wedges, rank
                        )
                    )
                    term *= upper**power
                if coefficient < 0 and contains_remaining:
                    bounded_negative += 1
                else:
                    retained += 1
                lower += term
            assert bounded_negative > 0
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
            shifted = sp.expand(normalized.subs(n, CUTOFF + t))
            bernstein_degrees, controls = tensor_bernstein_fast(shifted, box)
            control_rows = list(controls.flat)
            power_rows = [sp.Poly(value, t).all_coeffs() for value in control_rows]
            assert all(value >= 0 for row in power_rows for value in row)
            zero_count = sum(value == 0 for row in power_rows for value in row)
            coefficient_count = sum(len(row) for row in power_rows)
            stream = "".join(
                f"{position}:{sp.sstr(value)};"
                for position, value in enumerate(control_rows)
            )
            cell_reports.append({
                "ell": index[0],
                "k_index": index[1],
                "bounded_negative_high_coefficient_monomials": bounded_negative,
                "retained_low_motif_monomials": retained,
                "normalized_box_variables": [str(value) for value in box],
                "bernstein_degrees": list(bernstein_degrees),
                "bernstein_controls": len(control_rows),
                "power_coefficients": coefficient_count,
                "zero_power_coefficients": zero_count,
                "minimum_power_coefficient": str(min(
                    value for row in power_rows for value in row
                )),
                "control_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
            })
            total_controls += len(control_rows)
            total_zeros += zero_count
        face_reports.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "cells": cell_reports,
        })

    report = {
        "marker": MARKER,
        "cutoff_A_order": CUTOFF,
        "small_lengths": [1, 7],
        "k_index": 2,
        "blend_theta": str(THETA),
        "cells": [list(index) for index in CELLS],
        "proved_cells_total": 2 * len(CELLS),
        "upper_bounds": {
            "multiplicity": (
                "Each edge occurs in C(n-2,r-2) r-sets and each bad r-set "
                "contains at most C(r,2) edges."
            ),
            "bonferroni": (
                "Two-term inclusion-exclusion over edge events, splitting "
                "incident and disjoint edge pairs."
            ),
            "blend": "The average of two valid upper bounds is a valid upper bound.",
        },
        "normalized_constraints": [
            "0<=nb,nc,nd<=n",
            "0<=ea<=n, 0<=eb<=nb, 0<=ec<=nc, 0<=ed<=nd",
            "0<=qa<=ea^2/2",
        ],
        "faces": face_reports,
        "aggregate_Bernstein_controls": total_controls,
        "aggregate_zero_power_coefficients": total_zeros,
        "status": "exact large-parent theorem for n>=10 on all seven small-broom k=2 rows and both faces",
        "scope": (
            "Internal-spine/broom ordinary-parent g1, ell=1..7, integer "
            "collision-leaf count, parent remainder order n>=10, and only "
            "k-Newton index 2. The finite n<10 base, indices 0..1, other "
            "modes, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "cutoff_A_order": CUTOFF,
        "blend_theta": str(THETA),
        "proved_cells_total": report["proved_cells_total"],
        "aggregate_Bernstein_controls": total_controls,
        "cells": [
            {
                "geometry": face["geometry"],
                "rows": [
                    {
                        "index": [row["ell"], row["k_index"]],
                        "controls": row["bernstein_controls"],
                        "minimum": row["minimum_power_coefficient"],
                    }
                    for row in face["cells"]
                ],
            }
            for face in face_reports
        ],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()


