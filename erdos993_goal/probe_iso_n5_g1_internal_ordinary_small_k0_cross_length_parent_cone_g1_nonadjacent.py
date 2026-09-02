#!/usr/bin/env python3
"""Probe cross-length parent payments for the five open small-broom k=0 faces.

The fixed-length targets already certified by the parent interval cone are
nonnegative functions of the same parent deletion square.  This probe adds
the compatible longer-length targets as generators when testing ell=1,2 and
the adjacent ell=3 face.  A floating solution is only discovery evidence;
an exactly recovered rational solution is recorded for later solver-free
replay.
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
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from probe_iso_n5_g1_internal_endpoint_boundary_global_payment_root import compact_forms
from probe_iso_n5_g1_internal_ordinary_low00_parent_interval_cone_root import (
    interval_basis,
    recover_exact_basic_solution,
    universal_row_basis,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_cross_length_parent_cone_probe_g1_nonadjacent_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_CROSS_LENGTH_PARENT_CONE_G1_NONADJACENT"
OPEN_FACES = ((1, 0), (1, 1), (2, 0), (2, 1), (3, 0))


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def row_difference(full, deleted):
    return tuple(sp.expand(left - right) for left, right in zip(full, deleted))


def bridge_row(child_full, child_deleted, parent_full, parent_deleted):
    product = convolve(child_full, parent_full)
    forbidden = convolve(
        row_difference(child_full, child_deleted),
        row_difference(parent_full, parent_deleted),
    )
    return tuple(sp.expand(value - removed) for value, removed in zip(product, forbidden))


def target_for_length(expression, rows, ell):
    xrow, urow, yrow, zrow = child_rows(ell, sp.Integer(0))
    rules = {}
    for rank in range(1, 7):
        rules.update({
            rows["X"][rank]: xrow[rank],
            rows["U"][rank]: urow[rank],
            rows["Y"][rank]: yrow[rank],
            rows["Z"][rank]: zrow[rank],
        })
    return sp.expand(expression.subs(rules)), (xrow, urow, yrow, zrow)


def parent_chart(rows, epsilon):
    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
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
    active_rows = (("A", a), ("B", b), ("C", c)) + (("D", d),) * epsilon
    variables = tuple(symbol for _name, row in active_rows for symbol in row[1:])
    return rules, active_rows, variables, (a, b, c, d)


def base_basis(rows, child, partition_rules, active_rows, variables, epsilon):
    x0, u0, y0, z0 = child
    e, p, vrow, wrow = (rows[name] for name in ("E", "P", "V", "W"))
    constants = {
        row[0]: 1
        for row in (rows["X"], rows["U"], rows["Y"], rows["Z"], e, p, vrow, wrow)
    }
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
    global_payments = []
    for state_name, state_rows in states.items():
        forms = compact_forms(state_rows)
        for form_name in ("S_C", "C5_C", "N4_C"):
            label = f"global_ell_target_{form_name.replace('_C', '')}_{state_name}"
            global_payments.append((label, sp.expand(forms[form_name].subs(constants))))

    a, b, c, d = (row for _name, row in active_rows) if epsilon else (
        active_rows[0][1], active_rows[1][1], active_rows[2][1], None
    )
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
        for label, candidate in global_payments
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
    return basis


def vectorize(target, basis, variables):
    target_terms = dict(sp.Poly(target, *variables).terms())
    basis_terms = {
        label: dict(sp.Poly(candidate, *variables).terms())
        for label, candidate in basis
    }
    universe = sorted(
        set(target_terms).union(*(set(terms) for terms in basis_terms.values())),
        reverse=True,
    )
    labels = [label for label, _candidate in basis]
    assert len(labels) == len(set(labels))
    target_vector = [sp.Rational(target_terms.get(powers, 0)) for powers in universe]
    basis_vectors = {
        label: [sp.Rational(basis_terms[label].get(powers, 0)) for powers in universe]
        for label in labels
    }
    return universe, labels, target_vector, basis_vectors


def recover_exact_separator(solution, labels, target_vector, basis_vectors):
    """Recover y>=0, <y,basis_j>>=0, <y,target>=-1 exactly."""

    attempts = []
    for support_tolerance in (1e-8, 1e-10):
        support = [
            index for index, value in enumerate(solution.x)
            if value > support_tolerance
        ]
        for active_tolerance in (1e-10, 1e-9, 1e-8, 1e-7):
            active = [
                label for label in labels
                if abs(float(sum(
                    basis_vectors[label][row] * solution.x[row]
                    for row in range(len(target_vector))
                ))) <= active_tolerance
            ]
            constraint_rows = [
                [target_vector[index] for index in support]
            ] + [
                [basis_vectors[label][index] for index in support]
                for label in active
            ]
            matrix = sp.Matrix(constraint_rows)
            rank = matrix.rank()
            attempts.append({
                "support_tolerance": support_tolerance,
                "active_tolerance": active_tolerance,
                "support": len(support),
                "active_basis": len(active),
                "rank": rank,
            })
            if rank < len(support):
                continue
            _rref, pivot_rows = matrix.T.rref()
            selected = list(pivot_rows[:len(support)])
            square = sp.Matrix([constraint_rows[index] for index in selected])
            rhs = sp.Matrix([
                -1 if index == 0 else 0
                for index in selected
            ])
            try:
                recovered_support = list(square.inv() * rhs)
            except Exception:
                continue
            recovered = [sp.Rational(0)] * len(target_vector)
            for index, value in zip(support, recovered_support):
                recovered[index] = sp.factor(value)
            target_pairing = sum(
                value * coefficient
                for value, coefficient in zip(recovered, target_vector)
            )
            basis_pairings = {
                label: sum(
                    recovered[row] * basis_vectors[label][row]
                    for row in range(len(target_vector))
                )
                for label in labels
            }
            if (
                all(value >= 0 for value in recovered)
                and target_pairing == -1
                and all(value >= 0 for value in basis_pairings.values())
            ):
                return recovered, basis_pairings, {
                    "method": "exact active-constraint separator recovery",
                    "support": len(support),
                    "selected_constraints": selected,
                    "attempts": attempts,
                }
    return None, None, {"method": "failed separator recovery", "attempts": attempts}


def exact_separator(universe, labels, target_vector, basis_vectors):
    """Find an exact Farkas separator for failed coefficient-cone membership."""

    basis_matrix = np.array([
        [float(basis_vectors[label][row]) for row in range(len(universe))]
        for label in labels
    ])
    target_array = np.array([float(value) for value in target_vector])
    solution = linprog(
        c=np.ones(len(universe)),
        A_ub=-basis_matrix,
        b_ub=np.zeros(len(labels)),
        A_eq=np.array([target_array]),
        b_eq=np.array([-1.0]),
        bounds=[(0, None)] * len(universe),
        method="highs",
        options={
            "dual_feasibility_tolerance": 1e-9,
            "primal_feasibility_tolerance": 1e-9,
        },
    )
    if not solution.success:
        return {
            "floating_feasible": False,
            "floating_status": solution.message,
            "exact": False,
        }
    recovered, pairings, recovery = recover_exact_separator(
        solution, labels, target_vector, basis_vectors
    )
    if recovered is None:
        return {
            "floating_feasible": True,
            "floating_status": solution.message,
            "exact": False,
            "exact_recovery": recovery,
        }
    sparse = [
        {"powers": list(universe[index]), "weight": str(value)}
        for index, value in enumerate(recovered) if value
    ]
    stream = "".join(
        f"{universe[index]}:{value};"
        for index, value in enumerate(recovered) if value
    )
    return {
        "floating_feasible": True,
        "floating_status": solution.message,
        "exact": True,
        "exact_recovery": recovery,
        "support": len(sparse),
        "weights": sparse,
        "target_pairing": "-1",
        "minimum_basis_pairing": str(min(pairings.values())),
        "positive_basis_pairings": sum(1 for value in pairings.values() if value > 0),
        "separator_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
    }


def solve_face(expression, rows, ell, epsilon, cross_lengths=(), with_separator=False):
    target_raw, child = target_for_length(expression, rows, ell)
    partition_rules, active_rows, variables, _abcd = parent_chart(rows, epsilon)
    target = sp.expand(target_raw.subs(partition_rules))
    basis = base_basis(rows, child, partition_rules, active_rows, variables, epsilon)
    cross_labels = []
    for known_ell in cross_lengths:
        known_raw, _known_child = target_for_length(expression, rows, known_ell)
        label = f"known_target_ell{known_ell}_{'nonadjacent' if epsilon else 'adjacent'}"
        basis.append((label, sp.expand(known_raw.subs(partition_rules))))
        cross_labels.append(label)

    universe, labels, target_vector, basis_vectors = vectorize(target, basis, variables)
    target_stream = "".join(
        f"{powers}:{value};"
        for powers, value in zip(universe, target_vector) if value
    )
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
    record = {
        "ell": ell,
        "epsilon": epsilon,
        "geometry": "nonadjacent" if epsilon else "adjacent",
        "target_monomials": len(sp.Poly(target, *variables).terms()),
        "target_term_stream_sha256": hashlib.sha256(
            target_stream.encode()
        ).hexdigest().upper(),
        "coefficient_rows": len(universe),
        "base_basis_size": len(basis) - len(cross_labels),
        "cross_length_generators": cross_labels,
        "basis_size": len(basis),
        "floating_feasible": bool(solution.success),
        "floating_status": solution.message,
        "exact_rational_certificate": False,
    }
    if not solution.success:
        if with_separator:
            record["exact_separator"] = exact_separator(
                universe, labels, target_vector, basis_vectors
            )
        return record
    weights, residual, recovery = recover_exact_basic_solution(
        solution, matrix, rhs, labels, target_vector, basis_vectors
    )
    record["exact_recovery"] = recovery
    if weights is None:
        weights = [
            sp.Rational(Fraction(float(value)).limit_denominator(10_000_000))
            for value in solution.x
        ]
        residual = [
            target_vector[row] - sum(
                weights[index] * basis_vectors[label][row]
                for index, label in enumerate(labels)
            )
            for row in range(len(universe))
        ]
    if all(weight >= 0 for weight in weights) and all(value >= 0 for value in residual):
        stream = "".join(
            f"{powers}:{value};"
            for powers, value in zip(universe, residual) if value
        )
        record.update({
            "exact_rational_certificate": True,
            "weights": {
                label: str(weight)
                for label, weight in zip(labels, weights) if weight
            },
            "cross_length_weights": {
                label: str(weight)
                for label, weight in zip(labels, weights)
                if weight and label in cross_labels
            },
            "nonzero_residual_coefficients": sum(value != 0 for value in residual),
            "minimum_residual_coefficient": str(min(residual)),
            "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        })
    else:
        record["minimum_rational_residual"] = str(min(residual))
    return record


def main():
    expression, rows = ordinary_expression()
    literal_faces = [
        solve_face(expression, rows, ell, epsilon)
        for ell in range(1, 8) for epsilon in (0, 1)
    ]
    certified = {
        epsilon: tuple(
            face["ell"] for face in literal_faces
            if face["epsilon"] == epsilon and face["exact_rational_certificate"]
        )
        for epsilon in (0, 1)
    }
    cross_faces = [
        solve_face(
            expression, rows, ell, epsilon,
            tuple(known for known in certified[epsilon] if known > ell),
        )
        for ell, epsilon in OPEN_FACES
    ]
    report = {
        "marker": MARKER,
        "open_faces": [list(face) for face in OPEN_FACES],
        "literal_faces": literal_faces,
        "literal_exact_faces": sum(
            face["exact_rational_certificate"] for face in literal_faces
        ),
        "literal_certified_lengths": {
            "adjacent": list(certified[0]),
            "nonadjacent": list(certified[1]),
        },
        "cross_faces": cross_faces,
        "cross_exact_faces": sum(
            face["exact_rational_certificate"] for face in cross_faces
        ),
        "status": (
            "exact rational discovery certificates; solver-free replay still required"
            if all(face["exact_rational_certificate"] for face in cross_faces)
            else "cross-length cone obstruction; unresolved faces make no sign claim"
        ),
        "scope": (
            "Discovery only for the five open internal-ordinary small-broom k=0 faces. "
            "No theorem, other Newton cell, other canonical mode, all N5, or Problem 993 claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "literal_exact_faces": report["literal_exact_faces"],
        "literal_certified_lengths": report["literal_certified_lengths"],
        "cross_exact_faces": report["cross_exact_faces"],
        "cross_faces": [
            {
                "ell": face["ell"],
                "geometry": face["geometry"],
                "floating_feasible": face["floating_feasible"],
                "exact": face["exact_rational_certificate"],
                "cross_length_weights": face.get("cross_length_weights", {}),
            }
            for face in cross_faces
        ],
        "status": report["status"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
