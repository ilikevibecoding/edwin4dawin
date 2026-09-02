#!/usr/bin/env python3
"""Exact degree-3 certificates for the structured leaf lemma.

Structured leaf lemma (see docs/LEAF_LEMMA_STRUCTURED.md).  In a forest T take
a deepest leaf l; its neighbour v has s further leaf children and a parent w
(the case without parent is the star-like case, handled separately).  Let
F' = T minus v and its s+1 leaf children and

    gamma = I(F' - w),   delta = I(F' - N[w]),   beta = I(F') = gamma + x delta  (exact),
    b = I(T - l - v) = (1+x)^s beta,   a = I(T - l) = b + x gamma,   p = I(T) = (1+x)^{s+1} beta + x gamma.

The leaf lemma is  R_r := Q_r(p) - Q_r(a) - Q_{r-1}(b) >= 0.  Together with the
induction hypothesis (ISO at every index for the smaller forests T-l and
T-l-v) it gives ISO_r(T); by induction on n, ISO_r for every forest.

This script searches, for given (r, s), for an identity

    m(gamma, delta) * R_r  ==  sum_j lambda_j * g_j        (lambda_j >= 0, exact rationals)

where m is a positive combination (weights summing to 1) of the linear
generators 1, gamma_k, delta_k, gamma_k - delta_k, and each g_j is a product of
a quadratic generator with a linear generator.  Every generator is a
polynomial that is >= 0 for EVERY forest F' and vertex w:
  * gamma_k, delta_k, gamma_k - delta_k >= 0  (F' - N[w] is an induced subforest of F' - w);
  * super-multiplicativity  i_j(Y) i_k(X) >= C(j+k, j) i_{j+k}(X)  for X an induced
    subforest of Y (ordered splittings of an independent (j+k)-set of X give distinct pairs);
  * p_2 <= C(p_1, 2) and 2 p_2 >= p_1 (p_1 - 3) for every forest (e <= n - 1);
  * Q_i(beta), Q_i(gamma), Q_i(delta) >= 0 for i <= r: the induction hypothesis on the
    smaller forests F', F' - w, F' - N[w].
Hence, wherever m > 0, R_r >= 0.  m has a strictly positive constant term in
the certificates we accept, so m > 0 everywhere on the domain.

The float LP (HiGHS) only proposes a support; the certificate is then
re-solved EXACTLY over the rationals on that support (sympy), checked for
non-negativity, and the polynomial identity is verified symbolically.  Only
then is the pair (r, s) reported as certified.
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import sys
from fractions import Fraction

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import numpy as np  # noqa: E402
import sympy as sp  # noqa: E402
from scipy.optimize import linprog  # noqa: E402

from erdos993lib.report import provenance, write_report  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("slc", os.path.join(HERE, "search_leaf_certificate_structured.py"))
slc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(slc)  # type: ignore


def exact_certificate(r, s, require_constant=True):
    target, gens, syms = slc.build_delta(r, s)
    lin = {"1": sp.Integer(1)}
    for k, v in gens.items():
        if k.startswith("(1)*(") and k.endswith(")") and k.count("*") == 1:
            lin[k[5:-1]] = v
    gens3 = {f"{qk}*[{lk}]": sp.expand(qv * lv) for qk, qv in gens.items() for lk, lv in lin.items()}
    mult_names = list(lin)
    names = list(gens3)
    polys = [sp.Poly(g, *syms) for g in gens3.values()]
    tpolys = [sp.Poly(sp.expand(lin[m] * target), *syms) for m in mult_names]
    monos = set()
    for P in polys + tpolys:
        monos |= set(P.monoms())
    monos = sorted(monos)
    idx = {m: i for i, m in enumerate(monos)}
    nm, nl = len(mult_names), len(names)
    A = np.zeros((len(monos) + 1, nm + nl))
    for i, P in enumerate(tpolys):
        for m, c in zip(P.monoms(), P.coeffs()):
            A[idx[m], i] += float(c)
    for j, P in enumerate(polys):
        for m, c in zip(P.monoms(), P.coeffs()):
            A[idx[m], nm + j] -= float(c)
    A[-1, :nm] = 1.0
    b = np.zeros(len(monos) + 1)
    b[-1] = 1.0
    bounds = [(0, None)] * (nm + nl)
    if require_constant:
        bounds[0] = (0.2, None)  # force a positive constant term in the multiplier
    res = linprog(c=np.r_[np.zeros(nm), np.ones(nl)], A_eq=A, b_eq=b, bounds=bounds, method="highs")
    info = {"float_status": int(res.status), "float_message": res.message, "monomials": len(monos), "generators": nl}
    if res.status != 0:
        return None, info
    # exact re-solve on the support
    sup_m = [i for i in range(nm) if res.x[i] > 1e-9]
    sup_l = [j for j in range(nl) if res.x[nm + j] > 1e-9]
    um = sp.symbols(f"m0:{len(sup_m)}")
    ul = sp.symbols(f"l0:{len(sup_l)}")
    expr = sp.expand(sum(u * lin[mult_names[i]] for u, i in zip(um, sup_m)) * target
                     - sum(u * gens3[names[j]] for u, j in zip(ul, sup_l)))
    eqs = sp.Poly(expr, *syms).coeffs() + [sum(um) - 1]
    sol = sp.linsolve(eqs, list(um) + list(ul))
    sol = list(sol)
    if not sol:
        info["exact"] = "no exact solution on float support"
        return None, info
    vec = sol[0]
    free = sorted(set().union(*[sp.sympify(v).free_symbols for v in vec]), key=str)
    if free:
        # affine solution space: substitute the float values for the free parameters, then round
        subs = {}
        allu = list(um) + list(ul)
        fx = list(res.x[sup_m]) + list(res.x[nm + np.array(sup_l)])
        for f in free:
            subs[f] = sp.Rational(Fraction(float(fx[allu.index(f)])).limit_denominator(10**4))
        vec = [sp.sympify(v).subs(subs) for v in vec]
    try:
        vals = [sp.Rational(sp.nsimplify(v, rational=True)) for v in vec]
    except (TypeError, ValueError):
        info["exact"] = "non-rational entries after substitution"
        return None, info
    if any(v < 0 for v in vals):
        # try clipping tiny negatives to zero and re-check the identity
        vals2 = [v if v > 0 else sp.Integer(0) for v in vals]
        expr2 = sp.expand(sum(v * lin[mult_names[i]] for v, i in zip(vals2[:len(sup_m)], sup_m)) * target
                          - sum(v * gens3[names[j]] for v, j in zip(vals2[len(sup_m):], sup_l)))
        if sp.expand(expr2) != 0 or sum(vals2[:len(sup_m)]) == 0:
            info["exact"] = "exact solution has negative entries: %s" % [str(v) for v in vals if v < 0][:5]
            return None, info
        vals = vals2
    # final exact verification
    mult = {mult_names[i]: v for v, i in zip(vals[:len(sup_m)], sup_m) if v != 0}
    lam = {names[j]: v for v, j in zip(vals[len(sup_m):], sup_l) if v != 0}
    check = sp.expand(sum(v * lin[k] for k, v in mult.items()) * target - sum(v * gens3[k] for k, v in lam.items()))
    if check != 0:
        info["exact"] = "identity check failed"
        return None, info
    if require_constant and mult.get("1", 0) <= 0:
        info["exact"] = "multiplier has no constant term"
        return None, info
    info["exact"] = "verified"
    return {"multiplier": {k: str(v) for k, v in mult.items()}, "lambda": {k: str(v) for k, v in lam.items()}}, info


def exact_certificate_degree4(r, s, min_const=0.1):
    """Multipliers = quadratic generators, products = quadratic x quadratic (degree 4)."""
    from scipy.sparse import csr_matrix, lil_matrix

    target, gens, syms = slc.build_delta(r, s)
    qn = list(gens)
    qp = [sp.Poly(gens[k], *syms) for k in qn]
    tpoly = sp.Poly(target, *syms)
    monos: dict = {}

    def midx(m):
        if m not in monos:
            monos[m] = len(monos)
        return monos[m]

    cols = []
    for P in qp:
        prod = P * tpoly
        cols.append({midx(m): float(c) for m, c in zip(prod.monoms(), prod.coeffs())})
    nm = len(qp)
    pairs = []
    for i in range(len(qp)):
        for j in range(i, len(qp)):
            prod = qp[i] * qp[j]
            cols.append({midx(m): -float(c) for m, c in zip(prod.monoms(), prod.coeffs())})
            pairs.append((i, j))
    nrow = len(monos) + 1
    A = lil_matrix((nrow, len(cols)))
    for j, col in enumerate(cols):
        for i, v in col.items():
            A[i, j] = v
    for i in range(nm):
        A[nrow - 1, i] = 1.0
    b = np.zeros(nrow)
    b[-1] = 1.0
    bounds = [(0, None)] * len(cols)
    bounds[qn.index("(1)*(1)")] = (min_const, None)
    res = linprog(c=np.r_[np.zeros(nm), np.ones(len(cols) - nm)], A_eq=csr_matrix(A), b_eq=b, bounds=bounds, method="highs")
    info = {"float_status": int(res.status), "float_message": res.message, "monomials": len(monos), "generators": len(pairs), "degree": 4}
    if res.status != 0:
        return None, info
    sup_m = [i for i in range(nm) if res.x[i] > 1e-9]
    sup_l = [j for j in range(len(pairs)) if res.x[nm + j] > 1e-9]
    um = sp.symbols(f"m0:{len(sup_m)}")
    ul = sp.symbols(f"l0:{len(sup_l)}")
    expr = sum(u * qp[i] for u, i in zip(um, sup_m)) * tpoly - sum(u * qp[pairs[j][0]] * qp[pairs[j][1]] for u, j in zip(ul, sup_l))
    eqs = expr.coeffs() + [sum(um) - 1]
    sol = list(sp.linsolve(eqs, list(um) + list(ul)))
    if not sol:
        info["exact"] = "no exact solution on float support"
        return None, info
    vec = sol[0]
    free = sorted(set().union(*[sp.sympify(v).free_symbols for v in vec]), key=str)
    if free:
        allu = list(um) + list(ul)
        fx = list(res.x[sup_m]) + list(res.x[nm + np.array(sup_l)])
        subs = {f: sp.Rational(Fraction(float(fx[allu.index(f)])).limit_denominator(10**4)) for f in free}
        vec = [sp.sympify(v).subs(subs) for v in vec]
    vals = [sp.Rational(sp.nsimplify(v, rational=True)) for v in vec]
    if any(v < 0 for v in vals):
        vals = [v if v > 0 else sp.Integer(0) for v in vals]
    mult = {qn[i]: v for v, i in zip(vals[: len(sup_m)], sup_m) if v != 0}
    lam = {f"{qn[pairs[j][0]]} * {qn[pairs[j][1]]}": v for v, j in zip(vals[len(sup_m):], sup_l) if v != 0}
    check = sp.expand(sum(v * gens[k] for k, v in mult.items()) * target
                      - sum(v * gens[k.split(" * ")[0]] * gens[k.split(" * ")[1]] for k, v in lam.items()))
    if check != 0 or mult.get("(1)*(1)", 0) <= 0:
        info["exact"] = "identity check failed" if check != 0 else "no constant term"
        return None, info
    info["exact"] = "verified"
    return {"multiplier": {k: str(v) for k, v in mult.items()}, "lambda": {k: str(v) for k, v in lam.items()}}, info


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--r", type=int, nargs="+", default=[3])
    ap.add_argument("--smax", type=int, default=3)
    ap.add_argument("--degree4", type=str, nargs="*", default=["3,0"], help="pairs r,s to also try at degree 4 if degree 3 fails")
    ap.add_argument("--out", default="reports/leaf_lemma_degree3_certificates.json")
    args = ap.parse_args()
    results = {}
    deg4_pairs = {tuple(int(x) for x in p.split(",")) for p in args.degree4}
    for r in args.r:
        for s in range(0, args.smax + 1):
            cert, info = exact_certificate(r, s)
            if cert is None and (r, s) in deg4_pairs:
                cert, info = exact_certificate_degree4(r, s)
            key = f"r={r},s={s}"
            results[key] = {"certified": cert is not None, "info": info, "certificate": cert}
            status = ("CERTIFIED (exact rational identity verified, degree %d)" % info.get("degree", 3)) if cert else f"not certified: {info.get('exact', info['float_message'])[:80]}"
            print(f"{key}: {status}; float LP {info['monomials']} monomials x {info['generators']} generators", flush=True)
            if cert:
                print("   multiplier:", {k: v for k, v in list(cert["multiplier"].items())[:4]}, "...")
                print("   support:", len(cert["lambda"]), "generators")
    n_ok = sum(1 for v in results.values() if v["certified"])
    payload = {"title": "Exact degree-3 certificates for the structured leaf lemma", "results": results,
               "marker": "PASS_EXACT_LEAF_LEMMA_DEGREE3_CERTIFICATES" if n_ok == len(results) else "LEAF_LEMMA_DEGREE3_PARTIAL",
               "provenance": provenance(os.path.abspath(__file__))}
    print(payload["marker"], "report:", args.out, write_report(args.out, payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
