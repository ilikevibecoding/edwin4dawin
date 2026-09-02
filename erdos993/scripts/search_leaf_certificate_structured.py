#!/usr/bin/env python3
"""Certificate search for the STRUCTURED leaf lemma (deepest-leaf recursion).

Setting.  In a forest T pick a deepest leaf; its neighbour v has s >= 0 further
leaf children and (possibly) a parent w.  Let F' = T minus v and its s+1 leaf
children, beta = I(F'), gamma = I(F' - w) (gamma = beta if v has no parent).
Deleting v gives the exact recursion

    I(T) = (1+x)^{s+1} beta + x gamma =: a' + x gamma,     a' = I(T - v).

Induction target (ISO at every index for every forest).  With the induction
hypothesis Q_r(a') >= 0 and Q_{r-1}(gamma) >= 0 (both are polynomials of smaller
forests), ISO_r(T) follows from the residual

    R'_r := Q_r(a' + x gamma) - Q_r(a') - Q_{r-1}(gamma) >= 0.

This script asks whether R'_r has a Handelman/Positivstellensatz-type
certificate: R'_r == sum_i lambda_i g_i identically as a polynomial in the
coordinates (beta_k, gamma_k), lambda_i >= 0, where the generators g_i are
products of at most two of the following inequalities, all of which are TRUE
for every forest F' and vertex w (proofs in docs/LEAF_LEMMA_STRUCTURED.md):

  (L)  beta_k >= 0, gamma_k >= 0, beta_k - gamma_k >= 0 (F'-w is an induced
       subforest), and the single-mark relation gamma_k + gamma_{k-1} - beta_k >= 0
       (an independent k-set of F' containing w is w plus an independent
       (k-1)-set of F' - N[w] subset F' - w);
  (S)  super-multiplicativity: beta_j beta_k - C(j+k,j) beta_{j+k} >= 0,
       gamma_j gamma_k - C(j+k,j) gamma_{j+k} >= 0, beta_j gamma_k - C(j+k,j) gamma_{j+k} >= 0
       (pairs of independent sets versus ordered splittings of one independent set);
  (H)  the induction hypotheses on the smaller forests F' and F' - w:
       Q_i(beta) >= 0, Q_i(gamma) >= 0 for 1 <= i <= r  (ISO), and optionally
       FLC_i(beta), FLC_i(gamma) (only if one inducts on FLC instead).

beta_0 = gamma_0 = 1 is substituted.  For each (r, s) the LP is solved in
floating point (HiGHS), the solution is rationalised and the identity is
re-verified EXACTLY with sympy.  A verified certificate for (r, s) is a proof
of R'_r >= 0 for every forest whose deepest-leaf neighbour has s further leaves.

Usage: python3 scripts/search_leaf_certificate_structured.py --rmax 6 --smax 3
"""

from __future__ import annotations

import argparse
import itertools
import os
import sys
from fractions import Fraction
from math import comb

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import numpy as np  # noqa: E402
import sympy as sp  # noqa: E402
from scipy.optimize import linprog  # noqa: E402

from erdos993lib.report import provenance, write_report  # noqa: E402


def Q(seq, r):
    """r x_r^2 + x_{r-1}^2 - (r+1) x_{r-1} x_{r+1} with out-of-range entries = 0."""
    g = lambda k: seq[k] if 0 <= k < len(seq) else sp.Integer(0)  # noqa: E731
    return r * g(r) ** 2 + g(r - 1) ** 2 - (r + 1) * g(r - 1) * g(r + 1)


def FLC(seq, r):
    g = lambda k: seq[k] if 0 <= k < len(seq) else sp.Integer(0)  # noqa: E731
    return r * g(r) ** 2 - (r + 1) * g(r - 1) * g(r + 1)


