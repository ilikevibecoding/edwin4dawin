#!/usr/bin/env python3
"""Extract exact negative partition monomials in the 15 open low cells.

This is a diagnostic, not a sign theorem.  It records which mark-inclusion
blocks and coefficient ranks occur in the negative scalar terms after the
ell=8+h, k Newton reduction.  The result identifies the graph-structural
relations a successful cone must encode.
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
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_low_cell_obstructions_diagnostic_root_20260830.json"
MARKER = "DIAGNOSE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW_CELL_OBSTRUCTIONS_ROOT"
OPEN = tuple(
    (left, right)
    for left in range(5)
    for right in range(5 - left)
)


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def monomial_name(variables, powers):
    factors = []
    for variable, power in zip(variables, powers):
        if not power:
            continue
        factors.append(str(variable) if power == 1 else f"{variable}^{power}")
    return "*".join(factors) if factors else "1"


def main() -> None:
    expression, rows = ordinary_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    substitutions = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        substitutions.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    degrees, coefficients = tensor_binomial(
        sp.expand(expression.subs(substitutions)), (h, k)
    )
    assert degrees == (6, 6)
    assert all(index in coefficients for index in OPEN)

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    faces = []
    for epsilon in (0, 1):
        rules = {}
        for rank in range(1, 7):
            rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        variables = tuple((*a[1:], *b[1:], *c[1:], *(d[1:] if epsilon else ())))
        rows_report = []
        aggregate_support = {}
        for index in OPEN:
            polynomial = sp.Poly(
                sp.expand(coefficients[index].subs(rules)), *variables
            )
            negative = [
                (powers, value)
                for powers, value in polynomial.terms() if value < 0
            ]
            negative.sort(key=lambda item: (item[1], item[0]))
            block_patterns = {}
            for powers, value in negative:
                blocks = (
                    sum(powers[:6]),
                    sum(powers[6:11]),
                    sum(powers[11:16]),
                    sum(powers[16:]) if epsilon else 0,
                )
                label = f"A{blocks[0]}B{blocks[1]}C{blocks[2]}D{blocks[3]}"
                block_patterns[label] = block_patterns.get(label, 0) + 1
                aggregate_support[label] = aggregate_support.get(label, 0) + 1
            rows_report.append({
                "h_index": index[0],
                "k_index": index[1],
                "total_monomials": len(polynomial.terms()),
                "negative_monomials": len(negative),
                "minimum_scalar": str(min(value for _powers, value in negative)),
                "negative_block_patterns": block_patterns,
                "ten_most_negative_terms": [
                    {
                        "coefficient": str(value),
                        "monomial": monomial_name(variables, powers),
                        "powers": list(powers),
                    }
                    for powers, value in negative[:10]
                ],
            })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "aggregate_negative_block_patterns": aggregate_support,
            "rows": rows_report,
        })

    report = {
        "marker": MARKER,
        "degrees_h_k": list(degrees),
        "open_indices": [list(index) for index in OPEN],
        "faces": faces,
        "status": "exact negative-term diagnostic; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": [
            {
                "geometry": face["geometry"],
                "aggregate_negative_block_patterns": face[
                    "aggregate_negative_block_patterns"
                ],
                "cell_summaries": [
                    {
                        key: row[key]
                        for key in (
                            "h_index", "k_index", "negative_monomials",
                            "minimum_scalar", "negative_block_patterns",
                        )
                    }
                    for row in face["rows"]
                ],
            }
            for face in faces
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
