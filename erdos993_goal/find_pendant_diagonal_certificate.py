#!/usr/bin/env python3
"""Search quadratic conic certificates for the pendant-cherry sequence lemma.

Let A=B+W with b_0=1, w_0=0, w_1=1.  The hypotheses are that A and B
are log-concave and partially synchronized.  For K=(1+x)^r put

    E=K*A,  P=E+x*B.

For a requested target, search for a nonnegative linear combination of the
input LC/partial reserves whose subtraction leaves a polynomial with
coefficientwise nonnegative monomials in the remaining b_i,w_i variables.
"""

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
        for powers, value in sp.Poly(
            sp.expand(expr), *symbols
        ).as_dict().items()
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--r", type=int, default=2)
    parser.add_argument("--m", type=int, default=4)
    parser.add_argument("--n", type=int)
    parser.add_argument(
        "--target", choices=("lc", "partial"), default="lc"
    )
    parser.add_argument(
        "--output", type=Path, default=Path("pendant_certificate.json")
    )
    args = parser.parse_args()
    n = args.m if args.n is None else args.n
    maximum = args.m + args.r + 4

    b = list(sp.symbols(f"b0:{maximum + 1}", nonnegative=True))
    w = list(sp.symbols(f"w0:{maximum + 1}", nonnegative=True))
    b[0] = sp.Integer(1)
    w[0] = sp.Integer(0)
    w[1] = sp.Integer(1)
    a = add(b, w)
    # In a genuine rooted deletion pair A=B+xJ, so j_k=w_{k+1}.
    jseq = w[1:]
    symbols = sorted(
        set().union(*(item.free_symbols for item in [*a, *b])),
        key=str,
    )

    k = [comb(args.r, i) for i in range(args.r + 1)]
    e = conv(k, a)
    p = add(e, [sp.Integer(0), *b])
    target = (
        minor(p, args.m, args.m)
        if args.target == "lc"
        else mixed(p, e, args.m, n)
    )

    generators = []
    for i in range(maximum):
        for j in range(i + 1):
            pa = mixed(a, b, i, j)
            ma = minor(a, i, j)
            mb = minor(b, i, j)
            mj = minor(jseq, i, j)
            if pa != 0:
                generators.append(("partial", i, j, pa))
            if ma != 0:
                generators.append(("A_lc", i, j, ma))
            if mb != 0:
                generators.append(("B_lc", i, j, mb))
            if mj != 0:
                generators.append(("J_lc", i, j, mj))

    target_c = coeffs(target, symbols)
    generator_c = [coeffs(item[3], symbols) for item in generators]
    keys = sorted(set(target_c).union(*(set(item) for item in generator_c)))
    # A*x <= b means target - sum x_i generator_i is coefficientwise
    # nonnegative in the nonnegative b,w variables.
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
    residual = None
    if result.success:
        expression = target
        for value, (kind, i, j, generator) in zip(
            result.x, generators, strict=True
        ):
            if value > 1e-8:
                rational = sp.Rational(str(float(value))).limit_denominator(
                    10_000
                )
                chosen.append(
                    {
                        "weight_float": float(value),
                        "weight_rational": str(rational),
                        "kind": kind,
                        "m": i,
                        "n": j,
                    }
                )
                expression -= rational * generator
        residual = str(sp.factor(expression))

    report = {
        "status": "feasible" if result.success else "infeasible",
        "target": args.target,
        "r": args.r,
        "m": args.m,
        "n": n,
        "constraints": len(keys),
        "generators": len(generators),
        "solver_message": result.message,
        "chosen": chosen,
        "residual": residual,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
