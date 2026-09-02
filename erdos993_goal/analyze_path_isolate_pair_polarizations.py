#!/usr/bin/env python3
"""Audit the symmetric isolate-layer polarization on a bare path.

The complete terminal phase gap is quadratic in its residual-moment
rows.  After adjoining isolates, let V_a be the a-th binomial layer
of those rows.  Every output coefficient is a positive subset-union
linear combination of symmetric pair polarizations P(a,b).

If P(a,b)>=0 for all a,b, all isolate coefficients are nonnegative at
once.  This script constructs P(a,b) exactly for fixed layer indices
and audits it on the all-rank stable coordinates

    q=4+r, L=2q-4+x.

The grid is exploratory unless a separate polynomial sign certificate
is produced.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from derive_path_isolate_layer_direct import terminal_series


Series = tuple[sp.Expr, ...]


def core_terms(
    q: sp.Expr,
    A: tuple[Series, ...],
    M: tuple[Series, ...],
    P: tuple[Series, ...],
):
    N, S, H, C, X, Y, HX = A
    m, T, J2, D = M
    p, U, K2, E = P
    return (
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


def ordered_pair(
    state,
    a: int,
    b: int,
) -> sp.Expr:
    q, A, M, P = state
    return sum(
        scalar * left[a] * right[b]
        for scalar, left, right in core_terms(q, A, M, P)
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-layer", type=int, default=4)
    parser.add_argument("--q-max", type=int, default=10)
    parser.add_argument("--x-max", type=int, default=10)
    args = parser.parse_args()
    maximum = args.maximum_layer
    q, length, x = sp.symbols(
        "q L x", integer=True, nonnegative=True
    )
    print("constructing layer states", flush=True)
    states = terminal_series(
        q, length, maximum, return_states=True
    )

    expressions = {}
    for a in range(maximum + 1):
        for b in range(a, maximum + 1):
            value = sp.Integer(0)
            for name, sign in (
                ("new", 1),
                ("old", -1),
                ("lower", -1),
            ):
                state = states[name]
                value += sign * ordered_pair(state, a, b)
                if a != b:
                    value += sign * ordered_pair(state, b, a)
            expressions[(a, b)] = sp.factor(
                sp.combsimp(sp.expand(value))
            )

    negatives = []
    minimum = None
    evaluations = 0
    for tag, expression in expressions.items():
        shifted = expression.subs(length, 2 * q - 4 + x)
        for q_value in range(4, args.q_max + 1):
            for x_value in range(args.x_max + 1):
                value = sp.simplify(
                    shifted.subs({q: q_value, x: x_value})
                )
                evaluations += 1
                record = {
                    "layers": list(tag),
                    "q": q_value,
                    "x": x_value,
                    "value": str(value),
                }
                if minimum is None or value < minimum[0]:
                    minimum = (value, record)
                if value < 0:
                    negatives.append(record)

    report = {
        "status": (
            "PASS_PAIR_POLARIZATION_GRID"
            if not negatives
            else "FAIL_PAIR_POLARIZATION_GRID"
        ),
        "maximum_layer": maximum,
        "pair_count": len(expressions),
        "stable_coordinates": "q>=4, L=2q-4+x",
        "grid": {
            "q": f"4..{args.q_max}",
            "x": f"0..{args.x_max}",
            "evaluations": evaluations,
        },
        "negative_count": len(negatives),
        "first_negatives": negatives[:50],
        "minimum": minimum[1] if minimum else None,
        "pair_expressions": {
            f"{a},{b}": str(value)
            for (a, b), value in expressions.items()
        },
        "consequence_if_proved_uniformly": (
            "Every stable-range isolate-binomial coefficient is a "
            "positive subset-union linear combination of these "
            "pair polarizations."
        ),
        "warning": (
            "This grid audit is not a proof for unbounded q,x,a,b."
        ),
    }
    Path(
        "path_isolate_pair_polarization_grid_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
