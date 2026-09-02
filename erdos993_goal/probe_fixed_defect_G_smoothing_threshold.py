#!/usr/bin/env python3
"""Map the sampled T-smoothing threshold for the fixed-defect G repair.

For each N and b this tests the reverse-Borel transform of

    A^(N-d) T^b G^g

on exact positive-direction affine lines.  The output is finite evidence,
not a stability proof.  It is intended to identify the sharp integer region
that a uniform Laguerre/finite-free-convolution lemma would need to cover.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, q
from probe_path_isolate_p4_affine_target_rows import (
    A as A_sparse,
    T as T_sparse,
    multiply,
    power,
)
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from probe_reserve_endpoint_reverse_borel_stability import line_values


OUT = Path("fixed_defect_G_smoothing_threshold_probe_20260802.json")


def repaired_kernel(N: int, defect: int, b: int, g_power: int):
    G = sp.expand(A * T**2 - q)
    source = evaluate(to_sparse(sp.expand(G**g_power)), 0, 0, 0, N)
    return multiply(
        multiply(source, power(A_sparse, N - defect, N), N),
        power(T_sparse, b, N),
        N,
    )


def has_nonreal(values: list[int]) -> bool:
    return any(not root.imag.is_zero() for root, _ in fmpz_poly(values).complex_roots())


def main() -> None:
    ctx.prec = 100
    rng = random.Random(9930249)
    trials = 20
    packages = ((4, 1, "defect4_G"), (3, 2, "defect3_G2"))
    records = []
    first_failures = []

    for defect, g_power, label in packages:
        for N in range(max(4, defect), 22):
            row = []
            for b in range(0, N + 3):
                kernel = repaired_kernel(N, defect, b, g_power)
                failure_count = 0
                for trial in range(trials):
                    base = (rng.randint(-18, 18), rng.randint(-18, 18))
                    direction = (rng.randint(1, 14), rng.randint(1, 14))
                    values = line_values(kernel, N, base, direction)
                    if has_nonreal(values):
                        failure_count += 1
                        if len(first_failures) < 40:
                            first_failures.append(
                                {
                                    "package": label,
                                    "N": N,
                                    "b": b,
                                    "trial": trial,
                                    "base": base,
                                    "direction": direction,
                                }
                            )
                row.append({"b": b, "failures": failure_count})
            passing = [entry["b"] for entry in row if entry["failures"] == 0]
            eventual = next(
                (
                    b
                    for b in passing
                    if all(entry["failures"] == 0 for entry in row if entry["b"] >= b)
                ),
                None,
            )
            record = {
                "package": label,
                "defect": defect,
                "G_power": g_power,
                "N": N,
                "sampled_eventual_threshold": eventual,
                "ceil_N_over_2": (N + 1) // 2,
                "endpoint_floor_2N_minus3_over3": (2 * N - 3) // 3,
                "row": row,
            }
            records.append(record)
            print(
                {
                    "package": label,
                    "N": N,
                    "threshold": eventual,
                    "ceil(N/2)": (N + 1) // 2,
                },
                flush=True,
            )

    threshold_matches = {
        label: sum(
            record["sampled_eventual_threshold"] == record["ceil_N_over_2"]
            for record in records
            if record["package"] == label
        )
        for _, _, label in packages
    }
    report = {
        "kind": "fixed_defect_G_smoothing_threshold_probe",
        "date": "2026-08-02",
        "status": "FINITE_EXACT_LINE_EVIDENCE",
        "N_range": [4, 21],
        "b_range": "0..N+2",
        "trials_per_cell": trials,
        "threshold_matches_ceil_N_over_2": threshold_matches,
        "records": records,
        "first_failures": first_failures,
        "warning": "Zero sampled failures do not prove real stability or a sharp threshold.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "threshold_matches_ceil_N_over_2": threshold_matches,
                "output": str(OUT.resolve()),
            },
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
