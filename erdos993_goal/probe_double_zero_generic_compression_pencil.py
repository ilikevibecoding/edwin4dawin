#!/usr/bin/env python3
"""Test whether the forced double zero makes the endpoint pencil generic.

Let p=x^2 r with r negative-rooted of degree n=N-2, and let h=x^2 q
where q is an arbitrary monic Hermitian compression of r.  This preserves
the exact degree and double-zero pattern of the defect-three seed while
discarding its Chebyshev/Laguerre geometry.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from probe_catalan_smoothed_proper_position import derivative_sum_line, derivative_table
from probe_generic_compression_endpoint_pencil import compression_polynomial
from probe_umbral_repaired_core_stability import X, add, integer_values, multiply


OUT = Path("double_zero_generic_compression_pencil_probe_20260802.json")


def nonreal(values: list[sp.Rational]) -> int:
    return sum(
        multiplicity
        for root, multiplicity in fmpz_poly(integer_values(values)).complex_roots()
        if not root.imag.is_zero()
    )


def main() -> None:
    ctx.prec = 160
    rng = random.Random(993_200_005)
    records = []
    witnesses = []
    trials = 20

    for m in range(1, 9):
        N = 3 * m + 3
        n = N - 2
        d = 2 * m + 3
        roots = sorted(rng.sample(range(-18 * n, -1), n))
        models = [
            ("derivative", [1] * n),
            ("random", [rng.randint(1, 30) for _ in range(n)]),
            ("left_spike", [10**12] + [1] * (n - 1)),
            ("middle_spike", [1 if i != n // 2 else 10**12 for i in range(n)]),
            ("right_spike", [1] * (n - 1) + [10**12]),
        ]
        r = sp.Poly(sp.prod(X - root for root in roots), X)
        for label, weights in models:
            # compression_polynomial has leading coefficient n; divide it
            # out so q is monic.  Positive rescaling would only rescale U.
            q = sp.Poly(compression_polynomial(r, roots, weights).as_expr() / n, X)
            p = sp.Poly(X**2 * r.as_expr(), X)
            h = sp.Poly(X**2 * q.as_expr(), X)
            pd = derivative_table(p, d)
            hd = derivative_table(h, d - 2)
            failures = 0
            for trial in range(trials):
                xy_base = (rng.randint(-45, 45), rng.randint(-45, 45))
                xy_direction = (rng.randint(1, 24), rng.randint(1, 24))
                u = [rng.randint(-45, 45), rng.randint(1, 24)]
                a_line = derivative_sum_line(pd, d, xy_base, xy_direction)
                b_line = derivative_sum_line(hd, d - 2, xy_base, xy_direction)
                count = nonreal(add(b_line, multiply(a_line, u)))
                failures += bool(count)
                if count and len(witnesses) < 40:
                    witnesses.append(
                        {
                            "m": m,
                            "N": N,
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
            record = {"m": m, "N": N, "label": label, "failures": failures}
            records.append(record)
            print(record, flush=True)

    total = sum(record["failures"] for record in records)
    report = {
        "kind": "double_zero_generic_compression_pencil_probe",
        "date": "2026-08-02",
        "status": "DOUBLE_ZERO_GENERIC_THEOREM_FALSE" if total else "NO_FAILURE_FOUND",
        "m_range": [1, 8],
        "trials_per_model": trials,
        "total_exact_lines": len(records) * trials,
        "total_failures": total,
        "records": records,
        "first_witnesses": witnesses,
        "warning": "Finite exact failures disprove the generic theorem; absence would be evidence only.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "records": "omitted", "first_witnesses": "omitted", "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
