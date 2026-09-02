#!/usr/bin/env python3
"""Search for a grouped positive bulk plus one boundary-atom representation."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_path_isolate_p4_affine_parameter_monotonicity_common_order_atom_sources import coefficient_map
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, V, m, q, x, z
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_common_kernel_tp2_order import atom_column
from probe_path_isolate_p4_affine_parameter_monotonicity_deweighted_grouped_source import PRIMES, group_index
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

    numerator_only = sorted(set(numerator) - set(denominator))
    mode_records = []
    for mode in ("sum", "w"):
        indices = sorted({group_index(atom, mode) for atom in denominator})
        grouped = {index: [0] * (order + 1) for index in indices}
        for atom, coefficient in denominator.items():
            destination = grouped[group_index(atom, mode)]
            for j, value in enumerate(atom_columns[atom]):
                destination[j] += coefficient * value
        base_rows = [
            [grouped[index][j] for index in indices]
            for j in range(order + 1)
        ]
        base_ranks = {
            prime: rank_mod_prime(base_rows, prime) for prime in PRIMES
        }
        compatible = []
        certified_no_count = 0
        inconclusive_count = 0
        for atom in numerator_only:
            column = atom_columns[atom]
            prime_records = []
            works = True
            certified_no = False
            for prime in PRIMES:
                extended = [row + [column[j]] for j, row in enumerate(base_rows)]
                augmented = [
                    row + [column[j], target_vector[j]]
                    for j, row in enumerate(base_rows)
                ]
                extended_rank = rank_mod_prime(extended, prime)
                augmented_rank = rank_mod_prime(augmented, prime)
                works = works and (
                    extended_rank == base_ranks[prime] + 1
                    and augmented_rank == extended_rank
                )
                certified_no = certified_no or (
                    extended_rank == len(indices) + 1
                    and augmented_rank == len(indices) + 2
                )
                prime_records.append({
                    "prime": prime,
                    "base_rank": base_ranks[prime],
                    "extended_rank": extended_rank,
                    "augmented_rank": augmented_rank,
                })
            if works:
                compatible.append({
                    "atom": list(atom),
                    "numerator_coefficient": numerator[atom],
                    "prime_records": prime_records,
                })
            elif certified_no:
                certified_no_count += 1
            else:
                inconclusive_count += 1
        mode_records.append({
            "mode": mode,
            "group_count": len(indices),
            "numerator_only_candidate_count": len(numerator_only),
            "one_boundary_atom_compatible_count": len(compatible),
            "one_boundary_atom_certified_impossible_count": certified_no_count,
            "one_boundary_atom_inconclusive_count": inconclusive_count,
            "first_compatible_atoms": compatible[:20],
        })

    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "parameters": {str(symbol): int(value) for symbol, value in values.items()},
        "order": order,
        "numerator_only_atom_count": len(numerator_only),
        "mode_records": mode_records,
    }


def main():
    records = [
        audit("group", 0, "m", {c: 1, m: 16, x: 40}, 25),
        audit("bottom", 1, "x", {m: 20, x: 40}, 26),
    ]
    report = {
        "status": (
            "PROVED_NO_GROUPED_PLUS_ONE_BOUNDARY_ATOM_REPRESENTATION"
            if all(
                mode["one_boundary_atom_certified_impossible_count"]
                == mode["numerator_only_candidate_count"]
                for record in records for mode in record["mode_records"]
            )
            else "GROUPED_PLUS_ONE_BOUNDARY_MODULAR_PROBE"
        ),
        "records": records,
        "warning": (
            "Compatibility modulo three primes is evidence, not an exact "
            "rational representation; nonexistence is not certified unless "
            "an explicit rank gap is recorded for every candidate."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "grouped_plus_boundary_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
