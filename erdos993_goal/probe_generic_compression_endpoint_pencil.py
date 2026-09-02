#!/usr/bin/env python3
"""Test whether the endpoint pencil follows from interlacing alone.

For a monic negative-rooted p of degree N and a monic interlacer q written
as q/p=sum w_i/(X-r_i), set h=Nq.  At d=2m+3, N=3m+3, test

    S^(d-2)(h tensor h) + U S^d(p tensor p).

Failures disprove a generic compression/interlacing theorem and isolate the
extra structure needed from the hypergeometric pair.
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
from probe_umbral_repaired_core_stability import X, add, integer_values, multiply


OUT = Path("generic_compression_endpoint_pencil_probe_20260802.json")


def nonreal(values: list[sp.Rational]) -> int:
    return sum(
        multiplicity
        for root, multiplicity in fmpz_poly(integer_values(values)).complex_roots()
        if not root.imag.is_zero()
    )


def compression_polynomial(p: sp.Poly, roots: list[int], weights: list[int]) -> sp.Poly:
    total = sum(weights)
    N = len(roots)
    # h=Nq has leading coefficient N, matching the original endpoint
    # normalization.  The residues lambda_i=N*w_i/sum(w) sum to N.
    expression = sum(
        sp.Rational(N * weight, total) * sp.div(p.as_expr(), X - root)[0]
        for root, weight in zip(roots, weights)
    )
    return sp.Poly(sp.expand(expression), X)


def main() -> None:
    ctx.prec = 128
    rng = random.Random(993_180_023)
    records = []
    witnesses = []

    for m in range(1, 6):
        N = 3 * m + 3
        d = 2 * m + 3
        for model in range(8):
            roots = sorted(rng.sample(range(-8 * N, -1), N))
            p = sp.Poly(sp.prod(X - root for root in roots), X)
            if model == 0:
                weights = [1] * N  # h=p'
                label = "derivative"
            else:
                weights = [rng.randint(1, 20) for _ in roots]
                label = "random_compression"
            h = compression_polynomial(p, roots, weights)
            pd = derivative_table(p, d)
            hd = derivative_table(h, d - 2)
            failures = 0

            for trial in range(12):
                xy_base = (rng.randint(-30, 30), rng.randint(-30, 30))
                xy_direction = (rng.randint(1, 15), rng.randint(1, 15))
                u = [rng.randint(-30, 30), rng.randint(1, 15)]
                a_line = derivative_sum_line(pd, d, xy_base, xy_direction)
                b_line = derivative_sum_line(hd, d - 2, xy_base, xy_direction)
                values = add(b_line, multiply(a_line, u))
                count = nonreal(values)
                failures += bool(count)
                if count and len(witnesses) < 30:
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
                            "u": u,
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

    report = {
        "kind": "generic_compression_endpoint_pencil_probe",
        "date": "2026-08-02",
        "status": "GENERIC_THEOREM_FALSE" if witnesses else "NO_FAILURE_FOUND",
        "records": records,
        "total_failures": sum(record["failures"] for record in records),
        "first_witnesses": witnesses,
        "warning": "Finite exact line failures are rigorous disproof witnesses for the generic theorem.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "total_failures": report["total_failures"], "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
