#!/usr/bin/env python3
"""Exact-line test of the Catalan-lowering endpoint theorem.

For a generic monic negative-rooted p of degree N, define

    h = Phi(D)p,
    Phi(t)=sum_{j>=1} (-1)^(j-1) Catalan_j t^j.

At N=3m+3, d=2m+3, test both the target A-B and the oriented pencil
B+U A, where A=S^d(p tensor p) and B=S^(d-2)(h tensor h).
This isolates whether universal Catalan lowering, rather than the specific
hypergeometric seed, explains the observed proper position.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from probe_catalan_smoothed_proper_position import derivative_sum_line, derivative_table
from probe_umbral_repaired_core_stability import X, add, integer_values, multiply


OUT = Path("generic_catalan_lowered_endpoint_pencil_probe_20260802.json")


def catalan_lower(poly: sp.Poly) -> sp.Poly:
    expression = sp.S.Zero
    for j in range(1, poly.degree() + 1):
        expression += (-1) ** (j - 1) * sp.catalan(j) * sp.diff(poly.as_expr(), X, j)
    return sp.Poly(sp.expand(expression), X)


def nonreal(values: list[sp.Rational]) -> int:
    return sum(
        multiplicity
        for root, multiplicity in fmpz_poly(integer_values(values)).complex_roots()
        if not root.imag.is_zero()
    )


def main() -> None:
    ctx.prec = 192
    rng = random.Random(993_180_028)
    records = []
    witnesses = []

    for m in range(1, 9):
        N = 3 * m + 3
        d = 2 * m + 3
        for model in range(8):
            roots = sorted(rng.sample(range(-14 * N, -1), N))
            p = sp.Poly(sp.prod(X - root for root in roots), X)
            h = catalan_lower(p)
            pd = derivative_table(p, d)
            hd = derivative_table(h, d - 2)
            target_failures = 0
            reverse_failures = 0

            for trial in range(20):
                xy_base = (rng.randint(-48, 48), rng.randint(-48, 48))
                xy_direction = (rng.randint(1, 24), rng.randint(1, 24))
                u = [rng.randint(-48, 48), rng.randint(1, 24)]
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
                            "model": model,
                            "roots": roots,
                            "trial": trial,
                            "xy_base": xy_base,
                            "xy_direction": xy_direction,
                            "u": u,
                            "target_nonreal": target_count,
                            "reverse_nonreal": reverse_count,
                        }
                    )

            record = {
                "m": m,
                "N": N,
                "d": d,
                "model": model,
                "target_failures": target_failures,
                "reverse_failures": reverse_failures,
            }
            records.append(record)
            print(record, flush=True)

    total_target = sum(record["target_failures"] for record in records)
    total_reverse = sum(record["reverse_failures"] for record in records)
    report = {
        "kind": "generic_catalan_lowered_endpoint_pencil_probe",
        "date": "2026-08-02",
        "status": (
            "CATALAN_GENERALIZATION_FALSE"
            if total_target or total_reverse
            else "NO_CATALAN_GENERALIZATION_FAILURE_FOUND"
        ),
        "total_exact_lines": len(records) * 20,
        "target_failure_count": total_target,
        "reverse_pencil_failure_count": total_reverse,
        "records": records,
        "first_witnesses": witnesses,
        "warning": "Finite exact sampling; any failure disproves the corresponding universal claim.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "target_failures": total_target, "reverse_failures": total_reverse, "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
