#!/usr/bin/env python3
"""Exact shifted-binomial cone probe for the three small endpoint holdouts.

For a fixed broom length ``ell`` the endpoint expression is a polynomial
``G_ell(k)`` in the collision-leaf count.  Positivity of every coefficient in
the Newton expansion at zero is sufficient but not necessary.  This probe
therefore expands ``G_ell(s+t)`` in ``binom(t,j)`` for several integer shifts
``s`` and tests those coefficients against the same rigorously nonnegative
parent cone used by the augmented small-length probe.  The finitely many
values ``k < s`` are tested separately against that cone.

Only rows with an exact rational cone decomposition are sign certificates.
An unresolved row is diagnostic and carries no sign claim.
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
OUTPUT = HERE / "iso_n5_g1_internal_endpoint_small_shifted_augmented_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_SMALL_SHIFTED_AUGMENTED_CONE_ROOT"
LENGTHS = (1, 2, 3)
SHIFTS = tuple(range(1, 9))


def vector(expression, variables, monomials):
    data = dict(sp.Poly(sp.expand(expression), *variables).terms())
    return [sp.Rational(data.get(monomial, 0)) for monomial in monomials]


def rationalize(values):
    return [
        sp.Rational(Fraction(float(value)).limit_denominator(2_000_000))
        for value in values
    ]


def parent_basis(rows):
    q = rows["Q"]
    r = rows["R"]
    variables = tuple(list(q[1:6]) + list(r[1:7]))
    basis = []
    interval = unique_expressions(interval_cells(P, H))[1:]
    mapping = {
        P[0]: 1,
        H[0]: 1,
        **{P[index]: r[index] for index in range(1, 7)},
        **{H[index]: q[index] for index in range(1, 6)},
    }
    for label, value in enumerate(interval, 2):
        basis.append((f"interval_sum_{label}", sp.expand(value.subs(mapping))))

    for name, row in (("R", r), ("Q", q)):
        basis.extend([
            (f"HC_{name}", row[3] ** 2 - row[1] * row[5]),
            (f"Q3_{name}", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
            (f"two_step_{name}", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
            (f"rank2_companion_{name}", 2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2]),
        ])

    multipliers = [("one", sp.Integer(1))] + [
        (str(symbol), symbol) for symbol in variables
    ]
    for rank in range(1, 6):
        difference = r[rank] - q[rank]
        for multiplier_name, multiplier in multipliers:
            basis.append((
                f"dominance_{rank}_times_{multiplier_name}",
                sp.expand(difference * multiplier),
            ))
    return variables, basis


def cone_row(form, variables, basis):
    form = sp.expand(form)
    monomial_set = set(sp.Poly(form, *variables).monoms())
    for _label, candidate in basis:
        monomial_set.update(sp.Poly(candidate, *variables).monoms())
    monomials = sorted(monomial_set, reverse=True)
    target_vector = vector(form, variables, monomials)
    basis_vectors = [vector(candidate, variables, monomials) for _label, candidate in basis]
    matrix = np.array([
        [float(candidate[row]) for candidate in basis_vectors]
        for row in range(len(monomials))
    ])
    target = np.array([float(value) for value in target_vector])
    solution = linprog(
        c=np.zeros(len(basis)),
        A_ub=matrix,
        b_ub=target,
        bounds=[(0, None)] * len(basis),
        method="highs",
        options={
            "dual_feasibility_tolerance": 1e-9,
            "primal_feasibility_tolerance": 1e-9,
        },
    )
    result = {
        "floating_feasible": bool(solution.success),
        "exact_rational_certificate": False,
        "parent_form_monomials": len(sp.Poly(form, *variables).terms()),
    }
    if not solution.success:
        return result
    weights = rationalize(solution.x)
    residual = sp.expand(form - sum(
        weight * candidate for weight, (_label, candidate) in zip(weights, basis)
    ))
    residual_poly = sp.Poly(residual, *variables)
    if not (
        all(weight >= 0 for weight in weights)
        and all(value >= 0 for value in residual_poly.coeffs())
    ):
        return result
    stream = "".join(f"{powers}:{value};" for powers, value in residual_poly.terms())
    result.update({
        "exact_rational_certificate": True,
        "basis_weights": {
            label: str(weight)
            for weight, (label, _candidate) in zip(weights, basis)
            if weight != 0
        },
        "residual_nonnegative_monomials": len(residual_poly.terms()),
        "minimum_residual_scalar": str(min(residual_poly.coeffs())),
        "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    })
    return result


def main() -> None:
    expression, rows = endpoint_expression()
    k, t = sp.symbols("k t", integer=True, nonnegative=True)
    variables, basis = parent_basis(rows)

    reduced_by_length = {}
    for length in LENGTHS:
        x, u, y, z = child_rows(length, k)
        substitutions = {}
        for rank in range(1, 7):
            substitutions.update({
                rows["X"][rank]: x[rank],
                rows["U"][rank]: u[rank],
                rows["Y"][rank]: y[rank],
                rows["Z"][rank]: z[rank],
            })
        reduced_by_length[length] = sp.expand(expression.subs(substitutions))

    rows_out = []
    coverage = []
    for length, reduced in reduced_by_length.items():
        for shift in SHIFTS:
            boundary = []
            for value in range(shift):
                row = {
                    "ell": length,
                    "shift": shift,
                    "row_kind": "boundary_value",
                    "k_value": value,
                    **cone_row(reduced.subs(k, value), variables, basis),
                }
                boundary.append(row)
                rows_out.append(row)

            shifted = sp.expand(reduced.subs(k, shift + t))
            degree, coefficients = tensor_binomial(shifted, (t,))
            tail = []
            for index, form in sorted(coefficients.items()):
                if form == 0:
                    continue
                row = {
                    "ell": length,
                    "shift": shift,
                    "row_kind": "shifted_newton_coefficient",
                    "t_index": index[0],
                    **cone_row(form, variables, basis),
                }
                tail.append(row)
                rows_out.append(row)
            closed = all(row["exact_rational_certificate"] for row in boundary + tail)
            coverage.append({
                "ell": length,
                "shift": shift,
                "degree_t": degree[0],
                "boundary_rows": len(boundary),
                "tail_rows": len(tail),
                "exact_boundary_rows": sum(
                    row["exact_rational_certificate"] for row in boundary
                ),
                "exact_tail_rows": sum(
                    row["exact_rational_certificate"] for row in tail
                ),
                "full_nonnegative_integer_k_certificate": closed,
                "unresolved_rows": [
                    {key: row[key] for key in ("row_kind", "k_value", "t_index") if key in row}
                    for row in boundary + tail
                    if not row["exact_rational_certificate"]
                ],
            })

    report = {
        "marker": MARKER,
        "lengths": list(LENGTHS),
        "shifts": list(SHIFTS),
        "basis_size": len(basis),
        "coverage": coverage,
        "rows": rows_out,
        "interpretation": (
            "A full certificate proves the fixed small length for every integer "
            "k>=0.  An unresolved row or shift makes no sign claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "basis_size": len(basis),
        "coverage": coverage,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
