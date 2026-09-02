#!/usr/bin/env python3
"""
Exact proof-verification script for

    THEOREM (ISO_2 for every forest).  For every forest F of order n >= 1,
    with p_k = number of independent k-sets of F (p_k = 0 for k > alpha),

        Q_2(F) = 2 p_2^2 + p_1^2 - 3 p_1 p_3  >=  2 n^2 - 3 n + 2  >= 1,

    with equality if and only if F is the star K_{1,n-1}
    (K_1 for n = 1, K_2 for n = 2).  In particular ISO_2 (Q_2 >= 0) holds
    strictly for every forest, whether or not r = 2 is a prefix index.

    COROLLARY (WR_2).  p_1 <= 2 p_2  iff  2e <= n(n-2); this holds for every
    forest of order n >= 4 and fails exactly for K_1, K_2 and P_3.  The index
    r = 2 is a prefix index (2 <= L(alpha) - 1) iff alpha >= 4, which forces
    n >= 4; hence WR_2 holds whenever r = 2 lies in the prefix.

Proof ingredients (all verified below with sympy, exactly):

  (a) counting:  p_1 = n,  p_2 = C(n,2) - e,  p_3 = C(n,3) - e(n-2) + S,
      where e = |E(F)| and S = sum_v C(d_v, 2) = number of pairs of edges
      sharing a vertex (a forest has no triangles, so inclusion-exclusion
      over the edges stops at pairs);
  (b) S <= C(e,2) with equality iff every two edges meet, i.e. iff the
      non-trivial part of F is a star;  Q_2 = f(n,e) + 3n (C(e,2) - S)
      with  f(n,e) := 2 (C(n,2)-e)^2 + n^2 - 3n [C(n,3) - e(n-2) + C(e,2)]
                    = n^2(n+1)/2 + e (n^2 - 5n/2) + e^2 (2 - 3n/2);
  (c) f is strictly concave in e for n >= 2, f(n,0) = n^2(n+1)/2,
      f(n,n-1) = 2n^2 - 3n + 2 = 2m^2 + m + 1 (m = n-1), and
      f(n,0) - f(n,n-1) = (n-1)(n^2-2n+4)/2 >= 0; a forest has
      0 <= e <= n-1, so Q_2 >= f(n,e) >= f(n,n-1) = 2n^2 - 3n + 2, with
      equality iff e = n-1 and S = C(e,2), i.e. iff F = K_{1,n-1}.

Exhaustive exact verification on ALL nonisomorphic forests with n <= 14
(15 205 forests): formulas (a) against the core polynomials, the bound
Q_2 >= f(n,e) with its equality case, the extremal statement, WR_2 and the
prefix bookkeeping.  Prints PASS_EXACT_ISO2_ALL_FORESTS on success and
records the results (with this file's sha256) in results/iso2_iso3.json.

Exact arithmetic only (Python ints, sympy rationals).  Deterministic.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from math import factorial

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from forest_indep import (  # noqa: E402
    L_cutoff,
    forests,
    indep_poly_tree,
    level_sequence_to_parent,
    parent_to_edges,
    tree_level_sequences,
    tree_polys_upto,
)

NMAX = 14
PASS_MARKER = "PASS_EXACT_ISO2_ALL_FORESTS"
RESULTS_PATH = os.path.join(HERE, "results", "iso2_iso3.json")


# ---------------------------------------------------------------------------
# exact helpers
# ---------------------------------------------------------------------------


def binom(a: int, k: int) -> int:
    """Polynomial binomial coefficient a(a-1)...(a-k+1)/k! (exact for every
    integer a; equals the combinatorial C(a,k) for a >= 0)."""
    r = 1
    for i in range(k):
        r *= a - i
    return r // factorial(k)


def pk(p, k: int) -> int:
    """Coefficient p_k of a polynomial given as a list, zero beyond alpha."""
    return p[k] if k < len(p) else 0


def forest_edges(comps, seqs):
    """Edge list of a forest given as ((size, index), ...) into seqs."""
    edges = []
    off = 0
    for k, i in comps:
        par = level_sequence_to_parent(seqs[k][i])
        edges.extend((off + a, off + b) for a, b in parent_to_edges(par))
        off += k
    return edges


def degree_stats(n: int, edges):
    deg = [0] * n
    for a, b in edges:
        deg[a] += 1
        deg[b] += 1
    e = len(edges)
    S = sum(binom(x, 2) for x in deg)
    return deg, e, S


def is_star_forest(n: int, deg, e: int) -> bool:
    """All edges pairwise share a vertex (edge set is a star, e <= 1 allowed)."""
    return e <= 1 or max(deg) == e


def is_star_tree(n: int, deg, e: int) -> bool:
    """F is the tree K_{1,n-1} (K_1 for n = 1)."""
    return e == n - 1 and is_star_forest(n, deg, e)


def f_bound(n: int, e: int) -> int:
    """f(n,e) = 2(C(n,2)-e)^2 + n^2 - 3n[C(n,3) - e(n-2) + C(e,2)] (integer)."""
    return 2 * (binom(n, 2) - e) ** 2 + n * n - 3 * n * (binom(n, 3) - e * (n - 2) + binom(e, 2))


# ---------------------------------------------------------------------------
# symbolic verification (sympy)
# ---------------------------------------------------------------------------


def symbolic_checks() -> dict:
    import sympy as sp

    n, e, S, m = sp.symbols("n e S m")

    def Cb(x, k):
        return sp.expand(sp.prod([x - i for i in range(k)]) / sp.factorial(k))

    p1 = n
    p2 = Cb(n, 2) - e
    p3 = Cb(n, 3) - e * (n - 2) + S
    Q2 = sp.expand(2 * p2**2 + p1**2 - 3 * p1 * p3)
    f = 2 * (Cb(n, 2) - e) ** 2 + n**2 - 3 * n * (Cb(n, 3) - e * (n - 2) + Cb(e, 2))
    f_claim = n**2 * (n + 1) / 2 + e * (n**2 - sp.Rational(5, 2) * n) + e**2 * (2 - sp.Rational(3, 2) * n)
    out = {}
    out["f_expansion"] = sp.expand(f - f_claim) == 0
    out["Q2_minus_f_is_3n(C(e,2)-S)"] = sp.expand(Q2 - f - 3 * n * (Cb(e, 2) - S)) == 0
    out["f(n,0)=n^2(n+1)/2"] = sp.expand(f.subs(e, 0) - n**2 * (n + 1) / 2) == 0
    out["f(n,n-1)=2n^2-3n+2"] = sp.expand(f.subs(e, n - 1) - (2 * n**2 - 3 * n + 2)) == 0
    out["2n^2-3n+2=2m^2+m+1 (m=n-1)"] = sp.expand((2 * n**2 - 3 * n + 2).subs(n, m + 1) - (2 * m**2 + m + 1)) == 0
    out["d2f/de2=4-3n"] = sp.expand(sp.diff(f, e, 2) - (4 - 3 * n)) == 0
    out["f(n,0)-f(n,n-1)=(n-1)(n^2-2n+4)/2"] = sp.expand(f.subs(e, 0) - f.subs(e, n - 1) - (n - 1) * (n**2 - 2 * n + 4) / 2) == 0
    # star K_{1,m}: n = m+1, e = m, S = C(m,2)
    star = {n: m + 1, e: m, S: Cb(m, 2)}
    out["star_p2=C(m,2)"] = sp.expand(p2.subs(star) - Cb(m, 2)) == 0
    out["star_p3=C(m,3)"] = sp.expand(p3.subs(star) - Cb(m, 3)) == 0
    out["star_Q2=2m^2+m+1"] = sp.expand(Q2.subs(star) - (2 * m**2 + m + 1)) == 0
    # WR_2
    out["2p2-p1=n(n-2)-2e"] = sp.expand(2 * p2 - p1 - (n * (n - 2) - 2 * e)) == 0
    out["n(n-2)-2(n-1)=(n-2)^2-2"] = sp.expand(n * (n - 2) - 2 * (n - 1) - ((n - 2) ** 2 - 2)) == 0
    out["Q2_polynomial"] = str(sp.Poly(Q2, n, e, S).as_expr())
    out["f_polynomial"] = str(sp.expand(f_claim))
    return out


# ---------------------------------------------------------------------------
# exhaustive verification
# ---------------------------------------------------------------------------


def exhaustive_checks(nmax: int = NMAX) -> dict:
    tp = tree_polys_upto(nmax)
    seqs = [None] + [list(tree_level_sequences(k)) for k in range(1, nmax + 1)]
    # indexing consistency between seqs and tree_polys
    for k in range(1, nmax + 1):
        assert len(seqs[k]) == len(tp[k])
        for i, s in enumerate(seqs[k]):
            assert indep_poly_tree(level_sequence_to_parent(s)) == tp[k][i]

    per_n = {}
    wr2_failures = []
    prefix_alphas = set()
    nonprefix_alphas = set()
    total = 0
    for n in range(1, nmax + 1):
        cnt = 0
        minQ = None
        argmin = []
        n_equal_f = 0
        n_star_edge_sets = 0
        n_wr2_hold = 0
        n_prefix = 0
        min_prefix_Q = None
        for comps, P in forests(n, tp):
            cnt += 1
            total += 1
            edges = forest_edges(comps, seqs)
            deg, e, S = degree_stats(n, edges)
            assert 0 <= e <= n - 1
            # (a) counting formulas against the core polynomial
            p1, p2, p3 = pk(P, 1), pk(P, 2), pk(P, 3)
            assert p1 == n
            assert p2 == binom(n, 2) - e, (comps, P)
            assert p3 == binom(n, 3) - e * (n - 2) + S, (comps, P)
            # (b) Q_2 >= f(n,e) with the exact defect 3n(C(e,2)-S)
            Q2 = 2 * p2**2 + p1**2 - 3 * p1 * p3
            fb = f_bound(n, e)
            assert S <= binom(e, 2)
            assert Q2 - fb == 3 * n * (binom(e, 2) - S)
            star_edges = is_star_forest(n, deg, e)
            assert (S == binom(e, 2)) == star_edges, (comps, deg)
            assert (Q2 == fb) == star_edges
            n_equal_f += Q2 == fb
            n_star_edge_sets += star_edges
            # (c) extremal statement
            bound = 2 * n * n - 3 * n + 2
            assert Q2 >= bound >= 1
            assert (Q2 == bound) == is_star_tree(n, deg, e), (comps, Q2, bound)
            if minQ is None or Q2 < minQ:
                minQ, argmin = Q2, [comps]
            elif Q2 == minQ:
                argmin.append(comps)
            # WR_2
            wr2 = p1 <= 2 * p2
            assert wr2 == (2 * e <= n * (n - 2))
            if n >= 4:
                assert wr2
            if not wr2:
                wr2_failures.append({"n": n, "e": e, "components": [list(c) for c in comps], "poly": P})
            n_wr2_hold += wr2
            # prefix bookkeeping: r = 2 is a prefix index iff 2 <= L(alpha)-1
            alpha = len(P) - 1
            L = L_cutoff(alpha)
            in_prefix = 2 <= L - 1
            assert in_prefix == (alpha >= 4)
            (prefix_alphas if in_prefix else nonprefix_alphas).add(alpha)
            if in_prefix:
                n_prefix += 1
                assert n >= 4 and wr2 and Q2 > 0
                if min_prefix_Q is None or Q2 < min_prefix_Q:
                    min_prefix_Q = Q2
        # the star is the unique minimizer of Q_2 for every n >= 1
        assert len(argmin) == 1
        (k0, i0), = argmin[0]
        assert k0 == n
        deg0, e0, _ = degree_stats(n, forest_edges(argmin[0], seqs))
        assert is_star_tree(n, deg0, e0)
        assert minQ == 2 * n * n - 3 * n + 2
        per_n[n] = {
            "forests": cnt,
            "min_Q2": minQ,
            "min_Q2_forest": "K_{1,%d}" % (n - 1),
            "unique_minimizer": True,
            "forests_with_Q2_equal_f": n_equal_f,
            "forests_with_star_edge_set": n_star_edge_sets,
            "forests_satisfying_WR2": n_wr2_hold,
            "forests_with_r2_in_prefix(alpha>=4)": n_prefix,
            "min_Q2_over_prefix_forests": min_prefix_Q,
        }
    assert total == 15205
    assert max(nonprefix_alphas, default=0) <= 3 and min(prefix_alphas) == 4
    return {
        "nmax": nmax,
        "total_forests_checked": total,
        "per_n": per_n,
        "WR2_failures_all_have_n<=3": wr2_failures,
    }


def sha256_of(path: str) -> str:
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def main() -> None:
    t0 = time.time()
    sym = symbolic_checks()
    for key, val in sym.items():
        if isinstance(val, bool):
            assert val, key
    print("sympy identities verified:", sum(isinstance(v, bool) for v in sym.values()))
    exh = exhaustive_checks()
    print("exhaustive: %d forests, n <= %d" % (exh["total_forests_checked"], exh["nmax"]))
    for n, rec in exh["per_n"].items():
        print("  n=%2d forests=%5d minQ2=%5d (star)  WR2 holds for %5d  prefix(alpha>=4): %5d"
              % (n, rec["forests"], rec["min_Q2"], rec["forests_satisfying_WR2"],
                 rec["forests_with_r2_in_prefix(alpha>=4)"]))
    runtime = time.time() - t0

    record = {
        "status": "PROVED",
        "theorem": ("For every forest F of order n >= 1 (p_k := 0 for k > alpha): "
                    "Q_2(F) = 2 p_2^2 + p_1^2 - 3 p_1 p_3 >= 2 n^2 - 3 n + 2 >= 1, "
                    "with equality iff F = K_{1,n-1}.  ISO_2 holds strictly for every forest."),
        "corollary_WR2": ("p_1 <= 2 p_2 iff 2e <= n(n-2); true for every forest with n >= 4; "
                          "fails exactly for K_1, K_2, P_3.  r = 2 is a prefix index iff alpha >= 4 "
                          "(L(alpha) >= 3), which forces n >= 4, so WR_2 holds on the whole prefix."),
        "key_identities": {
            "p_1": "n",
            "p_2": "C(n,2) - e",
            "p_3": "C(n,3) - e(n-2) + S,  S = sum_v C(d_v,2) <= C(e,2)",
            "Q_2": "f(n,e) + 3n (C(e,2) - S)",
            "f(n,e)": "n^2(n+1)/2 + e(n^2 - 5n/2) + e^2(2 - 3n/2)",
            "f(n,0)": "n^2(n+1)/2",
            "f(n,n-1)": "2n^2 - 3n + 2 = 2m^2 + m + 1 (m = n-1)",
            "f(n,0) - f(n,n-1)": "(n-1)(n^2 - 2n + 4)/2 >= 0",
            "d^2 f / d e^2": "4 - 3n < 0 for n >= 2",
        },
        "sympy_checks": sym,
        "exhaustive": exh,
        "pass_marker": PASS_MARKER,
        "script": os.path.basename(__file__),
        "script_sha256": sha256_of(os.path.abspath(__file__)),
        "runtime_seconds": round(runtime, 2),
    }
    os.makedirs(os.path.dirname(RESULTS_PATH), exist_ok=True)
    data = {}
    if os.path.exists(RESULTS_PATH):
        with open(RESULTS_PATH) as fh:
            data = json.load(fh)
    data["iso2"] = record
    with open(RESULTS_PATH, "w") as fh:
        json.dump(data, fh, indent=1, sort_keys=True)
    print("results written to", RESULTS_PATH)
    print("runtime %.2f s" % runtime)
    print(PASS_MARKER)


if __name__ == "__main__":
    main()
