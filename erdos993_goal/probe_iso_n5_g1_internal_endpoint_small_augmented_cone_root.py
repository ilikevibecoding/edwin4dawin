#!/usr/bin/env python3
"""Augmented exact cone for the five small internal-endpoint parent forms.

Besides the sixteen frozen componentwise-deletion interval sums, use only
globally valid forest inequalities (rank-three reserve, two-step drop,
rank-two companion, and H_C) and the elementary induced-subforest dominance
i_j(Q)<=i_j(R), optionally multiplied by one nonnegative coefficient.  Exact
rational residual checks determine whether this cone closes the five rows.
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
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from probe_iso_n5_g1_internal_endpoint_small_parent_interval_cone_root import child_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_endpoint_small_augmented_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_SMALL_AUGMENTED_CONE_ROOT"
TARGETS = ((1, 0), (1, 1), (2, 0), (3, 0), (4, 0))


def vector(expression, variables, monomials):
    data = dict(sp.Poly(sp.expand(expression), *variables).terms())
    return [sp.Rational(data.get(monomial, 0)) for monomial in monomials]


def rationalize(values):
    return [sp.Rational(Fraction(float(value)).limit_denominator(1_000_000)) for value in values]


def main() -> None:
    expression, rows = endpoint_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    targets = {}
    for length in range(1, 5):
        x, u, y, z = child_rows(length, k)
        substitutions = {}
        for rank in range(1, 7):
            substitutions.update({
                rows["X"][rank]: x[rank], rows["U"][rank]: u[rank],
                rows["Y"][rank]: y[rank], rows["Z"][rank]: z[rank],
            })
        reduced = sp.expand(expression.subs(substitutions))
        _degrees, coefficients = tensor_binomial(reduced, (k,))
        for target in TARGETS:
            if target[0] == length:
                targets[target] = coefficients[(target[1],)]
    assert set(targets) == set(TARGETS)

    q = rows["Q"]
    r = rows["R"]
    variables = tuple(list(q[1:6]) + list(r[1:7]))
    basis = []
    interval = unique_expressions(interval_cells(P, H))[1:]
    mapping = {
        P[0]: 1, H[0]: 1,
        **{P[index]: r[index] for index in range(1, 7)},
        **{H[index]: q[index] for index in range(1, 6)},
    }
    for label, value in enumerate(interval, 2):
        basis.append((f"interval_sum_{label}", sp.expand(value.subs(mapping))))

    # Universally nonnegative single-forest forms.
    for name, row in (("R", r), ("Q", q)):
        basis.extend([
            (f"HC_{name}", row[3] ** 2 - row[1] * row[5]),
            (f"Q3_{name}", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
            (f"two_step_{name}", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
            (f"rank2_companion_{name}", 2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]),
        ])

    # Q is an induced subforest of R, so every coefficient difference is
    # nonnegative.  Multiplication by any single nonnegative coefficient is valid.
    multipliers = [("one", sp.Integer(1))] + [
        (str(symbol), symbol) for symbol in variables
    ]
    for rank in range(1, 6):
        difference = r[rank] - q[rank]
        for multiplier_name, multiplier in multipliers:
            basis.append((f"dominance_{rank}_times_{multiplier_name}", sp.expand(difference * multiplier)))

    results = []
    for target in TARGETS:
        form = targets[target]
        monomial_set = set(sp.Poly(form, *variables).monoms())
        for _label, candidate in basis:
            monomial_set.update(sp.Poly(candidate, *variables).monoms())
        monomials = sorted(monomial_set, reverse=True)
        target_vector = vector(form, variables, monomials)
        basis_vectors = [vector(candidate, variables, monomials) for _label, candidate in basis]
        A = np.array([
            [float(candidate[row]) for candidate in basis_vectors]
            for row in range(len(monomials))
        ])
        b = np.array([float(value) for value in target_vector])
        solution = linprog(
            c=np.zeros(len(basis)), A_ub=A, b_ub=b,
            bounds=[(0, None)] * len(basis), method="highs",
            options={"dual_feasibility_tolerance": 1e-9, "primal_feasibility_tolerance": 1e-9},
        )
        row = {
            "ell": target[0], "k_index": target[1],
            "floating_feasible": bool(solution.success),
            "exact_rational_certificate": False,
        }
        if solution.success:
            weights = rationalize(solution.x)
            residual = sp.expand(form - sum(
                weight * candidate for weight, (_label, candidate) in zip(weights, basis)
            ))
            residual_poly = sp.Poly(residual, *variables)
            if all(weight >= 0 for weight in weights) and all(
                value >= 0 for value in residual_poly.coeffs()
            ):
                used = {
                    label: str(weight)
                    for weight, (label, _candidate) in zip(weights, basis) if weight != 0
                }
                stream = "".join(
                    f"{powers}:{value};" for powers, value in residual_poly.terms()
                )
                row.update({
                    "exact_rational_certificate": True,
                    "basis_weights": used,
                    "residual_nonnegative_monomials": len(residual_poly.terms()),
                    "minimum_residual_scalar": str(min(residual_poly.coeffs())),
                    "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
                })
        results.append(row)

    exact = sum(row["exact_rational_certificate"] for row in results)
    report = {
        "marker": MARKER,
        "basis_size": len(basis),
        "basis_labels": [label for label, _candidate in basis],
        "target_forms": len(results),
        "exact_decompositions": exact,
        "unresolved_forms": len(results) - exact,
        "forms": results,
        "scope": (
            "Exact cone-decomposition probe.  A verified row is a sign proof from "
            "the named global inequalities; unresolved rows make no sign claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "basis_size": len(basis),
        "exact_decompositions": exact,
        "unresolved_forms": len(results) - exact,
        "forms": results,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
