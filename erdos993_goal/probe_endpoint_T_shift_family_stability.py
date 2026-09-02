#!/usr/bin/env python3
"""Probe the full T -> T+S*q*A deformation after the endpoint G repair."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import q
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_bare_bottom_proper_position_parameter_region import transform
from probe_reserve_endpoint_reverse_borel_stability import line_values, mul


OUT = Path("endpoint_T_shift_family_stability_probe_20260802.json")


def add_scaled(target: list[int], source: list[int], scalar: int) -> None:
    if len(target) < len(source):
        target.extend([0] * (len(source) - len(target)))
    for index, value in enumerate(source):
        target[index] += scalar * value


def affine_powers(base: int, direction: int, degree: int) -> list[list[int]]:
    powers = [[1]]
    for _ in range(degree):
        powers.append(mul(powers[-1], [base, direction]))
    return powers


def main() -> None:
    ctx.prec = 110
    rng = random.Random(9930245)
    trials = 16
    records = []
    failures = []
    for m in range(1, 11):
        N, a, b = 3 * m + 3, 3 * m - 1, 2 * m + 1
        components = []
        for k in range(b + 3):
            pieces = []
            if k <= b + 2:
                first = transform(to_sparse(q**k), N, a + k + 1, b + 2 - k)
                pieces.append((math.comb(b + 2, k), first))
            if k <= b:
                second = transform(to_sparse(q ** (k + 1)), N, a + k, b - k)
                pieces.append((-math.comb(b, k), second))
            components.append(pieces)
        local = 0
        max_degree = 0
        for trial in range(trials):
            xy_base = (rng.randint(-14, 14), rng.randint(-14, 14))
            xy_direction = (rng.randint(1, 11), rng.randint(1, 11))
            s_base = rng.randint(-14, 14)
            s_direction = rng.randint(1, 11)
            s_powers = affine_powers(s_base, s_direction, b + 2)
            values: list[int] = []
            for k, pieces in enumerate(components):
                coefficient_values: list[int] = []
                for scalar, kernel in pieces:
                    add_scaled(
                        coefficient_values,
                        line_values(kernel, N, xy_base, xy_direction),
                        scalar,
                    )
                term = mul(coefficient_values, s_powers[k])
                add_scaled(values, term, 1)
            while values and values[-1] == 0:
                values.pop()
            max_degree = max(max_degree, len(values) - 1)
            nonreal = sum(
                multiplicity
                for root, multiplicity in fmpz_poly(values).complex_roots()
                if not root.imag.is_zero()
            )
            if nonreal:
                local += 1
                failures.append(
                    {
                        "m": m,
                        "trial": trial,
                        "xy_base": xy_base,
                        "xy_direction": xy_direction,
                        "s_base": s_base,
                        "s_direction": s_direction,
                        "nonreal": nonreal,
                    }
                )
        records.append({"m": m, "N": N, "b": b, "max_line_degree": max_degree, "failure_count": local})
        print(records[-1], flush=True)
    report = {
        "kind": "endpoint_T_shift_family_stability_probe",
        "date": "2026-08-02",
        "status": "PASS_T_SHIFT_FAMILY_PROBE" if not failures else "T_SHIFT_FAMILY_FAILURE",
        "deformation": "B_N[A^a*(T+S*q*A)^b*(A*(T+S*q*A)^2-q)]",
        "m_range": [1, 10],
        "trials_per_m": trials,
        "failure_count": len(failures),
        "records": records,
        "first_failures": failures[:30],
        "warning": "Finite exact affine-line samples are evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key not in ("records", "first_failures")}, indent=2))


if __name__ == "__main__":
    main()
