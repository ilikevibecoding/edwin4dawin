#!/usr/bin/env python3
"""Exact low-motif diagnostic for the h+k=3 internal-ordinary g1 cells.

This substitutes the order/edge/wedge/four-vertex-subtree formulas for every
induced forest coefficient that occurs negatively on the second open
diagonal.  It is a diagnostic and makes no sign claim.
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
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_diagonal3_motif_diagnostic_root_20260830.json"
MARKER = "DIAGNOSE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_DIAGONAL3_MOTIF_ROOT"
CELLS = ((0, 3), (1, 2), (2, 1), (3, 0))


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def choose_polynomial(order, rank):
    if rank == 0:
        return sp.Integer(1)
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


def summary(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    negative = [
        (powers, value) for powers, value in polynomial.terms() if value < 0
    ]
    negative.sort(key=lambda item: (item[1], item[0]))
    stream = "".join(
        f"{powers}:{value};" for powers, value in polynomial.terms()
    )
    return {
        "variables": [str(variable) for variable in variables],
        "expression": sp.sstr(polynomial.as_expr()),
        "monomials": len(polynomial.terms()),
        "negative_monomials": len(negative),
        "minimum_scalar": str(min(polynomial.coeffs())),
        "negative_terms": [
            {"powers": list(powers), "coefficient": str(value)}
            for powers, value in negative
        ],
        "ordered_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


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

    faces = []
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
        cells = []
        for index in CELLS:
            partitioned = sp.expand(newton_cells[index].subs(partition_rules))
            motif = sp.expand(partitioned.subs(motif_rules))
            cells.append({
                "h_index": index[0],
                "k_index": index[1],
                "motif_polynomial": summary(motif),
            })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "cells": cells,
        })

    report = {
        "marker": MARKER,
        "degrees_h_k": list(degrees),
        "cells": [list(index) for index in CELLS],
        "statistics": {
            "A": [str(value) for value in astats],
            "B": [str(value) for value in bstats],
            "C": [str(value) for value in cstats],
            "D": [str(value) for value in dstats],
            "meaning": "n=order, e=edges, q=incident edge pairs, t=three-edge subtrees on four vertices",
        },
        "faces": faces,
        "status": "exact motif diagnostic; sign remains open",
        "scope": "Only the four h+k=3 cells of internal-spine ordinary-parent g1.",
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
                        "monomials": cell["motif_polynomial"]["monomials"],
                        "negative_monomials": cell["motif_polynomial"]["negative_monomials"],
                        "minimum_scalar": cell["motif_polynomial"]["minimum_scalar"],
                    }
                    for cell in face["cells"]
                ],
            }
            for face in faces
        ],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
