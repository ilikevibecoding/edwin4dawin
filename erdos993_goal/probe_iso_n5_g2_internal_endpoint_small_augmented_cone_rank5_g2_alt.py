#!/usr/bin/env python3
"""Exact augmented-cone probe for internal-endpoint g2 broom lengths 1..7."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from audit_iso_n5_g1_internal_endpoint_all_forest_independent_rank5_g2_alt import independent_parent_basis
from derive_iso_n5_g2_internal_endpoint_broom_factor_rank5_g2_alt import endpoint_expression
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from probe_iso_n5_g1_internal_endpoint_small_parent_interval_cone_root import child_rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_endpoint_small_augmented_cone_probe_rank5_g2_alt_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G2_INTERNAL_ENDPOINT_SMALL_AUGMENTED_CONE_RANK5_G2_ALT"


def vector(expression, variables, monomials):
    data = dict(sp.Poly(sp.expand(expression), *variables).terms())
    return [sp.Rational(data.get(monomial, 0)) for monomial in monomials]


def solve(form, variables, basis):
    monomial_set = set(sp.Poly(form, *variables).monoms())
    for _label, value in basis:
        monomial_set.update(sp.Poly(value, *variables).monoms())
    monomials = sorted(monomial_set, reverse=True)
    target = vector(form, variables, monomials)
    columns = [vector(value, variables, monomials) for _label, value in basis]
    A = np.array([[float(column[row]) for column in columns] for row in range(len(monomials))])
    b = np.array([float(value) for value in target])
    solution = linprog(c=np.zeros(len(basis)), A_ub=A, b_ub=b,
                       bounds=[(0, None)] * len(basis), method="highs")
    record = {"floating_feasible": bool(solution.success), "exact_rational_certificate": False}
    if not solution.success:
        return record
    weights = [
        sp.Rational(Fraction(float(value)).limit_denominator(1_000_000))
        for value in solution.x
    ]
    residual = sp.expand(form - sum(weight * value for weight, (_label, value) in zip(weights, basis)))
    polynomial = sp.Poly(residual, *variables)
    if all(weight >= 0 for weight in weights) and all(value >= 0 for value in polynomial.coeffs()):
        stream = "".join(f"{powers}:{value};" for powers, value in polynomial.terms())
        record.update({
            "exact_rational_certificate": True,
            "weights": {label: str(weight) for weight, (label, _value) in zip(weights, basis) if weight},
            "residual_nonnegative_monomials": len(polynomial.terms()),
            "minimum_residual_scalar": str(min(polynomial.coeffs())),
            "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        })
    return record


def main():
    expression, rows = endpoint_expression()
    variables, basis = independent_parent_basis(rows)
    k = sp.Symbol("k", integer=True, nonnegative=True)
    records = []
    per_length = {}
    for ell in range(1, 8):
        actual = child_rows(ell, k)
        rules = {
            rows[name][rank]: actual[index][rank]
            for index, name in enumerate(("X", "U", "Y", "Z"))
            for rank in range(1, 7)
        }
        reduced = sp.expand(expression.subs(rules))
        degrees, coefficients = tensor_binomial(reduced, (k,))
        before = len(records)
        for index, form in sorted(coefficients.items()):
            if form == 0:
                continue
            record = {
                "ell": ell, "k_index": index[0],
                "parent_form_monomials": len(sp.Poly(form, *variables).terms()),
                **solve(form, variables, basis),
            }
            if not record["exact_rational_certificate"]:
                record["unresolved_parent_form"] = str(sp.factor(form))
            records.append(record)
        local = records[before:]
        per_length[str(ell)] = {
            "degree_k": degrees[0],
            "nonzero_parent_forms": len(local),
            "exact_decompositions": sum(row["exact_rational_certificate"] for row in local),
            "unresolved": sum(not row["exact_rational_certificate"] for row in local),
        }
    exact = sum(row["exact_rational_certificate"] for row in records)
    report = {
        "marker": MARKER,
        "small_lengths": [1, 7],
        "basis_size": len(basis),
        "total_parent_forms": len(records),
        "exact_decompositions": exact,
        "unresolved_forms": len(records) - exact,
        "per_length": per_length,
        "forms": records,
        "scope": "Exact augmented-cone probe; unresolved forms make no claim.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "forms": len(records), "exact": exact,
        "per_length": per_length,
        "unresolved": [[r["ell"], r["k_index"]] for r in records if not r["exact_rational_certificate"]],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
