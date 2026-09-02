#!/usr/bin/env python3
"""Probe one-dimensional grouped representations of the deweighted quotient."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_affine_parameter_monotonicity_common_order_atom_sources import coefficient_map
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, V, m, q, x, z, w
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_common_kernel_tp2_order import atom_column
from probe_path_isolate_p4_affine_parameter_monotonicity_deweighted_moment_representation import rank_mod_prime
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


PRIMES = [1000003, 1000033, 1000037]


def group_index(atom: tuple[int, int], mode: str):
    pz, pw = atom
    return {
        "sum": pz + pw,
        "difference": pz - pw,
        "absolute_difference": abs(pz - pw),
        "z": pz,
        "w": pw,
        "minimum": min(pz, pw),
        "maximum": max(pz, pw),
    }[mode]


def audit(package, parity, coordinate, values, order):
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
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

    atoms = set(numerator) | set(denominator)
    atom_columns = {
        atom: atom_column(*atom, a=a, b=b, n=order, target=target)
        for atom in atoms
    }
    target_vector = [0] * (order + 1)
    for atom, coefficient in numerator.items():
        for j, value in enumerate(atom_columns[atom]):
            target_vector[j] += coefficient * value

    mode_records = []
    for mode in (
        "sum", "difference", "absolute_difference", "z", "w",
        "minimum", "maximum",
    ):
        indices = sorted({group_index(atom, mode) for atom in denominator})
        grouped = {index: [0] * (order + 1) for index in indices}
        for atom, coefficient in denominator.items():
            column = atom_columns[atom]
            destination = grouped[group_index(atom, mode)]
            for j, value in enumerate(column):
                destination[j] += coefficient * value
        rows = [[grouped[index][j] for index in indices] for j in range(order + 1)]
        adjacent_minor_positive = 0
        adjacent_minor_negative = 0
        adjacent_minor_zero = 0
        first_negative_adjacent_minor = None
        first_positive_adjacent_minor = None
        for j in range(order):
            for column in range(len(indices) - 1):
                determinant = (
                    rows[j][column] * rows[j + 1][column + 1]
                    - rows[j][column + 1] * rows[j + 1][column]
                )
                if determinant > 0:
                    adjacent_minor_positive += 1
                    if first_positive_adjacent_minor is None:
                        first_positive_adjacent_minor = {
                            "rows": [j, j + 1],
                            "indices": [indices[column], indices[column + 1]],
                            "determinant": str(determinant),
                        }
                elif determinant < 0:
                    adjacent_minor_negative += 1
                    if first_negative_adjacent_minor is None:
                        first_negative_adjacent_minor = {
                            "rows": [j, j + 1],
                            "indices": [indices[column], indices[column + 1]],
                            "determinant": str(determinant),
                        }
                else:
                    adjacent_minor_zero += 1
        modular = []
        certified_no = False
        modular_compatible = True
        for prime in PRIMES:
            rank = rank_mod_prime(rows, prime)
            augmented_rank = rank_mod_prime(
                [row + [target_vector[j]] for j, row in enumerate(rows)], prime
            )
            full_column_no = (
                len(indices) <= order + 1
                and rank == len(indices)
                and augmented_rank == len(indices) + 1
            )
            certified_no = certified_no or full_column_no
            modular_compatible = modular_compatible and rank == augmented_rank
            modular.append({
                "prime": prime,
                "rank": rank,
                "augmented_rank": augmented_rank,
                "full_column_nonexistence_certificate": full_column_no,
            })
        mode_records.append({
            "mode": mode,
            "group_count": len(indices),
            "index_minimum": min(indices),
            "index_maximum": max(indices),
            "certified_no_rational_representation": certified_no,
            "compatible_modulo_all_tested_primes": modular_compatible,
            "adjacent_minor_positive_count": adjacent_minor_positive,
            "adjacent_minor_negative_count": adjacent_minor_negative,
            "adjacent_minor_zero_count": adjacent_minor_zero,
            "natural_order_is_tp2_on_adjacent_minors": (
                adjacent_minor_negative == 0
            ),
            "natural_or_reverse_order_has_uniform_adjacent_minor_sign": (
                adjacent_minor_positive == 0 or adjacent_minor_negative == 0
            ),
            "first_positive_adjacent_minor": first_positive_adjacent_minor,
            "first_negative_adjacent_minor": first_negative_adjacent_minor,
            "modular_records": modular,
        })

    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "parameters": {str(symbol): int(value) for symbol, value in values.items()},
        "order": order,
        "positive_denominator_atom_count": len(denominator),
        "numerator_atom_count": len(numerator),
        "mode_records": mode_records,
    }


def main():
    records = [
        audit("group", 0, "m", {c: 1, m: 16, x: 40}, 25),
        audit("bottom", 1, "x", {m: 20, x: 40}, 26),
    ]
    report = {
        "status": "EXACT_GROUPED_SOURCE_MODULAR_PROBE",
        "records": records,
        "warning": (
            "A full-column modular rank gap proves nonexistence over Q. "
            "Equal modular ranks are only compatibility evidence until an "
            "exact rational representation is reconstructed."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "deweighted_grouped_source_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
