#!/usr/bin/env python3
"""
bruteforce_forests.py -- INDEPENDENT brute-force replay for the Erdos-993 project.

This script is deliberately simple.  It was written without looking at the
other ("fast") implementation and is meant to be compared against it.

What it does, for every n = 0 .. NMAX (default NMAX = 11):

  1. Enumerates every unlabeled forest on n vertices exactly once.
     * Trees of order k come from ``networkx.nonisomorphic_trees(k)``.
       (Their count is asserted against OEIS A000055, and pairwise
       non-isomorphism is verified with an AHU canonical form.)
     * A forest is a multiset of trees whose orders sum to n.  We iterate
       over the integer partitions of n and, for every part size k that
       occurs m times, over ``itertools.combinations_with_replacement``
       of the trees of order k taken m at a time.
     * The number of forests is asserted against OEIS A005195.

  2. Computes the independence polynomial  I(F;x) = sum_r p_r x^r
     by BRUTE FORCE: it loops over all 2^n vertex subsets (bitmasks) and
     tests independence directly against the edge list.  No shortcut is
     used for the primary computation.  As a self-consistency check only,
     the polynomial is recomputed as the product over the components (each
     component again by brute force) and alpha is compared with
     n - (maximum matching size)  (Koenig's theorem for bipartite graphs).

  3. For every forest computes (all with exact integer / Fraction arithmetic):
       alpha        = degree of I (independence number)
       unimodal     : p_0 <= ... <= p_m >= ... >= p_alpha for some m
       log-concave  : p_r^2 >= p_{r-1} p_{r+1}          for 1 <= r <= alpha-1
       ISO          : ISO_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0
                      for 1 <= r <= alpha-1, and
                      min_r ISO_r / ((r+1) p_{r-1} p_{r+1})  as an exact Fraction
       WR           : R = largest R with p_{r-1} <= r p_r for all 1 <= r <= R
       L            = ceil((2 alpha - 1) / 3)
       TAIL         : p_r >= p_{r+1} for all L <= r <= alpha-1

  4. Writes
       bruteforce_forests_report.json   (per-n aggregate results + hashes)
       coeffs_n{n}.txt                  (multiset of coefficient vectors, one
                                         per line, comma separated, sorted
                                         lexicographically as integer tuples)

Hash definition (so the other implementation can reproduce it):
    vectors = sorted(list_of_coefficient_tuples)           # lexicographic
    text    = json.dumps(vectors, sort_keys=True, separators=(",", ":"))
    hash    = hashlib.sha256(text.encode("utf-8")).hexdigest()
(json.dumps renders the tuples as JSON arrays, e.g. "[[1,2,1],[1,3,1]]".)

Usage:
    python3 bruteforce_forests.py [--nmax N] [--outdir DIR]
"""

import argparse
import hashlib
import itertools
import json
import os
import sys
import time
from fractions import Fraction

import networkx as nx

# OEIS A005195: number of forests with n unlabeled nodes, n = 0, 1, 2, ...
A005195 = [1, 1, 2, 3, 6, 10, 20, 37, 76, 153, 329, 710, 1601, 3658, 8599, 20514]

# OEIS A000055: number of trees with k unlabeled nodes, k = 0, 1, 2, ...
A000055 = [1, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741]


# ---------------------------------------------------------------------------
# Integer partitions
# ---------------------------------------------------------------------------
def partitions(n, max_part=None):
    """Yield all integer partitions of n as non-increasing tuples."""
    if max_part is None:
        max_part = n
    if n == 0:
        yield ()
        return
    for first in range(min(n, max_part), 0, -1):
        for rest in partitions(n - first, first):
            yield (first,) + rest


# ---------------------------------------------------------------------------
# Trees
# ---------------------------------------------------------------------------
def ahu_canonical_form(k, edges):
    """Canonical string of an unlabeled tree (AHU encoding rooted at the centre).

    Two trees are isomorphic iff their canonical strings are equal.
    Used only to double check that networkx really produced pairwise
    non-isomorphic trees.
    """
    if k == 1:
        return "()"
    adj = {v: set() for v in range(k)}
    for u, v in edges:
        adj[u].add(v)
        adj[v].add(u)

    # find the centre(s) by repeatedly stripping leaves
    remaining = set(range(k))
    degree = {v: len(adj[v]) for v in range(k)}
    leaves = [v for v in remaining if degree[v] <= 1]
    while len(remaining) > 2:
        new_leaves = []
        for leaf in leaves:
            remaining.discard(leaf)
            for w in adj[leaf]:
                if w in remaining:
                    degree[w] -= 1
                    if degree[w] == 1:
                        new_leaves.append(w)
        leaves = new_leaves
    centres = sorted(remaining)

    def encode(v, parent):
        return "(" + "".join(sorted(encode(w, v) for w in adj[v] if w != parent)) + ")"

    return min(encode(c, None) for c in centres)


