#!/usr/bin/env python3
"""Adversarial endpoint test for highly concentrated compression weights.

The earlier generic probe used moderately balanced positive residues.  This
probe pushes the compression q/p=sum w_i/(x-r_i) close to a single principal
deletion by using weight ratios up to 10^12.  Exact affine-line failures would
show that the endpoint theorem requires quantitative residue balance.
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


OUT = Path("spiky_compression_endpoint_target_probe_20260802.json")


def nonreal(values: list[sp.Rational]) -> int:
    return sum(
        multiplicity
        for root, multiplicity in fmpz_poly(integer_values(values)).complex_roots()
        if not root.imag.is_zero()
    )


def main() -> None:
    ctx.prec = 192
    rng = random.Random(993_180_027)
    records = []
    witnesses = []

    for m in range(1, 9):
        N = 3 * m + 3
        d = 2 * m + 3
        roots = sorted(rng.sample(range(-16 * N, -1), N))
        weight_models = [
            ("left_spike", [10**12] + [1] * (N - 1)),
            ("right_spike", [1] * (N - 1) + [10**12]),
            ("middle_spike", [1 if i != N // 2 else 10**12 for i in range(N)]),
            ("two_spikes", [10**9 if i in (N // 3, 2 * N // 3) else 1 for i in range(N)]),
        ]
        for label, weights in weight_models:
            p = sp.Poly(sp.prod(X - root for root in roots), X)
            h = compression_polynomial(p, roots, weights)
            pd = derivative_table(p, d)
            hd = derivative_table(h, d - 2)
            failures = 0
            for trial in range(30):
                xy_base = (rng.randint(-55, 55), rng.randint(-55, 55))
                xy_direction = (rng.randint(1, 28), rng.randint(1, 28))
                a_line = derivative_sum_line(pd, d, xy_base, xy_direction)
                b_line = derivative_sum_line(hd, d - 2, xy_base, xy_direction)
                count = nonreal(add(a_line, b_line, -1))
                failures += bool(count)
                if count and len(witnesses) < 40:
                    witnesses.append(
                        {
                            "m": m,
                            "N": N,
                            "d": d,
                            "label": label,
                            "roots": roots,
                            "weights": weights,
                            "trial": trial,
                            "xy_base": xy_base,
                            "xy_direction": xy_direction,
                            "nonreal": count,
                        }
                    )
            record = {"m": m, "N": N, "d": d, "label": label, "failures": failures}
            records.append(record)
            print(record, flush=True)

    total_failures = sum(record["failures"] for record in records)
    report = {
        "kind": "spiky_compression_endpoint_target_probe",
        "date": "2026-08-02",
        "status": "SPIKY_GENERIC_TARGET_FALSE" if total_failures else "NO_SPIKY_FAILURE_FOUND",
        "total_exact_lines": len(records) * 30,
        "total_failures": total_failures,
        "records": records,
        "first_witnesses": witnesses,
        "warning": "Finite exact sampling; failures disprove the unrestricted compression theorem.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "total_failures": total_failures, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
