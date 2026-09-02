#!/usr/bin/env python3
"""Locate which fixed source factors create bottom-endpoint proper position."""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx

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
from probe_bottom_endpoint_compact_proper_position import (
    add,
    multiply_affine,
    nonreal_count,
    transformed,
)
from probe_reserve_endpoint_reverse_borel_stability import line_values


OUT = Path("bottom_endpoint_proper_position_factor_repair_probe_20260802.json")


def main() -> None:
    ctx.prec = 100
    rng = random.Random(9930227)
    F = sp.expand(2 * A * (A - 1) + (V + 1) ** 2)
    G = sp.expand(A * T**2 - q)
    prefixes = {
        "bare": sp.S.One,
        "A_minus_1": A - 1,
        "F_A_minus_1": F * (A - 1),
        "z2sum_F_A_minus_1": (z**2 + w**2) * F * (A - 1),
        "zsum_F_A_minus_1": (z + w) * F * (A - 1),
        "full": (z + w) * (z**2 + w**2) * F * (A - 1),
    }
    source_pairs = {
        label: (
            to_sparse(sp.expand(prefix * G * T)),
            to_sparse(
                sp.expand(prefix * q * A * ((2 * m_symbol + 3) * G + 2 * q))
            ),
        )
        for label, prefix in prefixes.items()
    }

    trials_per_case = 24
    records = []
    failures = []
    for m_value in range(1, 11):
        N = 3 * m_value + 3
        transformed_pairs = {
            label: (
                transformed(gt_source, m_value, N),
                transformed(tail_source, m_value, N),
            )
            for label, (gt_source, tail_source) in source_pairs.items()
        }
        local = {
            label: {"GT_plus_U_tail": 0, "tail_plus_U_GT": 0}
            for label in prefixes
        }
        for trial in range(trials_per_case):
            xy_base = (rng.randint(-16, 16), rng.randint(-16, 16))
            xy_direction = (rng.randint(1, 12), rng.randint(1, 12))
            u_base = rng.randint(-16, 16)
            u_direction = rng.randint(1, 12)
            for label, (gt, tail) in transformed_pairs.items():
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
                        local[label][orientation] += 1
                        if len(failures) < 80:
                            failures.append(
                                {
                                    "m": m_value,
                                    "trial": trial,
                                    "prefix": label,
                                    "orientation": orientation,
                                    "nonreal": nonreal,
                                }
                            )
        for label in prefixes:
            records.append({"m": m_value, "prefix": label, **local[label]})
        print({"m": m_value, "failures": local}, flush=True)

    totals = {
        label: {
            orientation: sum(
                record[orientation] for record in records if record["prefix"] == label
            )
            for orientation in ("GT_plus_U_tail", "tail_plus_U_GT")
        }
        for label in prefixes
    }
    report = {
        "kind": "bottom_endpoint_proper_position_factor_repair_probe",
        "date": "2026-08-02",
        "status": "PASS_FACTOR_LOCALIZATION_PROBE",
        "m_range": [1, 10],
        "trials_per_case": trials_per_case,
        "tests_per_prefix_orientation": 10 * trials_per_case,
        "failure_totals": totals,
        "records": records,
        "first_failures": failures,
        "warning": "Finite exact affine-line samples are evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key not in ("records", "first_failures")}, indent=2))


if __name__ == "__main__":
    main()
