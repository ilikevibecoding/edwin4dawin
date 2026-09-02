#!/usr/bin/env python3
"""Map the parameter region of the bare bottom proper-position pair."""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, q
from probe_bottom_endpoint_compact_proper_position import add, multiply_affine, nonreal_count
from probe_path_isolate_p4_affine_target_rows import (
    A as A_sparse,
    T as T_sparse,
    multiply,
    power,
)
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from probe_reserve_endpoint_reverse_borel_stability import line_values


OUT = Path("bare_bottom_proper_position_parameter_region_probe_20260802.json")


def transform(source, N: int, a: int, b: int):
    numeric = evaluate(source, 0, 0, 0, N)
    return multiply(
        multiply(numeric, power(A_sparse, a, N), N),
        power(T_sparse, b, N),
        N,
    )


def main() -> None:
    ctx.prec = 90
    rng = random.Random(9930231)
    G = sp.expand(A * T**2 - q)
    gt_source = to_sparse(sp.expand(G * T))
    tail_sources = {
        b: to_sparse(sp.expand(q * A * ((b + 2) * G + 2 * q)))
        for b in range(0, 10)
    }
    trials_per_case = 3
    records = []
    for N in range(4, 14):
        for d in range(0, min(8, N + 1)):
            a = N - d
            for b in range(0, 10):
                gt = transform(gt_source, N, a, b)
                tail = transform(tail_sources[b], N, a, b)
                failures = 0
                reverse_failures = 0
                for _ in range(trials_per_case):
                    xy_base = (rng.randint(-12, 12), rng.randint(-12, 12))
                    xy_direction = (rng.randint(1, 10), rng.randint(1, 10))
                    u_base = rng.randint(-12, 12)
                    u_direction = rng.randint(1, 10)
                    p = line_values(gt, N, xy_base, xy_direction)
                    q_values = line_values(tail, N, xy_base, xy_direction)
                    forward = add(p, multiply_affine(q_values, u_base, u_direction))
                    reverse = add(q_values, multiply_affine(p, u_base, u_direction))
                    failures += bool(nonreal_count(forward))
                    reverse_failures += bool(nonreal_count(reverse))
                records.append(
                    {
                        "N": N,
                        "a": a,
                        "d": d,
                        "b": b,
                        "forward_failures": failures,
                        "reverse_failures": reverse_failures,
                    }
                )
        print({"N": N, "cases_done": sum(record["N"] == N for record in records)}, flush=True)

    by_d = {
        d: {
            "case_count": sum(record["d"] == d for record in records),
            "forward_failed_cases": sum(
                record["forward_failures"] > 0 for record in records if record["d"] == d
            ),
            "reverse_failed_cases": sum(
                record["reverse_failures"] > 0 for record in records if record["d"] == d
            ),
        }
        for d in range(0, 8)
    }
    passing_cases = [
        {key: record[key] for key in ("N", "a", "d", "b")}
        for record in records
        if record["forward_failures"] == 0
    ]
    report = {
        "kind": "bare_bottom_proper_position_parameter_region_probe",
        "date": "2026-08-02",
        "status": "PASS_PARAMETER_REGION_MAP",
        "N_range": [4, 13],
        "d_range": [0, 7],
        "b_range": [0, 9],
        "trials_per_case": trials_per_case,
        "case_count": len(records),
        "by_d": by_d,
        "forward_passing_case_count": len(passing_cases),
        "records": records,
        "warning": "Finite exact affine-line samples are evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
