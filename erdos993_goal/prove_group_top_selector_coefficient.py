#!/usr/bin/env python3
"""Prove and replay the all-layer sign of the highest Newton selector term.

Only the q=2 summand in the defect formula can contribute the highest
power of j.  Its alternating convolution is governed by the path
independence polynomial B_M(t)=sum_i binom(2M-i-1,i)t^i.  Since B_M has
simple negative roots, B_M(t)B_M(-t) and its odd Wronskian have alternating
coefficients.  This gives a positive highest Newton coefficient in every
layer.  The symbolic fixed-layer checks below replay the coefficient
extraction; the root-factor argument is the all-order proof.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from analyze_group_arbitrary_layer_schur_pattern import derive_selector


HERE = Path(__file__).resolve().parent


def choose_polynomial(top: sp.Expr, bottom: int) -> sp.Expr:
    if bottom < 0:
        return sp.S.Zero
    return sp.prod(top - j for j in range(bottom)) / sp.factorial(bottom)


def falling(value: sp.Expr, order: int) -> sp.Expr:
    return sp.prod(value - j for j in range(order))


def predicted(layer: int, p: sp.Symbol, alpha: sp.Symbol) -> sp.Expr:
    N = p + alpha
    b = [choose_polynomial(2 * N - index - 5, index) for index in range(layer + 1)]
    order = layer // 2 + 2
    if layer % 2 == 0:
        convolution = sum(
            (-1) ** index * b[index] * b[layer - index]
            for index in range(layer + 1)
        )
        return sp.cancel(
            (-1) ** order * convolution / falling(p, layer + 4)
        )
    wronskian_coefficient = sum(
        (-1) ** index
        * (layer - 2 * index)
        * b[index]
        * b[layer - index]
        for index in range(layer + 1)
    )
    return sp.cancel(
        (-1) ** order
        * (p - layer - 3)
        * wronskian_coefficient
        / (2 * falling(p, layer + 4))
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--first", type=int, default=2)
    parser.add_argument("--last", type=int, default=12)
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "group_top_selector_coefficient_theorem_20260805.json",
    )
    args = parser.parse_args()
    records = []
    for layer in range(args.first, args.last + 1):
        p, alpha, selector = derive_selector(layer)
        candidate = predicted(layer, p, alpha)
        identity = sp.cancel(selector[-1] - candidate) == 0
        assert identity
        records.append(
            {
                "layer": layer,
                "selector_degree": len(selector) - 1,
                "coefficient_identity": True,
                "parity": "even-product" if layer % 2 == 0 else "odd-wronskian",
            }
        )
        print(layer, identity, flush=True)
    report = {
        "status": "ALL_LAYER_HIGHEST_NEWTON_SELECTOR_COEFFICIENT_POSITIVE",
        "identity": {
            "even_layer": (
                "c_m=(-1)^m [t^s]B_M(-t)B_M(t)/(p)_(s+4)"
            ),
            "odd_layer": (
                "c_m=(-1)^m(p-s-3)[t^s]t(B_M(-t)B_M'(t)-B_M(-t)'B_M(t))/(2(p)_(s+4))"
            ),
            "B_M": "sum_i binom(2M-i-1,i)t^i, M=N-2",
        },
        "proof": (
            "B_M is the independence polynomial of the path P_(2M-2), so "
            "its roots are simple and negative. Pairing each root with its "
            "sign reversal makes the even product coefficients alternate. "
            "The displayed Wronskian equals 2t times a positive weighted "
            "sum of products with one paired factor omitted, so its odd "
            "coefficients alternate as well. Since p-s-3>0 in the upper "
            "cone and the Newton leading sign is (-1)^m, c_m is positive."
        ),
        "symbolic_replays": records,
        "scope": (
            "This proves the highest selector coefficient in every layer; "
            "positivity of all exceptional Jacobi couplings remains separate."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
