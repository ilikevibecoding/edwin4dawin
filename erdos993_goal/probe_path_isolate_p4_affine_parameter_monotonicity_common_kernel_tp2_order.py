#!/usr/bin/env python3
"""Test whether the literal positive reserve atoms admit any TP2 order.

For the common-order transform

    Phi_j(H) = C(n,j) [z^N w^N]
               A^a T^b w^j (1+z)^(n-j) H,

the column indexed by a source monomial z^p w^q has the explicit
positive binomial-product sum recorded below.  If two columns have
2-by-2 minors of both signs (with the output rows kept in increasing
order), then no ordering of those two source atoms can make the kernel
TP2, hence no ordering of the full literal source support can make it
TP3.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, m, q, x, z, w
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def choose(n: int, k: int) -> int:
    if n < 0 or k < 0 or k > n:
        return 0
    return math.comb(n, k)


def coefficient_map(expression: sp.Expr) -> dict[tuple[int, int], int]:
    return {
        tuple(map(int, exponent)): int(coefficient)
        for exponent, coefficient in sp.Poly(sp.expand(expression), z, w).terms()
    }


def atom_column(
    pz: int,
    pw: int,
    *,
    a: int,
    b: int,
    n: int,
    target: int,
) -> list[int]:
    values = []
    for j in range(n + 1):
        inner = 0
        for k in range(b + 1):
            inner += (
                choose(b, k)
                * choose(a + b - k, target - pw - b + k - j)
                * choose(a + k + n - j, target - pz - k)
            )
        values.append(choose(n, j) * inner)
    return values


def audit(
    package: str,
    parity: int,
    coordinate: str,
    values: dict[sp.Symbol, int],
    r: int,
) -> dict:
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    reserve_reduced = quotient(reserve_expression, common)
    reserve_source = quotient(reserve_reduced, 1 + z)
    specialized = sp.expand(reserve_source.subs(values))
    support_map = coefficient_map(specialized)
    assert support_map and all(value > 0 for value in support_map.values())

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
    target = m_value + r + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2
    n = r + 1

    support = sorted(support_map)
    columns = {
        atom: atom_column(*atom, a=a, b=b, n=n, target=target)
        for atom in support
    }

    conflict_count = 0
    first_conflict = None
    for left_index, left in enumerate(support):
        left_column = columns[left]
        for right in support[left_index + 1 :]:
            right_column = columns[right]
            positive = []
            negative = []
            for j in range(n):
                determinant = (
                    left_column[j] * right_column[j + 1]
                    - right_column[j] * left_column[j + 1]
                )
                if determinant > 0:
                    positive.append((j, determinant))
                elif determinant < 0:
                    negative.append((j, determinant))
            if positive and negative:
                conflict_count += 1
                if first_conflict is None:
                    jp, dp = positive[0]
                    jn, dn = negative[0]
                    first_conflict = {
                        "left_atom": list(left),
                        "right_atom": list(right),
                        "left_source_coefficient": support_map[left],
                        "right_source_coefficient": support_map[right],
                        "positive_adjacent_minor": {
                            "rows": [jp, jp + 1],
                            "determinant": str(dp),
                            "left_values": [left_column[jp], left_column[jp + 1]],
                            "right_values": [right_column[jp], right_column[jp + 1]],
                        },
                        "negative_adjacent_minor": {
                            "rows": [jn, jn + 1],
                            "determinant": str(dn),
                            "left_values": [left_column[jn], left_column[jn + 1]],
                            "right_values": [right_column[jn], right_column[jn + 1]],
                        },
                    }

    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "parameters": {str(symbol): int(value) for symbol, value in values.items()},
        "r": r,
        "n": n,
        "a": a,
        "b": b,
        "target": target,
        "positive_reserve_atom_count": len(support),
        "pair_count": len(support) * (len(support) - 1) // 2,
        "adjacent_minor_sign_conflict_pair_count": conflict_count,
        "literal_source_support_admits_tp2_order": conflict_count == 0,
        "first_conflict": first_conflict,
    }


def main() -> None:
    records = [
        audit("group", 0, "m", {c: 1, m: 16, x: 40}, 25),
        audit("bottom", 1, "x", {m: 20, x: 40}, 26),
    ]
    any_conflict = all(record["first_conflict"] is not None for record in records)
    report = {
        "status": (
            "PROVED_LITERAL_SOURCE_HAS_NO_TP2_ORDER_IN_BOTH_HARD_CASES"
            if any_conflict
            else "NO_UNIFORM_OBSTRUCTION_FOUND"
        ),
        "interpretation": (
            "Opposite signs for adjacent 2-by-2 minors of one fixed column "
            "pair cannot be repaired by reversing the column order. Thus the "
            "literal positive reserve atoms cannot form a TP2, hence TP3, "
            "kernel under any source ordering in each certified case."
        ),
        "records": records,
    }
    output = Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "common_kernel_tp2_order_20260802.json"
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
