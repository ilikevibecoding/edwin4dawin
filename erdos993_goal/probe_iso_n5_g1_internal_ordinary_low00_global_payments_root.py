#!/usr/bin/env python3
"""Exact global-payment cone search for the sole large-broom origin cell.

At tensor-Newton index (0,0), a polynomial's coefficient is its value at
h=k=0.  Therefore the (0,0) coefficient of each universal S, C5, or N4 form
on an actual composite/deleted marked forest is itself nonnegative.  This
probe seeks independent nonnegative payment weights on the adjacent and
nonadjacent parent faces so that the remaining origin-cell polynomial is
coefficientwise nonnegative in the mark-inclusion partition rows.

An exact rational residual is a theorem certificate for this one cell.  A
floating infeasibility or failed rational reconstruction is diagnostic only.
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
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_low00_global_payments_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW00_GLOBAL_PAYMENTS_ROOT"
CELL = (0, 0)


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def rationalize(values):
    return [
        sp.Rational(Fraction(float(value)).limit_denominator(10_000_000))
        for value in values
    ]


def main() -> None:
    target_expression, rows = ordinary_expression()
    x, u, y, z = (rows[name] for name in ("X", "U", "Y", "Z"))
    e, p, v, w = (rows[name] for name in ("E", "P", "V", "W"))
    constants = {row[0]: 1 for row in (x, u, y, z, e, p, v, w)}

    # The origin cell is ell=8, k=0.  Materialize the four small integer
    # child rows before building any composite universal forms.
    ell = 8
    collision_count = 0
    origin_rules = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(collision_count, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(collision_count, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        origin_rules.update({
            x[rank]: x_value,
            u[rank]: u_value,
            y[rank]: y_value,
            z[rank]: z_value,
        })
    x_origin = tuple(sp.Integer(1) if rank == 0 else origin_rules[x[rank]] for rank in range(7))
    u_origin = tuple(sp.Integer(1) if rank == 0 else origin_rules[u[rank]] for rank in range(7))
    y_origin = tuple(sp.Integer(1) if rank == 0 else origin_rules[y[rank]] for rank in range(7))
    z_origin = tuple(sp.Integer(1) if rank == 0 else origin_rules[z[rank]] for rank in range(7))

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
            bridge_row(x_origin, y_origin, e, p),
            bridge_row(u_origin, z_origin, e, p),
            bridge_row(x_origin, y_origin, v, w),
            bridge_row(u_origin, z_origin, v, w),
        ),
        "00_C": (
            convolve(x_origin, e), convolve(u_origin, e),
            convolve(x_origin, v), convolve(u_origin, v),
        ),
        "10_delete_a": (
            convolve(y_origin, e), convolve(z_origin, e),
            convolve(y_origin, v), convolve(z_origin, v),
        ),
        "01_delete_p": (
            convolve(x_origin, p), convolve(u_origin, p),
            convolve(x_origin, w), convolve(u_origin, w),
        ),
        "11_D": (
            convolve(y_origin, p), convolve(z_origin, p),
            convolve(y_origin, w), convolve(z_origin, w),
        ),
    }
    payments = {}
    for state_name, state_rows in states.items():
        forms = compact_forms(state_rows)
        for form_name in ("S_C", "C5_C", "N4_C"):
            label = f"{form_name.replace('_C', '')}_{state_name}"
            payments[label] = sp.expand(forms[form_name].subs(constants))

    target = sp.expand(target_expression.subs(origin_rules))
    payment_cells = payments

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    faces = []
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
        target_terms = dict(sp.Poly(sp.expand(target.subs(partition_rules)), *variables).terms())
        payment_terms = {
            label: dict(
                sp.Poly(sp.expand(form.subs(partition_rules)), *variables).terms()
            )
            for label, form in payment_cells.items()
        }
        universe = sorted(
            set(target_terms).union(*(set(terms) for terms in payment_terms.values())),
            reverse=True,
        )
        labels = sorted(payment_terms)
        target_vector = [sp.Rational(target_terms.get(powers, 0)) for powers in universe]
        basis_vectors = {
            label: [sp.Rational(payment_terms[label].get(powers, 0)) for powers in universe]
            for label in labels
        }
        matrix = np.array([
            [float(basis_vectors[label][row]) for label in labels]
            for row in range(len(universe))
        ])
        rhs = np.array([float(value) for value in target_vector])
        solution = linprog(
            c=np.zeros(len(labels)),
            A_ub=matrix,
            b_ub=rhs,
            bounds=[(0, None)] * len(labels),
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
            "global_payments": len(labels),
            "floating_feasible": bool(solution.success),
            "floating_status": solution.message,
            "exact_rational_certificate": False,
        }
        if solution.success:
            weights = rationalize(solution.x)
            residual = [
                target_vector[row] - sum(
                    weight * basis_vectors[label][row]
                    for weight, label in zip(weights, labels)
                )
                for row in range(len(universe))
            ]
            if all(weight >= 0 for weight in weights) and all(value >= 0 for value in residual):
                stream = "".join(
                    f"{powers}:{value};"
                    for powers, value in zip(universe, residual) if value
                )
                face.update({
                    "exact_rational_certificate": True,
                    "weights": {
                        label: str(weight)
                        for label, weight in zip(labels, weights) if weight
                    },
                    "nonzero_residual_coefficients": sum(value != 0 for value in residual),
                    "minimum_residual_coefficient": str(min(residual)),
                    "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
                })
            else:
                face["rational_reconstruction_minimum_residual"] = str(min(residual))
        faces.append(face)

    report = {
        "marker": MARKER,
        "cell": list(CELL),
        "payments": sorted(payments),
        "faces": faces,
        "logic": (
            "At binomial index (0,0), each payment is the value of a proved "
            "universal marked-forest form on an actual composite/deleted state. "
            "Nonnegative exact weights plus a coefficientwise nonnegative "
            "partition residual prove this cell."
        ),
        "status": (
            "exact theorem certificate" if all(face["exact_rational_certificate"] for face in faces)
            else "diagnostic cone search; unresolved face makes no sign claim"
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "faces": faces}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