def trees_of_order(k):
    """Return the list of all non-isomorphic trees on k vertices.

    Each tree is a tuple (k, edges) with vertices 0..k-1 and edges a sorted
    tuple of (u, v) pairs with u < v.
    """
    trees = []
    for t in nx.nonisomorphic_trees(k):
        assert nx.is_tree(t), "networkx produced a non-tree"
        assert t.number_of_nodes() == k, "networkx produced a tree of wrong order"
        nodes = sorted(t.nodes())
        relabel = {v: i for i, v in enumerate(nodes)}
        edges = tuple(sorted(tuple(sorted((relabel[u], relabel[v]))) for u, v in t.edges()))
        assert len(edges) == k - 1
        trees.append((k, edges))

    assert len(trees) == A000055[k], (
        "tree count for k=%d is %d, expected A000055 = %d" % (k, len(trees), A000055[k])
    )
    canon = [ahu_canonical_form(k, e) for (_, e) in trees]
    assert len(set(canon)) == len(canon), "networkx produced isomorphic duplicates for k=%d" % k
    return trees


# ---------------------------------------------------------------------------
# Forests
# ---------------------------------------------------------------------------
def forests_of_order(n, trees_by_order):
    """Yield every unlabeled forest on n vertices exactly once.

    A forest is yielded as a tuple of trees (k, edges), sorted so that the
    representation is deterministic.
    """
    if n == 0:
        yield ()
        return
    for part in partitions(n):
        # multiplicities of each distinct part size, largest part first
        sizes = sorted(set(part), reverse=True)
        mult = {k: part.count(k) for k in sizes}
        choices = [
            itertools.combinations_with_replacement(trees_by_order[k], mult[k]) for k in sizes
        ]
        for combo in itertools.product(*choices):
            forest = tuple(tree for group in combo for tree in group)
            assert sum(k for (k, _) in forest) == n
            yield forest


def forest_edge_list(forest):
    """Disjoint union of the component trees on vertices 0..n-1.

    Returns (n, edges) where edges is a list of (u, v) pairs.
    """
    edges = []
    offset = 0
    for k, tree_edges in forest:
        for u, v in tree_edges:
            edges.append((u + offset, v + offset))
        offset += k
    return offset, edges


# ---------------------------------------------------------------------------
# Independence polynomial (brute force)
# ---------------------------------------------------------------------------
def independence_polynomial_bruteforce(n, edges):
    """Coefficients [p_0, ..., p_alpha] of I(G;x) for a graph on vertices 0..n-1.

    Loops over all 2^n subsets encoded as bitmasks; a subset is independent
    iff no edge has both endpoints inside it.
    """
    counts = [0] * (n + 1)
    for mask in range(1 << n):
        independent = True
        for u, v in edges:
            if (mask >> u) & 1 and (mask >> v) & 1:
                independent = False
                break
        if independent:
            counts[mask.bit_count()] += 1
    while len(counts) > 1 and counts[-1] == 0:
        counts.pop()
    return counts


def poly_mul(a, b):
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return out


def independence_polynomial_by_components(forest):
    """Self-consistency check: product of the component polynomials."""
    poly = [1]
    for k, tree_edges in forest:
        poly = poly_mul(poly, independence_polynomial_bruteforce(k, list(tree_edges)))
    return poly


def maximum_matching_size(n, edges):
    g = nx.Graph()
    g.add_nodes_from(range(n))
    g.add_edges_from(edges)
    return len(nx.max_weight_matching(g, maxcardinality=True))


