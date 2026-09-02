#!/usr/bin/env python3
"""Exact degree-4 certificate for the structured leaf lemma at r = 4 (first
foothold on the ISO_4 ladder), configuration (s, d).

Setting as in docs/LEAF_LEMMA_STRUCTURED.md, with one more universally valid
family of relations, the DEGREE RELATION: if w has d neighbours in F', then

    gamma_k - delta_k <= d * gamma_{k-1}        (k >= 1),

because an independent k-set of F' - w that meets N(w) contains some
neighbour u of w, and removing u leaves an independent (k-1)-set of F' - w;
each of the d neighbours contributes at most gamma_{k-1} such sets.

The certificate has the form  m * R_4 == sum lambda_j q_i q_j  with m a
positive combination of quadratic generators (constant term forced > 0) and
q_i, q_j quadratic generators; it is solved in floating point (HiGHS), then
re-solved exactly over the rationals on the float support and verified as a
polynomial identity with sympy.  Only an exactly verified identity is reported
as certified.  Usage: python3 scripts/certify_leaf_lemma_r4.py --s 1 --d 2
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import sys
import time
from fractions import Fraction

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


def generators_with_degree_relation(r, s, d):
    target, gens, syms = slc.build_delta(r, s)
    c = {int(str(x)[1:]): x for x in syms if str(x).startswith("c")}
    dd = {int(str(x)[1:]): x for x in syms if str(x).startswith("d")}
    M = max(c)
    lin = {"1": sp.Integer(1)}
    for k, v in gens.items():
        if k.startswith("(1)*(") and k.count("*") == 1:
            lin[k[5:-1]] = v
    for k in range(1, M + 1):
        gk1 = c[k - 1] if k - 1 >= 1 else sp.Integer(1)
        lin[f"{d}c{k-1}-c{k}+d{k}"] = sp.expand(d * gk1 - c[k] + dd[k])
    quad = dict(gens)
    names = list(lin)
    for i in range(len(names)):
        for j in range(i, len(names)):
            key = f"({names[i]})*({names[j]})"
            if key not in quad:
                quad[key] = sp.expand(lin[names[i]] * lin[names[j]])
    quad = {k: v for k, v in quad.items() if v != 0}
    return target, quad, syms


def certify(r, s, d, min_const=0.1, time_limit=1500):
    t0 = time.time()
    target, quad, syms = generators_with_degree_relation(r, s, d)
    qn = list(quad)
    qp = [sp.Poly(quad[k], *syms) for k in qn]
    tpoly = sp.Poly(target, *syms)
    monos: dict = {}

    def midx(m):
        if m not in monos:
            monos[m] = len(monos)
        return monos[m]

    entries = []  # (row, col, exact rational coefficient)
    for i, P in enumerate(qp):
        prod = P * tpoly
        for m, cf in zip(prod.monoms(), prod.coeffs()):
            entries.append((midx(m), i, sp.Rational(cf)))
    nm = len(qp)
    pairs = []
    col = nm
    for i in range(len(qp)):
        for j in range(i, len(qp)):
            prod = qp[i] * qp[j]
            for m, cf in zip(prod.monoms(), prod.coeffs()):
                entries.append((midx(m), col, -sp.Rational(cf)))
            pairs.append((i, j))
            col += 1
    nrow = len(monos) + 1
    A = lil_matrix((nrow, col))
    for i, j, v in entries:
        A[i, j] += float(v)
    for i in range(nm):
        A[nrow - 1, i] = 1.0
    b = np.zeros(nrow)
    b[-1] = 1.0
    bounds = [(0, None)] * col
    bounds[qn.index("(1)*(1)")] = (min_const, None)
    res = linprog(c=np.r_[np.zeros(nm), np.ones(col - nm)], A_eq=csr_matrix(A), b_eq=b, bounds=bounds,
                  method="highs", options={"time_limit": time_limit, "primal_feasibility_tolerance": 1e-10, "dual_feasibility_tolerance": 1e-10})
    info = {"r": r, "s": s, "d": d, "monomials": len(monos), "multipliers": nm, "generators": len(pairs),
            "float_status": int(res.status), "float_message": res.message, "seconds_float": round(time.time() - t0, 1)}
    print(f"float LP: status {res.status} ({info['seconds_float']}s) {res.message[:60]}", flush=True)
    if res.status != 0:
        return None, info
    sup_m = [i for i in range(nm) if res.x[i] > 1e-9]
    sup_l = [j for j in range(len(pairs)) if res.x[nm + j] > 1e-9]
    print(f"float support: {len(sup_m)} multiplier terms, {len(sup_l)} products; exact re-solve ...", flush=True)
    # exact linear algebra on the support: build the augmented matrix directly from the exact
    # coefficients and row-reduce it with DomainMatrix over QQ (flint-backed when available)
    from sympy import QQ
    from sympy.polys.matrices import DomainMatrix

    support_cols = list(sup_m) + [nm + j for j in sup_l]
    colpos = {cidx: k for k, cidx in enumerate(support_cols)}
    ncols = len(support_cols)
    rows = [[QQ(0)] * (ncols + 1) for _ in range(nrow)]
    for i, j, v in entries:
        if j in colpos:
            rows[i][colpos[j]] += QQ(v.p, v.q)
    for k, cidx in enumerate(support_cols):
        if cidx < nm:
            rows[nrow - 1][k] = QQ(1)
    rows[nrow - 1][ncols] = QQ(1)
    dm = DomainMatrix(rows, (nrow, ncols + 1), QQ)
    t1 = time.time()
    rref, pivots = dm.rref()
    print(f"exact rref in {time.time()-t1:.1f}s", flush=True)
    R = rref.to_Matrix()
    if ncols in pivots:
        info["exact"] = "inconsistent system on float support"
        return None, info
    pivots = list(pivots)
    fx = list(res.x[sup_m]) + list(res.x[nm + np.array(sup_l)])
    free_idx = [j for j in range(ncols) if j not in set(pivots)]
    # fix free variables at rationalised float values, solve pivots
    vals = [None] * ncols
    for j in free_idx:
        vals[j] = sp.Rational(Fraction(float(fx[j])).limit_denominator(10**5))
    for row, pj in enumerate(pivots):
        v = R[row, ncols]
        for j in free_idx:
            v -= R[row, j] * vals[j]
        vals[pj] = sp.Rational(v)
    print(f"exact rref done: rank {len(pivots)}, free {len(free_idx)}", flush=True)
    neg = [v for v in vals if v < 0]
    if neg:
        # clip tiny negatives and re-verify
        vals = [v if v > 0 else sp.Integer(0) for v in vals]
    mult = {qn[i]: v for v, i in zip(vals[: len(sup_m)], sup_m) if v != 0}
    lam = {(pairs[j][0], pairs[j][1]): v for v, j in zip(vals[len(sup_m):], sup_l) if v != 0}
    # exact identity check: the exact coefficient vectors of the chosen columns must combine to the rhs
    # (every monomial coefficient of  m*R - sum lambda q_i q_j  must vanish; normalisation row = 1)
    acc = [sp.Integer(0)] * nrow
    for i, j, v in entries:
        if j in colpos:
            acc[i] += v * vals[colpos[j]]
    ok = all(acc[i] == 0 for i in range(nrow - 1)) and sum(vals[: len(sup_m)]) == 1
    if not ok:
        info["exact"] = "identity check failed after exact re-solve (negatives clipped: %d)" % len(neg)
        return None, info
    # independent spot check of the polynomial identity at random rational points
    import random as _random

    rng = _random.Random(3)
    for _ in range(5):
        pt = {sy: sp.Rational(rng.randrange(1, 50), rng.randrange(1, 7)) for sy in syms}
        lhs = sum(v * quad[k].subs(pt) for k, v in mult.items()) * target.subs(pt)
        rhs = sum(v * quad[qn[i]].subs(pt) * quad[qn[j]].subs(pt) for (i, j), v in lam.items())
        assert sp.simplify(lhs - rhs) == 0, "spot check failed"
    if mult.get("(1)*(1)", 0) <= 0:
        info["exact"] = "no constant term in multiplier"
        return None, info
    info["exact"] = "verified"
    info["seconds_total"] = round(time.time() - t0, 1)
    return {"multiplier": {k: str(v) for k, v in mult.items()},
            "lambda": {f"{qn[i]} * {qn[j]}": str(v) for (i, j), v in lam.items()}}, info


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--r", type=int, default=4)
    ap.add_argument("--s", type=int, nargs="+", default=[1])
    ap.add_argument("--d", type=int, nargs="+", default=[2])
    ap.add_argument("--out", default="reports/leaf_lemma_r4_certificates.json")
    args = ap.parse_args()
    results = {}
    for s in args.s:
        for d in args.d:
            print(f"== r={args.r}, s={s}, d={d}", flush=True)
            cert, info = certify(args.r, s, d)
            key = f"r={args.r},s={s},d={d}"
            results[key] = {"certified": cert is not None, "info": info, "certificate": cert}
            print(f"{key}: {'CERTIFIED (exact rational identity verified, degree 4)' if cert else 'not certified: ' + str(info.get('exact', info['float_message']))[:80]}", flush=True)
            if cert:
                print("   multiplier terms:", len(cert["multiplier"]), " products:", len(cert["lambda"]))
    n_ok = sum(1 for v in results.values() if v["certified"])
    payload = {"title": "Exact degree-4 certificates for the structured leaf lemma at r = 4 (with the degree relation)",
               "results": results,
               "marker": "PASS_EXACT_LEAF_LEMMA_R4_CONFIGURATIONS" if n_ok == len(results) and n_ok > 0 else "LEAF_LEMMA_R4_PARTIAL",
               "provenance": provenance(os.path.abspath(__file__))}
    print(payload["marker"], "report:", args.out, write_report(args.out, payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
