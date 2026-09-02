#!/usr/bin/env python3
"""Exact relation diagnostics for the seven remaining small k0 parent forms."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression
from derive_iso_n5_g2_internal_ordinary_broom_parameters_rank5_g2_alt import stable_forms


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_small_k0_relations_analysis_root_20260830.json"
MARKER = "ANALYSIS_ISO_N5_G2_INTERNAL_ORDINARY_SMALL_K0_RELATIONS_ROOT"


def summary(form, variables):
    poly = sp.Poly(sp.expand(form), *variables)
    coeffs = poly.coeffs()
    return {
        "monomials": len(poly.terms()),
        "positive": sum(1 for value in coeffs if value > 0),
        "negative": sum(1 for value in coeffs if value < 0),
        "minimum": str(min(coeffs)) if coeffs else "0",
        "maximum": str(max(coeffs)) if coeffs else "0",
    }


def main():
    expression, rows = ordinary_expression()
    variables = tuple(
        symbol for name in ("E", "P", "V", "W") for symbol in rows[name][1:7]
    )
    k = sp.symbols("k", integer=True, nonnegative=True)
    forms = {}
    for ell in range(1, 8):
        xrow, urow, yrow, zrow = child_rows(ell, k)
        rules = {}
        for rank in range(1, 7):
            rules.update({
                rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
            })
        degree, coefficients = tensor_binomial(sp.expand(expression.subs(rules)), (k,))
        assert degree == (5,)
        forms[ell] = coefficients[(0,)]
    stable_degrees, stable_cells, stable_rows = stable_forms()
    assert stable_degrees == (5, 5)
    assert all(stable_rows[name] == rows[name] for name in rows)
    forms[8] = stable_cells[(0, 0)]

    rows_out = {str(ell): summary(form, variables) for ell, form in forms.items()}
    consecutive = []
    for ell in range(1, 8):
        forward = sp.expand(forms[ell + 1] - forms[ell])
        backward = -forward
        consecutive.append({
            "from_ell": ell,
            "to_ell": ell + 1,
            "next_minus_current": summary(forward, variables),
            "current_minus_next": summary(backward, variables),
        })

    # Exact vector ranks show whether a literal constant-coefficient transfer
    # among the eight path lengths can exist before adding forest inequalities.
    monomials = sorted({
        powers
        for form in forms.values()
        for powers, _coefficient in sp.Poly(form, *variables).terms()
    })
    matrix = sp.Matrix([
        [sp.Poly(forms[ell], *variables).coeff_monomial(powers) for ell in range(1, 9)]
        for powers in monomials
    ])
    report = {
        "marker": MARKER,
        "forms": rows_out,
        "consecutive_differences": consecutive,
        "joint_monomials": len(monomials),
        "eight_form_rank": matrix.rank(),
        "nullspace": [[str(value) for value in vector] for vector in matrix.nullspace()],
        "scope": "Exact relation diagnostics only; no sign claim.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
