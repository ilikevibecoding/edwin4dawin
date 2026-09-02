#!/usr/bin/env python3
"""Extract an exact separating functional for a literal short-k0 cone gap.

The primal parent cone seeks nonnegative generator weights whose subtraction
leaves a coefficientwise nonnegative residual.  Its normalized Farkas dual is

    y >= 0, sum(y)=1, M^T y >= 0,

minimizing ``target^T y``.  A negative exact value proves only that the named
generator cone cannot certify the target; it is not a graph counterexample.
The support monomials identify the missing structural inequality.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog
from scipy.sparse import coo_matrix, hstack, vstack

from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from probe_iso_n5_g1_internal_ordinary_small_k0_cross_length_parent_cone_g1_nonadjacent import (
    base_basis,
    parent_chart,
    target_for_length,
    vectorize,
)


HERE = Path(__file__).resolve().parent
ELL = int(os.environ.get("ERDOS993_SMALL_K0_ELL", "1"))
EPSILON = int(os.environ.get("ERDOS993_SMALL_K0_EPSILON", "0"))
assert ELL in range(1, 8)
assert EPSILON in (0, 1)
OUTPUT = HERE / (
    f"iso_n5_g1_internal_ordinary_small_k0_ell{ELL}_eps{EPSILON}_"
    "literal_parent_cone_dual_diagnostic_root_20260830.json"
)
MARKER = (
    f"DIAGNOSTIC_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_ELL{ELL}_"
    f"EPS{EPSILON}_LITERAL_PARENT_CONE_DUAL_ROOT"
)


def rationalize(values):
    return [
        sp.Rational(Fraction(float(value)).limit_denominator(100_000_000))
        for value in values
    ]


def main() -> None:
    expression, rows = ordinary_expression()
    target_raw, child = target_for_length(expression, rows, ELL)
    partition_rules, active_rows, variables, _abcd = parent_chart(rows, EPSILON)
    target = sp.expand(target_raw.subs(partition_rules))
    basis = base_basis(
        rows, child, partition_rules, active_rows, variables, EPSILON
    )
    universe, labels, target_vector, basis_vectors = vectorize(
        target, basis, variables
    )
    matrix = np.array([
        [float(basis_vectors[label][row]) for label in labels]
        for row in range(len(universe))
    ])
    objective = np.array([float(value) for value in target_vector])
    solution = linprog(
        c=objective,
        A_ub=-matrix.T,
        b_ub=np.zeros(len(labels)),
        A_eq=np.ones((1, len(universe))),
        b_eq=np.ones(1),
        bounds=[(0, None)] * len(universe),
        method="highs",
        options={
            "dual_feasibility_tolerance": 1e-9,
            "primal_feasibility_tolerance": 1e-9,
        },
    )
    report = {
        "marker": MARKER,
        "ell": ELL,
        "epsilon": EPSILON,
        "geometry": "adjacent" if EPSILON == 0 else "nonadjacent",
        "coefficient_rows": len(universe),
        "basis_size": len(labels),
        "floating_success": bool(solution.success),
        "floating_status": solution.message,
        "exact_separating_certificate": False,
    }
    if solution.success:
        report["floating_objective"] = format(float(solution.fun), ".17g")
        # Move into the strict interior of the generator halfspaces while
        # retaining half of the negative separating objective.  This makes
        # the subsequent rational reconstruction fail-closed and robust.
        threshold = float(solution.fun) / 2.0
        generator_block = hstack((coo_matrix(-matrix.T), np.ones((len(labels), 1))))
        target_block = coo_matrix(
            np.concatenate((objective, np.array([0.0]))).reshape(1, -1)
        )
        margin_solution = linprog(
            c=np.concatenate((np.zeros(len(universe)), np.array([-1.0]))),
            A_ub=vstack((generator_block, target_block), format="csr"),
            b_ub=np.concatenate((np.zeros(len(labels)), np.array([threshold]))),
            A_eq=np.concatenate((np.ones(len(universe)), np.array([0.0]))).reshape(1, -1),
            b_eq=np.ones(1),
            bounds=[(0, None)] * len(universe) + [(None, None)],
            method="highs",
            options={
                "dual_feasibility_tolerance": 1e-9,
                "primal_feasibility_tolerance": 1e-9,
            },
        )
        assert margin_solution.success
        report["floating_margin"] = format(float(margin_solution.x[-1]), ".17g")
        report["floating_retained_target_threshold"] = format(threshold, ".17g")
        exact_y_raw = rationalize(margin_solution.x[:-1])
        exact_sum_raw = sum(exact_y_raw)
        assert exact_sum_raw > 0
        exact_y = [value / exact_sum_raw for value in exact_y_raw]
        exact_sum = sum(exact_y)
        generator_values = [
            sum(exact_y[row] * basis_vectors[label][row] for row in range(len(universe)))
            for label in labels
        ]
        target_value = sum(
            exact_y[row] * target_vector[row] for row in range(len(universe))
        )
        exact = bool(
            all(value >= 0 for value in exact_y)
            and exact_sum == 1
            and all(value >= 0 for value in generator_values)
            and target_value < 0
        )
        support = [index for index, value in enumerate(exact_y) if value]
        report.update({
            "exact_separating_certificate": exact,
            "exact_sum": str(exact_sum),
            "exact_target_value": str(target_value),
            "minimum_exact_generator_value": str(min(generator_values)),
            "support_size": len(support),
            "support": [
                {
                    "row": index,
                    "monomial_powers": list(universe[index]),
                    "weight": str(exact_y[index]),
                }
                for index in support
            ],
            "tight_generators": [
                label for label, value in zip(labels, generator_values) if value == 0
            ][:80],
        })
    report["interpretation"] = (
        "A separating certificate rules out this generator cone only; it is not "
        "a forest witness and does not disprove g1 or Problem 993."
    )
    report["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
