#!/usr/bin/env python3
"""Test whether (z^2+w^2) smooths arbitrary symmetric positive sources."""

from __future__ import annotations

import json
import random
from pathlib import Path

from analyze_wide_target_blended_reserve_nyquist import reflected_cross
from analyze_original_reserve_pencil_crossings import product
from probe_exceptional_target_neighbor_reserve_crossings import multiply_binomial
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import aggregate


OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "quadratic_symmetric_smoother_reserve_cross_probe_20260802.json"
)


def convolve(left: dict[tuple[int, int], int], right: dict[tuple[int, int], int]):
    result = {}
    for (i, j), x in left.items():
        for (k, ell), y in right.items():
            key = (i + k, j + ell)
            result[key] = result.get(key, 0) + x * y
    return result


def sparse(source: dict[tuple[int, int], int]):
    return {(i, j, 0, 0, 0): value for (i, j), value in source.items()}


def one_case(source, a: int, b: int, r: int, target: int):
    current = aggregate(sparse(source), a, b, r, target, 0, 0, 0)
    previous = aggregate(sparse(source), a, b, r - 1, target - 1, 0, 0, 0)
    reference = multiply_binomial(previous, 1)
    cross = reflected_cross(current, reference)
    ce = [v if j % 2 == 0 else -v for j, v in enumerate(current[0::2])]
    co = [v if j % 2 == 0 else -v for j, v in enumerate(current[1::2])]
    re = [v if j % 2 == 0 else -v for j, v in enumerate(reference[0::2])]
    ro = [v if j % 2 == 0 else -v for j, v in enumerate(reference[1::2])]
    ee, oo = product(ce, re), product(co, ro)
    real = [
        (ee[j] if j < len(ee) else 0)
        + (oo[j - 1] if 0 <= j - 1 < len(oo) else 0)
        for j in range(max(len(ee), len(oo) + 1))
    ]
    return {
        "negative_count": sum(value < 0 for value in cross),
        "zero_count": sum(value == 0 for value in cross),
        "real_negative_count": sum(value < 0 for value in real),
        "real_zero_count": sum(value == 0 for value in real),
    }


def random_symmetric_source(rng: random.Random):
    result = {}
    for _ in range(rng.randint(1, 8)):
        i, j = rng.randint(0, 8), rng.randint(0, 8)
        value = rng.randint(1, 9)
        result[(i, j)] = result.get((i, j), 0) + value
        result[(j, i)] = result.get((j, i), 0) + value
    return result


def main() -> None:
    rng = random.Random(993)
    smoothers = {
        "bare": {(0, 0): 1},
        "quadratic": {(2, 0): 1, (0, 2): 1},
        "linear_quadratic": {(3, 0): 1, (2, 1): 1, (1, 2): 1, (0, 3): 1},
    }
    counts = {name: 0 for name in smoothers}
    real_counts = {name: 0 for name in smoothers}
    real_negative_counts = {name: 0 for name in smoothers}
    first_failures = {name: [] for name in smoothers}
    for trial in range(500):
        base = random_symmetric_source(rng)
        a = rng.randint(4, 30)
        b = rng.randint(2, 24)
        r = rng.randint(4, 24)
        minimum_degree = min(i + j for i, j in base)
        target = rng.randint(2, min(a + b + r, a + b) + 8)
        for name, smoother in smoothers.items():
            result = one_case(convolve(base, smoother), a, b, r, target)
            if result["negative_count"]:
                counts[name] += 1
                if len(first_failures[name]) < 8:
                    first_failures[name].append({
                        "trial": trial, "a": a, "b": b, "r": r,
                        "target": target, **result,
                    })
            if result["real_negative_count"] or result["real_zero_count"]:
                real_counts[name] += 1
            if result["real_negative_count"]:
                real_negative_counts[name] += 1
    constrained_failures = 0
    constrained_real_failures = 0
    constrained_real_negative_failures = 0
    constrained_first = []
    z_plus_w = {(1, 0): 1, (0, 1): 1}
    quadratic = {(2, 0): 1, (0, 2): 1}
    for trial in range(500):
        base = random_symmetric_source(rng)
        source = convolve(convolve(base, z_plus_w), quadratic)
        m = rng.randint(4, 30)
        x = rng.randint(2, 10) * m
        r = rng.randint(m, 2 * m)
        result = one_case(source, m + x + 1, 2 * m + 1, r, m + r + 4)
        if result["negative_count"]:
            constrained_failures += 1
            if len(constrained_first) < 8:
                constrained_first.append({
                    "trial": trial, "m": m, "x": x, "r": r, **result,
                })
        if result["real_negative_count"] or result["real_zero_count"]:
            constrained_real_failures += 1
        if result["real_negative_count"]:
            constrained_real_negative_failures += 1
    nonsymmetric_real_failures = 0
    nonsymmetric_real_negative_failures = 0
    nonsymmetric_first = []
    for trial in range(500):
        base = {}
        for _ in range(rng.randint(1, 12)):
            key = (rng.randint(0, 10), rng.randint(0, 10))
            base[key] = base.get(key, 0) + rng.randint(1, 9)
        a = rng.randint(4, 30)
        b = rng.randint(2, 24)
        r = rng.randint(4, 24)
        target = rng.randint(2, min(a + b + r, a + b) + 8)
        result = one_case(base, a, b, r, target)
        if result["real_negative_count"] or result["real_zero_count"]:
            nonsymmetric_real_failures += 1
            if len(nonsymmetric_first) < 8:
                nonsymmetric_first.append({
                    "trial": trial, "a": a, "b": b, "r": r,
                    "target": target, **result,
                })
        if result["real_negative_count"]:
            nonsymmetric_real_negative_failures += 1
    report = {
        "status": "QUADRATIC_SYMMETRIC_SMOOTHER_RESERVE_CROSS_PROBE",
        "trial_count": 500,
        "failure_counts": counts,
        "positive_real_failure_counts": real_counts,
        "positive_real_negative_coefficient_failure_counts": real_negative_counts,
        "first_failures": first_failures,
        "constrained_group_regime_failure_count": constrained_failures,
        "constrained_group_regime_positive_real_failure_count": constrained_real_failures,
        "constrained_group_regime_real_negative_coefficient_failure_count": constrained_real_negative_failures,
        "constrained_group_regime_first_failures": constrained_first,
        "nonsymmetric_positive_real_failure_count": nonsymmetric_real_failures,
        "nonsymmetric_real_negative_coefficient_failure_count": nonsymmetric_real_negative_failures,
        "nonsymmetric_positive_real_first_failures": nonsymmetric_first,
        "warning": "Random finite evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
