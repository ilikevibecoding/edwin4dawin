#!/usr/bin/env python3
"""Exact interval-cone test for internal-endpoint broom lengths 1..7.

Small one-ended brooms require truncated path rows rather than the stable
ell=8+h formulas.  For each exact length this script expands g1 in the
binomial basis C(k,j) and seeks exact rational decompositions of every parent
form into the already-proved componentwise-deletion interval sums plus
coefficientwise-nonnegative monomials.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from math import comb
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import (
    convolve,
    endpoint_expression,
)
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    choose,
    tensor_binomial,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_endpoint_small_parent_interval_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ENDPOINT_SMALL_PARENT_INTERVAL_CONE_ROOT"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def path_row(order, maximum=6):
    """I(P_order), with P_0=P_-1 empty and P_-2 the zero row."""
    if order == -2:
        return (sp.Integer(0),) * (maximum + 1)
    if order <= 0:
        return (sp.Integer(1),) + (sp.Integer(0),) * maximum
    return tuple(
        sp.Integer(comb(order - rank + 1, rank))
        if order - rank + 1 >= rank else sp.Integer(0)
        for rank in range(maximum + 1)
    )


def add(left, right, maximum=6):
    return tuple(sp.expand(at(left, rank) + at(right, rank)) for rank in range(maximum + 1))


def shift(row, amount=1, maximum=6):
    return tuple(at(row, rank - amount) for rank in range(maximum + 1))


def binomial_row(number, maximum=6):
    return tuple(choose(number, rank) for rank in range(maximum + 1))


def child_rows(length, collisions):
    leaves = binomial_row(collisions)
    p1, p2, p3 = path_row(length - 1), path_row(length - 2), path_row(length - 3)
    x = add(convolve(leaves, p1), shift(p2))
    u = convolve(leaves, p1)
    y = add(convolve(leaves, p2), shift(p3))
    z = convolve(leaves, p2)
    return x, u, y, z


def vector(expression, variables, monomials):
    data = dict(sp.Poly(sp.expand(expression), *variables).terms())
    return [sp.Rational(data.get(monomial, 0)) for monomial in monomials]


def rationalize(values):
    return [sp.Rational(Fraction(float(value)).limit_denominator(100_000)) for value in values]


def main() -> None:
    expression, rows = endpoint_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    interval = unique_expressions(interval_cells(P, H))[1:]
    interval = [sp.expand(value.subs({P[0]: 1, H[0]: 1})) for value in interval]
    mapping = {
        **{P[index]: rows["R"][index] for index in range(1, 7)},
        **{H[index]: rows["Q"][index] for index in range(1, 6)},
    }
    interval = [sp.expand(value.subs(mapping)) for value in interval]
    variables = tuple(list(rows["Q"][1:6]) + list(rows["R"][1:7]))

    all_rows = []
    exact = 0
    per_length = {}
    for length in range(1, 8):
        x, u, y, z = child_rows(length, k)
        substitutions = {}
        for rank in range(1, 7):
            substitutions.update({
                rows["X"][rank]: x[rank],
                rows["U"][rank]: u[rank],
                rows["Y"][rank]: y[rank],
                rows["Z"][rank]: z[rank],
            })
        reduced = sp.expand(expression.subs(substitutions))
        degrees, coefficients = tensor_binomial(reduced, (k,))
        length_rows = 0
        length_exact = 0
        for index, form in sorted(coefficients.items()):
            if form == 0:
                continue
            monomial_set = set(sp.Poly(form, *variables).monoms())
            for basis in interval:
                monomial_set.update(sp.Poly(basis, *variables).monoms())
            monomials = sorted(monomial_set, reverse=True)
            target = vector(form, variables, monomials)
            basis_vectors = [vector(basis, variables, monomials) for basis in interval]
            A = np.array([
                [float(basis_vector[row]) for basis_vector in basis_vectors]
                for row in range(len(monomials))
            ])
            b = np.array([float(value) for value in target])
            solution = linprog(
                c=np.zeros(len(interval)), A_ub=A, b_ub=b,
                bounds=[(0, None)] * len(interval), method="highs",
                options={"dual_feasibility_tolerance": 1e-9, "primal_feasibility_tolerance": 1e-9},
            )
            row = {
                "ell": length,
                "k_index": index[0],
                "floating_feasible": bool(solution.success),
                "exact_rational_certificate": False,
                "parent_form_monomials": len(sp.Poly(form, *variables).terms()),
            }
            if solution.success:
                weights = rationalize(solution.x)
                residual = sp.expand(form - sum(
                    weight * basis for weight, basis in zip(weights, interval)
                ))
                residual_poly = sp.Poly(residual, *variables)
                if all(weight >= 0 for weight in weights) and all(
                    value >= 0 for value in residual_poly.coeffs()
                ):
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
                    exact += 1
                    length_exact += 1
            if not row["exact_rational_certificate"]:
                row["unresolved_parent_form"] = str(sp.factor(form))
            all_rows.append(row)
            length_rows += 1
        per_length[str(length)] = {
            "degree_k": degrees[0],
            "nonzero_parent_forms": length_rows,
            "exact_decompositions": length_exact,
            "unresolved": length_rows - length_exact,
        }

    report = {
        "marker": MARKER,
        "small_lengths": [1, 7],
        "total_parent_forms": len(all_rows),
        "exact_decompositions": exact,
        "unresolved_forms": len(all_rows) - exact,
        "per_length": per_length,
        "forms": all_rows,
        "path_boundary_convention": "P_0=P_-1=empty and P_-2 is the zero row",
        "interpretation": (
            "Exact decompositions prove the associated parent form nonnegative; "
            "unresolved forms make no sign claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "total_parent_forms": len(all_rows),
        "exact_decompositions": exact,
        "unresolved_forms": len(all_rows) - exact,
        "per_length": per_length,
        "unresolved_indices": [
            [row["ell"], row["k_index"]]
            for row in all_rows if not row["exact_rational_certificate"]
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
