#!/usr/bin/env python3
"""Probe fixed T-expansion slices after the endpoint G repair."""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, q, w, z
from probe_bottom_endpoint_compact_proper_position import add, multiply_affine, nonreal_count
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from probe_reserve_endpoint_reverse_borel_stability import line_values


OUT = Path("G_repair_T_slice_proper_position_probe_20260802.json")


def kernel_for_slice(m: int, k: int):
    N, a, b = 3 * m + 3, 3 * m - 1, 2 * m + 1
    G = sp.expand(A * T**2 - q)
    expression = sp.expand(
        G
        * z**k
        * w ** (b - k)
        * (1 + z) ** (a + k)
        * (1 + w) ** (a + b - k)
    )
    return evaluate(to_sparse(expression), 0, 0, 0, N), N


def main() -> None:
    ctx.prec = 100
    rng = random.Random(9930249)
    records = []
    failures = []
    trials = 18
    for m in range(1, 9):
        b = 2 * m + 1
        kernels = []
        N = 3 * m + 3
        for k in range(b + 1):
            kernel, _ = kernel_for_slice(m, k)
            kernels.append(kernel)
        local_slice = 0
        local_adjacent = {"forward": 0, "reverse": 0}
        local_symmetric_adjacent = {"forward": 0, "reverse": 0}
        for trial in range(trials):
            base = (rng.randint(-14, 14), rng.randint(-14, 14))
            direction = (rng.randint(1, 11), rng.randint(1, 11))
            u_base = rng.randint(-14, 14)
            u_direction = rng.randint(1, 11)
            values = [line_values(kernel, N, base, direction) for kernel in kernels]
            for k, polynomial in enumerate(values):
                if nonreal_count(polynomial):
                    local_slice += 1
                    if len(failures) < 60:
                        failures.append({"m": m, "trial": trial, "kind": "slice", "k": k})
            for k in range(b):
                forward = add(values[k], multiply_affine(values[k + 1], u_base, u_direction))
                reverse = add(values[k + 1], multiply_affine(values[k], u_base, u_direction))
                local_adjacent["forward"] += bool(nonreal_count(forward))
                local_adjacent["reverse"] += bool(nonreal_count(reverse))
            symmetric = [
                add(values[k], values[b - k]) if k != b - k else values[k]
                for k in range((b + 1) // 2)
            ]
            for k in range(len(symmetric) - 1):
                forward = add(symmetric[k], multiply_affine(symmetric[k + 1], u_base, u_direction))
                reverse = add(symmetric[k + 1], multiply_affine(symmetric[k], u_base, u_direction))
                local_symmetric_adjacent["forward"] += bool(nonreal_count(forward))
                local_symmetric_adjacent["reverse"] += bool(nonreal_count(reverse))
        record = {
            "m": m,
            "b": b,
            "slice_failures": local_slice,
            "adjacent_forward_failures": local_adjacent["forward"],
            "adjacent_reverse_failures": local_adjacent["reverse"],
            "symmetric_adjacent_forward_failures": local_symmetric_adjacent["forward"],
            "symmetric_adjacent_reverse_failures": local_symmetric_adjacent["reverse"],
        }
        records.append(record)
        print(record, flush=True)
    totals = {
        key: sum(record[key] for record in records)
        for key in records[0]
        if key.endswith("failures")
    }
    report = {
        "kind": "G_repair_T_slice_proper_position_probe",
        "date": "2026-08-02",
        "status": "PASS_T_SLICE_LOCALIZATION_PROBE",
        "m_range": [1, 8],
        "trials": trials,
        "failure_totals": totals,
        "records": records,
        "first_failures": failures,
        "warning": "Finite exact affine-line samples are evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key not in ("records", "first_failures")}, indent=2))


if __name__ == "__main__":
    main()
