#!/usr/bin/env python3
"""Locate a natural grouping that makes the reserve-order cross positive."""

from __future__ import annotations

from collections import defaultdict
import json
import random
from pathlib import Path

from probe_reserve_order_cross_atom_kernel import (
    add,
    multiply_one_plus_t,
    nonnegative,
    reflected_cross,
)
from probe_reserve_atom_compatibility import atom
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "reserve_order_cross_grouped_kernel_probe_20260802.json"
)


def add_into(left: list[int], right: list[int]) -> None:
    if len(left) < len(right):
        left.extend([0] * (len(right) - len(left)))
    for j, value in enumerate(right):
        left[j] += value


def keys(pz: int, pw: int, k: int, b: int) -> dict[str, object]:
    label = (pz, pw, k)
    swapped = (pw, pz, b - k)
    return {
        "k": k,
        "source_monomial": (pz, pw),
        "source_total_degree": pz + pw,
        "source_z_degree": pz,
        "source_w_degree": pw,
        "source_difference": pz - pw,
        "k_plus_source_w": k + pw,
        "k_plus_source_z": k + pz,
        "source_unordered_pair": tuple(sorted((pz, pw))),
        "k_swap_orbit": min(k, b - k),
        "full_zw_swap_orbit": min(label, swapped),
    }


def kernel_summary(
    current: dict[object, list[int]],
    reference: dict[object, list[int]],
    seed: int,
) -> dict:
    labels = list(set(current) | set(reference))
    zeros = [0]
    diagonal_failures = []
    for label in labels:
        values = reflected_cross(current.get(label, zeros), reference.get(label, zeros))
        if not nonnegative(values):
            diagonal_failures.append(label)
    pairs = [
        (labels[i], labels[j])
        for i in range(len(labels)) for j in range(i + 1, len(labels))
    ]
    if len(pairs) > 2000:
        pairs = random.Random(seed).sample(pairs, 2000)
    pair_failures = []
    for left, right in pairs:
        values = add(
            reflected_cross(current.get(left, zeros), reference.get(right, zeros)),
            reflected_cross(current.get(right, zeros), reference.get(left, zeros)),
        )
        if not nonnegative(values):
            pair_failures.append([left, right])
            if len(pair_failures) >= 12:
                break
    return {
        "group_count": len(labels),
        "diagonal_failure_count": len(diagonal_failures),
        "first_diagonal_failures": diagonal_failures[:12],
        "tested_symmetrized_pair_count": len(pairs),
        "symmetrized_pair_failure_count": len(pair_failures),
        "first_symmetrized_pair_failures": pair_failures,
        "all_tested_kernel_pieces_nonnegative": (
            not diagonal_failures and not pair_failures
        ),
    }


def audit(package: str, parity: int, coordinate: str, c: int, m: int, x: int, r: int):
    _, reserve_source = reduced_sources(package, parity, coordinate)
    numeric = evaluate(reserve_source, c, m, x, m + r + 10)
    a = 2 * c + m + x - 3 if package == "group" else m + x - 3
    b = 2 * m + parity - (1 if package == "group" else 2)
    target = m + r + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2
    current = {name: defaultdict(list) for name in keys(0, 0, 0, b)}
    reference = {name: defaultdict(list) for name in keys(0, 0, 0, b)}
    for (pz, pw), coefficient in numeric.items():
        for k in range(b + 1):
            now = atom(pz, pw, coefficient, k, a, b, r, target)
            prior = multiply_one_plus_t(
                atom(pz, pw, coefficient, k, a, b, r - 1, target - 1)
            )
            if not any(now) and not any(prior):
                continue
            for name, key in keys(pz, pw, k, b).items():
                add_into(current[name][key], now)
                add_into(reference[name][key], prior)
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "m": m,
        "x": x,
        "r": r,
        "groupings": {
            name: kernel_summary(current[name], reference[name], 993 + index)
            for index, name in enumerate(current)
        },
    }


def main() -> None:
    records = [
        audit("group", 0, "m", 1, 6, 12, 12),
        audit("bottom", 1, "x", 0, 6, 12, 12),
    ]
    report = {
        "status": "RESERVE_ORDER_CROSS_GROUPED_KERNEL_PROBE",
        "records": records,
        "warning": "Finite exact and randomized grouped-kernel evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
