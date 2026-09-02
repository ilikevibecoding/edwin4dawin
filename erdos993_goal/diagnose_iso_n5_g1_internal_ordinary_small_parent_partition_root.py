#!/usr/bin/env python3
"""Exact partition-coordinate sign diagnostic for ell=1,...,7."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_parent_partition_diagnostic_root_20260830.json"
MARKER = "DIAGNOSTIC_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_PARENT_PARTITION_ROOT"


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def main() -> None:
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
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
        forms = []
        for ell in range(1, 8):
            xrow, urow, yrow, zrow = child_rows(ell, k)
            child_rules = {}
            for rank in range(1, 7):
                child_rules.update({
                    rows["X"][rank]: xrow[rank],
                    rows["U"][rank]: urow[rank],
                    rows["Y"][rank]: yrow[rank],
                    rows["Z"][rank]: zrow[rank],
                })
            _degree, coefficients = tensor_binomial(
                sp.expand(expression.subs(child_rules)), (k,)
            )
            for index, form in sorted(coefficients.items()):
                if form == 0:
                    continue
                polynomial = sp.Poly(sp.expand(form.subs(rules)), *variables)
                coefficients_scalar = tuple(polynomial.coeffs())
                stream = "".join(
                    f"{powers}:{value};" for powers, value in polynomial.terms()
                )
                forms.append({
                    "ell": ell,
                    "k_index": index[0],
                    "monomials": len(polynomial.terms()),
                    "negative_scalar_coefficients": sum(
                        int(value.is_negative is True)
                        for value in coefficients_scalar
                    ),
                    "minimum_scalar_coefficient": str(min(coefficients_scalar)),
                    "coefficientwise_nonnegative": all(
                        value.is_nonnegative is True
                        for value in coefficients_scalar
                    ),
                    "term_stream_sha256": hashlib.sha256(
                        stream.encode()
                    ).hexdigest().upper(),
                })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "coefficientwise_nonnegative_forms": sum(
                row["coefficientwise_nonnegative"] for row in forms
            ),
            "forms": forms,
        })
    report = {
        "marker": MARKER,
        "partition": "W=A, P=A+xB, V=A+xC, E=A+xB+xC+epsilon*x^2D",
        "faces": faces,
        "status": "exact diagnostic; only literal coefficientwise rows are certified",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": [
            {
                "epsilon": face["epsilon"],
                "coefficientwise_nonnegative_forms": face[
                    "coefficientwise_nonnegative_forms"
                ],
                "unresolved": [
                    [row["ell"], row["k_index"]]
                    for row in face["forms"]
                    if not row["coefficientwise_nonnegative"]
                ],
            }
            for face in faces
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
