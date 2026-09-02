#!/usr/bin/env python3
"""Test whether the literal ell=2 k=0 faces reduce to ell=1.

The finite deletion-square census found no negative value of

    T_ell2 - g1(10,11)

through parent order eleven.  This probe adds the same-face literal ell=1
target, the valid singleton square-edge payments, and the standard exact
parent cone to see whether ell=2 is a formal consequence of ell=1 plus already
proved singleton modes.  A certificate is conditional on a future ell=1 sign
theorem and requires a solver-free replay before promotion.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n5_g1_internal_endpoint_broom_factor_root import convolve
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from probe_iso_n5_g1_internal_ordinary_low00_parent_interval_cone_root import recover_exact_basic_solution
from probe_iso_n5_g1_internal_ordinary_small_k0_cross_length_parent_cone_g1_nonadjacent import (
    base_basis,
    parent_chart,
    target_for_length,
    vectorize,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_ell2_from_ell1_cone_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_ELL2_FROM_ELL1_CONE_ROOT"


def specialize_g1(crows, drows):
    generic_c, generic_d, raw_g1, _raw_g2 = raw_coefficients()
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update(dict(zip(generic, actual)))
    return sp.expand(raw_g1.subs(rules))


def states(rows, child):
    x, u, y, z = child
    e, p, v, w = (rows[name] for name in ("E", "P", "V", "W"))
    return {
        "00": (convolve(x, e), convolve(u, e), convolve(x, v), convolve(u, v)),
        "10": (convolve(y, e), convolve(z, e), convolve(y, v), convolve(z, v)),
        "01": (convolve(x, p), convolve(u, p), convolve(x, w), convolve(u, w)),
        "11": (convolve(y, p), convolve(z, p), convolve(y, w), convolve(z, w)),
    }


def solve(epsilon):
    expression, rows = ordinary_expression()
    target2_raw, child2 = target_for_length(expression, rows, 2)
    target1_raw, _child1 = target_for_length(expression, rows, 1)
    partition_rules, active_rows, variables, _abcd = parent_chart(rows, epsilon)
    target2 = sp.expand(target2_raw.subs(partition_rules))
    target1 = sp.expand(target1_raw.subs(partition_rules))
    basis = base_basis(rows, child2, partition_rules, active_rows, variables, epsilon)
    basis.append(("conditional_literal_ell1_same_face", target1))
    square = states(rows, child2)
    constants = {
        row[0]: 1 for row in (
            rows["X"], rows["U"], rows["Y"], rows["Z"],
            rows["E"], rows["P"], rows["V"], rows["W"],
        )
    }
    for label, crows, drows in (
        ("singleton_00_to_01", square["00"], square["01"]),
        ("singleton_00_to_10", square["00"], square["10"]),
        ("singleton_10_to_11", square["10"], square["11"]),
        ("singleton_01_to_11", square["01"], square["11"]),
    ):
        basis.append((
            label,
            sp.expand(specialize_g1(crows, drows).subs(constants).subs(partition_rules)),
        ))
    universe, labels, target_vector, basis_vectors = vectorize(target2, basis, variables)
    matrix = np.array([
        [float(basis_vectors[label][row]) for label in labels]
        for row in range(len(universe))
    ])
    rhs = np.array([float(value) for value in target_vector])
    solution = linprog(
        c=np.zeros(len(labels)), A_ub=matrix, b_ub=rhs,
        bounds=[(0, None)] * len(labels), method="highs",
        options={"dual_feasibility_tolerance": 1e-9, "primal_feasibility_tolerance": 1e-9},
    )
    record = {
        "epsilon": epsilon,
        "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
        "floating_feasible": bool(solution.success),
        "floating_status": solution.message,
        "basis_size": len(labels),
        "coefficient_rows": len(universe),
        "exact_rational_certificate": False,
    }
    if not solution.success:
        return record
    weights, residual, recovery = recover_exact_basic_solution(
        solution, matrix, rhs, labels, target_vector, basis_vectors
    )
    record["exact_recovery"] = recovery
    if weights is None:
        weights = [sp.Rational(Fraction(float(value)).limit_denominator(10_000_000)) for value in solution.x]
        residual = [
            target_vector[row] - sum(
                weights[index] * basis_vectors[label][row]
                for index, label in enumerate(labels)
            )
            for row in range(len(universe))
        ]
    if all(weight >= 0 for weight in weights) and all(value >= 0 for value in residual):
        stream = "".join(
            f"{powers}:{value};" for powers, value in zip(universe, residual) if value
        )
        record.update({
            "exact_rational_certificate": True,
            "weights": {label: str(weight) for label, weight in zip(labels, weights) if weight},
            "ell1_weight": str(weights[labels.index("conditional_literal_ell1_same_face")]),
            "singleton_weights": {
                label: str(weight)
                for label, weight in zip(labels, weights)
                if weight and label.startswith("singleton_")
            },
            "minimum_residual_coefficient": str(min(residual)),
            "residual_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        })
    return record


def main():
    faces = [solve(epsilon) for epsilon in (0, 1)]
    report = {
        "marker": MARKER,
        "faces": faces,
        "exact_faces": sum(face["exact_rational_certificate"] for face in faces),
        "status": "conditional discovery; literal ell1 theorem and solver-free replay required",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
