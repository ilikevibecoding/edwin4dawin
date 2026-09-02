#!/usr/bin/env python3
"""Mark-inclusion partition probe for large internal-ordinary g1 cells.

For the parent marked forest T=(E,P,V,W), write

    W=A, P=A+xB, V=A+xC,
    E=A+xB+xC+epsilon*x^2 D,

where epsilon is zero for adjacent parent marks and one otherwise.  This
script substitutes both epsilon faces into the 28 large-broom Newton cells
and records exact scalar-sign statistics.  It is diagnostic only unless a
cell is literally coefficientwise nonnegative.
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
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_parent_partition_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_PARENT_PARTITION_ROOT"


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


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
    reduced = sp.expand(expression.subs(substitutions))
    _degrees, coefficients = tensor_binomial(reduced, (h, k))

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    variables = tuple((*a[1:], *b[1:], *c[1:], *d[1:]))

    faces = []
    for epsilon in (0, 1):
        parent_rules = {}
        for rank in range(1, 7):
            parent_rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        face_rows = []
        for index, form in sorted(coefficients.items()):
            if form == 0:
                continue
            partitioned = sp.expand(form.subs(parent_rules))
            polynomial = sp.Poly(partitioned, *variables)
            scalar_coefficients = polynomial.coeffs()
            stream = "".join(
                f"{powers}:{value};" for powers, value in polynomial.terms()
            )
            face_rows.append({
                "h_index": index[0],
                "k_index": index[1],
                "monomials": len(polynomial.terms()),
                "negative_scalar_coefficients": sum(
                    int(value.is_negative is True) for value in scalar_coefficients
                ),
                "minimum_scalar_coefficient": str(min(scalar_coefficients)),
                "coefficientwise_nonnegative": all(
                    value.is_nonnegative is True for value in scalar_coefficients
                ),
                "term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
            })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "coefficientwise_nonnegative_cells": sum(
                row["coefficientwise_nonnegative"] for row in face_rows
            ),
            "forms": face_rows,
        })

    report = {
        "marker": MARKER,
        "partition": "W=A, P=A+xB, V=A+xC, E=A+xB+xC+epsilon*x^2D",
        "faces": faces,
        "scope": "Exact scalar-sign diagnostic only; negative scalar coefficients make no realizable sign claim.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": [
            {
                "epsilon": face["epsilon"],
                "coefficientwise_nonnegative_cells": face["coefficientwise_nonnegative_cells"],
                "unresolved_indices": [
                    [row["h_index"], row["k_index"]]
                    for row in face["forms"] if not row["coefficientwise_nonnegative"]
                ],
            }
            for face in faces
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
