#!/usr/bin/env python3
"""Probe proper position of the two compact bottom-endpoint blocks.

For real stable P,Q, one of P+UQ or Q+UP is stable exactly when the
corresponding proper-position orientation holds.  A necessary and sufficient
line criterion is real-rootedness after X,Y,U are put on arbitrary real-base,
positive-direction affine lines.  This script performs finite exact samples of
that criterion; it is evidence, not a proof.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A,
    T,
    V,
    m as m_symbol,
    q,
    w,
    z,
)
from probe_path_isolate_p4_affine_target_rows import (
    A as A_sparse,
    T as T_sparse,
    multiply,
    power,
)
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from probe_reserve_endpoint_reverse_borel_stability import line_values


OUT = Path("bottom_endpoint_compact_proper_position_probe_20260802.json")


def add(left: list[int], right: list[int]) -> list[int]:
    out = [0] * max(len(left), len(right))
    for i, value in enumerate(left):
        out[i] += value
    for i, value in enumerate(right):
        out[i] += value
    while out and not out[-1]:
        out.pop()
    return out


def multiply_affine(values: list[int], base: int, direction: int) -> list[int]:
    out = [0] * (len(values) + 1)
    for i, value in enumerate(values):
        out[i] += base * value
        out[i + 1] += direction * value
    while out and not out[-1]:
        out.pop()
    return out


def nonreal_count(values: list[int]) -> int:
    return sum(
        multiplicity
        for root, multiplicity in fmpz_poly(values).complex_roots()
        if not root.imag.is_zero()
    )


def transformed(source, m_value: int, N: int):
    numeric = evaluate(source, 0, m_value, 2 * m_value, N)
    a, b = 3 * m_value - 1, 2 * m_value + 1
    return multiply(
        multiply(numeric, power(A_sparse, a, N), N),
        power(T_sparse, b, N),
        N,
    )


def main() -> None:
    ctx.prec = 100
    rng = random.Random(9930223)
    F = sp.expand(2 * A * (A - 1) + (V + 1) ** 2)
    G = sp.expand(A * T**2 - q)
    common = sp.expand((z + w) * (z**2 + w**2) * (A - 1) * F)
    gt_source = to_sparse(sp.expand(common * G * T))
    tail_source = to_sparse(
        sp.expand(common * q * A * ((2 * m_symbol + 3) * G + 2 * q))
    )

    trials_per_m = 40
    records = []
    failures = []
    for m_value in range(1, 16):
        N = 3 * m_value + 3
        gt = transformed(gt_source, m_value, N)
        tail = transformed(tail_source, m_value, N)
        local = {"GT_plus_U_tail": 0, "tail_plus_U_GT": 0}
        for trial in range(trials_per_m):
            xy_base = (rng.randint(-16, 16), rng.randint(-16, 16))
            xy_direction = (rng.randint(1, 12), rng.randint(1, 12))
            u_base = rng.randint(-16, 16)
            u_direction = rng.randint(1, 12)
            gt_values = line_values(gt, N, xy_base, xy_direction)
            tail_values = line_values(tail, N, xy_base, xy_direction)
            candidates = {
                "GT_plus_U_tail": add(
                    gt_values,
                    multiply_affine(tail_values, u_base, u_direction),
                ),
                "tail_plus_U_GT": add(
                    tail_values,
                    multiply_affine(gt_values, u_base, u_direction),
                ),
            }
            for orientation, values in candidates.items():
                nonreal = nonreal_count(values)
                if nonreal:
                    local[orientation] += 1
                    failures.append(
                        {
                            "m": m_value,
                            "trial": trial,
                            "orientation": orientation,
                            "xy_base": xy_base,
                            "xy_direction": xy_direction,
                            "u_base": u_base,
                            "u_direction": u_direction,
                            "nonreal": nonreal,
                        }
                    )
        record = {"m": m_value, "N": N, **local}
        records.append(record)
        print(record, flush=True)

    totals = {
        orientation: sum(record[orientation] for record in records)
        for orientation in ("GT_plus_U_tail", "tail_plus_U_GT")
    }
    passing = [orientation for orientation, count in totals.items() if count == 0]
    report = {
        "kind": "bottom_endpoint_compact_proper_position_probe",
        "date": "2026-08-02",
        "status": "PASS_SAMPLED_PROPER_POSITION" if passing else "PROPER_POSITION_FAILURE",
        "m_range": [1, 15],
        "trials_per_m": trials_per_m,
        "tests_per_orientation": 15 * trials_per_m,
        "failure_totals": totals,
        "passing_orientations": passing,
        "records": records,
        "first_failures": failures[:30],
        "warning": "Finite exact affine-line samples are evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {key: value for key, value in report.items() if key not in ("records", "first_failures")},
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
