#!/usr/bin/env python3
"""Probe the sole stable internal-endpoint g2 origin form in an augmented cone."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from audit_iso_n5_g1_internal_endpoint_all_forest_independent_rank5_g2_alt import (
    independent_parent_basis,
)
from derive_iso_n5_g2_internal_endpoint_broom_factor_rank5_g2_alt import endpoint_expression
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_endpoint_origin_augmented_cone_probe_rank5_g2_alt_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G2_INTERNAL_ENDPOINT_ORIGIN_AUGMENTED_CONE_RANK5_G2_ALT"


def vector(expression, variables, monomials):
    data = dict(sp.Poly(sp.expand(expression), *variables).terms())
    return [sp.Rational(data.get(monomial, 0)) for monomial in monomials]


def origin_form():
    expression, rows = endpoint_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    rules = {}
    for rank in range(1, 7):
        u = isolate_times_path(k, ell - 1, rank)
        x = sp.expand(u + path_coefficient(ell - 2, rank - 1))
        z = isolate_times_path(k, ell - 2, rank)
        y = sp.expand(z + path_coefficient(ell - 3, rank - 1))
        rules.update({rows["X"][rank]: x, rows["U"][rank]: u,
                      rows["Y"][rank]: y, rows["Z"][rank]: z})
    _degrees, coefficients = tensor_binomial(sp.expand(expression.subs(rules)), (h, k))
    return sp.expand(coefficients[(0, 0)]), rows


def main():
    form, rows = origin_form()
    variables, basis = independent_parent_basis(rows)
    basis_labels = [label for label, _value in basis]
    basis_values = [value for _label, value in basis]
    monomial_set = set(sp.Poly(form, *variables).monoms())
    for value in basis_values:
        monomial_set.update(sp.Poly(value, *variables).monoms())
    monomials = sorted(monomial_set, reverse=True)
    target = vector(form, variables, monomials)
    columns = [vector(value, variables, monomials) for value in basis_values]
    A = np.array([[float(column[row]) for column in columns] for row in range(len(monomials))])
    b = np.array([float(value) for value in target])
    solution = linprog(c=np.zeros(len(basis)), A_ub=A, b_ub=b,
                       bounds=[(0, None)] * len(basis), method="highs")
    record = {"floating_feasible": bool(solution.success), "exact_rational_certificate": False}
    if solution.success:
        weights = [
            sp.Rational(Fraction(float(value)).limit_denominator(100_000))
            for value in solution.x
        ]
        residual = sp.expand(form - sum(w * value for w, value in zip(weights, basis_values)))
        polynomial = sp.Poly(residual, *variables)
        if all(w >= 0 for w in weights) and all(value >= 0 for value in polynomial.coeffs()):
            stream = "".join(f"{powers}:{value};" for powers, value in polynomial.terms())
            record.update({
                "exact_rational_certificate": True,
                "weights": {label: str(weight) for label, weight in zip(basis_labels, weights) if weight},
                "residual_nonnegative_monomials": len(polynomial.terms()),
                "minimum_residual_scalar": str(min(polynomial.coeffs())),
                "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
            })
    report = {
        "marker": MARKER,
        "origin": [0, 0],
        "basis_size": len(basis),
        **record,
        "scope": "Exact cone probe of the sole stable origin form only.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
