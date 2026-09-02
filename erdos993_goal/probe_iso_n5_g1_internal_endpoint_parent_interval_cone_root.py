#!/usr/bin/env python3
"""Test whether endpoint parent forms lie in the frozen interval-sum cone.

The disconnected-M5 theorem proves sixteen componentwise-deletion interval
sums nonnegative.  This diagnostic asks, for each of the 28 stable broom
Newton cells, whether its parent form is a nonnegative rational combination
of those interval sums plus coefficientwise-nonnegative monomials.  A
verified decomposition is an exact sign certificate; failure only means this
particular cone is insufficient.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import endpoint_expression
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_endpoint_parent_interval_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_PARENT_INTERVAL_CONE_ROOT"


def coefficient_vector(expression, variables, monomials):
    data = dict(sp.Poly(sp.expand(expression), *variables).terms())
    return [sp.Rational(data.get(monomial, 0)) for monomial in monomials]


def rationalize(values, maximum_denominator=100_000):
    return [sp.Rational(Fraction(float(value)).limit_denominator(maximum_denominator)) for value in values]


def main() -> None:
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
    _degrees, coefficients = tensor_binomial(parameterized, (h, k))

    interval = unique_expressions(interval_cells(P, H))[1:]
    interval = [sp.expand(value.subs({P[0]: 1, H[0]: 1})) for value in interval]
    mapping = {
        **{P[index]: rows["R"][index] for index in range(1, 7)},
        **{H[index]: rows["Q"][index] for index in range(1, 6)},
    }
    interval = [sp.expand(value.subs(mapping)) for value in interval]
    variables = tuple(
        list(rows["Q"][1:6]) + list(rows["R"][1:7])
    )

    results = []
    exact_successes = 0
    for index, form in sorted(coefficients.items()):
        if form == 0:
            continue
        monomial_set = set(sp.Poly(form, *variables).monoms())
        for basis in interval:
            monomial_set.update(sp.Poly(basis, *variables).monoms())
        monomials = sorted(monomial_set, reverse=True)
        target = coefficient_vector(form, variables, monomials)
        basis_vectors = [coefficient_vector(basis, variables, monomials) for basis in interval]
        A = np.array([[float(vector[row]) for vector in basis_vectors] for row in range(len(monomials))])
        b = np.array([float(value) for value in target])
        solution = linprog(
            c=np.zeros(len(interval)),
            A_ub=A,
            b_ub=b,
            bounds=[(0, None)] * len(interval),
            method="highs",
            options={"dual_feasibility_tolerance": 1e-9, "primal_feasibility_tolerance": 1e-9},
        )
        row = {
            "h_index": index[0],
            "k_index": index[1],
            "floating_feasible": bool(solution.success),
            "exact_rational_certificate": False,
        }
        if solution.success:
            weights = rationalize(solution.x)
            residual = sp.expand(form - sum(weight * basis for weight, basis in zip(weights, interval)))
            residual_poly = sp.Poly(residual, *variables)
            if all(value >= 0 for value in residual_poly.coeffs()) and all(weight >= 0 for weight in weights):
                used = {
                    str(basis_index + 2): str(weight)
                    for basis_index, weight in enumerate(weights) if weight != 0
                }
                stream = "".join(
                    f"{powers}:{value};" for powers, value in residual_poly.terms()
                )
                row.update({
                    "exact_rational_certificate": True,
                    "interval_sum_weights": used,
                    "residual_nonnegative_monomials": len(residual_poly.terms()),
                    "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
                    "minimum_residual_scalar": str(min(residual_poly.coeffs())),
                })
                exact_successes += 1
        results.append(row)

    report = {
        "marker": MARKER,
        "cone": (
            "nonnegative rational combinations of frozen disconnected-M5 unique "
            "interval sums 2..16 plus coefficientwise-nonnegative monomials"
        ),
        "stable_parent_forms": len(results),
        "exact_decompositions": exact_successes,
        "unresolved_forms": len(results) - exact_successes,
        "forms": results,
        "interpretation": (
            "Exact decompositions prove their displayed parent forms nonnegative. "
            "Unresolved rows make no sign claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "stable_parent_forms": len(results),
        "exact_decompositions": exact_successes,
        "unresolved_forms": len(results) - exact_successes,
        "unresolved_indices": [
            [row["h_index"], row["k_index"]]
            for row in results if not row["exact_rational_certificate"]
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