def build_delta(r, s, use_flc_hyp=False):
    """Coordinates (gamma, delta) with beta = gamma + x*delta exactly, where
    delta = I(F' - N[w]) <= gamma coefficientwise (F' - N[w] is an induced subforest of F' - w)."""
    M = r + 2
    gamma = [sp.Integer(1)] + list(sp.symbols(f"c1:{M+1}", nonnegative=True))
    delta = [sp.Integer(1)] + list(sp.symbols(f"d1:{M+1}", nonnegative=True))
    beta = [gamma[k] + (delta[k - 1] if k >= 1 else 0) for k in range(M + 1)]
    # LEAF-deletion recursion (the residual proved positive on all data by the probe):
    #   p = I(T) = (1+x)^{s+1} beta + x gamma,  a = I(T - l) = (1+x)^s beta + x gamma,  b = I(T - l - v) = (1+x)^s beta
    def binom_mult(seq, t):
        return [sp.expand(sum(comb(t, j) * seq[k - j] for j in range(0, min(t, k) + 1))) for k in range(M + 1)]

    b = binom_mult(beta, s)
    a = [b[k] + (gamma[k - 1] if k >= 1 else 0) for k in range(M + 1)]
    p = [binom_mult(beta, s + 1)[k] + (gamma[k - 1] if k >= 1 else 0) for k in range(M + 1)]
    target = sp.expand(Q(p, r) - Q(a, r) - Q(b, r - 1))
    lin = {"1": sp.Integer(1)}
    for k in range(1, M + 1):
        lin[f"c{k}"] = gamma[k]
        lin[f"d{k}"] = delta[k]
        lin[f"c{k}-d{k}"] = gamma[k] - delta[k]
    quad = {}
    names = list(lin)
    for i in range(len(names)):
        for j in range(i, len(names)):
            quad[f"({names[i]})*({names[j]})"] = sp.expand(lin[names[i]] * lin[names[j]])
    seqs = {"b": beta, "c": gamma, "d": delta}
    for (n1, s1), (n2, s2) in itertools.product(seqs.items(), repeat=2):
        for j in range(1, M + 1):
            for k in range(1, M + 1):
                if j + k <= M:
                    # pairs (J in I_j(X), K in I_k(Y)) >= C(j+k,j) * i_{j+k}(smaller of X,Y) when one is an induced subforest of the other
                    smaller = {("b", "c"): gamma, ("c", "b"): gamma, ("b", "d"): delta, ("d", "b"): delta,
                               ("c", "d"): delta, ("d", "c"): delta, ("b", "b"): beta, ("c", "c"): gamma, ("d", "d"): delta}[(n1, n2)]
                    quad[f"SM_{n1}{n2}({j},{k})"] = sp.expand(s1[j] * s2[k] - comb(j + k, j) * smaller[j + k])
    for i in range(1, r + 1):
        for nm, sq in seqs.items():
            quad[f"Q_{i}({nm})"] = sp.expand(Q(sq, i))
            if use_flc_hyp:
                quad[f"FLC_{i}({nm})"] = sp.expand(FLC(sq, i))
    # exact forest bounds on p_2 in terms of p_1 = n: p_2 <= C(n,2), and (e <= n-1 edges, valid also for n = 0)
    # 2 p_2 = n(n-1) - 2e >= n(n-1) - 2(n-1) = (n-1)(n-2) >= n(n-3) for n >= 1, and 0 >= 0 for n = 0.
    for nm, sq in seqs.items():
        quad[f"p2<=C(p1,2)({nm})"] = sp.expand(sq[1] ** 2 - sq[1] - 2 * sq[2])
        quad[f"2p2>=p1(p1-3)({nm})"] = sp.expand(2 * sq[2] - sq[1] ** 2 + 3 * sq[1])
    quad = {k: v for k, v in quad.items() if v != 0}
    syms = sorted(target.free_symbols | set().union(*[g.free_symbols for g in quad.values()]), key=str)
    return target, quad, syms


def build(r, s, use_flc_hyp=False, gamma_equals_beta=False):
    M = r + 2  # coordinates beta_0..beta_M, gamma_0..gamma_M
    beta = [sp.Integer(1)] + list(sp.symbols(f"b1:{M+1}", nonnegative=True))
    if gamma_equals_beta:
        gamma = beta
    else:
        gamma = [sp.Integer(1)] + list(sp.symbols(f"c1:{M+1}", nonnegative=True))
    # leaf-deletion recursion: p = (1+x)^{s+1} beta + x gamma, a = (1+x)^s beta + x gamma, b = (1+x)^s beta
    def binom_mult(seq, t):
        return [sp.expand(sum(comb(t, j) * seq[k - j] for j in range(0, min(t, k) + 1))) for k in range(M + 1)]

    b = binom_mult(beta, s)
    a = [b[k] + (gamma[k - 1] if k >= 1 else 0) for k in range(M + 1)]
    p = [binom_mult(beta, s + 1)[k] + (gamma[k - 1] if k >= 1 else 0) for k in range(M + 1)]
    target = sp.expand(Q(p, r) - Q(a, r) - Q(b, r - 1))
    # generators
    lin = {}
    for k in range(1, M + 1):
        lin[f"b{k}"] = beta[k]
        if not gamma_equals_beta:
            lin[f"c{k}"] = gamma[k]
            lin[f"b{k}-c{k}"] = beta[k] - gamma[k]
            lin[f"c{k}+c{k-1}-b{k}"] = gamma[k] + gamma[k - 1] - beta[k]
    lin["1"] = sp.Integer(1)
    quad = {}
    names = list(lin)
    for i in range(len(names)):
        for j in range(i, len(names)):
            quad[f"({names[i]})*({names[j]})"] = sp.expand(lin[names[i]] * lin[names[j]])
    for j in range(1, M + 1):
        for k in range(j, M + 1):
            if j + k <= M:
                quad[f"SM_b({j},{k})"] = sp.expand(beta[j] * beta[k] - comb(j + k, j) * beta[j + k])
                if not gamma_equals_beta:
                    quad[f"SM_c({j},{k})"] = sp.expand(gamma[j] * gamma[k] - comb(j + k, j) * gamma[j + k])
                    quad[f"SM_bc({j},{k})"] = sp.expand(beta[j] * gamma[k] - comb(j + k, j) * gamma[j + k])
                    if j != k:
                        quad[f"SM_bc({k},{j})"] = sp.expand(beta[k] * gamma[j] - comb(j + k, j) * gamma[j + k])
    for i in range(1, r + 1):
        quad[f"Q_{i}(beta)"] = sp.expand(Q(beta, i))
        if not gamma_equals_beta:
            quad[f"Q_{i}(gamma)"] = sp.expand(Q(gamma, i))
        if use_flc_hyp:
            quad[f"FLC_{i}(beta)"] = sp.expand(FLC(beta, i))
            if not gamma_equals_beta:
                quad[f"FLC_{i}(gamma)"] = sp.expand(FLC(gamma, i))
    # drop zero generators
    quad = {k: v for k, v in quad.items() if v != 0}
    syms = sorted(target.free_symbols | set().union(*[g.free_symbols for g in quad.values()]), key=str)
    return target, quad, syms


