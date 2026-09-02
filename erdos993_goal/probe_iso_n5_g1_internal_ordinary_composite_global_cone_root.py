#!/usr/bin/env python3
"""Exact composite-global cone for internal-ordinary large-broom g1.

For the two attachment endpoints a (child side) and p (parent side), the
four deletion states 00,10,01,11 are genuine marked forests retaining u,v.
Consequently the already proved universal forms S, C5, and N4 are
nonnegative on each state.  This probe asks whether one fixed nonnegative
rational combination of those twelve global payments leaves a tensor-
Newton/partition coefficientwise-nonnegative residual.

An exact rational residual is a theorem certificate for the ell>=8 sector;
an infeasible cone is only diagnostic evidence.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve
from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_composite_global_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_COMPOSITE_GLOBAL_CONE_ROOT"


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def rationalize(values):
    return [
        sp.Rational(Fraction(float(value)).limit_denominator(4_000_000))
        for value in values
    ]


def main() -> None:
    target_expression, rows = ordinary_expression()
    x, u, y, z = (rows[name] for name in ("X", "U", "Y", "Z"))
    e, p, v, w = (rows[name] for name in ("E", "P", "V", "W"))
    constants = {row[0]: 1 for row in (x, u, y, z, e, p, v, w)}

    def row_difference(full, deleted):
        return tuple(sp.expand(left - right) for left, right in zip(full, deleted))

    def bridge_row(child_full, child_deleted, parent_full, parent_deleted):
        product = convolve(child_full, parent_full)
        forbidden_both = convolve(
            row_difference(child_full, child_deleted),
            row_difference(parent_full, parent_deleted),
        )
        return tuple(
            sp.expand(value - forbidden)
            for value, forbidden in zip(product, forbidden_both)
        )

    states = {
        "bridge_G": (
            bridge_row(x, y, e, p),
            bridge_row(u, z, e, p),
            bridge_row(x, y, v, w),
            bridge_row(u, z, v, w),
        ),
        "00_C": (
            convolve(x, e), convolve(u, e),
            convolve(x, v), convolve(u, v),
        ),
        "10_delete_a": (
            convolve(y, e), convolve(z, e),
            convolve(y, v), convolve(z, v),
        ),
        "01_delete_p": (
            convolve(x, p), convolve(u, p),
            convolve(x, w), convolve(u, w),
        ),
        "11_D": (
            convolve(y, p), convolve(z, p),
            convolve(y, w), convolve(z, w),
        ),
    }
    payment_expressions = {}
    for state_name, state_rows in states.items():
        forms = compact_forms(state_rows)
        for form_name in ("S_C", "C5_C", "N4_C"):
            payment_expressions[f"{form_name.replace('_C', '')}_{state_name}"] = sp.expand(
                forms[form_name].subs(constants)
            )

    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    child_rules = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        child_rules.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })

    target_degrees, target_coefficients = tensor_binomial(
        sp.expand(target_expression.subs(child_rules)), (h, k)
    )
    payment_coefficients = {}
    payment_degrees = {}
    for name, expression in payment_expressions.items():
        degrees, coefficients = tensor_binomial(
            sp.expand(expression.subs(child_rules)), (h, k)
        )
        payment_degrees[name] = list(degrees)
        payment_coefficients[name] = coefficients

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    face_reports = []
    for epsilon in (0, 1):
        partition_rules = {}
        for rank in range(1, 7):
            partition_rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        variables = tuple((*a[1:], *b[1:], *c[1:], *(d[1:] if epsilon else ())))

        target_rows = {}
        basis_rows = {name: {} for name in payment_coefficients}
        all_indices = set(target_coefficients)
        for coefficients in payment_coefficients.values():
            all_indices.update(coefficients)
        universe = set()
        for index in sorted(all_indices):
            target_poly = sp.Poly(
                sp.expand(target_coefficients.get(index, sp.Integer(0)).subs(partition_rules)),
                *variables,
            )
            target_rows[index] = dict(target_poly.terms())
            universe.update((index, powers) for powers in target_rows[index])
            for name, coefficients in payment_coefficients.items():
                candidate = coefficients.get(index, sp.Integer(0))
                candidate_poly = sp.Poly(
                    sp.expand(candidate.subs(partition_rules)), *variables
                )
                basis_rows[name][index] = dict(candidate_poly.terms())
                universe.update(
                    (index, powers) for powers in basis_rows[name][index]
                )

        universe = sorted(universe, key=lambda item: (item[0], item[1]), reverse=True)
        names = sorted(payment_coefficients)
        target_vector = [
            sp.Rational(target_rows[index].get(powers, 0))
            for index, powers in universe
        ]
        basis_vectors = {
            name: [
                sp.Rational(basis_rows[name][index].get(powers, 0))
                for index, powers in universe
            ]
            for name in names
        }
        matrix = np.array([
            [float(basis_vectors[name][row]) for name in names]
            for row in range(len(universe))
        ])
        target = np.array([float(value) for value in target_vector])
        solution = linprog(
            c=np.zeros(len(names)),
            A_ub=matrix,
            b_ub=target,
            bounds=[(0, None)] * len(names),
            method="highs",
            options={
                "dual_feasibility_tolerance": 1e-9,
                "primal_feasibility_tolerance": 1e-9,
            },
        )
        face = {
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "coefficient_rows": len(universe),
            "global_payments": len(names),
            "floating_feasible": bool(solution.success),
            "exact_rational_certificate": False,
        }
        if solution.success:
            weights = rationalize(solution.x)
            residual = [
                target_vector[row] - sum(
                    weight * basis_vectors[name][row]
                    for weight, name in zip(weights, names)
                )
                for row in range(len(universe))
            ]
            if all(weight >= 0 for weight in weights) and all(value >= 0 for value in residual):
                stream = "".join(
                    f"{index},{powers}:{value};"
                    for (index, powers), value in zip(universe, residual) if value
                )
                face.update({
                    "exact_rational_certificate": True,
                    "weights": {
                        name: str(weight)
                        for name, weight in zip(names, weights) if weight
                    },
                    "nonzero_residual_coefficients": sum(value != 0 for value in residual),
                    "minimum_residual_coefficient": str(min(residual)),
                    "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
                })
        face_reports.append(face)

    report = {
        "marker": MARKER,
        "target_degrees_h_k": list(target_degrees),
        "payment_degrees_h_k": payment_degrees,
        "payments": sorted(payment_expressions),
        "faces": face_reports,
        "logic": (
            "Every payment is S, C5, or N4 on one of four actual marked-forest "
            "deletion states and is therefore nonnegative.  An exact global "
            "weight vector plus coefficientwise nonnegative tensor-Newton "
            "residual proves the target for h,k>=0."
        ),
        "scope": (
            "Internal-spine ordinary-parent g1 with ell>=8 only.  An infeasible "
            "face makes no sign claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "faces": face_reports,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
