#!/usr/bin/env python3
"""Exact motif reduction for the five top open internal-ordinary g1 cells.

The large-broom Newton cells with h+k=4 are the first unresolved diagonal
after the mark-inclusion partition

    W=A, P=A+xB, V=A+xC,
    E=A+xB+xC+epsilon*x^2 D.

This script records their complete exact parent-side polynomials and then
substitutes the universal order/edge/wedge identities for the first three
coefficients of the forest polynomial A:

    a1=n,
    a2=C(n,2)-m,
    a3=C(n,3)-(n-2)m+q,

where m is the number of edges and q=sum_v C(deg(v),2).  The output is an
algebraic reduction only; no sign theorem is asserted unless every remaining
scalar coefficient is nonnegative in an explicitly declared cone.
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
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_top_diagonal_motif_root_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_TOP_DIAGONAL_MOTIF_ROOT"
TOP_DIAGONAL = ((0, 4), (1, 3), (2, 2), (3, 1), (4, 0))


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def polynomial_summary(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    terms = polynomial.terms()
    stream = "".join(f"{powers}:{value};" for powers, value in terms)
    negative = [
        {"powers": list(powers), "coefficient": str(value)}
        for powers, value in terms if value < 0
    ]
    return {
        "expression": sp.sstr(polynomial.as_expr()),
        "monomials": len(terms),
        "negative_scalar_coefficients": len(negative),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "negative_terms": negative,
        "ordered_term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
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
    degrees, coefficients = tensor_binomial(
        sp.expand(expression.subs(child_rules)), (h, k)
    )
    assert degrees == (6, 6)

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    n, m, q = sp.symbols("n m q", integer=True, nonnegative=True)
    motif_rules = {
        a[1]: n,
        a[2]: n * (n - 1) / 2 - m,
        a[3]: n * (n - 1) * (n - 2) / 6 - (n - 2) * m + q,
    }

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
        base_variables = tuple((*a[1:], *b[1:], *c[1:], *(d[1:] if epsilon else ())))
        motif_variables = tuple((n, m, q, *a[4:], *b[1:], *c[1:], *(d[1:] if epsilon else ())))
        cells = []
        for index in TOP_DIAGONAL:
            partitioned = sp.expand(coefficients[index].subs(partition_rules))
            motif = sp.expand(partitioned.subs(motif_rules))
            cells.append({
                "h_index": index[0],
                "k_index": index[1],
                "partition_polynomial": polynomial_summary(partitioned, base_variables),
                "a_order_edge_wedge_polynomial": polynomial_summary(motif, motif_variables),
            })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "cells": cells,
        })

    report = {
        "marker": MARKER,
        "degrees_h_k": list(degrees),
        "top_diagonal": [list(index) for index in TOP_DIAGONAL],
        "motif_substitution": {
            "a1": "n",
            "a2": "binomial(n,2)-m",
            "a3": "binomial(n,3)-(n-2)m+q",
            "meaning": "n=|V(A)|, m=|E(A)|, q=sum_v binomial(deg_A(v),2)",
        },
        "faces": faces,
        "status": "exact algebraic motif reduction; sign remains open",
        "scope": (
            "Five h+k=4 large-broom cells in internal-spine ordinary-parent g1 only. "
            "No sign theorem, other cells, other modes, or full conjecture is asserted."
        ),
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
                        "partition_negative": cell["partition_polynomial"]["negative_scalar_coefficients"],
                        "motif_negative": cell["a_order_edge_wedge_polynomial"]["negative_scalar_coefficients"],
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
