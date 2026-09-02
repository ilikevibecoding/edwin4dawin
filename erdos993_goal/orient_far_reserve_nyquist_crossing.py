#!/usr/bin/env python3
"""Orient the unique far-edge reserve Nyquist crossing with Arb intervals."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp
from flint import arb, ctx, fmpq, fmpz_poly

from analyze_group_reserve_factor_prefix_crosses import sparse
from analyze_original_reserve_pencil_crossings import product
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, q, w, z
from analyze_wide_target_blended_reserve_nyquist import reflected_cross
from probe_exceptional_target_neighbor_reserve_crossings import multiply_binomial
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import aggregate


OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "far_reserve_nyquist_crossing_orientation_20260802.json"
)


def add(left: list[int], right: list[int]):
    return [
        (left[j] if j < len(left) else 0) + (right[j] if j < len(right) else 0)
        for j in range(max(len(left), len(right)))
    ]


def signed_part(values: list[int], parity: int):
    return [value if j % 2 == 0 else -value for j, value in enumerate(values[parity::2])]


def bisect_unique_positive(poly: fmpz_poly, steps: int = 90):
    lo = fmpq(0)
    hi = fmpq(1)
    lo_value = poly(lo)
    hi_value = poly(hi)
    while hi_value <= 0:
        hi *= 2
        hi_value = poly(hi)
    assert lo_value < 0 < hi_value
    for _ in range(steps):
        mid = (lo + hi) / 2
        value = poly(mid)
        if value < 0:
            lo = mid
        elif value > 0:
            hi = mid
        else:
            lo = hi = mid
            break
    return lo, hi


def main() -> None:
    ctx.prec = 256
    m = 240
    x = r = 2 * m
    F = sp.expand(2 * A * (A - 1) + (V + 1) ** 2)
    G = sp.expand(A * T**2 - q)
    source = sparse(sp.expand((z + w) * (z**2 + w**2) * F * G**2))
    a, b, target = m + x + 1, 2 * m + 1, m + r + 4
    current = aggregate(source, a, b, r, target, 0, 0, 0)
    previous = aggregate(source, a, b, r - 1, target - 1, 0, 0, 0)
    reference = multiply_binomial(previous, 1)
    crossing_values = reflected_cross(current, reference)
    crossing = fmpz_poly(crossing_values)
    lo, hi = bisect_unique_positive(crossing)

    current_even = signed_part(current, 0)
    current_odd = signed_part(current, 1)
    reference_even = signed_part(reference, 0)
    reference_odd = signed_part(reference, 1)
    real_numerator_values = add(
        product(current_even, reference_even),
        [0] + product(current_odd, reference_odd),
    )
    real_numerator = fmpz_poly(real_numerator_values)
    midpoint = (lo + hi) / 2
    radius = (hi - lo) / 2
    interval = arb(str(midpoint), str(radius))
    crossing_ball = crossing(interval)
    real_ball = real_numerator(interval)
    report = {
        "status": (
            "PASS_FAR_RESERVE_CROSSING_ON_POSITIVE_REAL_RAY"
            if real_ball > 0 else "FAR_RESERVE_CROSSING_ORIENTATION_UNRESOLVED"
        ),
        "m": m,
        "x": x,
        "r": r,
        "cross_degree": crossing.degree(),
        "negative_cross_coefficient_indices": [j for j, value in enumerate(crossing_values) if value < 0],
        "positive_root_lower": str(lo),
        "positive_root_upper": str(hi),
        "positive_root_arb": str(interval),
        "cross_on_root_interval": str(crossing_ball),
        "real_ratio_numerator_on_root_interval": str(real_ball),
        "real_ratio_numerator_positive": bool(real_ball > 0),
        "real_ratio_numerator_negative_coefficient_indices": [
            j for j, value in enumerate(real_numerator_values) if value < 0
        ],
        "real_ratio_numerator_zero_coefficient_count": sum(
            value == 0 for value in real_numerator_values
        ),
        "warning": "Exact dyadic root bracket and rigorous Arb interval evaluation for one finite case.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
