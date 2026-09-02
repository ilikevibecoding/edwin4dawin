#!/usr/bin/env python3
"""Exact (ell,k) Newton reduction of internal-spine endpoint g1.

For the one-ended broom A=B_(ell,k), ell>=8 and k>=0, substitute the
closed independence-polynomial rows into the endpoint factor reduction and
expand in the tensor binomial basis C(h,i)C(k,j), ell=8+h.  The resulting
finite list consists of rooted-parent forest forms in R=I(F-v) and
Q=I(F-N[v]).  This is an exact reduction, not yet a sign theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import factorial
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import endpoint_expression


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_endpoint_broom_parameters_root_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_BROOM_PARAMETERS_ROOT"
FACTOR_SOURCE = HERE / "derive_iso_n5_g1_internal_endpoint_broom_factor_root.py"
FACTOR_REPORT = HERE / "iso_n5_g1_internal_endpoint_broom_factor_root_20260830.json"
FACTOR_SOURCE_SHA256 = "89324C9B5C2E80B4E365B208FB896F0DB7E57579CC3381EEA8798E6A34EDA4F0"
FACTOR_REPORT_SHA256 = "0FA4D58DD4C3624327843BB8A39E986145675DA0E475473E20F62D2B4F64DDBC"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(variable, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.expand(
        sp.prod(variable - offset for offset in range(rank)) / sp.Integer(factorial(rank))
    )


def path_coefficient(order, rank):
    if rank < 0:
        return sp.Integer(0)
    return choose(order - rank + 1, rank)


def isolate_times_path(isolates, order, rank):
    return sp.expand(sum(
        choose(isolates, j) * path_coefficient(order, rank - j)
        for j in range(rank + 1)
    ))


def tensor_binomial(expression, variables):
    degrees = tuple(sp.Poly(expression, variable).degree() for variable in variables)
    coefficients = {}
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = sp.Integer(0)
        for point in itertools.product(*(range(i + 1) for i in index)):
            sign = (-1) ** sum(i - j for i, j in zip(index, point))
            weight = sp.prod(sp.binomial(i, j) for i, j in zip(index, point))
            value += sign * weight * expression.subs(dict(zip(variables, point)))
        coefficients[index] = sp.expand(value)
    reconstructed = sp.expand(sum(
        value * sp.prod(choose(variable, rank) for variable, rank in zip(variables, index))
        for index, value in coefficients.items()
    ))
    assert sp.expand(reconstructed - expression) == 0
    return degrees, coefficients


def form_summary(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    if variables:
        polynomial = sp.Poly(expression, *variables)
        terms = polynomial.terms()
        coefficients = polynomial.coeffs()
    else:
        terms = [((), sp.sympify(expression))]
        coefficients = [sp.sympify(expression)]
    stream = "".join(f"{powers}:{coefficient};" for powers, coefficient in terms)
    result = {
        "monomials": len(terms),
        "negative_scalar_coefficients": sum(
            coefficient.is_negative is True for coefficient in coefficients
        ),
        "positive_scalar_coefficients": sum(
            coefficient.is_positive is True for coefficient in coefficients
        ),
        "ordered_term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }
    if len(terms) <= 24:
        result["factor"] = str(sp.factor(expression))
    return result


def main() -> None:
    assert sha256(FACTOR_SOURCE) == FACTOR_SOURCE_SHA256
    assert sha256(FACTOR_REPORT) == FACTOR_REPORT_SHA256
    factor_report = json.loads(FACTOR_REPORT.read_text(encoding="utf-8"))
    assert factor_report["marker"] == (
        "DERIVED_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_BROOM_FACTOR_ROOT"
    )

    expression, rows = endpoint_expression()
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
    parameterized = sp.expand(expression.subs(substitutions))
    degrees, coefficients = tensor_binomial(parameterized, (h, k))
    forms = [
        {"h_index": index[0], "k_index": index[1], **form_summary(value)}
        for index, value in sorted(coefficients.items()) if value != 0
    ]
    index_stream = "".join(
        f"{row['h_index']},{row['k_index']}:{row['ordered_term_stream_sha256']};"
        for row in forms
    )

    report = {
        "marker": MARKER,
        "stable_domain": "ell=8+h with h>=0 and collision-leaf count k>=0",
        "broom_rows": {
            "X": "(1+x)^k P_(ell-1)+xP_(ell-2)",
            "U": "(1+x)^k P_(ell-1)",
            "Y": "(1+x)^k P_(ell-2)+xP_(ell-3)",
            "Z": "(1+x)^k P_(ell-2)",
        },
        "tensor_binomial_reduction": {
            "degrees_h_k": list(degrees),
            "coefficient_cells": len(coefficients),
            "nonzero_cells": len(forms),
            "forms_with_negative_scalars": sum(
                row["negative_scalar_coefficients"] > 0 for row in forms
            ),
            "form_index_stream_sha256": hashlib.sha256(index_stream.encode()).hexdigest().upper(),
            "forms": forms,
        },
        "dependencies_sha256": {
            FACTOR_SOURCE.name: FACTOR_SOURCE_SHA256,
            FACTOR_REPORT.name: FACTOR_REPORT_SHA256,
        },
        "status": "exact finite parent-form reduction; signs remain to be proved",
        "scope": (
            "Internal-spine endpoint g1 for ell>=8 reduced exactly to the displayed "
            "parent forms.  Small ell and every parent-form sign, other g1/g2 modes, "
            "all N5, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "degrees_h_k": list(degrees),
        "coefficient_cells": len(coefficients),
        "nonzero_cells": len(forms),
        "forms_with_negative_scalars": report["tensor_binomial_reduction"][
            "forms_with_negative_scalars"
        ],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
