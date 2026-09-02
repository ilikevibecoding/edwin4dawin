#!/usr/bin/env python3
"""LP search for a quadratic certificate of the paired-convolution lemma."""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path

import sympy as sp
from scipy.optimize import linprog


def c(p, k):
    return p[k] if 0 <= k < len(p) else sp.Integer(0)


def add(a, b):
    return [c(a, k) + c(b, k) for k in range(max(len(a), len(b)))]


def conv(a, b):
    out = [sp.Integer(0)] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return out


def minor(p, m, n):
    return sp.expand(c(p, m) * c(p, n) - c(p, m + 1) * c(p, n - 1))


def mixed(p, q, m, n):
    return sp.expand(
        c(p, m) * c(q, n)
        + c(q, m) * c(p, n)
        - c(p, m + 1) * c(q, n - 1)
        - c(q, m + 1) * c(p, n - 1)
    )


def coeffs(expr, symbols):
    return {
        powers: int(value)
        for powers, value in sp.Poly(sp.expand(expr), *symbols).as_dict().items()
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--r", type=int, default=2)
    parser.add_argument("--gap", type=int, default=0)
    parser.add_argument("--n", type=int, default=6)
    parser.add_argument("--normalized", action="store_true")
    parser.add_argument(
        "--output", type=Path, default=Path("paired_partial_certificate.json")
    )
    args = parser.parse_args()

    m = args.n + args.gap
    maximum = m + args.r + 3
    u = list(sp.symbols(f"u0:{maximum + 1}", nonnegative=True))
    w = list(sp.symbols(f"w0:{maximum + 1}", nonnegative=True))
    if args.normalized:
        u[0] = sp.Integer(1)
        w[0] = sp.Integer(0)
        w[1] = sp.Integer(2)
    symbols = sorted(
        set().union(*(item.free_symbols for item in [*u, *w])),
        key=str,
    )
    v = add(u, w)
    k = [comb(args.r, i) for i in range(args.r + 1)]
    ell = k[:]
    ell[1] += 2
    x = conv(u, ell)
    y = conv(v, k)
    target = mixed(x, y, m, args.n)

    generators = []
    for a in range(maximum):
        for b in range(a + 1):
            partial = mixed(u, v, a, b)
            mu = minor(u, a, b)
            mv = minor(v, a, b)
            if partial != 0:
                generators.append(("partial", a, b, partial))
            if mu != 0:
                generators.append(("U_lc", a, b, mu))
            if mv != 0:
                generators.append(("V_lc", a, b, mv))

    target_c = coeffs(target, symbols)
    generator_c = [coeffs(item[3], symbols) for item in generators]
    keys = sorted(set(target_c).union(*(set(item) for item in generator_c)))
    a_ub = [[item.get(key, 0) for item in generator_c] for key in keys]
    b_ub = [target_c.get(key, 0) for key in keys]
    result = linprog(
        c=[1.0] * len(generators),
        A_ub=a_ub,
        b_ub=b_ub,
        bounds=[(0, None)] * len(generators),
        method="highs",
    )
    chosen = []
    if result.success:
        for value, (kind, a, b, _) in zip(result.x, generators):
            if value > 1e-8:
                chosen.append(
                    {"weight": float(value), "kind": kind, "m": a, "n": b}
                )
    report = {
        "status": "feasible" if result.success else "infeasible",
        "r": args.r,
        "m": m,
        "n": args.n,
        "gap": args.gap,
        "normalized": args.normalized,
        "constraints": len(keys),
        "generators": len(generators),
        "solver_message": result.message,
        "chosen": chosen,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
