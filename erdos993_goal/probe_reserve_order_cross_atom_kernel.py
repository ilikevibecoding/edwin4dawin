#!/usr/bin/env python3
"""Probe atom-pair positivity of the consecutive-order Nyquist cross.

Write R_r=sum_i A_i and (1+t)R_{r-1}=sum_i S_i using the same
source-monomial/T-expansion labels.  Since the parity cross is bilinear,
the full certificate is the sum of diagonal pieces cross(A_i,S_i) and
symmetrized pair pieces cross(A_i,S_j)+cross(A_j,S_i).  If every such
piece has nonnegative reflected coefficients, positivity is universal for
all nonnegative source weights.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from analyze_original_reserve_pencil_crossings import product, subtract
from probe_reserve_atom_compatibility import atom
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "reserve_order_cross_atom_kernel_probe_20260802.json"
)


def add(left: list[int], right: list[int]) -> list[int]:
    return [
        (left[j] if j < len(left) else 0)
        + (right[j] if j < len(right) else 0)
        for j in range(max(len(left), len(right)))
    ]


def multiply_one_plus_t(values: list[int]) -> list[int]:
    return [
        (values[j] if j < len(values) else 0)
        + (values[j - 1] if j else 0)
        for j in range(len(values) + 1)
    ]


def reflected_cross(left: list[int], right: list[int]) -> list[int]:
    le, lo = left[0::2], left[1::2]
    re, ro = right[0::2], right[1::2]
    cross = subtract(product(le, ro), product(lo, re))
    return [value if j % 2 == 0 else -value for j, value in enumerate(cross)]


def nonnegative(values: list[int]) -> bool:
    return all(value >= 0 for value in values)


def audit(package: str, parity: int, coordinate: str, c: int, m: int, x: int, r: int):
    _, reserve_source = reduced_sources(package, parity, coordinate)
    numeric = evaluate(reserve_source, c, m, x, m + r + 10)
    a = 2 * c + m + x - 3 if package == "group" else m + x - 3
    b = 2 * m + parity - (1 if package == "group" else 2)
    target = m + r + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2
    labels = []
    current = []
    reference = []
    for (pz, pw), coefficient in numeric.items():
        for k in range(b + 1):
            now = atom(pz, pw, coefficient, k, a, b, r, target)
            previous = atom(
                pz, pw, coefficient, k, a, b, r - 1, target - 1
            )
            prior_reference = multiply_one_plus_t(previous)
            if not any(now) and not any(prior_reference):
                continue
            labels.append((pz, pw, k))
            current.append(now)
            reference.append(prior_reference)

    rng = random.Random(993)
    indices = list(range(len(labels)))
    diagonal_failures = []
    for i in rng.sample(indices, min(500, len(indices))):
        values = reflected_cross(current[i], reference[i])
        if not nonnegative(values):
            diagonal_failures.append({
                "label": labels[i],
                "negative_count": sum(value < 0 for value in values),
            })
            if len(diagonal_failures) >= 12:
                break
    pair_failures = []
    for _ in range(2000):
        i, j = rng.sample(indices, 2)
        values = add(
            reflected_cross(current[i], reference[j]),
            reflected_cross(current[j], reference[i]),
        )
        if not nonnegative(values):
            pair_failures.append({
                "left": labels[i],
                "right": labels[j],
                "negative_count": sum(value < 0 for value in values),
            })
            if len(pair_failures) >= 12:
                break
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "m": m,
        "x": x,
        "r": r,
        "atom_count": len(labels),
        "sampled_diagonal_failure_count": len(diagonal_failures),
        "sampled_symmetrized_pair_failure_count": len(pair_failures),
        "first_diagonal_failures": diagonal_failures,
        "first_symmetrized_pair_failures": pair_failures,
    }


def main() -> None:
    records = [
        audit("group", 0, "m", 1, 6, 12, 12),
        audit("bottom", 1, "x", 0, 6, 12, 12),
    ]
    report = {
        "status": "RESERVE_ORDER_CROSS_ATOM_KERNEL_PROBE",
        "records": records,
        "warning": "Finite randomized atom-pair evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
