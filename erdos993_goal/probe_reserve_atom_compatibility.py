#!/usr/bin/env python3
"""Probe common-interlacing compatibility of positive reserve atoms."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from flint import ctx, fmpz_poly

from probe_path_isolate_p4_affine_scaled_excess_local_summands import (
    choose,
)
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from stress_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_grids import (
    reduced_sources,
)


OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "reserve_atom_compatibility_probe_20260802.json"
)


def trim(values: list[int]) -> list[int]:
    while values and values[-1] == 0:
        values.pop()
    first = next((j for j, value in enumerate(values) if value), len(values))
    return values[first:]


def real_nonpositive(values: list[int]) -> bool:
    values = trim(list(values))
    if len(values) <= 1:
        return True
    for root, multiplicity in fmpz_poly(values).complex_roots():
        if not root.imag.is_zero() or root.real > 0:
            return False
    return True


def atom(
    pz: int,
    pw: int,
    coefficient: int,
    k: int,
    a: int,
    b: int,
    r: int,
    target: int,
) -> list[int]:
    k_weight = choose(b, k)
    return [
        coefficient
        * k_weight
        * choose(r, j)
        * choose(a + b - k, target - pw - b + k - j)
        * choose(a + k + r - j, target - pz - k)
        for j in range(r + 1)
    ]


def add(left: list[int], right: list[int], shift_left: bool = False) -> list[int]:
    if shift_left:
        left = [0] + left
    return [
        (left[j] if j < len(left) else 0)
        + (right[j] if j < len(right) else 0)
        for j in range(max(len(left), len(right)))
    ]


def audit(package: str, parity: int, coordinate: str, c: int, m: int, x: int, r: int):
    _, reserve_source = reduced_sources(package, parity, coordinate)
    numeric = evaluate(reserve_source, c, m, x, m + r + 10)
    a = 2 * c + m + x - 3 if package == "group" else m + x - 3
    original_b = 2 * m + parity - (4 if package == "group" else 5)
    b = original_b + 3
    target = m + r + 5 + int(coordinate == "m")
    if package == "bottom":
        target -= 2
    atoms = []
    labels = []
    for (pz, pw), coefficient in numeric.items():
        if coefficient <= 0:
            raise AssertionError("reserve source is not coefficient-positive")
        for k in range(b + 1):
            values = atom(pz, pw, coefficient, k, a, b, r, target)
            if any(values):
                atoms.append(values)
                labels.append((pz, pw, k))

    rng = random.Random(993)
    indices = list(range(len(atoms)))
    individual_failures = [
        {"label": labels[j]}
        for j in rng.sample(indices, min(200, len(indices)))
        if not real_nonpositive(atoms[j])
    ]
    pair_failures = []
    shifted_pair_failures = []
    for _ in range(400):
        i, j = rng.sample(indices, 2)
        if not real_nonpositive(add(atoms[i], atoms[j])):
            pair_failures.append({"left": labels[i], "right": labels[j]})
            if len(pair_failures) >= 10:
                break
        if not real_nonpositive(add(atoms[i], atoms[j], shift_left=True)):
            shifted_pair_failures.append({"left": labels[i], "right": labels[j]})
            if len(shifted_pair_failures) >= 10:
                break
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "m": m,
        "x": x,
        "r": r,
        "atom_count": len(atoms),
        "sampled_individual_failure_count": len(individual_failures),
        "sampled_pair_sum_failure_count": len(pair_failures),
        "sampled_x_left_plus_right_failure_count": len(shifted_pair_failures),
        "first_individual_failures": individual_failures,
        "first_pair_failures": pair_failures,
        "first_shifted_pair_failures": shifted_pair_failures,
    }


def main() -> None:
    ctx.prec = 80
    records = [
        audit("group", 0, "m", 1, 6, 12, 12),
        audit("bottom", 1, "x", 0, 6, 12, 12),
    ]
    report = {
        "status": "RESERVE_ATOM_COMPATIBILITY_PROBE",
        "records": records,
        "warning": "Finite randomized compatibility probe only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
