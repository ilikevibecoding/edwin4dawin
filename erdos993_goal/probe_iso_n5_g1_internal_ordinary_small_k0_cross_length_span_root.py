#!/usr/bin/env python3
"""Probe whether already proved short-length cells pay the five k=0 gaps.

The parent-interval certificates prove both marked-parent faces for
``ell=4,...,7`` and additionally the nonadjacent face for ``ell=3``.  This
script asks a deliberately small exact question: on each face, is an
unresolved target a nonnegative scalar combination of those already proved
same-face targets plus a coefficientwise nonnegative polynomial?

Only an exactly reconstructed rational combination is recorded as a
certificate.  An infeasible row is diagnostic and makes no sign claim.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_cross_length_span_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_CROSS_LENGTH_SPAN_ROOT"
UNRESOLVED = {0: (1, 2, 3), 1: (1, 2)}
DONORS = {0: (4, 5, 6, 7), 1: (3, 4, 5, 6, 7)}


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def exact_k0_targets():
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    targets = {}
    for ell in range(1, 8):
        xrow, urow, yrow, zrow = child_rows(ell, k)
        rules = {}
        for rank in range(1, 7):
            rules.update({
                rows["X"][rank]: xrow[rank],
                rows["U"][rank]: urow[rank],
                rows["Y"][rank]: yrow[rank],
                rows["Z"][rank]: zrow[rank],
            })
        degrees, coefficients = tensor_binomial(sp.expand(expression.subs(rules)), (k,))
        assert degrees == (6,)
        targets[ell] = sp.expand(coefficients[(0,)])
    return rows, targets


def partitioned_targets():
    rows, targets = exact_k0_targets()
    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    faces = {}
    for epsilon in (0, 1):
        rules = {}
        for rank in range(1, 7):
            rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        active = (a, b, c) if epsilon == 0 else (a, b, c, d)
        variables = tuple(symbol for row in active for symbol in row[1:])
        faces[epsilon] = (
            variables,
            {ell: sp.expand(target.subs(rules)) for ell, target in targets.items()},
        )
    return faces


def vector(expression, variables, monomials):
    terms = dict(sp.Poly(expression, *variables).terms())
    return [sp.Rational(terms.get(monomial, 0)) for monomial in monomials]


def rationalize(values):
    return [
        sp.Rational(Fraction(float(value)).limit_denominator(10_000_000))
        for value in values
    ]


def main() -> None:
    faces = partitioned_targets()
    rows = []
    for epsilon in (0, 1):
        variables, targets = faces[epsilon]
        donors = DONORS[epsilon]
        for ell in UNRESOLVED[epsilon]:
            target = targets[ell]
            monomial_set = set(sp.Poly(target, *variables).monoms())
            for donor in donors:
                monomial_set.update(sp.Poly(targets[donor], *variables).monoms())
            monomials = sorted(monomial_set, reverse=True)
            target_vector = vector(target, variables, monomials)
            donor_vectors = [vector(targets[donor], variables, monomials) for donor in donors]
            matrix = np.array([
                [float(candidate[index]) for candidate in donor_vectors]
                for index in range(len(monomials))
            ])
            rhs = np.array([float(value) for value in target_vector])
            solution = linprog(
                c=np.zeros(len(donors)),
                A_ub=matrix,
                b_ub=rhs,
                bounds=[(0, None)] * len(donors),
                method="highs",
                options={
                    "dual_feasibility_tolerance": 1e-9,
                    "primal_feasibility_tolerance": 1e-9,
                },
            )
            row = {
                "epsilon": epsilon,
                "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
                "target_ell": ell,
                "donor_ells": list(donors),
                "coefficient_rows": len(monomials),
                "floating_feasible": bool(solution.success),
                "exact_rational_certificate": False,
            }
            if solution.success:
                weights = rationalize(solution.x)
                residual = sp.expand(
                    target - sum(weight * targets[donor] for weight, donor in zip(weights, donors))
                )
                residual_poly = sp.Poly(residual, *variables)
                if all(weight >= 0 for weight in weights) and all(
                    coefficient >= 0 for coefficient in residual_poly.coeffs()
                ):
                    stream = "".join(
                        f"{powers}:{coefficient};"
                        for powers, coefficient in residual_poly.terms()
                    )
                    row.update({
                        "exact_rational_certificate": True,
                        "weights": {
                            str(donor): str(weight)
                            for donor, weight in zip(donors, weights) if weight
                        },
                        "residual_monomials": len(residual_poly.terms()),
                        "minimum_residual_coefficient": str(min(residual_poly.coeffs())),
                        "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
                    })
            rows.append(row)

    report = {
        "marker": MARKER,
        "rows": rows,
        "exact_rows": sum(row["exact_rational_certificate"] for row in rows),
        "total_rows": len(rows),
        "logic": (
            "Each donor is an already exact same-face k=0 theorem target. "
            "A nonnegative donor combination plus coefficientwise nonnegative "
            "residual proves the target."
        ),
        "status": "discovery probe; solver-free replay and dependency pins required",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
