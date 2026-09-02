#!/usr/bin/env python3
"""Probe homogenized bottom endpoints and adjacent homogeneous slices.

This is route-selection evidence only.  Suspected failures are replayed with
exact rational coefficients and counted with flint root isolation.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import numpy as np
import sympy as sp
from flint import fmpz_poly

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


Y, Z, Q, U = sp.symbols("Y Z Q U")
OUT = Path("bottom_homogenized_slice_chain_probe_20260803.json")


def bottom_target(m: int) -> sp.Poly:
    N = 3 * m + 3
    d = 2 * m + 3
    g = sp.expand(hypergeometric_form(N, 3))
    h = sp.expand(hypergeometric_form(N - 1, 3))
    expression = sum(
        sp.binomial(d, k)
        * sp.diff(g, X, k)
        * sp.diff(g, X, d - k).subs(X, Y)
        for k in range(d + 1)
    ) - sum(
        sp.binomial(d - 2, k)
        * sp.diff(h, X, k)
        * sp.diff(h, X, d - 2 - k).subs(X, Y)
        for k in range(d - 1)
    )
    return sp.Poly(sp.expand(expression), X, Y)


def primitive_integer_univariate(expression: sp.Expr) -> fmpz_poly:
    poly = sp.Poly(sp.expand(expression), Q)
    coefficients = [poly.nth(k) for k in range(poly.degree() + 1)]
    denominator = sp.ilcm(*[sp.denom(value) for value in coefficients])
    integers = [int(value * denominator) for value in coefficients]
    content = math.gcd(*[abs(value) for value in integers if value])
    return fmpz_poly([value // content for value in integers])


def exact_real_root_count(expression: sp.Expr) -> tuple[int, int]:
    polynomial = primitive_integer_univariate(expression)
    roots = polynomial.complex_roots()
    real = sum(multiplicity for root, multiplicity in roots if root.imag.is_zero())
    return polynomial.degree(), real


def numerical_line_roots(poly: sp.Poly, variables: tuple[sp.Symbol, ...], rng: random.Random):
    intercepts = [rng.randint(-80, 80) for _ in variables]
    directions = [rng.randint(1, 35) for _ in variables]
    substitution = {
        variable: intercept + direction * Q
        for variable, intercept, direction in zip(variables, intercepts, directions)
    }
    line = sp.Poly(sp.expand(poly.as_expr().subs(substitution)), Q)
    coefficients = np.array([float(value) for value in line.all_coeffs()], dtype=float)
    if len(coefficients) <= 1:
        return None
    roots = np.roots(coefficients / np.max(np.abs(coefficients)))
    nonreal = max((abs(root.imag) for root in roots), default=0.0)
    return intercepts, directions, line.as_expr(), nonreal


def homogeneous_slices(target: sp.Poly) -> dict[int, sp.Poly]:
    result: dict[int, sp.Expr] = {}
    for (px, py), coefficient in target.terms():
        degree = px + py
        result[degree] = result.get(degree, 0) + coefficient * X**px * Y**py
    return {degree: sp.Poly(sp.expand(value), X, Y) for degree, value in result.items()}


def main() -> None:
    rng = random.Random(20260803)
    report: dict[str, object] = {"kind": "bottom_homogenized_slice_chain_probe", "cases": []}
    for m in range(1, 6):
        target = bottom_target(m)
        top = target.total_degree()
        homogenized = sp.Poly(
            sp.expand(
                sum(
                    coefficient * X**px * Y**py * Z ** (top - px - py)
                    for (px, py), coefficient in target.terms()
                )
            ),
            X,
            Y,
            Z,
        )
        slices = homogeneous_slices(target)
        case: dict[str, object] = {
            "m": m,
            "N": 3 * m + 3,
            "d": 2 * m + 3,
            "total_degree": top,
            "slice_degrees": sorted(slices),
            "homogenized_trials": 0,
            "homogenized_exact_failures": [],
            "adjacent_slice_trials": 0,
            "adjacent_slice_exact_failures": [],
        }

        for _ in range(30):
            sample = numerical_line_roots(homogenized, (X, Y, Z), rng)
            if sample is None:
                continue
            case["homogenized_trials"] += 1
            intercepts, directions, line, nonreal = sample
            if nonreal > 1e-5:
                degree, real = exact_real_root_count(line)
                if real < degree:
                    case["homogenized_exact_failures"].append(
                        {
                            "intercepts": intercepts,
                            "directions": directions,
                            "degree": degree,
                            "real_roots": real,
                        }
                    )
                    break

        ordered = sorted(slices)
        for lower, upper in zip(ordered, ordered[1:]):
            # Equalize total degree before testing the proper-position pencil.
            pair = sp.Poly(
                sp.expand(slices[upper].as_expr() + U * slices[lower].as_expr()),
                X,
                Y,
                U,
            )
            for _ in range(15):
                sample = numerical_line_roots(pair, (X, Y, U), rng)
                if sample is None:
                    continue
                case["adjacent_slice_trials"] += 1
                intercepts, directions, line, nonreal = sample
                if nonreal > 1e-5:
                    degree, real = exact_real_root_count(line)
                    if real < degree:
                        case["adjacent_slice_exact_failures"].append(
                            {
                                "slice_degrees": [lower, upper],
                                "intercepts": intercepts,
                                "directions": directions,
                                "degree": degree,
                                "real_roots": real,
                            }
                        )
                        break
            if case["adjacent_slice_exact_failures"]:
                break

        report["cases"].append(case)
        print(
            json.dumps(
                {
                    "m": m,
                    "homogenized_failures": len(case["homogenized_exact_failures"]),
                    "adjacent_slice_failures": len(case["adjacent_slice_exact_failures"]),
                }
            ),
            flush=True,
        )

    report["status"] = (
        "FAILURE_FOUND"
        if any(
            case["homogenized_exact_failures"] or case["adjacent_slice_exact_failures"]
            for case in report["cases"]
        )
        else "NO_FAILURE_FINITE_PROBE"
    )
    report["warning"] = "Finite exact affine-line route-selection evidence only."
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
