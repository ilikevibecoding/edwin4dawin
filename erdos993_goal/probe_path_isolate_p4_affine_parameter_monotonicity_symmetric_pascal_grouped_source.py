#!/usr/bin/env python3
"""Search grouped positive-source representations for h=-D/R.

Unlike the deweighted quotient, the symmetric-Pascal utilization uses
the same order-r symmetric transform for the signed source -D and the
positive reserve source R.  This probe asks whether the transformed
numerator lies in a low-dimensional span obtained by grouping reserve
atoms by natural symmetric statistics.
"""

from __future__ import annotations

import json
from pathlib import Path

from analyze_path_isolate_p4_affine_parameter_monotonicity_common_order_atom_sources import coefficient_map
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, m, q, x
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_common_kernel_tp2_order import atom_column
from probe_path_isolate_p4_affine_parameter_monotonicity_deweighted_grouped_source import (
    PRIMES,
    group_index,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_deweighted_moment_representation import rank_mod_prime
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def audit(package, parity, coordinate, values, r):
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    numerator = coefficient_map((-quotient(d_expression, common)).subs(values))
    denominator = coefficient_map(quotient(reserve_expression, common).subs(values))
    assert denominator and all(value > 0 for value in denominator.values())

    m_value = int(values[m])
    x_value = int(values[x])
    c_value = int(values.get(c, 0))
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group"
        else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 1
        if package == "group"
        else 2 * m_value + parity - 2
    )
    target = m_value + r + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2

    atoms = set(numerator) | set(denominator)
    columns = {
        atom: atom_column(*atom, a=a, b=b, n=r, target=target)
        for atom in atoms
    }
    target_vector = [0] * (r + 1)
    for atom, coefficient in numerator.items():
        for j, value in enumerate(columns[atom]):
            target_vector[j] += coefficient * value

    modes = []
    for mode in ("sum", "absolute_difference", "minimum", "maximum", "z", "w", "difference"):
        indices = sorted({group_index(atom, mode) for atom in denominator})
        grouped = {index: [0] * (r + 1) for index in indices}
        for atom, coefficient in denominator.items():
            destination = grouped[group_index(atom, mode)]
            for j, value in enumerate(columns[atom]):
                destination[j] += coefficient * value
        rows = [[grouped[index][j] for index in indices] for j in range(r + 1)]
        modular = []
        certified_no = False
        compatible = True
        for prime in PRIMES:
            rank = rank_mod_prime(rows, prime)
            augmented_rank = rank_mod_prime(
                [row + [target_vector[j]] for j, row in enumerate(rows)], prime
            )
            certified = (
                len(indices) <= r + 1
                and rank == len(indices)
                and augmented_rank == len(indices) + 1
            )
            certified_no = certified_no or certified
            compatible = compatible and rank == augmented_rank
            modular.append(
                {
                    "prime": prime,
                    "rank": rank,
                    "augmented_rank": augmented_rank,
                    "full_column_nonexistence_certificate": certified,
                }
            )
        modes.append(
            {
                "mode": mode,
                "group_count": len(indices),
                "certified_no_rational_representation": certified_no,
                "compatible_modulo_all_tested_primes": compatible,
                "modular_records": modular,
            }
        )
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "parameters": {str(symbol): int(value) for symbol, value in values.items()},
        "r": r,
        "numerator_atom_count": len(numerator),
        "positive_denominator_atom_count": len(denominator),
        "numerator_only_atom_count": len(set(numerator) - set(denominator)),
        "modes": modes,
    }


def main() -> None:
    records = [
        audit("group", 0, "m", {c: 1, m: 16, x: 40}, 25),
        audit("bottom", 1, "x", {m: 20, x: 40}, 26),
    ]
    report = {
        "status": "SYMMETRIC_PASCAL_GROUPED_SOURCE_PROBE",
        "records": records,
        "warning": (
            "A full-column modular rank gap proves nonexistence over Q; "
            "rank compatibility alone is not an exact reconstruction."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "symmetric_pascal_grouped_source_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
