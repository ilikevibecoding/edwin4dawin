#!/usr/bin/env python3
"""Search a conic certificate for factorial pendant-hub CWF closure.

Fix an old planted state with q children and ordinary coefficient sequences
B (root excluded) and D (root included), A=B+D.  Assume the two empirical
full-minor invariants

    WMD: M_A-M_D = M_B+B(B,D) >= 0,
    CWF_q: (q-2)M_B+q B(B,D) >= 0.

After attaching a new hub with r leaf children,

    P=(1+x)^r A, Q=xB,

and the desired new invariant is

    (r-1)M_F(P)+(r+1)B_F(P,Q) >= 0,

where F multiplies rank k by k!.  For fixed output indices this script asks
whether the target is a nonnegative linear combination of old WMD/CWF
minors plus a polynomial with coefficientwise nonnegative monomials.

Numerical LP feasibility is only a discovery tool.  Any successful
certificate must be rationalized and checked symbolically.
"""

from __future__ import annotations

import argparse
import json
from math import comb, factorial
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


def ft(p):
    return [factorial(k) * value for k, value in enumerate(p)]


def minor(p, m, n):
    return sp.expand(c(p, m) * c(p, n) - c(p, m + 1) * c(p, n - 1))


def mixed(p, q, m, n):
    return sp.expand(
        c(p, m) * c(q, n)
        + c(q, m) * c(p, n)
        - c(p, m + 1) * c(q, n - 1)
        - c(q, m + 1) * c(p, n - 1)
    )


def coefficients(expr, symbols):
    return {
        powers: float(value)
        for powers, value in sp.Poly(sp.expand(expr), *symbols).as_dict().items()
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--r", type=int, default=2)
    parser.add_argument("--q", type=int, default=2)
    parser.add_argument("--m", type=int, default=4)
    parser.add_argument("--n", type=int)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    n = args.m if args.n is None else args.n
    maximum = args.m + 2

    b = list(sp.symbols(f"b0:{maximum + 1}", nonnegative=True))
    d = list(sp.symbols(f"d0:{maximum + 1}", nonnegative=True))
    # Exact rooted-state normalization.
    b[0] = sp.Integer(1)
    d[0] = sp.Integer(0)
    d[1] = sp.Integer(1)
    # If the old root has q children, B has q more available vertices at
    # rank one than J=D/x.  Parameterize the nonnegative common remainder
    # directly so both b1-d2=q and d2>=0 are built into the search.
    first_remainder = sp.Symbol("z1", nonnegative=True)
    b[1] = sp.Integer(args.q) + first_remainder
    d[2] = first_remainder
    # B is the forest obtained by deleting the old root.  It has N=b1
    # vertices and exactly N-q edges (q components), hence its number of
    # independent pairs is C(N,2)-(N-q).
    b[2] = sp.expand(
        b[1] * (b[1] - 1) / 2 - first_remainder
    )
    if maximum >= 3:
        # Triangle-free/forest third coefficient:
        # i3=C(N,3)-E(N-2)+sum_v C(deg(v),2), E=N-q.
        degree_wedge_sum = sp.Symbol("z2", nonnegative=True)
        n_vertices = b[1]
        b[3] = sp.expand(
            n_vertices * (n_vertices - 1) * (n_vertices - 2) / 6
            - first_remainder * (n_vertices - 2)
            + degree_wedge_sum
        )
    if maximum >= 4:
        # Inclusion-exclusion for independent 4-sets in a forest.  If
        # W=sum_v C(deg(v),2) and T is the number of three-edge subtrees
        # on four vertices (K_1,3 or P_4), then
        # i4=C(N,4)-E*C(N-2,2)+W*(N-4)+C(E,2)-T.
        three_edge_subtrees = sp.Symbol("z3", nonnegative=True)
        n_vertices = b[1]
        edge_count = first_remainder
        b[4] = sp.expand(
            n_vertices
            * (n_vertices - 1)
            * (n_vertices - 2)
            * (n_vertices - 3)
            / 24
            - edge_count * (n_vertices - 2) * (n_vertices - 3) / 2
            + degree_wedge_sum * (n_vertices - 4)
            + edge_count * (edge_count - 1) / 2
            - three_edge_subtrees
        )
    a = add(b, d)
    symbols = sorted(
        set().union(*(value.free_symbols for value in [*b, *d])),
        key=str,
    )

    kernel = [comb(args.r, k) for k in range(args.r + 1)]
    p = conv(kernel, a)
    qnew = [sp.Integer(0), *b]
    fp, fqnew = ft(p), ft(qnew)
    target = sp.expand(
        (args.r - 1) * minor(fp, args.m, n)
        + (args.r + 1) * mixed(fp, fqnew, args.m, n)
    )

    fb, fd, fa = ft(b), ft(d), ft(a)
    generators = []
    for i in range(maximum):
        for j in range(i + 1):
            mb = minor(fb, i, j)
            cross = mixed(fb, fd, i, j)
            wmd = sp.expand(minor(fa, i, j) - minor(fd, i, j))
            cwf = sp.expand((args.q - 2) * mb + args.q * cross)
            if wmd != 0:
                generators.append(("WMD", i, j, wmd))
            if cwf != 0:
                generators.append(("CWF", i, j, cwf))
    # Exact rooted product domination: J=A(T-N[root]) is coefficientwise
    # bounded by B=A(T-root), and d_{i+1}=(i+1)!J_i in ordinary coordinates
    # before F scaling means simply D_{i+1}=J_i <= B_i at the ordinary
    # coefficient level.  Multiply each linear inequality by every
    # nonnegative coefficient variable to obtain quadratic generators.
    coefficient_values = [*b, *d]
    for i in range(maximum):
        domination = sp.expand(c(b, i) - c(d, i + 1))
        if domination == 0:
            continue
        for j, value in enumerate(coefficient_values):
            generator = sp.expand(domination * value)
            if generator != 0:
                generators.append(("J_le_B", i, j, generator))

    tc = coefficients(target, symbols)
    gc = [coefficients(expr, symbols) for _, _, _, expr in generators]
    keys = sorted(set(tc).union(*(set(item) for item in gc)))
    result = linprog(
        c=[1.0] * len(generators),
        A_ub=[[item.get(key, 0) for item in gc] for key in keys],
        b_ub=[tc.get(key, 0) for key in keys],
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
            if value > 1e-9:
                rational = sp.Rational(str(float(value))).limit_denominator(
                    100_000
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

    payload = {
        "status": "feasible" if result.success else "infeasible",
        "r": args.r,
        "q": args.q,
        "m": args.m,
        "n": n,
        "variables": len(symbols),
        "constraints": len(keys),
        "generators": len(generators),
        "solver_message": result.message,
        "chosen": chosen,
        "residual": residual,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
