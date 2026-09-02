#!/usr/bin/env python3
"""Resolve one path-isolate layer by the two input layer indices.

The binomial product rule identifies a contribution to output layer j
by the two isolate layers a,b whose chosen isolate subsets have union
size j.  This script retains those tags through the complete terminal
phase gap.  It first performs an exact integer grid audit to determine
whether positivity already holds tag by tag; if so, those pieces are
natural candidates for a uniform proof in the isolate layer.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from derive_path_isolate_layer_direct import terminal_series


Series = tuple[sp.Expr, ...]
Contributions = dict[tuple[int, int], sp.Expr]


def add_product(
    result: Contributions,
    scalar: sp.Expr,
    left: Series,
    right: Series,
    target: int,
) -> None:
    for a, left_value in enumerate(left):
        if left_value == 0:
            continue
        for b, right_value in enumerate(right):
            if right_value == 0:
                continue
            if not (max(a, b) <= target <= a + b):
                continue
            linearization = sp.factorial(target) / (
                sp.factorial(a + b - target)
                * sp.factorial(target - a)
                * sp.factorial(target - b)
            )
            tag = (a, b)
            result[tag] = (
                result.get(tag, sp.Integer(0))
                + scalar
                * linearization
                * left_value
                * right_value
            )


def core_contributions(
    q: sp.Expr,
    A: tuple[Series, ...],
    M: tuple[Series, ...],
    P: tuple[Series, ...],
    target: int,
) -> Contributions:
    N, S, H, C, X, Y, HX = A
    m, T, J2, D = M
    p, U, K2, E = P
    result: Contributions = {}
    terms = (
        (-4, X, N),
        (4, X, X),
        (8, m, S),
        (-8, m, HX),
        (-8, N, T),
        (8, X, T),
        (4, m, X),
        (4, m, Y),
        (8, m, m),
        (4 * (q - 3), N, p),
        (2, p, C),
        (4, p, Y),
        (2, N, E),
        (-2, p, H),
        (-8, p, HX),
        (-8, p, X),
        (-2, N, K2),
        (4, S, U),
        (8, X, U),
        (4 * q - 12, m, p),
        (2, p, D),
        (2, m, E),
        (-2, p, J2),
        (-2, m, K2),
        (-4, p, T),
        (4, T, U),
        (4, m, U),
    )
    for scalar, left, right in terms:
        add_product(result, scalar, left, right, target)
    return {
        tag: sp.expand(value) for tag, value in result.items()
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--layer", type=int, required=True)
    parser.add_argument("--q-max", type=int, default=10)
    parser.add_argument("--x-max", type=int, default=8)
    args = parser.parse_args()
    layer = args.layer
    q, length, x = sp.symbols(
        "q L x", integer=True, nonnegative=True
    )
    states = terminal_series(
        q, length, layer, return_states=True
    )
    tagged: Contributions = {}
    for state_name, sign in (("new", 1), ("old", -1), ("lower", -1)):
        rank, A, M, P = states[state_name]
        pieces = core_contributions(rank, A, M, P, layer)
        for tag, value in pieces.items():
            tagged[tag] = tagged.get(tag, sp.Integer(0)) + sign * value
    tagged = {
        tag: sp.factor(sp.combsimp(value))
        for tag, value in tagged.items()
        if value != 0
    }
    unordered: Contributions = {}
    for (a, b), value in tagged.items():
        tag = (min(a, b), max(a, b))
        unordered[tag] = unordered.get(tag, sp.Integer(0)) + value
    unordered = {
        tag: sp.factor(sp.combsimp(value))
        for tag, value in unordered.items()
    }
    total = sp.factor(sp.combsimp(sum(tagged.values())))
    direct = sp.factor(
        sp.combsimp(
            terminal_series(q, length, layer)[layer]
        )
    )
    assert sp.simplify(total - direct) == 0

    def audit_grid(expressions: Contributions) -> dict:
        minimum = None
        negatives = []
        zeros = 0
        evaluations = 0
        for tag, expression in expressions.items():
            shifted = expression.subs(length, 2 * q - 4 + x)
            for q_value in range(4, args.q_max + 1):
                for x_value in range(args.x_max + 1):
                    value = sp.simplify(
                        shifted.subs({q: q_value, x: x_value})
                    )
                    assert value.is_Integer or value.is_Rational
                    evaluations += 1
                    record = {
                        "tag": list(tag),
                        "q": q_value,
                        "x": x_value,
                        "value": str(value),
                    }
                    if minimum is None or value < minimum[0]:
                        minimum = (value, record)
                    if value < 0:
                        negatives.append(record)
                    elif value == 0:
                        zeros += 1
        return {
            "evaluations": evaluations,
            "negative_count": len(negatives),
            "first_negatives": negatives[:40],
            "zero_count": zeros,
            "minimum": minimum[1] if minimum else None,
        }

    ordered_grid = audit_grid(tagged)
    unordered_grid = audit_grid(unordered)

    report = {
        "status": (
            "PASS_UNORDERED_TAGWISE_GRID"
            if not unordered_grid["negative_count"]
            else "FAIL_UNORDERED_TAGWISE_GRID"
        ),
        "isolate_layer": layer,
        "tag_definition": (
            "(a,b) are the two input isolate-binomial layers; their "
            "chosen isolate subsets have union size j"
        ),
        "tag_count": len(tagged),
        "unordered_tag_count": len(unordered),
        "grid": {
            "q": f"4..{args.q_max}",
            "x": f"0..{args.x_max}",
        },
        "ordered_tag_grid": ordered_grid,
        "unordered_tag_grid": unordered_grid,
        "exact_sum_replays_direct_coefficient": True,
        "tagged_expressions": {
            f"{a},{b}": str(expression)
            for (a, b), expression in sorted(tagged.items())
        },
        "unordered_tagged_expressions": {
            f"{a},{b}": str(expression)
            for (a, b), expression in sorted(unordered.items())
        },
        "warning": (
            "A passing finite grid is structural evidence, not an "
            "all-rank sign proof for the tagged expressions."
        ),
    }
    Path(
        f"path_isolate_layer_{layer}_union_contributions_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
