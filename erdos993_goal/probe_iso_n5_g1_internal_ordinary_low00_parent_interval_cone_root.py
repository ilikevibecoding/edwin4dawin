#!/usr/bin/env python3
"""Exact parent interval/dominance cone for the large-broom origin cell.

For H=F-{p,v}, the rows A=I(H), B=I(H-S_v), C=I(H-S_p), and
D=I(H-(S_p union S_v)) form four genuine forests.  Forest acyclicity makes
each deletion A->B, A->C, B->D, C->D a deletion of at most one vertex from
each connected component.  Hence every proved disconnected-M5 interval sum
is nonnegative on those pairs.  Each row also obeys the proved HC, Q3,
two-step, and rank-two forest inequalities, and every coefficient dominance
difference can be multiplied by any nonnegative coefficient variable.

This probe asks whether those exact generators leave a coefficientwise
nonnegative residual for the sole (h,k)=(0,0) cell on each mark geometry.
Only an exactly reconstructed rational cone is a theorem certificate.
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
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    interval_cells,
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_low00_parent_interval_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW00_PARENT_INTERVAL_CONE_ROOT"
CELL = (0, 0)


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def rationalize(values):
    return [
        sp.Rational(Fraction(float(value)).limit_denominator(10_000_000))
        for value in values
    ]


def recover_exact_basic_solution(
    solution, matrix, rhs, labels, target_vector, basis_vectors
):
    """Recover a rational basic feasible point from HiGHS active rows."""
    floating_slack = rhs - matrix @ solution.x
    attempts = []
    for support_tolerance in (1e-8, 1e-10):
        support = [
            index for index, value in enumerate(solution.x)
            if value > support_tolerance
        ]
        support_labels = [labels[index] for index in support]
        for active_tolerance in (1e-10, 1e-9, 1e-8, 1e-7):
            active = [
                row for row, value in enumerate(floating_slack)
                if abs(float(value)) <= active_tolerance
            ]
            active_matrix = sp.Matrix([
                [basis_vectors[label][row] for label in support_labels]
                for row in active
            ])
            rank = active_matrix.rank()
            attempts.append({
                "support_tolerance": support_tolerance,
                "active_tolerance": active_tolerance,
                "support": len(support),
                "active": len(active),
                "rank": rank,
            })
            if rank < len(support):
                continue
            # Pivot columns of A^T identify an independent set of rows of A.
            _rref, pivot_rows = active_matrix.T.rref()
            selected = [active[index] for index in pivot_rows[:len(support)]]
            square = sp.Matrix([
                [basis_vectors[label][row] for label in support_labels]
                for row in selected
            ])
            right = sp.Matrix([target_vector[row] for row in selected])
            try:
                recovered_support = list(square.inv() * right)
            except Exception:
                continue
            recovered = [sp.Rational(0)] * len(labels)
            for index, value in zip(support, recovered_support):
                recovered[index] = sp.factor(value)
            residual = [
                target_vector[row] - sum(
                    recovered[index] * basis_vectors[label][row]
                    for index, label in enumerate(labels)
                )
                for row in range(len(target_vector))
            ]
            if all(value >= 0 for value in recovered) and all(
                value >= 0 for value in residual
            ):
                return recovered, residual, {
                    "method": "exact active-row basic recovery",
                    "support_tolerance": support_tolerance,
                    "active_tolerance": active_tolerance,
                    "support": len(support),
                    "active": len(active),
                    "selected_rows": selected,
                    "attempts": attempts,
                }
    return None, None, {"method": "failed active-row recovery", "attempts": attempts}


def interval_basis(full, deleted, prefix):
    """Map every interval generator supported by the available row ranks."""
    expressions = unique_expressions(interval_cells(P, H))[1:]
    mapping = {P[0]: 1, H[0]: 1}
    mapping.update({P[index]: full[index] for index in range(1, len(full))})
    mapping.update({H[index]: deleted[index] for index in range(1, len(deleted))})
    supported = set(mapping)
    result = []
    for label, expression in enumerate(expressions, 2):
        if not expression.free_symbols.issubset(supported):
            continue
        result.append((f"interval_{prefix}_{label}", sp.expand(expression.subs(mapping))))
    return result


def universal_row_basis(row, prefix):
    result = []
    if len(row) > 5:
        result.append((f"HC_{prefix}", row[3] ** 2 - row[1] * row[5]))
    if len(row) > 4:
        result.extend([
            (f"Q3_{prefix}", 6 * row[3] ** 2 - row[2] * row[3] - 8 * row[2] * row[4]),
            (f"two_step_{prefix}", 2 * row[2] * row[3] - row[1] * row[3] - 4 * row[1] * row[4]),
        ])
    if len(row) > 3:
        result.append((
            f"rank2_companion_{prefix}",
            2 * row[2] ** 2 - 3 * row[1] * row[3] - 2 * row[2],
        ))
    return [(label, sp.expand(value)) for label, value in result]


def main() -> None:
    expression, rows = ordinary_expression()
    ell = 8
    collision_count = 0
    origin_rules = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(collision_count, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(collision_count, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        origin_rules.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    target = sp.expand(expression.subs(origin_rules))

    x, urow, y, zrow = (rows[name] for name in ("X", "U", "Y", "Z"))
    e, p, vrow, wrow = (rows[name] for name in ("E", "P", "V", "W"))
    constants = {row[0]: 1 for row in (x, urow, y, zrow, e, p, vrow, wrow)}
    x0 = tuple(sp.Integer(1) if rank == 0 else origin_rules[x[rank]] for rank in range(7))
    u0 = tuple(sp.Integer(1) if rank == 0 else origin_rules[urow[rank]] for rank in range(7))
    y0 = tuple(sp.Integer(1) if rank == 0 else origin_rules[y[rank]] for rank in range(7))
    z0 = tuple(sp.Integer(1) if rank == 0 else origin_rules[zrow[rank]] for rank in range(7))

    def row_difference(full, deleted):
        return tuple(sp.expand(left - right) for left, right in zip(full, deleted))

    def bridge_row(child_full, child_deleted, parent_full, parent_deleted):
        product = convolve(child_full, parent_full)
        forbidden = convolve(
            row_difference(child_full, child_deleted),
            row_difference(parent_full, parent_deleted),
        )
        return tuple(
            sp.expand(value - removed)
            for value, removed in zip(product, forbidden)
        )

    states = {
        "bridge_G": (
            bridge_row(x0, y0, e, p), bridge_row(u0, z0, e, p),
            bridge_row(x0, y0, vrow, wrow), bridge_row(u0, z0, vrow, wrow),
        ),
        "00_C": (
            convolve(x0, e), convolve(u0, e),
            convolve(x0, vrow), convolve(u0, vrow),
        ),
        "10_delete_a": (
            convolve(y0, e), convolve(z0, e),
            convolve(y0, vrow), convolve(z0, vrow),
        ),
        "01_delete_p": (
            convolve(x0, p), convolve(u0, p),
            convolve(x0, wrow), convolve(u0, wrow),
        ),
        "11_D": (
            convolve(y0, p), convolve(z0, p),
            convolve(y0, wrow), convolve(z0, wrow),
        ),
    }
    global_payments = {}
    for state_name, state_rows in states.items():
        forms = compact_forms(state_rows)
        for form_name in ("S_C", "C5_C", "N4_C"):
            global_payments[
                f"global_{form_name.replace('_C', '')}_{state_name}"
            ] = sp.expand(forms[form_name].subs(constants))

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
        active_rows = (("A", a), ("B", b), ("C", c)) + (("D", d),) * epsilon
        variables = tuple(symbol for _name, row in active_rows for symbol in row[1:])
        basis = []
        basis.extend(interval_basis(a, b, "A_B"))
        basis.extend(interval_basis(a, c, "A_C"))
        if epsilon:
            basis.extend(interval_basis(b, d, "B_D"))
            basis.extend(interval_basis(c, d, "C_D"))
        for name, row in active_rows:
            basis.extend(universal_row_basis(row, name))
        basis.extend([
            (label, sp.expand(candidate.subs(partition_rules)))
            for label, candidate in global_payments.items()
        ])

        multipliers = [("one", sp.Integer(1))] + [(str(symbol), symbol) for symbol in variables]
        deletion_pairs = [("A_B", a, b), ("A_C", a, c)]
        if epsilon:
            deletion_pairs.extend([("B_D", b, d), ("C_D", c, d)])
        for pair_name, full, deleted in deletion_pairs:
            for rank in range(1, min(len(full), len(deleted))):
                difference = full[rank] - deleted[rank]
                for multiplier_name, multiplier in multipliers:
                    basis.append((
                        f"dominance_{pair_name}_{rank}_times_{multiplier_name}",
                        sp.expand(difference * multiplier),
                    ))

        target_poly = sp.Poly(sp.expand(target.subs(partition_rules)), *variables)
        target_terms = dict(target_poly.terms())
        basis_terms = {
            label: dict(sp.Poly(candidate, *variables).terms())
            for label, candidate in basis
        }
        universe = sorted(
            set(target_terms).union(*(set(terms) for terms in basis_terms.values())),
            reverse=True,
        )
        labels = [label for label, _candidate in basis]
        target_vector = [sp.Rational(target_terms.get(powers, 0)) for powers in universe]
        basis_vectors = {
            label: [sp.Rational(basis_terms[label].get(powers, 0)) for powers in universe]
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
            "target_monomials": len(target_poly.terms()),
            "coefficient_rows": len(universe),
            "basis_size": len(basis),
            "basis_by_family": {
                "interval": sum(label.startswith("interval_") for label in labels),
                "universal_row": sum(label.startswith(("HC_", "Q3_", "two_step_", "rank2_")) for label in labels),
                "global_payment": sum(label.startswith("global_") for label in labels),
                "dominance": sum(label.startswith("dominance_") for label in labels),
            },
            "floating_feasible": bool(solution.success),
            "floating_status": solution.message,
            "exact_rational_certificate": False,
        }
        if solution.success:
            face["floating_nonzero_weights"] = {
                label: format(float(value), ".17g")
                for label, value in zip(labels, solution.x)
                if value > 1e-10
            }
            floating_slack = rhs - matrix @ solution.x
            face["floating_minimum_residual"] = format(
                float(np.min(floating_slack)), ".17g"
            )
            face["floating_active_rows_1e_8"] = int(
                np.count_nonzero(np.abs(floating_slack) <= 1e-8)
            )
            weights, residual, recovery = recover_exact_basic_solution(
                solution, matrix, rhs, labels, target_vector, basis_vectors
            )
            face["exact_recovery"] = recovery
            if weights is None:
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
                face["first_negative_rational_residuals"] = [
                    {
                        "powers": list(powers),
                        "value": str(value),
                    }
                    for powers, value in zip(universe, residual)
                    if value < 0
                ][:12]
        faces.append(face)

    report = {
        "marker": MARKER,
        "cell": list(CELL),
        "faces": faces,
        "logic": (
            "All basis elements are proved nonnegative for the exact parent "
            "deletion geometry.  Nonnegative rational weights plus a "
            "coefficientwise nonnegative residual certify the origin cell."
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
