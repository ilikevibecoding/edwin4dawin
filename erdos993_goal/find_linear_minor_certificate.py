#!/usr/bin/env python3
"""Search for a linear nonnegative quadratic certificate of cherry closure.

For a fixed generic output minor, this asks whether its quadratic polynomial
in the coefficients of B and D can be written as a nonnegative combination
of:

* input pair reserves M_{B+D}-M_D,
* log-concavity minors of B,
* log-concavity minors of D, and
* coefficient monomials.

The last class means that, after subtracting the chosen minor generators,
every remaining monomial coefficient must be nonnegative.  Feasibility is
checked by exact symbolic coefficient extraction followed by a numerical LP;
any putative certificate must later be rationalized and checked exactly.
"""

from __future__ import annotations

import argparse
import itertools
import json
from math import comb
from pathlib import Path

import sympy as sp
from scipy.optimize import linprog


def coefficient(seq: list[sp.Expr], k: int) -> sp.Expr:
    return seq[k] if 0 <= k < len(seq) else sp.Integer(0)


def add(a: list[sp.Expr], b: list[sp.Expr]) -> list[sp.Expr]:
    return [
        coefficient(a, k) + coefficient(b, k)
        for k in range(max(len(a), len(b)))
    ]


def convolve(a: list[sp.Expr], b: list[int]) -> list[sp.Expr]:
    out = [sp.Integer(0)] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return out


def minor(p: list[sp.Expr], m: int, n: int) -> sp.Expr:
    return sp.expand(
        coefficient(p, m) * coefficient(p, n)
        - coefficient(p, m + 1) * coefficient(p, n - 1)
    )


def vector(expr: sp.Expr, monomials: list[sp.Expr]) -> list[float]:
    poly = sp.Poly(sp.expand(expr), *sorted(expr.free_symbols, key=str))
    data = poly.as_dict()
    symbols = sorted(expr.free_symbols, key=str)
    result = []
    for monomial in monomials:
        powers = sp.Poly(monomial, *symbols).monoms()[0]
        result.append(float(data.get(powers, 0)))
    return result


def expression_coefficients(
    expr: sp.Expr, all_symbols: list[sp.Symbol]
) -> dict[tuple[int, ...], int]:
    return {
        powers: int(value)
        for powers, value in sp.Poly(sp.expand(expr), *all_symbols).as_dict().items()
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--r", type=int, default=2)
    parser.add_argument("--gap", type=int, default=0)
    parser.add_argument("--n", type=int, default=6)
    parser.add_argument(
        "--output", type=Path, default=Path("linear_minor_certificate.json")
    )
    args = parser.parse_args()

    m = args.n + args.gap
    maximum_index = m + args.r + 2
    b = list(sp.symbols(f"b0:{maximum_index + 1}", nonnegative=True))
    d = list(sp.symbols(f"d0:{maximum_index + 1}", nonnegative=True))
    symbols = [*b, *d]
    a = add(b, d)
    kernel = [comb(args.r, k) for k in range(args.r + 1)]
    h = kernel[:]
    if len(h) < 2:
        h += [0] * (2 - len(h))
    h[1] += 1
    total = add(convolve(b, h), convolve(d, kernel))
    occupied = [sp.Integer(0), *b]
    target = sp.expand(minor(total, m, args.n) - minor(occupied, m, args.n))

    generators: list[tuple[str, int, int, sp.Expr]] = []
    # Include every local ordered minor whose coefficient variables occur in
    # the target range.  A wider set only enlarges the possible certificate.
    for u in range(maximum_index):
        for v in range(u + 1):
            pair_reserve = sp.expand(minor(a, u, v) - minor(d, u, v))
            b_minor = minor(b, u, v)
            d_minor = minor(d, u, v)
            if pair_reserve != 0:
                generators.append(("pair", u, v, pair_reserve))
            if b_minor != 0:
                generators.append(("B_lc", u, v, b_minor))
            if d_minor != 0:
                generators.append(("D_lc", u, v, d_minor))

    target_coeffs = expression_coefficients(target, symbols)
    generator_coeffs = [
        expression_coefficients(expr, symbols) for _, _, _, expr in generators
    ]
    monomial_keys = sorted(
        set(target_coeffs).union(*(set(item) for item in generator_coeffs))
    )

    # target - sum(lambda_i generator_i) has nonnegative coefficients.
    a_ub = []
    b_ub = []
    for key in monomial_keys:
        a_ub.append([coeffs.get(key, 0) for coeffs in generator_coeffs])
        b_ub.append(target_coeffs.get(key, 0))

    result = linprog(
        c=[1.0] * len(generators),
        A_ub=a_ub,
        b_ub=b_ub,
        bounds=[(0, None)] * len(generators),
        method="highs",
    )
    chosen = []
    if result.success:
        for value, (kind, u, v, _) in zip(result.x, generators):
            if value > 1e-8:
                chosen.append(
                    {"weight": float(value), "kind": kind, "m": u, "n": v}
                )

    report = {
        "status": "feasible" if result.success else "infeasible",
        "r": args.r,
        "m": m,
        "n": args.n,
        "gap": args.gap,
        "variables": len(symbols),
        "monomial_constraints": len(monomial_keys),
        "generators": len(generators),
        "solver_message": result.message,
        "chosen": chosen,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
