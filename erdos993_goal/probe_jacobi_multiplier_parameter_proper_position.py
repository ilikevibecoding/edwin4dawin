#!/usr/bin/env python3
"""Locate the multiplier-strength boundary for the endpoint pencil.

Replace the actual defect-three factor T_3 J_n by T_c J_n, where
T_c(x^k)=x^k/(c)_k, and test the reverse pencil on exact affine lines.
This is a diagnostic probe only; it helps determine whether c=3 lies in a
larger parameter regime that may admit a theorem.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from probe_catalan_smoothed_proper_position import derivative_sum_line, derivative_table
from probe_umbral_repaired_core_stability import X, add, integer_values, multiply


OUT = Path("jacobi_multiplier_parameter_proper_position_probe_20260802.json")


def seed(N: int, c: sp.Rational | None) -> sp.Poly:
    n = N - 2
    terms = []
    for k in range(n + 1):
        denominator = sp.rf(sp.Rational(3, 2), k) * sp.factorial(k)
        if c is not None:
            denominator *= sp.rf(c, k)
        terms.append(
            sp.rf(-n, k)
            * sp.rf(n + 2, k)
            / denominator
            * (-X / 4) ** k
        )
    return sp.Poly(sp.expand(X**2 * sum(terms)), X)


def nonreal_count(values: list[sp.Rational]) -> int:
    return sum(
        multiplicity
        for root, multiplicity in fmpz_poly(integer_values(values)).complex_roots()
        if not root.imag.is_zero()
    )


def main() -> None:
    ctx.prec = 128
    rng = random.Random(993_200_003)
    parameters: list[tuple[str, sp.Rational | None]] = [
        ("1/2", sp.Rational(1, 2)),
        ("1", sp.Integer(1)),
        ("2", sp.Integer(2)),
        ("3", sp.Integer(3)),
        ("4", sp.Integer(4)),
        ("5", sp.Integer(5)),
        ("8", sp.Integer(8)),
        ("16", sp.Integer(16)),
        ("64", sp.Integer(64)),
        ("identity", None),
    ]
    trials = 12
    records = []

    # Reuse identical affine lines for every c at a fixed m.
    line_models = {}
    for m in range(1, 16):
        line_models[m] = [
            {
                "xy_base": (rng.randint(-18, 18), rng.randint(-18, 18)),
                "xy_direction": (rng.randint(1, 12), rng.randint(1, 12)),
                "u_base": rng.randint(-18, 18),
                "u_direction": rng.randint(1, 12),
            }
            for _ in range(trials)
        ]

    for label, c in parameters:
        total_failures = 0
        first_failure = None
        for m in range(1, 16):
            N = 3 * m + 3
            b = 2 * m + 1
            g_derivatives = derivative_table(seed(N, c), b + 2)
            h_derivatives = derivative_table(seed(N - 1, c), b)
            failures = 0
            for trial, model in enumerate(line_models[m]):
                a_line = derivative_sum_line(
                    g_derivatives,
                    b + 2,
                    model["xy_base"],
                    model["xy_direction"],
                )
                b_line = derivative_sum_line(
                    h_derivatives,
                    b,
                    model["xy_base"],
                    model["xy_direction"],
                )
                reverse = add(
                    b_line,
                    multiply(a_line, [model["u_base"], model["u_direction"]]),
                )
                count = nonreal_count(reverse)
                failures += bool(count)
                if count and first_failure is None:
                    first_failure = {"m": m, "trial": trial, **model, "nonreal": count}
            total_failures += failures
            records.append(
                {"c": label, "m": m, "failures": failures, "trials": trials}
            )
        print({"c": label, "total_failures": total_failures}, flush=True)

    totals = {
        label: sum(r["failures"] for r in records if r["c"] == label)
        for label, _ in parameters
    }
    report = {
        "kind": "jacobi_multiplier_parameter_proper_position_probe",
        "date": "2026-08-02",
        "status": "DONE_FINITE_EXACT_PARAMETER_SCAN",
        "pencil": "S^b(h tensor h)+U*S^(b+2)(g tensor g)",
        "family": "g=x^2 T_c[2F1(-n,n+2;3/2;-x/4)]",
        "m_range": [1, 15],
        "trials_per_m": trials,
        "parameters": [label for label, _ in parameters],
        "failure_totals": totals,
        "records": records,
        "warning": "Exact affine-line tests are finite evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**report, "records": "omitted", "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
