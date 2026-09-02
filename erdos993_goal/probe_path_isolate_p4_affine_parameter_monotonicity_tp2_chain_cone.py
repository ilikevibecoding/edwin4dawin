#!/usr/bin/env python3
"""Search for a positive one-dimensional TP2-chain representation.

This is an exploratory numerical cone test followed by exact combinatorial
checks of the chain.  Numerical feasibility is not a proof; infeasibility
is also only evidence.  A successful sparse basis would be reconstructed
exactly in a subsequent certificate.
"""

from __future__ import annotations

from fractions import Fraction
import functools
import json
from pathlib import Path

import numpy as np
from scipy.optimize import linprog

from analyze_path_isolate_p4_affine_parameter_monotonicity_common_order_atom_sources import coefficient_map
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, V, m, q, x, z
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_common_kernel_tp2_order import atom_column
from probe_path_isolate_p4_affine_parameter_monotonicity_deweighted_grouped_source import PRIMES
from probe_path_isolate_p4_affine_parameter_monotonicity_deweighted_moment_representation import rank_mod_prime
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def audit(package, parity, coordinate, values, order):
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group" else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    ell = quotient(d_reduced - reserve_reduced, V)
    numerator = coefficient_map((-(1 + z) * ell).subs(values))
    denominator = coefficient_map(reserve_reduced.subs(values))
    assert all(value > 0 for value in denominator.values())

    m_value = int(values[m])
    x_value = int(values[x])
    c_value = int(values.get(c, 0))
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    original_b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    b = original_b + 3
    target = m_value + order + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2

    all_columns = {
        atom: atom_column(*atom, a=a, b=b, n=order, target=target)
        for atom in denominator
    }
    columns = {
        atom: column
        for atom, column in all_columns.items()
        if all(value > 0 for value in column)
    }

    def first_ratio_compare(left, right):
        left_column = columns[left]
        right_column = columns[right]
        cross = left_column[1] * right_column[0] - right_column[1] * left_column[0]
        if cross < 0:
            return -1
        if cross > 0:
            return 1
        return (left > right) - (left < right)

    atoms = sorted(columns, key=functools.cmp_to_key(first_ratio_compare))

    def precedes(left, right):
        left_column = columns[left]
        right_column = columns[right]
        return all(
            left_column[j] * right_column[j + 1]
            - right_column[j] * left_column[j + 1] >= 0
            for j in range(order)
        )

    length = [1] * len(atoms)
    previous = [-1] * len(atoms)
    for right in range(len(atoms)):
        for left in range(right):
            if length[left] + 1 > length[right] and precedes(atoms[left], atoms[right]):
                length[right] = length[left] + 1
                previous[right] = left
    cursor = max(range(len(atoms)), key=length.__getitem__)
    chain_indices = []
    while cursor >= 0:
        chain_indices.append(cursor)
        cursor = previous[cursor]
    chain = [atoms[index] for index in reversed(chain_indices)]

    denominator_vector = [0] * (order + 1)
    numerator_vector = [0] * (order + 1)
    numerator_columns = {
        atom: atom_column(*atom, a=a, b=b, n=order, target=target)
        for atom in numerator
    }
    for atom, coefficient in denominator.items():
        for j, value in enumerate(all_columns[atom]):
            denominator_vector[j] += coefficient * value
    for atom, coefficient in numerator.items():
        for j, value in enumerate(numerator_columns[atom]):
            numerator_vector[j] += coefficient * value

    scaled = np.array([
        [
            float(Fraction(denominator[atom] * columns[atom][j], denominator_vector[j]))
            for atom in chain
        ]
        for j in range(order + 1)
    ])
    result = linprog(
        np.zeros(len(chain)),
        A_eq=scaled,
        b_eq=np.ones(order + 1),
        bounds=(0, None),
        method="highs-ds",
    )
    nonzero = []
    sparse_modular_records = []
    if result.success:
        nonzero = [
            {
                "chain_index": index,
                "atom": list(chain[index]),
                "relative_to_original_weight": float(value),
            }
            for index, value in enumerate(result.x)
            if value > 1e-9
        ]
        selected_atoms = [chain[item["chain_index"]] for item in nonzero]
        selected_rows = [
            [columns[atom][j] for atom in selected_atoms]
            for j in range(order + 1)
        ]
        for prime in PRIMES:
            rank = rank_mod_prime(selected_rows, prime)
            augmented_rank = rank_mod_prime(
                [row + [denominator_vector[j]] for j, row in enumerate(selected_rows)],
                prime,
            )
            sparse_modular_records.append({
                "prime": prime,
                "selected_matrix_rank": rank,
                "augmented_rank": augmented_rank,
                "full_column_nonexistence_certificate": (
                    rank == len(selected_atoms)
                    and augmented_rank == len(selected_atoms) + 1
                ),
            })

    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "parameters": {str(symbol): int(value) for symbol, value in values.items()},
        "order": order,
        "positive_atom_count": len(atoms),
        "endpoint_zero_atom_count": len(all_columns) - len(columns),
        "longest_tp2_chain_length": len(chain),
        "chain_matrix_numeric_rank": int(np.linalg.matrix_rank(scaled)),
        "positive_cone_lp_success": bool(result.success),
        "positive_cone_lp_status": int(result.status),
        "positive_cone_lp_message": result.message,
        "positive_cone_maximum_equality_residual": (
            float(np.max(np.abs(scaled @ result.x - 1)))
            if result.success else None
        ),
        "positive_cone_nonzero_weight_count": len(nonzero),
        "positive_cone_nonzero_weights": nonzero,
        "sparse_support_modular_records": sparse_modular_records,
        "chain_first_atoms": [list(atom) for atom in chain[:20]],
        "chain_last_atoms": [list(atom) for atom in chain[-20:]],
        "warning": "The cone calculation is floating-point exploratory evidence only.",
    }


def main():
    records = [
        audit("group", 0, "m", {c: 1, m: 16, x: 40}, 25),
        audit("bottom", 1, "x", {m: 20, x: 40}, 26),
    ]
    report = {
        "status": "NUMERICAL_TP2_CHAIN_CONE_PROBE",
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "tp2_chain_cone_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
