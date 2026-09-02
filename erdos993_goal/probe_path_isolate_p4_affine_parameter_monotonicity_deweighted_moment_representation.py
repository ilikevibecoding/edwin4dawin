#!/usr/bin/env python3
"""Search for a low-degree positive-reserve moment representation.

For the deweighted common quotient

    v_j = Psi_j(U) / Psi_j(W),
    U=(1+z)(-L),  W=T^2 Q,

the source W is coefficientwise positive.  This script asks whether,
after the common transform, Psi(U) can be represented as Psi(h W) for a
polynomial statistic h(p,q) of low total degree on source exponents.
Such a representation need not hold coefficientwise; it only needs to
hold on all output rows.  Exact matrix ranks decide existence.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_affine_parameter_monotonicity_common_order_atom_sources import (
    coefficient_map,
)
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, V, m, q, x, z, w
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_common_kernel_tp2_order import (
    atom_column,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def vector_for_source(
    source: dict[tuple[int, int], int],
    *,
    a: int,
    b: int,
    order: int,
    target: int,
) -> list[int]:
    result = [0] * (order + 1)
    for atom, coefficient in source.items():
        column = atom_column(
            *atom, a=a, b=b, n=order, target=target
        )
        for j, value in enumerate(column):
            result[j] += coefficient * value
    return result


def rank_mod_prime(rows: list[list[int]], prime: int) -> int:
    matrix = [[value % prime for value in row] for row in rows]
    if not matrix:
        return 0
    row_count = len(matrix)
    column_count = len(matrix[0])
    pivot_row = 0
    for column in range(column_count):
        pivot = next(
            (row for row in range(pivot_row, row_count) if matrix[row][column]),
            None,
        )
        if pivot is None:
            continue
        matrix[pivot_row], matrix[pivot] = matrix[pivot], matrix[pivot_row]
        inverse = pow(matrix[pivot_row][column], -1, prime)
        matrix[pivot_row] = [
            value * inverse % prime for value in matrix[pivot_row]
        ]
        for row in range(row_count):
            if row == pivot_row or not matrix[row][column]:
                continue
            multiplier = matrix[row][column]
            matrix[row] = [
                (left - multiplier * right) % prime
                for left, right in zip(matrix[row], matrix[pivot_row])
            ]
        pivot_row += 1
        if pivot_row == row_count:
            break
    return pivot_row


def audit(
    package: str,
    parity: int,
    coordinate: str,
    values: dict[sp.Symbol, int],
    order: int,
    maximum_degree: int = 5,
) -> dict:
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    ell = quotient(d_reduced - reserve_reduced, V)
    numerator_source_expression = sp.expand((1 + z) * (-ell))
    denominator_source_expression = reserve_reduced
    numerator_source = coefficient_map(
        numerator_source_expression.subs(values)
    )
    denominator_source = coefficient_map(
        denominator_source_expression.subs(values)
    )
    assert denominator_source and all(
        coefficient > 0 for coefficient in denominator_source.values()
    )

    m_value = int(values[m])
    x_value = int(values[x])
    c_value = int(values.get(c, 0))
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group"
        else m_value + x_value - 3
    )
    original_b = (
        2 * m_value + parity - 4
        if package == "group"
        else 2 * m_value + parity - 5
    )
    b = original_b + 3
    target = m_value + order + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2

    target_vector = vector_for_source(
        numerator_source, a=a, b=b, order=order, target=target
    )
    denominator_vector = vector_for_source(
        denominator_source, a=a, b=b, order=order, target=target
    )
    assert all(value > 0 for value in denominator_vector)

    atom_columns = {
        atom: atom_column(*atom, a=a, b=b, n=order, target=target)
        for atom in denominator_source
    }
    records = []
    primes = [1000003, 1000033, 1000037]
    for degree in range(maximum_degree + 1):
        basis = [
            (pz_degree, total_degree - pz_degree)
            for total_degree in range(degree + 1)
            for pz_degree in range(total_degree + 1)
        ]
        moment_columns = []
        for p_power, q_power in basis:
            column = [0] * (order + 1)
            for (pz, pw), coefficient in denominator_source.items():
                multiplier = coefficient * pz**p_power * pw**q_power
                atom_values = atom_columns[pz, pw]
                for j, value in enumerate(atom_values):
                    column[j] += multiplier * value
            moment_columns.append(column)
        rows = [
            [column[j] for column in moment_columns]
            for j in range(order + 1)
        ]
        modular_records = []
        certified_nonexistence = False
        for prime in primes:
            rank = rank_mod_prime(rows, prime)
            augmented_rank = rank_mod_prime(
                [row + [target_vector[j]] for j, row in enumerate(rows)],
                prime,
            )
            certificate = (
                rank == len(basis) and augmented_rank == len(basis) + 1
            )
            certified_nonexistence = certified_nonexistence or certificate
            modular_records.append({
                "prime": prime,
                "matrix_rank": rank,
                "augmented_rank": augmented_rank,
                "full_column_rank_nonexistence_certificate": certificate,
            })
        record = {
            "maximum_total_degree": degree,
            "basis_size": len(basis),
            "certified_no_representation_over_rationals": certified_nonexistence,
            "modular_records": modular_records,
        }
        records.append(record)

    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "parameters": {str(symbol): int(value) for symbol, value in values.items()},
        "order": order,
        "a": a,
        "b": b,
        "target": target,
        "positive_denominator_atom_count": len(denominator_source),
        "numerator_atom_count": len(numerator_source),
        "degree_records": records,
        "all_degrees_through_five_certified_impossible": all(
            record["certified_no_representation_over_rationals"]
            for record in records
        ),
    }


def main() -> None:
    records = [
        audit("group", 0, "m", {c: 1, m: 16, x: 40}, 25),
        audit("bottom", 1, "x", {m: 20, x: 40}, 26),
    ]
    report = {
        "status": (
            "PROVED_NO_TOTAL_DEGREE_AT_MOST_FIVE_MOMENT_REPRESENTATION"
            if all(
                record["all_degrees_through_five_certified_impossible"]
                for record in records
            )
            else "LOW_DEGREE_NONEXISTENCE_NOT_CERTIFIED"
        ),
        "records": records,
        "warning": (
            "For each degree at most five, a prime with full column rank "
            "for the moment matrix and one higher augmented rank proves "
            "nonexistence over the rationals. Degree six is deliberately "
            "excluded because its 28-dimensional basis already matches or "
            "exceeds the 26/27 output-row counts and would amount to interpolation."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "deweighted_moment_representation_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
