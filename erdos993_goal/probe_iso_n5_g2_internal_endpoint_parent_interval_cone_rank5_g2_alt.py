#!/usr/bin/env python3
"""Probe stable internal-endpoint g2 forms against the frozen parent cone."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_g2_internal_endpoint_broom_factor_rank5_g2_alt import (
    endpoint_expression,
)
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
OUTPUT = HERE / "iso_n5_g2_internal_endpoint_parent_interval_cone_probe_rank5_g2_alt_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G2_INTERNAL_ENDPOINT_PARENT_INTERVAL_CONE_RANK5_G2_ALT"


def coefficient_vector(expression, variables, monomials):
    data = dict(sp.Poly(sp.expand(expression), *variables).terms())
    return [sp.Rational(data.get(monomial, 0)) for monomial in monomials]


def rationalize(values, maximum_denominator=100_000):
    return [
        sp.Rational(Fraction(float(value)).limit_denominator(maximum_denominator))
        for value in values
    ]


def main():
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

    interval = unique_expressions(interval_cells(P, H))[1:]
    interval = [sp.expand(value.subs({P[0]: 1, H[0]: 1})) for value in interval]
    mapping = {
        **{P[index]: rows["R"][index] for index in range(1, 7)},
        **{H[index]: rows["Q"][index] for index in range(1, 6)},
    }
    interval = [sp.expand(value.subs(mapping)) for value in interval]
    variables = tuple(list(rows["Q"][1:6]) + list(rows["R"][1:7]))

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
        A = np.array([
            [float(vector[row]) for vector in basis_vectors]
            for row in range(len(monomials))
        ])
        b = np.array([float(value) for value in target])
        solution = linprog(
            c=np.zeros(len(interval)), A_ub=A, b_ub=b,
            bounds=[(0, None)] * len(interval), method="highs",
        )
        record = {
            "h_index": index[0], "k_index": index[1],
            "floating_feasible": bool(solution.success),
            "exact_rational_certificate": False,
        }
        if solution.success:
            weights = rationalize(solution.x)
            residual = sp.expand(form - sum(
                weight * basis for weight, basis in zip(weights, interval)
            ))
            residual_poly = sp.Poly(residual, *variables)
            if all(value >= 0 for value in residual_poly.coeffs()) and all(weight >= 0 for weight in weights):
                stream = "".join(
                    f"{powers}:{value};" for powers, value in residual_poly.terms()
                )
                record.update({
                    "exact_rational_certificate": True,
                    "interval_sum_weights": {
                        str(i + 2): str(weight) for i, weight in enumerate(weights) if weight
                    },
                    "residual_nonnegative_monomials": len(residual_poly.terms()),
                    "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
                    "minimum_residual_scalar": str(min(residual_poly.coeffs())),
                })
                exact_successes += 1
        results.append(record)
    report = {
        "marker": MARKER,
        "stable_domain": "ell=8+h, h,k>=0 (probe parameterization)",
        "degrees_h_k": list(degrees),
        "stable_parent_forms": len(results),
        "exact_decompositions": exact_successes,
        "unresolved_forms": len(results) - exact_successes,
        "forms": results,
        "scope": "Exact cone probe only; unresolved rows make no sign claim.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "degrees_h_k": list(degrees),
        "forms": len(results),
        "exact": exact_successes,
        "unresolved": [[r["h_index"], r["k_index"]] for r in results if not r["exact_rational_certificate"]],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
