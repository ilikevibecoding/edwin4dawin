#!/usr/bin/env python3
"""Test TP2 geometry after exact z<->w orbit symmetrisation.

For a symmetric source H, diagonal extraction allows replacement of the
one-sided V-split kernel by

  S_j^(r) = w^j(1+z)^(r-j) + z^j(1+w)^(r-j).

Thus source monomials occur in unordered orbits {z^p w^q,z^q w^p}.
This probe checks whether the corresponding positive reserve-orbit
columns admit any TP2 order.  The earlier literal-atom obstruction did
not perform this exact symmetry reduction.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, m, q, x, z, w
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_common_kernel_tp2_order import (
    atom_column,
    coefficient_map,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def audit(package, parity, coordinate, values, r):
    _, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    reserve = quotient(reserve_expression, common)
    source = coefficient_map(reserve.subs(values))
    assert source and all(value > 0 for value in source.values())
    assert all(source.get((pw, pz), 0) == value for (pz, pw), value in source.items())

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

    orbits = sorted({tuple(sorted(atom)) for atom in source})
    columns = {}
    weights = {}
    for orbit in orbits:
        pz, pw = orbit
        column = atom_column(pz, pw, a=a, b=b, n=r, target=target)
        if pz != pw:
            swapped = atom_column(pw, pz, a=a, b=b, n=r, target=target)
            column = [left + right for left, right in zip(column, swapped)]
        columns[orbit] = column
        weights[orbit] = source[pz, pw]

    conflict_pairs = []
    uniform_positive_pairs = 0
    uniform_negative_pairs = 0
    all_zero_pairs = 0
    orientation_edges = []
    sign_word_counts = {}
    maximum_pair_sign_transitions = 0
    multiple_transition_pair_count = 0
    for left_index, left in enumerate(orbits):
        for right in orbits[left_index + 1 :]:
            determinants = [
                columns[left][j] * columns[right][j + 1]
                - columns[right][j] * columns[left][j + 1]
                for j in range(r)
            ]
            positive = [j for j, value in enumerate(determinants) if value > 0]
            negative = [j for j, value in enumerate(determinants) if value < 0]
            sign_word = []
            for determinant in determinants:
                if not determinant:
                    continue
                sign = 1 if determinant > 0 else -1
                if not sign_word or sign_word[-1] != sign:
                    sign_word.append(sign)
            word_key = ",".join(map(str, sign_word)) if sign_word else "zero"
            sign_word_counts[word_key] = sign_word_counts.get(word_key, 0) + 1
            transitions = max(0, len(sign_word) - 1)
            maximum_pair_sign_transitions = max(
                maximum_pair_sign_transitions, transitions
            )
            multiple_transition_pair_count += transitions > 1
            if positive and negative:
                if len(conflict_pairs) < 20:
                    conflict_pairs.append(
                        {
                            "left_orbit": list(left),
                            "right_orbit": list(right),
                            "first_positive_rows": [positive[0], positive[0] + 1],
                            "first_negative_rows": [negative[0], negative[0] + 1],
                            "first_positive_determinant": str(determinants[positive[0]]),
                            "first_negative_determinant": str(determinants[negative[0]]),
                        }
                    )
            elif positive:
                uniform_positive_pairs += 1
                orientation_edges.append((left, right))
            elif negative:
                uniform_negative_pairs += 1
                orientation_edges.append((right, left))
            else:
                all_zero_pairs += 1

    # If every pair has a uniform sign, test whether those orientations
    # are compatible with one global source order.
    indegree = {orbit: 0 for orbit in orbits}
    successors = {orbit: set() for orbit in orbits}
    for earlier, later in orientation_edges:
        if later not in successors[earlier]:
            successors[earlier].add(later)
            indegree[later] += 1
    queue = sorted(orbit for orbit, degree in indegree.items() if degree == 0)
    topological = []
    while queue:
        orbit = queue.pop(0)
        topological.append(orbit)
        for later in sorted(successors[orbit]):
            indegree[later] -= 1
            if indegree[later] == 0:
                queue.append(later)
                queue.sort()

    conflict_count = 0
    # Recount without retaining every witness.
    for left_index, left in enumerate(orbits):
        for right in orbits[left_index + 1 :]:
            signs = set()
            for j in range(r):
                determinant = (
                    columns[left][j] * columns[right][j + 1]
                    - columns[right][j] * columns[left][j + 1]
                )
                if determinant:
                    signs.add(1 if determinant > 0 else -1)
                if len(signs) == 2:
                    conflict_count += 1
                    break

    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "parameters": {str(symbol): int(value) for symbol, value in values.items()},
        "r": r,
        "symmetric_orbit_count": len(orbits),
        "pair_count": len(orbits) * (len(orbits) - 1) // 2,
        "mixed_adjacent_minor_pair_count": conflict_count,
        "uniform_positive_pair_count": uniform_positive_pairs,
        "uniform_negative_pair_count": uniform_negative_pairs,
        "all_zero_pair_count": all_zero_pairs,
        "pair_adjacent_minor_sign_word_counts": sign_word_counts,
        "maximum_pair_adjacent_minor_sign_transition_count": (
            maximum_pair_sign_transitions
        ),
        "multiple_transition_pair_count": multiple_transition_pair_count,
        "pair_orientations_acyclic": len(topological) == len(orbits),
        "tp2_order_exists": conflict_count == 0 and len(topological) == len(orbits),
        "first_ordered_orbits": [list(orbit) for orbit in topological[:20]],
        "first_conflicts": conflict_pairs,
    }


def main() -> None:
    records = [
        audit("group", 0, "m", {c: 1, m: 16, x: 40}, 25),
        audit("bottom", 1, "x", {m: 20, x: 40}, 26),
    ]
    report = {
        "status": (
            "SYMMETRIC_ORBIT_KERNEL_TP2_IN_BOTH_HARD_CASES"
            if all(record["tp2_order_exists"] for record in records)
            else "SYMMETRIC_ORBIT_KERNEL_STILL_NOT_TP2"
        ),
        "records": records,
        "warning": (
            "TP2 is only the minimum requirement; quotient convexity would "
            "still require TP3 and a compatible signed-source representation."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "symmetric_orbit_kernel_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
