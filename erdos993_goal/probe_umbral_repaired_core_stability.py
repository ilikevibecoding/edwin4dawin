#!/usr/bin/env python3
"""Exact-line probe of the low-rank repaired kernels after umbral conjugacy.

The umbral map sends each one-variable operator D+D^2 to D.  Consequently
the unsmoothed bottom and group G-cores become fixed-rank combinations of
the hypergeometric seeds g_(N,d)=U(P_N^(N-d)) and ordinary derivatives.
If these cores are stable, all later powers of the conjugated T operator are
automatically stable.  This script is finite evidence, not a proof.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import sympy as sp
from flint import ctx, fmpz_poly

from verify_umbral_hypergeometric_finite_free_structure import (
    X,
    hypergeometric_form,
)


OUT = Path("umbral_repaired_core_stability_probe_20260802.json")


def add(left: list[sp.Rational], right: list[sp.Rational], scale=sp.S.One):
    out = [sp.S.Zero] * max(len(left), len(right))
    for i, value in enumerate(left):
        out[i] += value
    for i, value in enumerate(right):
        out[i] += scale * value
    while out and out[-1] == 0:
        out.pop()
    return out


def multiply(left: list[sp.Rational], right: list[sp.Rational]):
    out = [sp.S.Zero] * (len(left) + len(right) - 1)
    for i, u in enumerate(left):
        for j, v in enumerate(right):
            out[i + j] += u * v
    return out


def affine_values(poly: sp.Poly, base: int, direction: int):
    if poly.is_zero:
        return [sp.S.Zero]
    out = [sp.S.Zero]
    power = [sp.S.One]
    for degree in range(poly.degree() + 1):
        if degree:
            power = multiply(power, [sp.Integer(base), sp.Integer(direction)])
        coefficient = poly.nth(degree)
        if coefficient:
            out = add(out, power, coefficient)
    return out


def separable_line(
    left: sp.Poly,
    right: sp.Poly,
    xy_base: tuple[int, int],
    xy_direction: tuple[int, int],
):
    return multiply(
        affine_values(left, xy_base[0], xy_direction[0]),
        affine_values(right, xy_base[1], xy_direction[1]),
    )


def derivative_sum_square_line(
    g: sp.Poly,
    xy_base: tuple[int, int],
    xy_direction: tuple[int, int],
    order: int,
):
    result = [sp.S.Zero]
    for k in range(order + 1):
        left = sp.Poly(sp.diff(g.as_expr(), X, k), X)
        right = sp.Poly(sp.diff(g.as_expr(), X, order - k), X)
        result = add(
            result,
            separable_line(left, right, xy_base, xy_direction),
            sp.binomial(order, k),
        )
    return result


def integer_values(values: list[sp.Rational]) -> list[int]:
    denominator = sp.ilcm(*[sp.denom(value) for value in values])
    return [int(value * denominator) for value in values]


def core_line(
    package: str,
    N: int,
    xy_base: tuple[int, int],
    xy_direction: tuple[int, int],
):
    if package == "bottom":
        g = sp.Poly(hypergeometric_form(N, 3), X)
        previous = sp.Poly(hypergeometric_form(N - 1, 3), X)
        values = derivative_sum_square_line(g, xy_base, xy_direction, 2)
        values = add(
            values,
            separable_line(previous, previous, xy_base, xy_direction),
            -1,
        )
    else:
        g = sp.Poly(hypergeometric_form(N, 1), X)
        previous = sp.Poly(hypergeometric_form(N - 1, 1), X)
        previous2 = sp.Poly(hypergeometric_form(N - 2, 1), X)
        values = derivative_sum_square_line(g, xy_base, xy_direction, 4)
        values = add(
            values,
            derivative_sum_square_line(previous, xy_base, xy_direction, 2),
            -2,
        )
        values = add(
            values,
            separable_line(previous2, previous2, xy_base, xy_direction),
            1,
        )
    return integer_values(values)


def main() -> None:
    ctx.prec = 120
    rng = random.Random(9930281)
    trials = 30
    records = []
    failures = []

    for package in ("bottom", "group"):
        for m in range(1, 21):
            N = 3 * m + (3 if package == "bottom" else 4)
            local = 0
            for trial in range(trials):
                xy_base = (rng.randint(-24, 24), rng.randint(-24, 24))
                xy_direction = (rng.randint(1, 16), rng.randint(1, 16))
                values = core_line(package, N, xy_base, xy_direction)
                nonreal = sum(
                    multiplicity
                    for root, multiplicity in fmpz_poly(values).complex_roots()
                    if not root.imag.is_zero()
                )
                if nonreal:
                    local += 1
                    if len(failures) < 30:
                        failures.append(
                            {
                                "package": package,
                                "m": m,
                                "N": N,
                                "trial": trial,
                                "base": xy_base,
                                "direction": xy_direction,
                                "nonreal": nonreal,
                            }
                        )
            records.append(
                {"package": package, "m": m, "N": N, "failures": local}
            )
            print(records[-1], flush=True)

    report = {
        "kind": "umbral_repaired_core_stability_probe",
        "date": "2026-08-02",
        "status": "PASS_SAMPLED_CORES" if not failures else "CORE_STABILITY_FAILURE",
        "m_range": [1, 20],
        "trials_per_case": trials,
        "total_exact_lines": 2 * 20 * trials,
        "failure_count": sum(record["failures"] for record in records),
        "records": records,
        "first_failures": failures,
        "warning": "Finite exact affine-line samples are evidence, not a proof.",
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "failure_count": report["failure_count"],
                "output": str(OUT.resolve()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
