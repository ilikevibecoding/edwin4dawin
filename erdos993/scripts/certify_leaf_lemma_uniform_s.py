#!/usr/bin/env python3
"""Certificates for the structured leaf lemma that are UNIFORM in the number
of sibling leaves s (s = s0 + t, t >= 0 symbolic).

Setting as in docs/LEAF_LEMMA_STRUCTURED.md.  The residual

    R_r = Q_r(p) - Q_r(a) - Q_{r-1}(b),
    b = (1+x)^s beta,  a = b + x gamma,  p = (1+x)^{s+1} beta + x gamma,  beta = gamma + x delta,

is a polynomial in the coordinates (gamma_k, delta_k) AND in s (through the
binomial coefficients C(s, j), C(s+1, j)).  We look for an identity

    m(gamma, delta) * R_r  ==  sum_i lambda_i(t) * g_i,     lambda_i(t) = sum_e c_{i,e} t^e,  c_{i,e} >= 0,

valid identically in (gamma, delta, t).  Since every c_{i,e} >= 0 and t >= 0,
lambda_i(t) >= 0 for all s >= s0, so ONE identity proves R_r >= 0 for every
forest whose deepest-leaf neighbour has s >= s0 sibling leaves (with a
parent w; the degree relation, if used, has its own parameter d = d0 + u).
The generators g_i are the products of at most two generators of
search_leaf_certificate_structured.build_delta (degree-3 certificates with a
linear multiplier), optionally extended by the degree relation.

Float LP (HiGHS) proposes the support; the coefficients are re-solved exactly
over the rationals (flint-backed DomainMatrix) and the identity is verified
coefficient-by-coefficient.  Only then is a level reported as certified.

Usage: python3 scripts/certify_leaf_lemma_uniform_s.py --r 2 3 --s0 1 --tdeg 12
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import sys
import time
from fractions import Fraction
from math import comb

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import numpy as np  # noqa: E402
import sympy as sp  # noqa: E402
from scipy.optimize import linprog  # noqa: E402
from scipy.sparse import csr_matrix, lil_matrix  # noqa: E402

from erdos993lib.report import provenance, write_report  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("slc", os.path.join(HERE, "search_leaf_certificate_structured.py"))
slc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(slc)  # type: ignore

t = sp.Symbol("t", nonnegative=True)
u = sp.Symbol("u", nonnegative=True)


def sym_binom(sexpr, j):
    """C(sexpr, j) as a polynomial in the symbols of sexpr."""
    out = sp.Integer(1)
    for i in range(j):
        out *= (sexpr - i)
    return sp.expand(out / sp.factorial(j))


def build_symbolic(r, s0, use_degree_relation=False, d0=1, no_parent=False, fixed_s=False):
    """Target R_r with s = s0 + t; generators from build_delta (s-independent) plus optional degree relation with d = d0 + u.

    no_parent=True is the star-like case: the component of the deepest leaf is K_{1,s+1}, F' is the rest of the
    forest, gamma = beta = I(F') and delta = 0 (all delta_k = 0); generators involving delta drop out.
    """
    M = r + 2
    gamma = [sp.Integer(1)] + list(sp.symbols(f"c1:{M+1}", nonnegative=True))
    if no_parent:
        delta = [sp.Integer(0)] * (M + 1)
    else:
        delta = [sp.Integer(1)] + list(sp.symbols(f"d1:{M+1}", nonnegative=True))
    beta = [gamma[k] + (delta[k - 1] if k >= 1 else 0) for k in range(M + 1)]
    s = sp.Integer(s0) if fixed_s else s0 + t

    def binom_mult(seq, texpr):
        return [sp.expand(sum(sym_binom(texpr, j) * seq[k - j] for j in range(0, k + 1))) for k in range(M + 1)]

    b = binom_mult(beta, s)
    a = [b[k] + (gamma[k - 1] if k >= 1 else 0) for k in range(M + 1)]
    p = [binom_mult(beta, s + 1)[k] + (gamma[k - 1] if k >= 1 else 0) for k in range(M + 1)]
    target = sp.expand(slc.Q(p, r) - slc.Q(a, r) - slc.Q(b, r - 1))
    # generators: reuse build_delta's (they do not depend on s); same symbol names, so substitute by name
    _t, gens, syms0 = slc.build_delta(r, 0)
    name_map = {str(x): x for x in syms0}
    if no_parent:
        coord_syms = sorted(set(gamma[1:]), key=str)
        zero_d = {x: 0 for x in syms0 if str(x).startswith("d")}
        gens = {k: sp.expand(v.subs(zero_d)) for k, v in gens.items()}
        gens = {k: v.subs({name_map[str(x)]: x for x in coord_syms if str(x) in name_map}) for k, v in gens.items() if v != 0}
    else:
        coord_syms = sorted(set(gamma[1:]) | set(delta[1:]), key=str)
        gens = {k: v.subs({name_map[str(x)]: x for x in coord_syms if str(x) in name_map}) for k, v in gens.items()}
    lin = {"1": sp.Integer(1)}
    for k, v in gens.items():
        if k.startswith("(1)*(") and k.count("*") == 1:
            lin[k[5:-1]] = v
    if use_degree_relation:
        d = d0 + u
        for k in range(1, M + 1):
            gk1 = gamma[k - 1] if k - 1 >= 1 else sp.Integer(1)
            lin[f"d*c{k-1}-c{k}+d{k}"] = sp.expand(d * gk1 - gamma[k] + delta[k])
        names = list(lin)
        for i in range(len(names)):
            for j in range(i, len(names)):
                key = f"({names[i]})*({names[j]})"
                if key not in gens:
                    gens[key] = sp.expand(lin[names[i]] * lin[names[j]])
        gens = {k: v for k, v in gens.items() if v != 0}
    return target, gens, lin, coord_syms


def certify_uniform(r, s0, tdeg, use_degree_relation=False, d0=1, udeg=2, min_const=0.2, time_limit=1200, no_parent=False, fixed_s=False):
    t0 = time.time()
    target, gens, lin, csyms = build_symbolic(r, s0, use_degree_relation, d0, no_parent=no_parent, fixed_s=fixed_s)
    if fixed_s:
        tdeg = 0
    params = [t] + ([u] if use_degree_relation else [])
    allsyms = csyms + params
    gens3 = {f"{qk}*[{lk}]": sp.expand(qv * lv) for qk, qv in gens.items() for lk, lv in lin.items()}
    mult_names = list(lin)
    gnames = list(gens3)
    tpoly = sp.Poly(target, *allsyms)
    # columns: multiplier weights (constants) and coefficients c_{i,e(,f)} of lambda_i(t,u) = sum c t^e u^f
    param_monos = [(e, f) for e in range(tdeg + 1) for f in range(udeg + 1 if use_degree_relation else 1)]
    monos: dict = {}

    def midx(m):
        if m not in monos:
            monos[m] = len(monos)
        return monos[m]

    entries = []
    # multiplier columns: L_i * target, and (when parameters are present) also param^e * L_i * target
    mult_cols = []
    for i, mn in enumerate(mult_names):
        prod = sp.Poly(sp.expand(lin[mn] * target), *allsyms)
        base = list(zip(prod.monoms(), prod.coeffs()))
        for (e, f) in param_monos:
            if (e, f) != (0, 0) and mn == "1":
                continue  # the constant term of m stays a constant
            if e > 0 or f > 0:
                if not (e <= 2 and f <= 2):
                    continue
            for m, cf in base:
                mm = list(m)
                mm[len(csyms)] += e
                if use_degree_relation:
                    mm[len(csyms) + 1] += f
                entries.append((midx(tuple(mm)), len(mult_cols), sp.Rational(cf)))
            mult_cols.append((mn, e, f))
    nm = len(mult_cols)
    col = nm
    colinfo = []
    for gname in gnames:
        P = sp.Poly(gens3[gname], *allsyms)
        base = list(zip(P.monoms(), P.coeffs()))
        for (e, f) in param_monos:
            for m, cf in base:
                mm = list(m)
                mm[len(csyms)] += e
                if use_degree_relation:
                    mm[len(csyms) + 1] += f
                entries.append((midx(tuple(mm)), col, -sp.Rational(cf)))
            colinfo.append((gname, e, f))
            col += 1
    nrow = len(monos) + 1
    A = lil_matrix((nrow, col))
    for i, j, v in entries:
        A[i, j] += float(v)
    for i in range(nm):
        A[nrow - 1, i] = 1.0
    bvec = np.zeros(nrow)
    bvec[-1] = 1.0
    bounds = [(0, None)] * col
    bounds[mult_cols.index(("1", 0, 0))] = (min_const, None)
    res = linprog(c=np.r_[np.zeros(nm), np.ones(col - nm)], A_eq=csr_matrix(A), b_eq=bvec, bounds=bounds, method="highs",
                  options={"time_limit": time_limit, "primal_feasibility_tolerance": 1e-10, "dual_feasibility_tolerance": 1e-10})
    info = {"r": r, "s0": s0, "tdeg": tdeg, "degree_relation": use_degree_relation, "d0": d0 if use_degree_relation else None,
            "rows": nrow, "columns": col, "float_status": int(res.status), "float_message": res.message, "seconds_float": round(time.time() - t0, 1)}
    print(f"  float LP {nrow} x {col}: status {res.status} ({info['seconds_float']}s) {res.message[:50]}", flush=True)
    if res.status != 0:
        return None, info
    sup = [j for j in range(col) if res.x[j] > 1e-9]
    from sympy import QQ
    from sympy.polys.matrices import DomainMatrix

    colpos = {c: k for k, c in enumerate(sup)}
    ncols = len(sup)
    rows = [[QQ(0)] * (ncols + 1) for _ in range(nrow)]
    for i, j, v in entries:
        if j in colpos:
            rows[i][colpos[j]] += QQ(v.p, v.q)
    for k, c in enumerate(sup):
        if c < nm:
            rows[nrow - 1][k] = QQ(1)
    rows[nrow - 1][ncols] = QQ(1)
    dm = DomainMatrix(rows, (nrow, ncols + 1), QQ)
    rref, pivots = dm.rref()
    if ncols in pivots:
        info["exact"] = "inconsistent on float support"
        return None, info
    R = rref.to_Matrix()
    pivots = list(pivots)
    free_idx = [j for j in range(ncols) if j not in set(pivots)]
    vals = [None] * ncols
    for j in free_idx:
        vals[j] = sp.Rational(Fraction(float(res.x[sup[j]])).limit_denominator(10**5))
    for row, pj in enumerate(pivots):
        v = R[row, ncols]
        for j in free_idx:
            v -= R[row, j] * vals[j]
        vals[pj] = sp.Rational(v)
    neg = [v for v in vals if v < 0]
    if neg:
        vals = [v if v > 0 else sp.Integer(0) for v in vals]
    acc = [sp.Integer(0)] * nrow
    for i, j, v in entries:
        if j in colpos:
            acc[i] += v * vals[colpos[j]]
    ok = all(acc[i] == 0 for i in range(nrow - 1)) and sum(vals[k] for k, c in enumerate(sup) if c < nm) == 1
    if not ok:
        info["exact"] = f"identity check failed (negatives clipped: {len(neg)})"
        return None, info
    mult = {f"{mult_cols[c][0]} * t^{mult_cols[c][1]} u^{mult_cols[c][2]}": str(vals[k]) for k, c in enumerate(sup) if c < nm and vals[k] != 0}
    lam = {}
    for k, c in enumerate(sup):
        if c >= nm and vals[k] != 0:
            gname, e, f = colinfo[c - nm]
            lam.setdefault(gname, {})[f"t^{e}" + (f" u^{f}" if use_degree_relation else "")] = str(vals[k])
    info["exact"] = "verified"
    info["seconds_total"] = round(time.time() - t0, 1)
    return {"multiplier": mult, "lambda": lam}, info


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--r", type=int, nargs="+", default=[2, 3])
    ap.add_argument("--s0", type=int, default=1)
    ap.add_argument("--tdeg", type=int, default=12)
    ap.add_argument("--degree-relation", action="store_true")
    ap.add_argument("--d0", type=int, default=1)
    ap.add_argument("--no-parent", action="store_true", help="star-like case: the deepest leaf's component is K_{1,s+1}")
    ap.add_argument("--fixed-s", action="store_true", help="certify the single value s = s0 instead of all s >= s0")
    ap.add_argument("--out", default="reports/leaf_lemma_uniform_s_certificates.json")
    args = ap.parse_args()
    results = {}
    for r in args.r:
        key = f"r={r}," + (f"s={args.s0}" if args.fixed_s else f"s>={args.s0}") + (f",d>={args.d0}" if args.degree_relation else "") + (",no-parent" if args.no_parent else "")
        print(f"== {key}", flush=True)
        cert, info = certify_uniform(r, args.s0, args.tdeg, args.degree_relation, args.d0, no_parent=args.no_parent, fixed_s=args.fixed_s)
        results[key] = {"certified": cert is not None, "info": info, "certificate": cert}
        print(f"{key}: {'CERTIFIED (exact' + ('' if args.fixed_s else ', uniform in s >= %d' % args.s0) + (', uniform in d >= %d' % args.d0 if args.degree_relation else '') + ')' if cert else 'not certified: ' + str(info.get('exact', info['float_message']))[:80]}", flush=True)
        if cert:
            print("   multiplier:", cert["multiplier"])
            print("   generators used:", len(cert["lambda"]))
    n_ok = sum(1 for v in results.values() if v["certified"])
    payload = {"title": "Leaf-lemma certificates uniform in the number of sibling leaves", "results": results,
               "marker": "PASS_EXACT_LEAF_LEMMA_UNIFORM_S" if n_ok == len(results) and n_ok > 0 else "LEAF_LEMMA_UNIFORM_S_PARTIAL",
               "provenance": provenance(os.path.abspath(__file__))}
    print(payload["marker"], "report:", args.out, write_report(args.out, payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
