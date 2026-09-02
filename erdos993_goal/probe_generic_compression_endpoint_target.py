#!/usr/bin/env python3
"""Exact-line probe for the endpoint target under arbitrary compressions.

For a monic negative-rooted polynomial p of degree N and a monic strict
interlacer q represented by positive residues, put h=Nq.  At the Erdős-993
endpoint N=3m+3 and d=2m+3, test the bivariate polynomial

    (D_X+D_Y)^d[p(X)p(Y)]
      - (D_X+D_Y)^(d-2)[h(X)h(Y)].

The special hypergeometric pair has exactly this normalization.  Failures
would show that endpoint stability needs more than Hermitian compression;
no failures would support a general fixed-size mixed-determinant lemma.
Finite affine-line sampling is evidence only.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from probe_catalan_smoothed_proper_position import (
    derivative_sum_line,
    derivative_table,
)
from probe_generic_compression_endpoint_pencil import compression_polynomial
from probe_umbral_repaired_core_stability import X, add, integer_values


OUT = Path("generic_compression_endpoint_target_probe_20260802.json")


def nonreal(values: list[sp.Rational]) -> int:
    return sum(
        multiplicity
        for root, multiplicity in fmpz_poly(integer_values(values)).complex_roots()
        if not root.imag.is_zero()
    )


def main() -> None:
    ctx.prec = 160
    rng = random.Random(993_180_024)
    records: list[dict[str, object]] = []
    witnesses: list[dict[str, object]] = []

    for m in range(1, 9):
        N = 3 * m + 3
        d = 2 * m + 3
        for model in range(10):
            roots = sorted(rng.sample(range(-12 * N, -1), N))
            p = sp.Poly(sp.prod(X - root for root in roots), X)
            if model == 0:
                weights = [1] * N
                label = "derivative"
            else:
                weights = [rng.randint(1, 30) for _ in roots]
                label = "random_compression"
            h = compression_polynomial(p, roots, weights)
            pd = derivative_table(p, d)
            hd = derivative_table(h, d - 2)
            failures = 0

            for trial in range(20):
                xy_base = (rng.randint(-40, 40), rng.randint(-40, 40))
                xy_direction = (rng.randint(1, 20), rng.randint(1, 20))
                a_line = derivative_sum_line(pd, d, xy_base, xy_direction)
                b_line = derivative_sum_line(hd, d - 2, xy_base, xy_direction)
                values = add(a_line, b_line, -1)
                count = nonreal(values)
                failures += bool(count)
                if count and len(witnesses) < 40:
                    witnesses.append(
                        {
                            "m": m,
                            "N": N,
                            "d": d,
                            "model": model,
                            "label": label,
                            "roots": roots,
                            "weights": weights,
                            "trial": trial,
                            "xy_base": xy_base,
                            "xy_direction": xy_direction,
                            "nonreal": count,
                        }
                    )

            record = {
                "m": m,
                "N": N,
                "d": d,
                "model": model,
                "label": label,
                "failures": failures,
            }
            records.append(record)
            print(record, flush=True)

    total_failures = sum(int(record["failures"]) for record in records)
    report = {
        "kind": "generic_compression_endpoint_target_probe",
        "date": "2026-08-02",
        "status": (
            "GENERIC_TARGET_FALSE"
            if total_failures
            else "NO_GENERIC_TARGET_FAILURE_FOUND"
        ),
        "target": "S^d(p tensor p)-S^(d-2)(h tensor h), h=Nq",
        "m_range": [1, 8],
        "models_per_m": 10,
        "trials_per_model": 20,
        "total_exact_lines": len(records) * 20,
        "total_failures": total_failures,
        "records": records,
        "first_witnesses": witnesses,
        "warning": "A failure is a rigorous disproof witness; no failures are finite evidence only.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "total_failures": total_failures,
                "output": str(OUT.resolve()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
