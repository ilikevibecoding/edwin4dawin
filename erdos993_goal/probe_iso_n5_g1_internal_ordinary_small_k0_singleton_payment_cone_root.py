#!/usr/bin/env python3
"""Probe singleton-mode payments on literal short-broom k=0 faces.

The internal target uses the diagonal of the deletion square

    C = 00 (keep child attachment a and ordinary parent p),
    D = 11 (delete both a and p).

Each edge of that square is itself a canonical singleton g1 configuration:
delete p horizontally, or delete a vertically.  For ell>=2, both a and p are
ordinary vertices.  For ell=1, a=u and the vertical edges are singleton-
endpoint configurations.  This probe adds the valid edge payments to the
literal parent interval cone and tests the diagonal target.

The singleton-ordinary whole-mode theorem is still being assembled, so even an
exact cone is discovery-only until that dependency and a solver-free replay are
pinned.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    isolate_multiply,
    raw_coefficients,
)
from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from probe_iso_n5_g1_internal_ordinary_low00_parent_interval_cone_root import (
    recover_exact_basic_solution,
)
from probe_iso_n5_g1_internal_ordinary_small_k0_cross_length_parent_cone_g1_nonadjacent import (
    base_basis,
    parent_chart,
    target_for_length,
    vectorize,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_singleton_payment_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_SINGLETON_PAYMENT_CONE_ROOT"
FACES = tuple((ell, epsilon) for ell in (1, 2, 3) for epsilon in (0, 1))
ISOLATE_EXTENSIONS = tuple(range(17))


def specialize_g1(crows, drows):
    generic_c, generic_d, raw_g1, _raw_g2 = raw_coefficients()
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update(dict(zip(generic, actual)))
    return sp.expand(raw_g1.subs(rules))


def state_rows(rows, child):
    x, u, y, z = child
    e, p, v, w = (rows[name] for name in ("E", "P", "V", "W"))
    return {
        "00": (
            convolve(x, e), convolve(u, e),
            convolve(x, v), convolve(u, v),
        ),
        "10": (
            convolve(y, e), convolve(z, e),
            convolve(y, v), convolve(z, v),
        ),
        "01": (
            convolve(x, p), convolve(u, p),
            convolve(x, w), convolve(u, w),
        ),
        "11": (
            convolve(y, p), convolve(z, p),
            convolve(y, w), convolve(z, w),
        ),
    }


def solve_face(expression, rows, ell, epsilon):
    target_raw, child = target_for_length(expression, rows, ell)
    partition_rules, active_rows, variables, _abcd = parent_chart(rows, epsilon)
    target = sp.expand(target_raw.subs(partition_rules))
    basis = base_basis(rows, child, partition_rules, active_rows, variables, epsilon)
    states = state_rows(rows, child)
    payment_specs = [
        ("singleton_horizontal_keep_a_g1_00_to_01", states["00"], states["01"]),
        ("singleton_vertical_keep_p_g1_00_to_10", states["00"], states["10"]),
        ("singleton_vertical_after_p_g1_01_to_11", states["01"], states["11"]),
    ]
    # Deleting a first leaves the marked vertex u only when ell>=2.
    if ell >= 2:
        payment_specs.append((
            "singleton_horizontal_after_a_g1_10_to_11",
            states["10"], states["11"],
        ))
    payments = []
    for label, crows, drows in payment_specs:
        for amount in ISOLATE_EXTENSIONS:
            suffix = "" if amount == 0 else f"_plus_{amount}_isolates"
            payments.append((
                label + suffix,
                specialize_g1(
                    isolate_multiply(crows, amount),
                    isolate_multiply(drows, amount),
                ),
            ))
    constants = {
        row[0]: 1
        for row in (
            rows["X"], rows["U"], rows["Y"], rows["Z"],
            rows["E"], rows["P"], rows["V"], rows["W"],
        )
    }
    payment_labels = []
    for label, payment in payments:
        basis.append((label, sp.expand(payment.subs(constants).subs(partition_rules))))
        payment_labels.append(label)

    universe, labels, target_vector, basis_vectors = vectorize(target, basis, variables)
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
        "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
        "target_monomials": len(sp.Poly(target, *variables).terms()),
        "coefficient_rows": len(universe),
        "basis_size": len(labels),
        "singleton_payment_labels": payment_labels,
        "floating_feasible": bool(solution.success),
        "floating_status": solution.message,
        "exact_rational_certificate": False,
    }
    if not solution.success:
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
            "singleton_payment_weights": {
                label: str(weight)
                for label, weight in zip(labels, weights)
                if weight and label in payment_labels
            },
            "nonzero_residual_coefficients": sum(value != 0 for value in residual),
            "minimum_residual_coefficient": str(min(residual)),
            "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        })
    return record


def main() -> None:
    expression, rows = ordinary_expression()
    faces = [solve_face(expression, rows, ell, epsilon) for ell, epsilon in FACES]
    report = {
        "marker": MARKER,
        "faces": faces,
        "exact_faces": sum(face["exact_rational_certificate"] for face in faces),
        "total_faces": len(faces),
        "dependency_status": (
            "singleton_endpoint whole mode frozen; singleton_ordinary whole mode pending final assembly"
        ),
        "isolate_extensions": list(ISOLATE_EXTENSIONS),
        "status": "discovery cone; solver-free replay and theorem dependency pins required",
        "scope": (
            "Literal ell=1..3 k=0 internal-ordinary g1 faces only; no other "
            "Newton cells, canonical modes, full N5, or Problem 993 claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "exact_faces": report["exact_faces"],
        "faces": [
            {
                "ell": face["ell"],
                "geometry": face["geometry"],
                "exact": face["exact_rational_certificate"],
                "singleton_weights": face.get("singleton_payment_weights", {}),
            }
            for face in faces
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
