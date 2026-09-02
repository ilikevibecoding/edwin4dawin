#!/usr/bin/env python3
"""Map the derivative-order threshold for generic compression targets.

For monic negative-rooted p of degree N and a monic interlacer q, h=Nq,
test on exact positive-direction lines

    S^d(p tensor p) - S^(d-2)(h tensor h),  2 <= d <= 2N-1.

This identifies whether the Erdős endpoint d=2m+3 is sitting above a
general stability threshold.  Finite sampling is evidence; any reported
failure is an exact counterexample to the corresponding general claim.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from probe_catalan_smoothed_proper_position import derivative_sum_line, derivative_table
from probe_generic_compression_endpoint_pencil import compression_polynomial
from probe_umbral_repaired_core_stability import X, add, integer_values


OUT = Path("generic_compression_target_threshold_probe_20260802.json")


def nonreal(values: list[sp.Rational]) -> int:
    return sum(
        multiplicity
        for root, multiplicity in fmpz_poly(integer_values(values)).complex_roots()
        if not root.imag.is_zero()
    )


def main() -> None:
    ctx.prec = 160
    rng = random.Random(993_180_025)
    records: list[dict[str, int]] = []
    witnesses: list[dict[str, object]] = []

    for N in range(4, 16):
        failures_by_d = {d: 0 for d in range(2, 2 * N)}
        for model in range(5):
            roots = sorted(rng.sample(range(-15 * N, -1), N))
            p = sp.Poly(sp.prod(X - root for root in roots), X)
            weights = [1] * N if model == 0 else [rng.randint(1, 40) for _ in roots]
            h = compression_polynomial(p, roots, weights)
            pd = derivative_table(p, 2 * N - 1)
            hd = derivative_table(h, 2 * N - 3)

            for trial in range(8):
                xy_base = (rng.randint(-45, 45), rng.randint(-45, 45))
                xy_direction = (rng.randint(1, 24), rng.randint(1, 24))
                for d in range(2, 2 * N):
                    a_line = derivative_sum_line(pd, d, xy_base, xy_direction)
                    b_line = derivative_sum_line(hd, d - 2, xy_base, xy_direction)
                    count = nonreal(add(a_line, b_line, -1))
                    failures_by_d[d] += bool(count)
                    if count and len(witnesses) < 60:
                        witnesses.append(
                            {
                                "N": N,
                                "d": d,
                                "model": model,
                                "roots": roots,
                                "weights": weights,
                                "trial": trial,
                                "xy_base": xy_base,
                                "xy_direction": xy_direction,
                                "nonreal": count,
                            }
                        )

        passing = [d for d, count in failures_by_d.items() if count == 0]
        first_passing_tail = 2 * N
        for d in range(2 * N - 1, 1, -1):
            if failures_by_d[d] == 0:
                first_passing_tail = d
            else:
                break
        record = {
            "N": N,
            "first_zero_failure_tail_d": first_passing_tail,
            "failure_counts": {str(d): failures_by_d[d] for d in failures_by_d},
            "passing_d_count": len(passing),
        }
        records.append(record)
        print(record, flush=True)

    report = {
        "kind": "generic_compression_target_threshold_probe",
        "date": "2026-08-02",
        "N_range": [4, 15],
        "models_per_N": 5,
        "trials_per_model": 8,
        "records": records,
        "first_witnesses": witnesses,
        "warning": "Finite exact sampling: failures disprove, passes only support.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "DONE", "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
