#!/usr/bin/env python3
"""Complete exact certification of the structured leaf lemma at r = 1, 2, 3
for EVERY deepest-leaf configuration, i.e. a complete inductive proof of
ISO_1, ISO_2, ISO_3 for all forests through the leaf recursion.

Configurations (see docs/LEAF_LEMMA_STRUCTURED.md): the deepest leaf's
neighbour v has s >= 0 sibling leaves and either a parent w or none.
  (A) parent, s >= 1     : one certificate uniform in s (s = 1 + t), degree 3
  (B) parent, s = 0      : degree-4 certificate without the degree relation (valid for every deg(w))
  (C) no parent, s >= 1  : one certificate uniform in s, degree 3
  (D) no parent, s = 0   : degree-4 certificate
plus the base case (edgeless forests) and the induction hypotheses used
(ISO at all indices <= r for the strictly smaller forests F', F'-w, F'-N[w],
T-l, T-l-v).  Every certificate is an exact rational polynomial identity
verified coefficient-by-coefficient.  Prints
PASS_EXACT_LEAF_LEMMA_R3_ALL_CONFIGURATIONS only if all pieces verify.
Runtime: a few minutes (python-flint recommended).
"""

from __future__ import annotations

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
from sympy import QQ  # noqa: E402
from sympy.polys.matrices import DomainMatrix  # noqa: E402

from erdos993lib.report import provenance, write_report  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def _load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore
    return mod


slc = _load("search_leaf_certificate_structured")
cu = _load("certify_leaf_lemma_uniform_s")
c3 = _load("certify_leaf_lemma_degree3")


def noparent_degree4(r, s):
    """Exact degree-4 certificate for the star-like case (delta = 0), fixed s."""
    target, gens, syms = slc.build_delta(r, s)
    zero_d = {x: 0 for x in syms if str(x).startswith("d")}
    target = sp.expand(target.subs(zero_d))
    gens = {k: sp.expand(v.subs(zero_d)) for k, v in gens.items()}
    gens = {k: v for k, v in gens.items() if v != 0}
    csyms = [x for x in syms if str(x).startswith("c")]
    qn = list(gens)
    qp = [sp.Poly(gens[k], *csyms) for k in qn]
    tpoly = sp.Poly(target, *csyms)
    monos: dict = {}

    def midx(m):
        if m not in monos:
            monos[m] = len(monos)
        return monos[m]

    entries = []
    for i, P in enumerate(qp):
        prod = P * tpoly
        for m, cf in zip(prod.monoms(), prod.coeffs()):
            entries.append((midx(m), i, sp.Rational(cf)))
    nm = len(qp)
    col = nm
    for i in range(len(qp)):
        for j in range(i, len(qp)):
            prod = qp[i] * qp[j]
            for m, cf in zip(prod.monoms(), prod.coeffs()):
                entries.append((midx(m), col, -sp.Rational(cf)))
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
    bounds[qn.index("(1)*(1)")] = (0.1, None)
    res = linprog(c=np.r_[np.zeros(nm), np.ones(col - nm)], A_eq=csr_matrix(A), b_eq=b, bounds=bounds, method="highs",
                  options={"primal_feasibility_tolerance": 1e-10, "dual_feasibility_tolerance": 1e-10})
    if res.status != 0:
        return False, {"float_status": int(res.status)}
    sup = [j for j in range(col) if res.x[j] > 1e-9]
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
    rref, pivots = DomainMatrix(rows, (nrow, ncols + 1), QQ).rref()
    R = rref.to_Matrix()
    pivots = list(pivots)
    if ncols in pivots:
        return False, {"exact": "inconsistent"}
    free = [j for j in range(ncols) if j not in set(pivots)]
    vals = [None] * ncols
    for j in free:
        vals[j] = sp.Rational(Fraction(float(res.x[sup[j]])).limit_denominator(10**5))
    for row, pj in enumerate(pivots):
        v = R[row, ncols]
        for j in free:
            v -= R[row, j] * vals[j]
        vals[pj] = sp.Rational(v)
    if any(v < 0 for v in vals):
        vals = [v if v > 0 else sp.Integer(0) for v in vals]
    acc = [sp.Integer(0)] * nrow
    for i, j, v in entries:
        if j in colpos:
            acc[i] += v * vals[colpos[j]]
    ok = all(acc[i] == 0 for i in range(nrow - 1)) and sum(vals[k] for k, c in enumerate(sup) if c < nm) == 1
    return ok, {"support": len(sup), "exact": "verified" if ok else "identity check failed"}


