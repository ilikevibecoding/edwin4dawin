#!/usr/bin/env python3
"""Exact full-D5 Bernstein probe for the four rank-eight Delta7 branches."""

from __future__ import annotations

import argparse
from collections import deque
import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly_ctx

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank7_terminal_broom_middle_differences import CORE_ORDER, D4_CEILING
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def build_cleared_branch(capacity_e: int, d6_k: int):
    n, w, x = sp.symbols("n w x", positive=True)
    U, V = sp.symbols("U V", nonnegative=True)
    source_variables = (n, w, x, U, V)

    c0 = 2 * w / ((n - 1) * (n - 2))
    c1 = n * c0
    c2 = w
    c3 = sp.S.One
    c4 = 1 / x
    d4_low = (2 + x) / 10
    d4 = sp.factor(d4_low + (D4_CEILING - d4_low) * U)
    c5 = sp.factor((1 - d4) / x**2)
    x5 = sp.factor(c4 / c5)
    d5_low = (2 + x5) / 12
    d5_high = sp.Rational(1, 6) + x5 / 2
    d5 = sp.factor(d5_low + (d5_high - d5_low) * V)
    c6 = sp.factor((1 - d5) * c5**2 / c4)
    c7 = sp.factor((12 * c6**2 / c5 - d6_k * c6) / 14)
    c8 = sp.factor((n - 7) * c7 / 8)
    h6 = c6
    h7 = sp.Rational(capacity_e, 7) * (n - 7) * c6

    raw = newton_coefficients(residual())[7]
    rational = sp.cancel(
        raw.subs(
            dict(
                zip(
                    (*c[:9], h[6], h[7]),
                    (c0, c1, c2, c3, c4, c5, c6, c7, c8, h6, h7),
                )
            ),
            simultaneous=True,
        )
    )
    source_numerator, source_denominator = sp.fraction(rational)
    source_numerator = sp.Poly(
        sp.expand(source_numerator), *source_variables, domain=sp.QQ
    )
    source_denominator = sp.Poly(
        sp.expand(source_denominator), *source_variables, domain=sp.QQ
    )

    T, W, A = sp.symbols("T W A", nonnegative=True)
    box = (T, W, A, U, V)
    order = sp.Rational(CORE_ORDER, 1) / T
    w_low = 3 / (order - 3)
    w_high = 3 * (order - 1) / ((order - 3) * (order - 4))
    w_value = sp.factor(w_low + (w_high - w_low) * W)
    x_low = 8 * w_value / (6 - w_value)
    x_high = 4 * w_value / (3 * (1 - w_value))
    x_value = sp.factor(x_low + (x_high - x_low) * A)
    maps_sympy = []
    for value in (order, w_value, x_value):
        numerator, denominator = sp.fraction(sp.cancel(value))
        maps_sympy.append(
            (
                sp.Poly(sp.expand(numerator), *box, domain=sp.QQ),
                sp.Poly(sp.expand(denominator), *box, domain=sp.QQ),
            )
        )
    maps_sympy.extend(
        [
            (sp.Poly(U, *box, domain=sp.QQ), sp.Poly(1, *box, domain=sp.QQ)),
            (sp.Poly(V, *box, domain=sp.QQ), sp.Poly(1, *box, domain=sp.QQ)),
        ]
    )

    flint_context = fmpq_mpoly_ctx.get([str(variable) for variable in box])

    def to_flint(poly: sp.Poly):
        data = {}
        for monomial, coefficient in poly.terms():
            numerator, denominator = sp.fraction(coefficient)
            data[monomial] = fmpq(int(numerator), int(denominator))
        return flint_context.from_dict(data)

    maps = [(to_flint(num), to_flint(den)) for num, den in maps_sympy]

    def clear(source: sp.Poly):
        maxima = source.degree_list()
        powers = [
            [num**power * den ** (maximum - power) for power in range(maximum + 1)]
            for maximum, (num, den) in zip(maxima, maps)
        ]
        result = flint_context.constant(0)
        for monomial, coefficient in source.terms():
            coefficient_numerator, coefficient_denominator = sp.fraction(coefficient)
            term = flint_context.constant(
                fmpq(int(coefficient_numerator), int(coefficient_denominator))
            )
            for axis, power in enumerate(monomial):
                term *= powers[axis][power]
            result += term
        sympy_data = {}
        for monomial, coefficient in result.terms():
            sympy_data[monomial] = sp.Rational(
                int(coefficient.numerator), int(coefficient.denominator)
            )
        expression = sp.Poly.from_dict(sympy_data, box, domain=sp.QQ).as_expr()
        return expression, maxima

    numerator, source_numerator_degrees = clear(source_numerator)
    denominator, source_denominator_degrees = clear(source_denominator)
    return (
        sp.expand(numerator),
        sp.expand(denominator),
        box,
        source_numerator_degrees,
        source_denominator_degrees,
        len(source_numerator.terms()),
        len(source_denominator.terms()),
    )


