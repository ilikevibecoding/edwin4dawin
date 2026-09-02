#!/usr/bin/env python3
"""Probe the literal ell=1,2 k=0 residual after a singleton payment.

For the deletion square 00,10,01,11, the finite census through parent order
eleven found no negative value of

    g1(00,11) - g1(10,11).

The second term is already covered by the frozen singleton-ordinary theorem.
This discovery probe asks whether the residual itself belongs to the standard
exact parent cone (interval, universal-row, global S/C5/N4, and dominance
payments).  A floating solution is only discovery evidence; an exactly
recovered rational solution is recorded for later solver-free replay.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

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
from probe_iso_n5_g1_internal_ordinary_small_k0_ell2_from_ell1_cone_root import (
    specialize_g1,
    states,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_k0_after_payment_residual_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_AFTER_PAYMENT_RESIDUAL_ROOT"


def solve(ell: int, epsilon: int, quantity: str):
    expression, rows = ordinary_expression()
    target_raw, child = target_for_length(expression, rows, ell)
    square = states(rows, child)
    after_raw = specialize_g1(square["10"], square["11"])
    constants = {
        row[0]: 1
        for row in (
            rows["X"], rows["U"], rows["Y"], rows["Z"],
            rows["E"], rows["P"], rows["V"], rows["W"],
        )
    }
    residual_raw = sp.expand(target_raw - after_raw.subs(constants))

    partition_rules, active_rows, variables, _abcd = parent_chart(rows, epsilon)
    residual = sp.expand(residual_raw.subs(partition_rules))
    target = sp.expand(target_raw.subs(partition_rules))
    after = sp.expand(after_raw.subs(constants).subs(partition_rules))
    assert sp.expand(residual - target + after) == 0

    basis = base_basis(
        rows, child, partition_rules, active_rows, variables, epsilon
    )
    candidate = residual if quantity == "residual" else after
    universe, labels, target_vector, basis_vectors = vectorize(
        candidate, basis, variables
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

    stream = "".join(
        f"{powers}:{value};"
        for powers, value in zip(universe, target_vector) if value
    )
    record = {
        "ell": ell,
        "epsilon": epsilon,
        "geometry": "nonadjacent" if epsilon else "adjacent",
        "quantity": quantity,
        "identity": (
            "g1(00,11)-g1(10,11)" if quantity == "residual"
            else "g1(10,11)"
        ),
        "candidate_monomials": len(sp.Poly(candidate, *variables).terms()),
        "candidate_term_stream_sha256": hashlib.sha256(stream.encode()).hexdigest().upper(),
        "coefficient_rows": len(universe),
        "basis_size": len(labels),
        "floating_feasible": bool(solution.success),
        "floating_status": solution.message,
        "exact_rational_certificate": False,
    }
    if not solution.success:
        return record

    weights, remainder, recovery = recover_exact_basic_solution(
        solution, matrix, rhs, labels, target_vector, basis_vectors
    )
    record["exact_recovery"] = recovery
    if weights is None:
        weights = [
            sp.Rational(Fraction(float(value)).limit_denominator(10_000_000))
            for value in solution.x
        ]
        remainder = [
            target_vector[row] - sum(
                weights[index] * basis_vectors[label][row]
                for index, label in enumerate(labels)
            )
            for row in range(len(universe))
        ]
    if all(weight >= 0 for weight in weights) and all(value >= 0 for value in remainder):
        remainder_stream = "".join(
            f"{powers}:{value};"
            for powers, value in zip(universe, remainder) if value
        )
        record.update({
            "exact_rational_certificate": True,
            "positive_weights": {
                label: str(weight)
                for label, weight in zip(labels, weights) if weight
            },
            "positive_weight_count": len([weight for weight in weights if weight > 0]),
            "positive_remainder_terms": len([value for value in remainder if value > 0]),
            "minimum_remainder_coefficient": str(min(remainder)),
            "remainder_stream_sha256": hashlib.sha256(
                remainder_stream.encode()
            ).hexdigest().upper(),
        })
    return record


def main() -> None:
    faces = [
        solve(ell, epsilon, quantity)
        for quantity in ("residual", "after_payment")
        for ell in (1, 2)
        for epsilon in (0, 1)
    ]
    report = {
        "marker": MARKER,
        "faces": faces,
        "exact_faces": sum(face["exact_rational_certificate"] for face in faces),
        "status": (
            "discovery probe; every exact face still requires a pinned "
            "solver-free replay and dependency audit"
        ),
        "scope": (
            "Only the four literal ell=1,2 k=0 internal-spine ordinary-parent "
            "g1 residuals; no broader sign is asserted."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