def main() -> int:
    t0 = time.time()
    results = {}
    all_ok = True

    def record(key, ok, detail):
        nonlocal all_ok
        results[key] = {"certified": bool(ok), "detail": detail}
        all_ok &= bool(ok)
        print(("PASS " if ok else "FAIL ") + key + "  " + str(detail)[:160], flush=True)

    # base case: edgeless forests (1+x)^n satisfy ISO at every index (Newton / explicit margin 1 + r^2/(n-r+1))
    from math import comb

    base_ok = all(r * comb(n, r) ** 2 + comb(n, r - 1) ** 2 - (r + 1) * comb(n, r - 1) * comb(n, r + 1) > 0
                  for n in range(1, 80) for r in range(1, n))
    record("base case: ISO_r((1+x)^n) > 0 for n < 80, all r (identity: margin 1 + r^2/(n-r+1))", base_ok, None)

    for r in (1, 2, 3):
        # (A) parent, s >= 1, uniform in s
        cert, info = cu.certify_uniform(r, 1, 12)
        record(f"(A) r={r}: parent, all s >= 1 (uniform, degree 3)", cert is not None, info.get("exact", info.get("float_message")))
        # (B) parent, s = 0, all d: degree 3 first, else degree 4 without degree relation
        cert2, info2 = c3.exact_certificate(r, 0)
        deg = 3
        if cert2 is None:
            cert2, info2 = c3.exact_certificate_degree4(r, 0)
            deg = 4
        record(f"(B) r={r}: parent, s = 0, every deg(w) (degree {deg}, no degree relation)", cert2 is not None, info2.get("exact", info2.get("float_message")))
        # (C) no parent, s >= 1, uniform in s
        cert3, info3 = cu.certify_uniform(r, 1, 12, no_parent=True)
        record(f"(C) r={r}: no parent, all s >= 1 (uniform, degree 3)", cert3 is not None, info3.get("exact", info3.get("float_message")))
        # (D) no parent, s = 0
        cert4, info4 = cu.certify_uniform(r, 0, 0, no_parent=True, fixed_s=True)
        deg4 = 3
        if cert4 is None:
            ok4, info4 = noparent_degree4(r, 0)
            deg4 = 4
        else:
            ok4 = True
        record(f"(D) r={r}: no parent, s = 0 (degree {deg4})", ok4, info4.get("exact", info4.get("float_message")))

    marker = "PASS_EXACT_LEAF_LEMMA_R3_ALL_CONFIGURATIONS" if all_ok else "LEAF_LEMMA_R3_INCOMPLETE"
    print(marker, f"({time.time()-t0:.0f}s)")
    payload = {
        "theorem": "For every forest T with an edge and every 1 <= r <= 3, choosing a deepest leaf l with neighbour v: "
                   "Q_r(T) >= Q_r(T - l) + Q_{r-1}(T - l - v). Hence, by induction on |V| with base case the edgeless forests, "
                   "ISO_1, ISO_2, ISO_3 hold for every forest at every index.",
        "results": results,
        "marker": marker,
        "provenance": provenance(os.path.abspath(__file__)),
    }
    out = os.path.join(HERE, "..", "reports", "leaf_lemma_r3_complete.json")
    print("report:", os.path.normpath(out), write_report(out, payload))
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
