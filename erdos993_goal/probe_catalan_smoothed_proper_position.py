#!/usr/bin/env python3
"""Exact affine-line probe for the oriented bottom endpoint pencil.

For N=3m+3 and b=2m+1, put

    A = (D_X+D_Y)^(b+2) (g_N(X) g_N(Y)),
    B = (D_X+D_Y)^b     (g_(N-1)(X) g_(N-1)(Y)).

The desired endpoint is A-B.  Multivariate proper position would follow
from stability of the reverse pencil B+U*A.  This script tests that pencil,
and the generally false forward pencil A+U*B, on exact positive-direction
affine lines.  It supplies finite evidence only.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from probe_umbral_repaired_core_stability import (
    X,
    add,
    affine_values,
    integer_values,
    multiply,
)
from verify_umbral_hypergeometric_finite_free_structure import hypergeometric_form


OUT = Path("catalan_smoothed_proper_position_probe_20260802.json")


def derivative_table(poly: sp.Poly, order: int) -> list[sp.Poly]:
    return [sp.Poly(sp.diff(poly.as_expr(), X, k), X) for k in range(order + 1)]


def derivative_sum_line(
    derivatives: list[sp.Poly],
    order: int,
    xy_base: tuple[int, int],
    xy_direction: tuple[int, int],
) -> list[sp.Rational]:
    values = [sp.S.Zero]
    affine = [
        affine_values(poly, xy_base[coordinate], xy_direction[coordinate])
        for coordinate in range(2)
        for poly in derivatives
    ]
    width = len(derivatives)
    for k in range(order + 1):
        left = affine[k]
        right = affine[width + order - k]
        values = add(values, multiply(left, right), sp.binomial(order, k))
    return values


def nonreal_count(values: list[sp.Rational]) -> int:
    integer_poly = fmpz_poly(integer_values(values))
    return sum(
        multiplicity
        for root, multiplicity in integer_poly.complex_roots()
        if not root.imag.is_zero()
    )


def main() -> None:
    ctx.prec = 128
    rng = random.Random(993_180_021)
    trials = 30
    records: list[dict[str, int]] = []
    first_failures: list[dict[str, object]] = []

    for m in range(1, 21):
        N = 3 * m + 3
        b = 2 * m + 1
        g = sp.Poly(hypergeometric_form(N, 3), X)
        h = sp.Poly(hypergeometric_form(N - 1, 3), X)
        g_derivatives = derivative_table(g, b + 2)
        h_derivatives = derivative_table(h, b)
        reverse_failures = 0
        forward_failures = 0

        for trial in range(trials):
            xy_base = (rng.randint(-24, 24), rng.randint(-24, 24))
            xy_direction = (rng.randint(1, 16), rng.randint(1, 16))
            u_base = rng.randint(-24, 24)
            u_direction = rng.randint(1, 16)

            a_line = derivative_sum_line(
                g_derivatives, b + 2, xy_base, xy_direction
            )
            b_line = derivative_sum_line(h_derivatives, b, xy_base, xy_direction)
            reverse = add(b_line, multiply(a_line, [u_base, u_direction]))
            forward = add(a_line, multiply(b_line, [u_base, u_direction]))
            reverse_nonreal = nonreal_count(reverse)
            forward_nonreal = nonreal_count(forward)

            reverse_failures += bool(reverse_nonreal)
            forward_failures += bool(forward_nonreal)
            if (reverse_nonreal or forward_nonreal) and len(first_failures) < 40:
                first_failures.append(
                    {
                        "m": m,
                        "N": N,
                        "b": b,
                        "trial": trial,
                        "xy_base": xy_base,
                        "xy_direction": xy_direction,
                        "u_base": u_base,
                        "u_direction": u_direction,
                        "reverse_nonreal": reverse_nonreal,
                        "forward_nonreal": forward_nonreal,
                    }
                )

        record = {
            "m": m,
            "N": N,
            "b": b,
            "reverse_failures": reverse_failures,
            "forward_failures": forward_failures,
        }
        records.append(record)
        print(record, flush=True)

    total_reverse = sum(record["reverse_failures"] for record in records)
    total_forward = sum(record["forward_failures"] for record in records)
    report = {
        "kind": "catalan_smoothed_proper_position_probe",
        "date": "2026-08-02",
        "status": (
            "PASS_SAMPLED_REVERSE_PENCIL"
            if total_reverse == 0
            else "REVERSE_PENCIL_FAILURE"
        ),
        "pencils": {
            "reverse": "B+U*A",
            "forward": "A+U*B",
            "A": "(D_X+D_Y)^(b+2)(g_N tensor g_N)",
            "B": "(D_X+D_Y)^b(g_(N-1) tensor g_(N-1))",
        },
        "m_range": [1, 20],
        "trials_per_m": trials,
        "total_exact_lines_per_orientation": 20 * trials,
        "reverse_failure_count": total_reverse,
        "forward_failure_count": total_forward,
        "records": records,
        "first_failures": first_failures,
        "warning": "Finite exact affine-line samples are evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "reverse_failure_count": total_reverse,
                "forward_failure_count": total_forward,
                "output": str(OUT.resolve()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
