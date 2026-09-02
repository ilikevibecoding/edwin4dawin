#!/usr/bin/env python3
"""Discovery-only factorial-ratio cones for the no-parent g2 occupation split.

The exact order geometry is n_D=q, n_B=q+x, n_C=q+y,
n_A=q+x+y+z.  Each of A,B,C,D is placed in the standard forest high or
low factorial-drop cone.  Scalar coefficient signs are reported only; this
helper makes no theorem claim.
"""

from __future__ import annotations

import itertools

import sympy as sp


def scaled_row(label, order, maximum):
    ratios = sp.symbols(f"{label}rho1:{maximum}", nonnegative=True)
    q = [sp.Integer(1), 2 * order]
    for ratio in ratios:
        q.append(sp.expand(q[-1] * ratio))
    row = tuple(q[k] / (sp.Integer(2) ** k * sp.factorial(k)) for k in range(maximum + 1))
    return row, ratios


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def a2(row):
    return sp.expand(
        4 * at(row, 0) * at(row, 3) - 3 * at(row, 0) * at(row, 4)
        - 15 * at(row, 0) * at(row, 5) - 6 * at(row, 0) * at(row, 6)
        + 12 * at(row, 1) * at(row, 2) + 8 * at(row, 1) * at(row, 3)
        - 19 * at(row, 1) * at(row, 4) - 14 * at(row, 1) * at(row, 5)
        + 11 * at(row, 2) ** 2 + 18 * at(row, 2) * at(row, 3)
        - 2 * at(row, 2) * at(row, 4) + 6 * at(row, 3) ** 2
    )


def l2(a, b):
    return sp.expand(
        4 * at(a, 0) * at(b, 2) - at(a, 0) * at(b, 3)
        - 14 * at(a, 0) * at(b, 4) - 6 * at(a, 0) * at(b, 5)
        + 8 * at(a, 1) * at(b, 1) + 9 * at(a, 1) * at(b, 2)
        - 4 * at(a, 1) * at(b, 3) - 8 * at(a, 1) * at(b, 4)
        + 4 * at(a, 2) * at(b, 0) + 9 * at(a, 2) * at(b, 1)
        + 20 * at(a, 2) * at(b, 2) + 6 * at(a, 2) * at(b, 3)
        - at(a, 3) * at(b, 0) - 4 * at(a, 3) * at(b, 1)
        + 6 * at(a, 3) * at(b, 2) - 14 * at(a, 4) * at(b, 0)
        - 8 * at(a, 4) * at(b, 1) - 6 * at(a, 5) * at(b, 0)
    )


def k2(b, c):
    return sp.expand(
        4 * at(b, 0) * at(c, 1) + at(b, 0) * at(c, 2)
        - 13 * at(b, 0) * at(c, 3) - 6 * at(b, 0) * at(c, 4)
        + 4 * at(b, 1) * at(c, 0) + 6 * at(b, 1) * at(c, 1)
        + 9 * at(b, 1) * at(c, 2) - 2 * at(b, 1) * at(c, 3)
        + at(b, 2) * at(c, 0) + 9 * at(b, 2) * at(c, 1)
        + 8 * at(b, 2) * at(c, 2) - 13 * at(b, 3) * at(c, 0)
        - 2 * at(b, 3) * at(c, 1) - 6 * at(b, 4) * at(c, 0)
    )


def cone_rules(label, ratios, branch):
    terminal = sp.Symbol(f"{label}t", nonnegative=True)
    deltas = {}
    bounded = None
    if branch == "high":
        for index in range(1, len(ratios)):
            slack = sp.Symbol(f"{label}d{index}", nonnegative=True)
            deltas[index] = 1 + slack
    else:
        bounded = sp.Symbol(f"{label}r", nonnegative=True)
        deltas[1] = bounded
        if len(ratios) >= 3:
            deltas[2] = 2 - bounded + sp.Symbol(f"{label}d2", nonnegative=True)
        for index in range(3, len(ratios)):
            deltas[index] = 1 + sp.Symbol(f"{label}d{index}", nonnegative=True)
    rules = {ratios[-1]: terminal}
    current = terminal
    for index in range(len(ratios) - 1, 0, -1):
        current = sp.expand(current + deltas[index])
        rules[ratios[index - 1]] = current
    return rules, bounded


def main():
    q, x, y, z = sp.symbols("q x y z", nonnegative=True)
    a, ar = scaled_row("A", q + x + y + z, 6)
    b, br = scaled_row("B", q + x, 5)
    c, cr = scaled_row("C", q + y, 5)
    d, dr = scaled_row("D", q, 4)
    target = sp.expand(a2(a) + l2(a, b) + l2(a, c) + k2(b, c) + k2(a, d))
    print("raw_terms", len(sp.Poly(target, q, x, y, z, *ar, *br, *cr, *dr).terms()))

    # Start with the all-high sector.  Other branches are only useful if this
    # broadest power-basis test is promising.
    rules = {}
    for label, ratios in (("A", ar), ("B", br), ("C", cr), ("D", dr)):
        branch_rules, _ = cone_rules(label, ratios, "high")
        rules.update(branch_rules)
    reduced = sp.expand(target.subs(rules))
    variables = tuple(sorted(reduced.free_symbols, key=str))
    polynomial = sp.Poly(reduced, *variables)
    negatives = [(monomial, coefficient) for monomial, coefficient in polynomial.terms() if coefficient < 0]
    print({
        "branch": "high/high/high/high",
        "variables": len(variables),
        "terms": len(polynomial.terms()),
        "negative_coefficients": len(negatives),
        "minimum_coefficient": str(min(polynomial.coeffs())),
    })
    print("first_negative", negatives[:20])


if __name__ == "__main__":
    main()