# ---------------------------------------------------------------------------
# Properties of a coefficient sequence
# ---------------------------------------------------------------------------
def ceil_div(a, b):
    """ceil(a / b) for integers, b > 0, exact."""
    return -((-a) // b)


def analyze(p):
    """Return a dict of exact verdicts for the coefficient list p = [p_0..p_alpha]."""
    alpha = len(p) - 1
    assert all(isinstance(x, int) and x > 0 for x in p)

    # unimodal: non-decreasing up to (the first occurrence of) the maximum,
    # non-increasing afterwards.
    m = p.index(max(p))
    unimodal = all(p[i] <= p[i + 1] for i in range(0, m)) and all(
        p[i] >= p[i + 1] for i in range(m, alpha)
    )

    log_concave = all(p[r] * p[r] >= p[r - 1] * p[r + 1] for r in range(1, alpha))

    iso_ok = True
    iso_min = None  # exact Fraction, or None if there is no r in 1..alpha-1
    for r in range(1, alpha):
        iso_r = r * p[r] * p[r] + p[r - 1] * p[r - 1] - (r + 1) * p[r - 1] * p[r + 1]
        if iso_r < 0:
            iso_ok = False
        denom = (r + 1) * p[r - 1] * p[r + 1]
        if denom != 0:
            ratio = Fraction(iso_r, denom)
            if iso_min is None or ratio < iso_min:
                iso_min = ratio

    # WR: largest R such that p_{r-1} <= r * p_r for all 1 <= r <= R.
    # (p_r = 0 for r > alpha, so the condition fails at r = alpha + 1 at the latest.)
    R = 0
    while R + 1 <= alpha and p[R] <= (R + 1) * p[R + 1]:
        R += 1

    L = ceil_div(2 * alpha - 1, 3)
    tail = all(p[r] >= p[r + 1] for r in range(L, alpha))

    return {
        "alpha": alpha,
        "unimodal": unimodal,
        "log_concave": log_concave,
        "iso_ok": iso_ok,
        "iso_min": iso_min,
        "WR": R,
        "L": L,
        "tail": tail,
        "wr_fails_le_L": R < L,
        "wr_fails_le_Lminus1": R < L - 1,
    }


# ---------------------------------------------------------------------------
# Reporting helpers
# ---------------------------------------------------------------------------
def forest_repr(forest):
    """JSON-friendly description of a forest (sorted list of tree edge lists)."""
    comps = sorted(forest)
    return {
        "component_sizes": [k for (k, _) in comps],
        "edges": [[list(e) for e in edges] for (_, edges) in comps],
        "canonical": [ahu_canonical_form(k, edges) for (k, edges) in comps],
    }


def coefficient_hash(coeff_vectors):
    vectors = sorted(coeff_vectors)
    text = json.dumps(vectors, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def process_n(n, trees_by_order, outdir):
    t0 = time.time()
    coeff_vectors = []
    stats = {
        "n": n,
        "forests": 0,
        "unimodal": 0,
        "log_concave": 0,
        "iso_ok": 0,
        "tail_ok": 0,
        "wr_fails_for_some_r_le_L": 0,
        "wr_fails_for_some_r_le_Lminus1": 0,
    }
    global_min = None
    argmin = []

    for forest in forests_of_order(n, trees_by_order):
        nv, edges = forest_edge_list(forest)
        assert nv == n
        p = independence_polynomial_bruteforce(n, edges)

        # --- self-consistency checks (not used for the primary computation)
        assert p == independence_polynomial_by_components(forest), "component product mismatch"
        def coef(r):
            return p[r] if r < len(p) else 0

        assert coef(0) == 1
        assert coef(1) == n
        assert coef(2) == n * (n - 1) // 2 - len(edges)
        assert len(p) - 1 == n - maximum_matching_size(n, edges), "alpha != n - nu"

        a = analyze(p)
        coeff_vectors.append(tuple(p))
        stats["forests"] += 1
        stats["unimodal"] += a["unimodal"]
        stats["log_concave"] += a["log_concave"]
        stats["iso_ok"] += a["iso_ok"]
        stats["tail_ok"] += a["tail"]
        stats["wr_fails_for_some_r_le_L"] += a["wr_fails_le_L"]
        stats["wr_fails_for_some_r_le_Lminus1"] += a["wr_fails_le_Lminus1"]

        if a["iso_min"] is not None:
            if global_min is None or a["iso_min"] < global_min:
                global_min = a["iso_min"]
                argmin = [(forest, p)]
            elif a["iso_min"] == global_min:
                argmin.append((forest, p))

    assert stats["forests"] == A005195[n], (
        "forest count for n=%d is %d, expected A005195 = %d" % (n, stats["forests"], A005195[n])
    )
    assert len(coeff_vectors) == A005195[n]

    stats["A005195_expected"] = A005195[n]
    stats["min_iso_ratio"] = str(global_min) if global_min is not None else None
    stats["min_iso_ratio_float"] = float(global_min) if global_min is not None else None
    stats["min_iso_argmin_count"] = len(argmin)
    argmin_sorted = sorted(argmin, key=lambda fp: (fp[1], sorted(fp[0])))
    stats["min_iso_argmin_forests"] = [
        dict(forest_repr(f), coeffs=list(p)) for (f, p) in argmin_sorted
    ]
    # the required "argmin forest as a sorted list of tree edge lists"
    if argmin_sorted:
        stats["min_iso_argmin_forest_edges"] = forest_repr(argmin_sorted[0][0])["edges"]
    else:
        stats["min_iso_argmin_forest_edges"] = None
    stats["distinct_coefficient_vectors"] = len(set(coeff_vectors))
    stats["coeff_multiset_sha256"] = coefficient_hash(coeff_vectors)

    path = os.path.join(outdir, "coeffs_n%d.txt" % n)
    with open(path, "w") as fh:
        for vec in sorted(coeff_vectors):
            fh.write(",".join(str(x) for x in vec) + "\n")
    stats["coeff_file"] = os.path.basename(path)
    stats["seconds"] = round(time.time() - t0, 3)
    return stats


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--nmax", type=int, default=11, help="largest n to process (default 11)")
    ap.add_argument(
        "--outdir",
        default=os.path.dirname(os.path.abspath(__file__)),
        help="output directory (default: directory containing this script)",
    )
    ap.add_argument(
        "--report",
        default="bruteforce_forests_report.json",
        help="name of the JSON report inside --outdir",
    )
    args = ap.parse_args()
    nmax = args.nmax
    assert 0 <= nmax < len(A005195), "no A005195 reference value for this nmax"
    os.makedirs(args.outdir, exist_ok=True)

    print("independent brute-force replay: forests on n = 0..%d vertices" % nmax)
    print("python %s, networkx %s" % (sys.version.split()[0], nx.__version__))
    sys.stdout.flush()

    trees_by_order = {}
    for k in range(1, nmax + 1):
        trees_by_order[k] = trees_of_order(k)
    print("trees per order k=1..%d: %s  (A000055 ok)" % (nmax, [len(trees_by_order[k]) for k in range(1, nmax + 1)]))
    sys.stdout.flush()

    header = (
        "%3s %7s %7s %7s %7s %7s %7s %7s %7s  %-64s %s"
        % ("n", "forests", "A005195", "unimod", "logconc", "ISO", "TAIL", "WR<L", "WR<L-1", "sha256(coeff multiset)", "min ISO ratio")
    )
    print(header)
    per_n = []
    for n in range(0, nmax + 1):
        s = process_n(n, trees_by_order, args.outdir)
        per_n.append(s)
        print(
            "%3d %7d %7d %7d %7d %7d %7d %7d %7d  %s %s  [%.1fs]"
            % (
                n,
                s["forests"],
                s["A005195_expected"],
                s["unimodal"],
                s["log_concave"],
                s["iso_ok"],
                s["tail_ok"],
                s["wr_fails_for_some_r_le_L"],
                s["wr_fails_for_some_r_le_Lminus1"],
                s["coeff_multiset_sha256"],
                s["min_iso_ratio"],
                s["seconds"],
            )
        )
        sys.stdout.flush()

    print()
    print("global minimum ISO ratio per n and argmin forest(s):")
    for s in per_n:
        if s["min_iso_ratio"] is None:
            print("  n=%d: undefined (no forest has alpha >= 2)" % s["n"])
            continue
        print(
            "  n=%d: min ISO ratio = %s (~%.6f), attained by %d forest(s)"
            % (s["n"], s["min_iso_ratio"], s["min_iso_ratio_float"], s["min_iso_argmin_count"])
        )
        for f in s["min_iso_argmin_forests"]:
            print(
                "        component sizes %s  coeffs %s  edges %s"
                % (f["component_sizes"], f["coeffs"], json.dumps(f["edges"], separators=(",", ":")))
            )

    report = {
        "description": "Independent brute-force replay: independence polynomials of all unlabeled forests, "
        "computed by enumerating all 2^n vertex subsets.",
        "script": os.path.basename(__file__),
        "nmax": nmax,
        "python": sys.version.split()[0],
        "networkx": nx.__version__,
        "hash_definition": "sha256(json.dumps(sorted(list_of_coefficient_tuples), sort_keys=True, separators=(',', ':')).encode('utf-8'))",
        "definitions": {
            "unimodal": "p_0 <= ... <= p_m >= ... >= p_alpha for some m",
            "log_concave": "p_r^2 >= p_{r-1} p_{r+1} for all 1 <= r <= alpha-1",
            "ISO": "ISO_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0 for all 1 <= r <= alpha-1",
            "iso_ratio": "min over 1 <= r <= alpha-1 of ISO_r / ((r+1) p_{r-1} p_{r+1}) (exact Fraction)",
            "WR": "largest R such that p_{r-1} <= r p_r for all 1 <= r <= R",
            "L": "ceil((2 alpha - 1)/3)",
            "TAIL": "p_r >= p_{r+1} for all L <= r <= alpha-1",
            "wr_fails_for_some_r_le_L": "number of forests with R < L",
            "wr_fails_for_some_r_le_Lminus1": "number of forests with R < L-1",
        },
        "per_n": per_n,
    }
    report_path = os.path.join(args.outdir, args.report)
    with open(report_path, "w") as fh:
        json.dump(report, fh, indent=1)
    print()
    print("wrote %s" % report_path)
    print("all A005195 / A000055 / self-consistency assertions passed")


if __name__ == "__main__":
    main()
