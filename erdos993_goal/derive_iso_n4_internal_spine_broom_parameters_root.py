#!/usr/bin/env python3
"""Reduce the full internal-spine broom mode in (ell,k) Newton layers.

For ell>=7 and k>=0, substitute the exact one-ended-broom rows into the
algebraic g1,g2 factor forms, put ell=7+h, and expand in the tensor binomial
basis C(h,i)C(k,j).  Each resulting coefficient is a parent-side forest form.
This is a finite exact reduction, not a sign theorem for those forms.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_internal_spine_broom_factor_root_20260829.json"
OUTPUT = HERE / "iso_n4_internal_spine_broom_parameters_root_20260829.json"


def choose(variable: sp.Expr, rank: int) -> sp.Expr:
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.expand(
        sp.prod(variable - j for j in range(rank)) / sp.Integer(factorial(rank))
    )


def path_coefficient(order: sp.Expr, rank: int) -> sp.Expr:
    if rank < 0:
        return sp.Integer(0)
    return choose(order - rank + 1, rank)


def isolate_times_path(isolates: sp.Symbol, order: sp.Expr, rank: int) -> sp.Expr:
    return sp.expand(
        sum(choose(isolates, j) * path_coefficient(order, rank - j) for j in range(rank + 1))
    )


def tensor_binomial(expression: sp.Expr, variables: tuple[sp.Symbol, ...]):
    degrees = tuple(sp.Poly(sp.expand(expression), variable).degree() for variable in variables)
    coefficients = {}
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = sp.Integer(0)
        for point in itertools.product(*(range(i + 1) for i in index)):
            sign = (-1) ** sum(i - j for i, j in zip(index, point))
            weight = sp.prod(sp.binomial(i, j) for i, j in zip(index, point))
            value += sign * weight * expression.subs(dict(zip(variables, point)))
        coefficients[index] = sp.factor(value)
    reconstructed = sp.expand(
        sum(
            value * sp.prod(choose(variable, index) for variable, index in zip(variables, multi))
            for multi, value in coefficients.items()
        )
    )
    residual = sp.expand(reconstructed - expression)
    if residual != 0:
        raise AssertionError(
            f"tensor reconstruction failed degrees={degrees}; residual={sp.factor(residual)}"
        )
    return degrees, coefficients


def form_summary(expression: sp.Expr):
    symbols = sorted(expression.free_symbols, key=str)
    coefficients = sp.Poly(sp.expand(expression), *symbols).coeffs() if symbols else [expression]
    return {
        "monomials": len(coefficients),
        "negative_scalar_coefficients": sum(value.is_negative is True for value in coefficients),
        "positive_scalar_coefficients": sum(value.is_positive is True for value in coefficients),
        "factor": str(sp.factor(expression)),
    }


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_FACTOR_ROOT"
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 7 + h
    substitutions = {}
    for rank in range(1, 6):
        y = isolate_times_path(k, ell - 1, rank)
        x = sp.expand(y + path_coefficient(ell - 2, rank - 1))
        b0 = isolate_times_path(k, ell - 2, rank)
        a0 = sp.expand(b0 + path_coefficient(ell - 3, rank - 1))
        substitutions.update({
            sp.symbols(f"x{rank}"): x,
            sp.symbols(f"y{rank}"): y,
            sp.symbols(f"a0_{rank}"): a0,
            sp.symbols(f"b0_{rank}"): b0,
        })

    result = {}
    for name in ("g1_normalized", "g2_normalized"):
        expression = sp.expand(sp.sympify(dependency[name]["factor"]).subs(substitutions))
        degrees, coefficients = tensor_binomial(expression, (h, k))
        result[name] = {
            "degrees_h_k": list(degrees),
            "coefficient_cells": len(coefficients),
            "nonzero_cells": sum(value != 0 for value in coefficients.values()),
            "forms": [
                {"h_index": multi[0], "k_index": multi[1], **form_summary(value)}
                for multi, value in sorted(coefficients.items()) if value != 0
            ],
        }

    report = {
        "marker": "DERIVED_EXACT_ISO_N4_INTERNAL_SPINE_BROOM_PARAMETER_NEWTON_ROOT",
        "stable_domain": "ell=7+h with h>=0; collision leaves k>=0",
        "row_formulas": {
            "X": "(1+x)^k P_(ell-1)+xP_(ell-2)",
            "Y": "(1+x)^k P_(ell-1)",
            "A0": "(1+x)^k P_(ell-2)+xP_(ell-3)",
            "B0": "(1+x)^k P_(ell-2)",
        },
        "coefficients": result,
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "scope": "Exact finite parameter reduction only; every parent-side form must still be proved nonnegative.",
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "summary": {
            name: {
                "degrees_h_k": block["degrees_h_k"],
                "cells": block["coefficient_cells"],
                "nonzero": block["nonzero_cells"],
                "forms_with_negative_scalars": sum(form["negative_scalar_coefficients"] > 0 for form in block["forms"]),
            }
            for name, block in result.items()
        },
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
