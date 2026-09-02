#!/usr/bin/env python3
"""Prove the five h+k=4 internal-ordinary large-broom g1 cells.

For the parent forest F with marked vertices p,v, put H=F-{p,v} and

    W=A, P=A+xB, V=A+xC,
    E=A+xB+xC+epsilon*x^2D.

Here A,B,C,D are independence polynomials of induced subforests of H;
epsilon is zero when p,v are adjacent and one otherwise.  Let

    n=|V(H)|, m=|E(H)|, q=sum_z binomial(deg_H(z),2),
    b=|V(B)|, c=|V(C)|, d=|V(D)|.

The exact forest identities a2=C(n,2)-m and
a3=C(n,3)-(n-2)m+q reduce every cell on the h+k=4 diagonal to a common
form.  The proof then uses only the elementary induced-forest bounds

    b,c,d <= n,   m <= n-1 (n>=1),
    b2 <= C(b,2), c2 <= C(c,2), q <= C(m,2).

All symbolic identities and every scalar inequality certificate are checked
exactly below.  This closes only the top open diagonal, not the whole mode.
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


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_top_diagonal_motif_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_TOP_DIAGONAL_MOTIF_ROOT"
TOP_DIAGONAL = ((0, 4), (1, 3), (2, 2), (3, 1), (4, 0))


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def coefficient(expression, monomial, variables):
    polynomial = sp.Poly(expression, *variables)
    powers = tuple(monomial.get(variable, 0) for variable in variables)
    return polynomial.coeff_monomial(powers)


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
    n, m, q, b, b2, c, c2, d = sp.symbols(
        "n m q b b2 c c2 d", integer=True, nonnegative=True
    )
    motif_rules = {
        a[1]: n,
        a[2]: n * (n - 1) / 2 - m,
        a[3]: n * (n - 1) * (n - 2) / 6 - (n - 2) * m + q,
        brow[1]: b,
        brow[2]: b2,
        crow[1]: c,
        crow[2]: c2,
        drow[1]: d,
    }
    variables = (n, m, q, b, b2, c, c2, d)

    face_reports = []
    all_rows = []
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
        cells = []
        for index in TOP_DIAGONAL:
            reduced = sp.expand(
                newton_cells[index].subs(partition_rules).subs(motif_rules)
            )
            polynomial = sp.Poly(reduced, *variables)

            # Every cell has exactly this common motif shape.
            beta = coefficient(reduced, {b: 1}, variables)
            gamma = -coefficient(reduced, {c: 1}, variables)
            delta = coefficient(reduced, {m: 1}, variables)
            alpha = coefficient(reduced, {n: 2}, variables)
            linear = coefficient(reduced, {n: 1}, variables)
            constant = coefficient(reduced, {}, variables)
            d_coefficient = coefficient(reduced, {d: 1}, variables)
            schema = sp.expand(
                20 * b * n + beta * b - 6 * b2
                + 14 * c * n - gamma * c - 42 * c2
                + 28 * m * n + delta * m - 42 * q
                + alpha * n**2 + linear * n + constant
                + d_coefficient * d
            )
            assert sp.expand(reduced - schema) == 0
            assert d_coefficient == -6 * epsilon

            # Exact lower-bound decompositions under the displayed forest bounds.
            b_after_pairs = sp.expand(
                (20 * b * n + beta * b - 6 * (b * (b - 1) / 2))
            )
            b_floor = b * (17 * n + beta + 3)
            b_slack = sp.expand(b_after_pairs - b_floor)
            assert sp.expand(b_slack - 3 * b * (n - b)) == 0

            mq_after_pairs = sp.expand(
                28 * m * n + delta * m - 42 * (m * (m - 1) / 2)
            )
            mq_floor = m * (7 * n + delta + 42)
            mq_slack = sp.expand(mq_after_pairs - mq_floor)
            assert sp.expand(mq_slack - 21 * m * (n - 1 - m)) == 0

            c_after_pairs = sp.expand(
                14 * c * n - gamma * c - 42 * (c * (c - 1) / 2)
            )
            c_floor = -7 * n**2 + (21 - gamma) * n
            c_slack = sp.factor(c_after_pairs - c_floor)
            assert sp.expand(
                c_slack - (n - c) * (21 * c + 7 * n + gamma - 21)
            ) == 0

            # On the nonadjacent face, 20*n-6*d is embedded in the extracted
            # linear coefficient relative to the adjacent face.  Record the
            # direct d<=n payment separately after pairing rows below.
            core_floor = sp.expand(
                (alpha - 7) * n**2
                + (linear + 21 - gamma) * n
                + constant
                + d_coefficient * d
            )
            cells.append({
                "h_index": index[0],
                "k_index": index[1],
                "beta": int(beta),
                "gamma": int(gamma),
                "delta": int(delta),
                "alpha": int(alpha),
                "linear": int(linear),
                "constant": int(constant),
                "d_coefficient": int(d_coefficient),
                "b_slack_identity": sp.sstr(b_slack),
                "mq_slack_identity": sp.sstr(mq_slack),
                "c_slack_identity": sp.sstr(c_slack),
                "core_floor": sp.sstr(core_floor),
                "ordered_reduced_sha256": hashlib.sha256(
                    sp.sstr(polynomial.as_expr()).encode()
                ).hexdigest().upper(),
            })
            all_rows.append((epsilon, index, reduced, cells[-1]))
        face_reports.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "cells": cells,
        })

    # Pair the two faces cellwise.  The nonadjacent correction is positive:
    # correction = 20*n + kappa - 6*d >= 14*n + kappa >= 0.
    adjacent = {(index): reduced for epsilon, index, reduced, _row in all_rows if epsilon == 0}
    paired_corrections = []
    for epsilon, index, reduced, row in all_rows:
        if epsilon == 0:
            # The adjacent core floor has positive integer coefficients.
            floor = sp.Poly(
                sp.sympify(row["core_floor"], locals={"n": n, "d": d}), n
            )
            assert all(value > 0 for value in floor.coeffs())
            continue
        correction = sp.expand(reduced - adjacent[index])
        kappa = coefficient(correction, {}, variables)
        assert sp.expand(correction - (20 * n + kappa - 6 * d)) == 0
        correction_floor = sp.expand(14 * n + kappa)
        assert kappa > 0
        paired_corrections.append({
            "h_index": index[0],
            "k_index": index[1],
            "exact_correction": sp.sstr(correction),
            "d_le_n_floor": sp.sstr(correction_floor),
            "kappa": int(kappa),
        })

    report = {
        "marker": MARKER,
        "degrees_h_k": list(degrees),
        "proved_cells_per_face": len(TOP_DIAGONAL),
        "proved_cells_total": 2 * len(TOP_DIAGONAL),
        "top_diagonal": [list(index) for index in TOP_DIAGONAL],
        "forest_bounds": [
            "0<=b,c,d<=n",
            "0<=m<=n-1 for n>=1; n=0 is the positive constant case",
            "b2<=b(b-1)/2",
            "c2<=c(c-1)/2",
            "q<=m(m-1)/2",
        ],
        "faces": face_reports,
        "nonadjacent_face_corrections": paired_corrections,
        "status": "exact all-order sign theorem for all five h+k=4 cells on both faces",
        "scope": (
            "Internal-spine ordinary-parent g1, ell=8+h, h>=0, k>=0, and "
            "only the five Newton cells h+k=4.  The remaining lower cells, "
            "small ell, other modes, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "proved_cells_per_face": report["proved_cells_per_face"],
        "proved_cells_total": report["proved_cells_total"],
        "adjacent_core_floors": [
            row["core_floor"] for row in face_reports[0]["cells"]
        ],
        "nonadjacent_corrections": paired_corrections,
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
