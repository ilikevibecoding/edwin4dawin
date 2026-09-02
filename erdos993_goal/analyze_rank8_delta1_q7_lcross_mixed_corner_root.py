#!/usr/bin/env python3
"""Exact slice diagnosis for the mixed Delta1/Q7/lower-cross tensor.

The full tensor's most negative Bernstein coefficient lies at the endpoint
T=W=A=1, Kc=Vc=Zc=0 and at an interior U coefficient.  This script rebuilds
that exact one-dimensional U slice from the source formula and recursively
subdivides its Bernstein representation.  A negative value here is only a
point in the enlarged analytic box, never by itself a tree counterexample.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from probe_rank8_delta01_source_curvatures_root import build


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_q7_lcross_mixed_corner_slice_exact_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def bernstein_coefficients(expression: sp.Expr, variable: sp.Symbol) -> list[sp.Rational]:
    poly = sp.Poly(sp.expand(expression), variable, domain=sp.QQ)
    degree = poly.degree()
    power = [poly.nth(k) for k in range(degree + 1)]
    return [
        sp.factor(
            sum(
                power[k]
                * sp.Rational(math.comb(index, k), math.comb(degree, k))
                for k in range(index + 1)
            )
        )
        for index in range(degree + 1)
    ]


def interval_bernstein(
    expression: sp.Expr,
    variable: sp.Symbol,
    left: sp.Rational,
    right: sp.Rational,
) -> list[sp.Rational]:
    local = sp.symbols("local")
    mapped = sp.expand(expression.subs(variable, left + (right - left) * local))
    return bernstein_coefficients(mapped, local)


def main() -> None:
    value, (n, w, x, U, K, V, Z) = build(1, "q7", "lcross")
    t = sp.Rational(1, 28)
    y = 3 + sp.Rational(546, 25) * t
    r = sp.Rational(4, 3) + sp.Rational(1008, 173) * t
    substitutions = {
        n: 28,
        w: t * y,
        x: t * y * r,
        K: 1,
        V: 0,
        Z: sp.Rational(9, 16),
    }
    slice_value = sp.cancel(value.subs(substitutions))
    numerator, denominator = sp.fraction(slice_value)
    numerator = sp.Poly(sp.expand(numerator), U, domain=sp.QQ).as_expr()
    denominator = sp.Poly(sp.expand(denominator), U, domain=sp.QQ).as_expr()
    denominator_bernstein = bernstein_coefficients(denominator, U)
    assert all(coefficient > 0 for coefficient in denominator_bernstein)

    base = bernstein_coefficients(numerator, U)
    base_negative = [index for index, coefficient in enumerate(base) if coefficient < 0]
    stack = [(sp.S.Zero, sp.S.One, 0)]
    certified = []
    unresolved = []
    negative_sample = None
    maximum_depth = 24
    visited = 0
    while stack:
        left, right, depth = stack.pop()
        visited += 1
        coefficients = interval_bernstein(numerator, U, left, right)
        if all(coefficient >= 0 for coefficient in coefficients):
            certified.append((left, right, depth, min(coefficients)))
            continue
        midpoint = sp.factor((left + right) / 2)
        midpoint_value = sp.factor(numerator.subs(U, midpoint))
        if midpoint_value < 0:
            negative_sample = (left, right, midpoint, midpoint_value, depth)
            break
        if depth >= maximum_depth:
            unresolved.append((left, right, depth, min(coefficients)))
            continue
        stack.append((midpoint, right, depth + 1))
        stack.append((left, midpoint, depth + 1))

    if negative_sample is not None:
        status = "EXACT_NEGATIVE_POINT_IN_ENLARGED_ANALYTIC_BOX_NOT_A_TREE_COUNTEREXAMPLE"
    elif not unresolved:
        status = "PASS_EXACT_MIXED_CORNER_U_SLICE_BY_BERNSTEIN_SUBDIVISION"
    else:
        status = "MIXED_CORNER_U_SLICE_UNRESOLVED_AT_DEPTH_24"

    payload = {
        "schema": "rank8-delta1-q7-lcross-mixed-corner-slice-exact-root-v1",
        "status": status,
        "scope_warning": (
            "This is an enlarged analytic-box slice. Even an exact negative point "
            "is not a rooted tree or a counterexample to Problem 993."
        ),
        "fixed_cube_corner": {
            "T": 1,
            "W": 1,
            "A": 1,
            "Kc": 0,
            "Vc": 0,
            "Zc": 0,
            "n": 28,
            "y": str(y),
            "r": str(r),
            "K": 1,
            "V": 0,
            "Z": "9/16",
        },
        "numerator_degree_U": sp.Poly(numerator, U).degree(),
        "denominator_degree_U": sp.Poly(denominator, U).degree(),
        "denominator_bernstein_minimum": str(min(denominator_bernstein)),
        "base_bernstein_sign_counts": {
            "negative": sum(bool(coefficient < 0) for coefficient in base),
            "zero": sum(bool(coefficient == 0) for coefficient in base),
            "positive": sum(bool(coefficient > 0) for coefficient in base),
        },
        "base_negative_indices": base_negative,
        "base_minimum": str(min(base)),
        "subdivision": {
            "maximum_depth": maximum_depth,
            "visited_intervals": visited,
            "certified_intervals": len(certified),
            "unresolved_intervals": len(unresolved),
            "negative_sample": None
            if negative_sample is None
            else {
                "parent_interval": [str(negative_sample[0]), str(negative_sample[1])],
                "U": str(negative_sample[2]),
                "numerator_value": str(negative_sample[3]),
                "depth": negative_sample[4],
            },
        },
        "immutable_inputs": {
            "probe_rank8_delta01_source_curvatures_root.py": sha256(
                HERE / "probe_rank8_delta01_source_curvatures_root.py"
            ),
            "verify_rank7_terminal_broom_middle_differences.py": sha256(
                HERE / "verify_rank7_terminal_broom_middle_differences.py"
            ),
            "verify_rank8_q8_terminal_reduction.py": sha256(
                HERE / "verify_rank8_q8_terminal_reduction.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(status)
    print("BASE_SIGNS", payload["base_bernstein_sign_counts"])
    print("NEGATIVE_SAMPLE", payload["subdivision"]["negative_sample"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