def solve(target, gens, syms):
    """LP: find lambda >= 0 with sum lambda_i g_i == target (coefficient matching)."""
    names = list(gens)
    polys = [sp.Poly(gens[nm], *syms) for nm in names]
    tpoly = sp.Poly(target, *syms)
    monos = set(tpoly.monoms())
    for P in polys:
        monos |= set(P.monoms())
    monos = sorted(monos)
    idx = {m: i for i, m in enumerate(monos)}
    A = np.zeros((len(monos), len(names)))
    for j, P in enumerate(polys):
        for m, c in zip(P.monoms(), P.coeffs()):
            A[idx[m], j] = float(c)
    b = np.zeros(len(monos))
    for m, c in zip(tpoly.monoms(), tpoly.coeffs()):
        b[idx[m]] = float(c)
    # maximise total weight on the IH generators? No: any feasible point suffices; minimise sum lambda for sparsity
    res = linprog(c=np.ones(len(names)), A_eq=A, b_eq=b, bounds=[(0, None)] * len(names), method="highs")
    if res.status != 0:
        return None, res.message
    # rationalise and verify exactly
    lam = {}
    for nm, val in zip(names, res.x):
        if val > 1e-9:
            lam[nm] = Fraction(val).limit_denominator(10**6)
    recon = sp.expand(sum(sp.Rational(v.numerator, v.denominator) * gens[nm] for nm, v in lam.items()))
    if sp.expand(recon - target) == 0:
        return lam, "exact"
    # try exact re-solve on the support via sympy linear system
    support = list(lam)
    unknowns = sp.symbols(f"l0:{len(support)}")
    expr = sp.expand(sum(u * gens[nm] for u, nm in zip(unknowns, support)) - target)
    eqs = sp.Poly(expr, *syms).coeffs()
    sol = sp.solve(eqs, unknowns, dict=True)
    if sol:
        cand = {nm: sol[0].get(u, u) for u, nm in zip(unknowns, support)}
        if all(getattr(v, "is_number", False) and v >= 0 for v in cand.values()):
            recon = sp.expand(sum(v * gens[nm] for nm, v in cand.items()))
            if sp.expand(recon - target) == 0:
                return {nm: Fraction(str(v)) for nm, v in cand.items()}, "exact (re-solved)"
    return None, "float-feasible but exact reconstruction failed"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rmax", type=int, default=6)
    ap.add_argument("--smax", type=int, default=3)
    ap.add_argument("--out", default="reports/leaf_certificate_structured.json")
    args = ap.parse_args()
    results = {}
    for r in range(1, args.rmax + 1):
        for s in range(0, args.smax + 1):
            for variant in ("ISO-IH", "ISO-IH+FLC-IH", "delta-coords,ISO-IH", "delta-coords,ISO-IH+FLC-IH"):
                if variant.startswith("delta"):
                    target, gens, syms = build_delta(r, s, use_flc_hyp=variant.endswith("FLC-IH"))
                else:
                    target, gens, syms = build(r, s, use_flc_hyp=(variant != "ISO-IH"))
                lam, msg = solve(target, gens, syms)
                key = f"r={r},s={s},{variant}"
                results[key] = {"feasible": lam is not None, "message": msg, "num_generators": len(gens),
                                "certificate": {k: str(v) for k, v in lam.items()} if lam else None}
                print(f"{key:28s} generators={len(gens):4d} -> {'CERTIFICATE ' + msg if lam else 'infeasible: ' + str(msg)[:60]}", flush=True)
                if lam:
                    for k, v in lam.items():
                        print(f"      {v}  *  {k}")
        # star-like component (no parent): gamma = beta
        target, gens, syms = build(r, 0, gamma_equals_beta=True)
        lam, msg = solve(target, gens, syms)
        key = f"r={r},no-parent(gamma=beta),s=0"
        results[key] = {"feasible": lam is not None, "message": msg, "num_generators": len(gens),
                        "certificate": {k: str(v) for k, v in lam.items()} if lam else None}
        print(f"{key:28s} generators={len(gens):4d} -> {'CERTIFICATE ' + msg if lam else 'infeasible: ' + str(msg)[:60]}", flush=True)
    payload = {"title": "Handelman-type certificate search for the structured leaf lemma",
               "results": results, "provenance": provenance(os.path.abspath(__file__))}
    print("report:", args.out, write_report(args.out, payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