def certify(coefficients, max_depth: int):
    queue = deque([(coefficients, 0)])
    leaves = 0
    deepest = 0
    worst = None
    splits_by_axis = [0] * coefficients.ndim
    while queue:
        patch, depth = queue.popleft()
        minimum, index = minimum_with_index(patch)
        if worst is None or minimum < worst[0]:
            worst = (minimum, tuple(int(x) for x in index), depth)
        if minimum >= 0:
            leaves += 1
            deepest = max(deepest, depth)
            continue
        if depth >= max_depth:
            return {
                "status": "UNRESOLVED",
                "leaves": leaves,
                "deepest": deepest,
                "worst": worst,
                "unresolved_minimum": str(minimum),
                "unresolved_index": [int(x) for x in index],
                "splits_by_axis": splits_by_axis,
            }
        # Split the axis whose negative coefficient is most interior in
        # normalized index; ties cycle with depth.  This keeps the bounded
        # subdivision deterministic and focuses on the live D4/D5 variables.
        candidates = []
        for axis, (position, size) in enumerate(zip(index, patch.shape)):
            degree = size - 1
            interior = min(position, degree - position) if degree else 0
            candidates.append((interior, axis in (3, 4), -((axis - depth) % patch.ndim), axis))
        axis = max(candidates)[-1]
        left, right = split_bernstein_midpoint(patch, axis)
        splits_by_axis[axis] += 1
        queue.append((left, depth + 1))
        queue.append((right, depth + 1))
    return {
        "status": "PASS",
        "leaves": leaves,
        "deepest": deepest,
        "worst": worst,
        "splits_by_axis": splits_by_axis,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--e", type=int, choices=(0, 1), required=True)
    parser.add_argument("--k", type=int, choices=(1, 7), required=True)
    parser.add_argument("--max-depth", type=int, default=28)
    parser.add_argument("--no-split", action="store_true")
    args = parser.parse_args()
    (
        numerator,
        denominator,
        box,
        source_numerator_degrees,
        source_denominator_degrees,
        source_numerator_terms,
        source_denominator_terms,
    ) = build_cleared_branch(args.e, args.k)
    denominator_degrees, denominator_coefficients = tensor_bernstein_fast(denominator, box)
    denominator_minimum, denominator_index = minimum_with_index(denominator_coefficients)
    assert denominator_minimum >= 0
    degrees, coefficients = tensor_bernstein_fast(numerator, box)
    initial_minimum, initial_index = minimum_with_index(coefficients)
    certificate = (
        {
            "status": "PASS" if initial_minimum >= 0 else "UNRESOLVED_NO_SPLIT",
            "leaves": 1 if initial_minimum >= 0 else 0,
            "deepest": 0,
            "worst": (initial_minimum, tuple(int(x) for x in initial_index), 0),
            "splits_by_axis": [0] * len(box),
        }
        if args.no_split
        else certify(coefficients, args.max_depth)
    )
    payload = {
        "status": certificate["status"],
        "branch": {"capacity_E": args.e, "D6_k": args.k},
        "domain": "n>=39, full D4 and full interior D5 intervals",
        "box": [str(x) for x in box],
        "source_numerator_terms": source_numerator_terms,
        "source_numerator_degrees": list(source_numerator_degrees),
        "source_denominator_terms": source_denominator_terms,
        "source_denominator_degrees": list(source_denominator_degrees),
        "cleared_degrees": list(degrees),
        "initial_coefficients": int(coefficients.size),
        "initial_minimum": str(initial_minimum),
        "initial_minimum_index": [int(x) for x in initial_index],
        "denominator_degrees": list(denominator_degrees),
        "denominator_minimum": str(denominator_minimum),
        "denominator_minimum_index": [int(x) for x in denominator_index],
        "certificate": certificate,
    }
    output = Path(__file__).with_name(
        f"rank8_q8_terminal_delta7_d5_e{args.e}_k{args.k}_exact_20260817.json"
    )
    output.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
    print("BRANCH", args.e, args.k)
    print("SOURCE", source_numerator_terms, source_numerator_degrees)
    print("CLEARED", degrees, coefficients.size, initial_minimum, initial_index)
    print("CERTIFICATE", certificate)
    print("REPORT", output.name, hashlib.sha256(output.read_bytes()).hexdigest().upper())
    if certificate["status"] != "PASS":
        raise SystemExit(2)
    print("PASS_EXACT_RANK8_DELTA7_FULL_D5_BRANCH")


if __name__ == "__main__":
    main()
