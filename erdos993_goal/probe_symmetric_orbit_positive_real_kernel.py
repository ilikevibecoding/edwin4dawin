#!/usr/bin/env python3
"""Test the orbit-pair kernel behind the positive-real reserve comparison."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_original_reserve_pencil_crossings import product
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, q, w, z
from probe_exceptional_target_neighbor_reserve_crossings import multiply_binomial
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import aggregate


OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "symmetric_orbit_positive_real_kernel_probe_20260802.json"
)
SMOOTHER = {(3, 0): 1, (2, 1): 1, (1, 2): 1, (0, 3): 1}


def add(left: list[int], right: list[int]):
    return [
        (left[j] if j < len(left) else 0) + (right[j] if j < len(right) else 0)
        for j in range(max(len(left), len(right)))
    ]


def reflect(values: list[int]):
    return [value if j % 2 == 0 else -value for j, value in enumerate(values)]


def mixed_real(left: list[int], right: list[int]):
    even = product(reflect(left[0::2]), reflect(right[0::2]))
    odd = product(reflect(left[1::2]), reflect(right[1::2]))
    return [
        (even[j] if j < len(even) else 0)
        + (odd[j - 1] if 0 <= j - 1 < len(odd) else 0)
        for j in range(max(len(even), len(odd) + 1))
    ]


def orbit_source(p: int, q: int):
    base = {(p, q): 1}
    if p != q:
        base[(q, p)] = 1
    result = {}
    for (i, j), value in base.items():
        for (k, ell), factor in SMOOTHER.items():
            key = (i + k, j + ell, 0, 0, 0)
            result[key] = result.get(key, 0) + value * factor
    return result


def audit(m: int, x: int, r: int, labels):
    a, b, target = m + x + 1, 2 * m + 1, m + r + 4
    current = []
    reference = []
    for p, q in labels:
        source = orbit_source(p, q)
        now = aggregate(source, a, b, r, target, 0, 0, 0)
        before = aggregate(source, a, b, r - 1, target - 1, 0, 0, 0)
        current.append(now)
        reference.append(multiply_binomial(before, 1))

    diagonal_failures = []
    for i, label in enumerate(labels):
        values = mixed_real(current[i], reference[i])
        if any(value < 0 for value in values):
            diagonal_failures.append({
                "label": label,
                "negative_indices": [j for j, value in enumerate(values) if value < 0],
            })
            if len(diagonal_failures) >= 12:
                break
    pair_failures = []
    for i in range(len(labels)):
        for j in range(i + 1, len(labels)):
            values = add(
                mixed_real(current[i], reference[j]),
                mixed_real(current[j], reference[i]),
            )
            if any(value < 0 for value in values):
                pair_failures.append({
                    "left": labels[i],
                    "right": labels[j],
                    "negative_indices": [k for k, value in enumerate(values) if value < 0],
                })
                if len(pair_failures) >= 12:
                    break
        if len(pair_failures) >= 12:
            break
    return {
        "m": m,
        "x": x,
        "r": r,
        "support_scope": "exact_F_G_squared_orbits",
        "orbit_count": len(labels),
        "orbit_pair_count": len(labels) * (len(labels) - 1) // 2,
        "diagonal_failure_count": len(diagonal_failures),
        "pair_failure_count": len(pair_failures),
        "first_diagonal_failures": diagonal_failures,
        "first_pair_failures": pair_failures,
    }


def main() -> None:
    F = sp.expand(2 * A * (A - 1) + (V + 1) ** 2)
    G = sp.expand(A * T**2 - q)
    base = sp.Poly(sp.expand(F * G**2), z, w)
    labels = sorted({tuple(sorted((int(p), int(q)))) for (p, q), _ in base.terms()})
    records = [
        audit(6, 12, 12, labels),
        audit(12, 96, 12, labels),
        audit(24, 48, 48, labels),
    ]
    report = {
        "status": (
            "PASS_SYMMETRIC_ORBIT_POSITIVE_REAL_KERNEL_PROBE"
            if all(not x["diagonal_failure_count"] and not x["pair_failure_count"] for x in records)
            else "SYMMETRIC_ORBIT_POSITIVE_REAL_KERNEL_FAILURE"
        ),
        "records": records,
        "warning": "Finite exact orbit-pair evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
