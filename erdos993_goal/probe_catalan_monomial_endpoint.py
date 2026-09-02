#!/usr/bin/env python3
"""Probe the Catalan endpoint on the algebraic-symbol monomial seed.

The repeated-root seed p=X^N is the extremal test for whether S^(d-2)Q
is a bounded-degree stability preserver.  Test the target and reverse pencil
for N=3m+3, d=2m+3 on exact positive-direction lines.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from probe_catalan_smoothed_proper_position import derivative_sum_line, derivative_table
from probe_generic_catalan_lowered_endpoint_pencil import catalan_lower
from probe_umbral_repaired_core_stability import X, add, integer_values, multiply


OUT = Path("catalan_monomial_endpoint_probe_20260802.json")


def nonreal(values: list[sp.Rational]) -> int:
    return sum(
        multiplicity
        for root, multiplicity in fmpz_poly(integer_values(values)).complex_roots()
        if not root.imag.is_zero()
    )


def main() -> None:
    ctx.prec = 192
    rng = random.Random(993_180_029)
    records = []
    witnesses = []
    for m in range(1, 31):
        N = 3 * m + 3
        d = 2 * m + 3
        p = sp.Poly(X**N, X)
        h = catalan_lower(p)
        pd = derivative_table(p, d)
        hd = derivative_table(h, d - 2)
        target_failures = 0
        reverse_failures = 0
        for trial in range(40):
            xy_base = (rng.randint(-30, 30), rng.randint(-30, 30))
            xy_direction = (rng.randint(1, 20), rng.randint(1, 20))
            u = [rng.randint(-30, 30), rng.randint(1, 20)]
            a_line = derivative_sum_line(pd, d, xy_base, xy_direction)
            b_line = derivative_sum_line(hd, d - 2, xy_base, xy_direction)
            target_count = nonreal(add(a_line, b_line, -1))
            reverse_count = nonreal(add(b_line, multiply(a_line, u)))
            target_failures += bool(target_count)
            reverse_failures += bool(reverse_count)
            if (target_count or reverse_count) and len(witnesses) < 50:
                witnesses.append(
                    {
                        "m": m,
                        "N": N,
                        "d": d,
                        "trial": trial,
                        "xy_base": xy_base,
                        "xy_direction": xy_direction,
                        "u": u,
                        "target_nonreal": target_count,
                        "reverse_nonreal": reverse_count,
                    }
                )
        record = {"m": m, "N": N, "d": d, "target_failures": target_failures, "reverse_failures": reverse_failures}
        records.append(record)
        print(record, flush=True)

    report = {
        "kind": "catalan_monomial_endpoint_probe",
        "date": "2026-08-02",
        "records": records,
        "target_failure_count": sum(record["target_failures"] for record in records),
        "reverse_failure_count": sum(record["reverse_failures"] for record in records),
        "first_witnesses": witnesses,
        "warning": "Finite exact affine-line sampling; failures are rigorous witnesses.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "DONE", "target_failures": report["target_failure_count"], "reverse_failures": report["reverse_failure_count"], "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
