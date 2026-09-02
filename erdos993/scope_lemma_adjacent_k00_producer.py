#!/usr/bin/env python3
"""
Exact structural producer for the scope lemma "the adjacent-k00 cell is empty"
(Erdős Problem #993 project, handoff section 8.4, "ordinary parent" family).

Setting
-------
H is a forest of order n with two distinct marked vertices u, v.  The marks
are *ordered* (the K-mask distinguishes u from v), so every unordered pair
{u, v} is examined with both role assignments, i.e. all n(n-1) ordered pairs.
An *actual ordinary parent* is a NEW vertex p attached to a nonempty set
S ⊆ V(H) such that H + p (p adjacent exactly to S) is still a forest.
K := H − S.  Geometry: "adjacent" iff uv ∈ E(H), else "nonadjacent".
K-mask: k<b_u><b_v> with b_u = 1 iff u ∉ S (u retained in K) and
b_v = 1 iff v ∉ S; so k00 means both marks are deleted (u ∈ S and v ∈ S).

What is computed (exact integers only, deterministic, single process)
--------------------------------------------------------------------
1. Every nonisomorphic forest H of order n = 2..NMAX exactly once, from
   forest_indep.forests (WROM level sequences, components concatenated with
   vertex offsets).  Forest counts are checked against OEIS A005195.
2. The star-attachable sets S (per component: nothing or exactly one vertex,
   not all nothing) are enumerated directly; for EVERY such S the forest
   property of H + p is verified by union-find via
   |E(H+p)| == |V(H+p)| − #components(H+p).
3. Conversely ALL 2^n − 1 nonempty S ⊆ V(H) are enumerated and it is checked
   that H + p is acyclic exactly when S has at most one vertex in every
   component of H, and that this set of S coincides with the directly
   enumerated one (attachable ⟺ one-per-component, verified exhaustively).
4. For every ordered pair (u, v), u ≠ v, and every attachable S the cell
   (geometry, mask) is recorded and counted per (n, geometry, mask).
   adjacent-k00 is asserted to be 0 for every n; for every other cell the
   smallest n and the first witness (H, u, v, S) in enumeration order are
   recorded.  Every nonadjacent-k00 instance is checked to have u and v in
   different components of H (structural corollary of the attachability
   lemma).
5. Every per-forest count is cross-checked against a closed form that depends
   only on the multiset of component sizes of H (derived in
   SCOPE_LEMMA_ADJACENT_K00.md).
6. results/scope_lemma_adjacent_k00_producer.json is written (with the sha256
   of this script and of forest_indep.py) and the marker line
   PASS_EXACT_SCOPE_LEMMA_ADJACENT_K00_PRODUCER (or FAIL_...) is printed.

Usage:  python3 scope_lemma_adjacent_k00_producer.py [NMAX]   (default 10)
        n <= 9 takes ~0.3 s, n <= 10 ~1.4 s, n <= 11 ~6 s (single process).
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from itertools import product

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import forest_indep as fi  # noqa: E402

NMAX_DEFAULT = 10
GEOMETRIES = ("adjacent", "nonadjacent")
MASKS = ("k00", "k01", "k10", "k11")   # index = 2*[u not in S] + [v not in S]
CELLS = [f"{g}:{m}" for g in GEOMETRIES for m in MASKS]
MARKER_PASS = "PASS_EXACT_SCOPE_LEMMA_ADJACENT_K00_PRODUCER"
MARKER_FAIL = "FAIL_EXACT_SCOPE_LEMMA_ADJACENT_K00_PRODUCER"


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        h.update(fh.read())
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Forest construction from forest_indep
# ---------------------------------------------------------------------------


def tree_tables(nmax: int):
    """seqs[k][i] = canonical level sequence, edges[k][i] = edge list of the
    i-th nonisomorphic tree of order k (vertices 0..k-1)."""
    seqs = [[] for _ in range(nmax + 1)]
    edges = [[] for _ in range(nmax + 1)]
    for k in range(1, nmax + 1):
        for seq in fi.tree_level_sequences(k):
            seqs[k].append(list(seq))
            edges[k].append(fi.parent_to_edges(fi.level_sequence_to_parent(seq)))
        assert len(seqs[k]) == fi.count_trees(k), (k, len(seqs[k]))
    return seqs, edges


def build_forest(components, tree_edges):
    """Concatenate the component trees with vertex offsets.

    Returns (edges, comp_of, comp_vertices) where comp_of[x] is the index of
    the component containing vertex x and comp_vertices[c] lists the vertices
    of component c (consecutive labels)."""
    edges = []
    comp_of = []
    comp_vertices = []
    offset = 0
    for ci, (k, idx) in enumerate(components):
        for a, b in tree_edges[k][idx]:
            edges.append((a + offset, b + offset))
        comp_vertices.append(list(range(offset, offset + k)))
        comp_of.extend([ci] * k)
        offset += k
    return edges, comp_of, comp_vertices


# ---------------------------------------------------------------------------
# Acyclicity of H + p by union-find:  |E| == |V| - #components
# ---------------------------------------------------------------------------


def hp_is_forest_unionfind(n: int, edges, s_bits: int) -> bool:
    """H + p with p = vertex n adjacent exactly to the vertices in s_bits.
    A graph is a forest iff |E| = |V| − (number of connected components)."""
    parent = list(range(n + 1))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    components = n + 1
    edge_count = 0
    for a, b in edges:
        edge_count += 1
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
            components -= 1
    bits = s_bits
    while bits:
        s = (bits & -bits).bit_length() - 1
        bits &= bits - 1
        edge_count += 1
        ra, rb = find(s), find(n)
        if ra != rb:
            parent[ra] = rb
            components -= 1
    return edge_count == (n + 1) - components


def one_per_component(s_bits: int, comp_of, ncomp: int) -> bool:
    """True iff the vertex set s_bits meets every component of H at most once."""
    hit = [0] * ncomp
    bits = s_bits
    while bits:
        x = (bits & -bits).bit_length() - 1
        bits &= bits - 1
        hit[comp_of[x]] += 1
        if hit[comp_of[x]] > 1:
            return False
    return True


def attachable_sets_direct(comp_vertices):
    """All nonempty S with at most one vertex per component, enumerated by
    choosing per component either nothing (None) or one vertex.  Returned as
    a list of bitmasks in a deterministic order."""
    options = [[None] + list(cv) for cv in comp_vertices]
    out = []
    for choice in product(*options):
        bits = 0
        for x in choice:
            if x is not None:
                bits |= 1 << x
        if bits:
            out.append(bits)
    return out


# ---------------------------------------------------------------------------
# Closed form (depends only on the component sizes of H), ordered pairs
# ---------------------------------------------------------------------------


def closed_form_counts(sizes):
    """Expected cell counts for one forest with component sizes ``sizes``.

    P = prod(1 + c_i) counts the one-per-component sets including S = ∅;
    A_j = P / (1 + c_j);  B_jl = P / ((1 + c_j)(1 + c_l)).
    For an ordered pair (u, v) inside one component C_j (adjacent or not):
        k00 = 0, k01 = k10 = A_j, k11 = (c_j − 1) A_j − 1.
    For u ∈ C_j, v ∈ C_l with j ≠ l (necessarily nonadjacent):
        k00 = B_jl, k01 = c_l B_jl, k10 = c_j B_jl, k11 = c_j c_l B_jl − 1.
    Ordered pair counts: 2(c_j − 1) adjacent pairs inside C_j,
    (c_j − 1)(c_j − 2) nonadjacent pairs inside C_j, c_j c_l pairs (C_j, C_l)."""
    P = 1
    for c in sizes:
        P *= 1 + c
    A = [P // (1 + c) for c in sizes]
    adj = [0, 0, 0, 0]
    non = [0, 0, 0, 0]
    for j, c in enumerate(sizes):
        na = 2 * (c - 1)
        adj[1] += na * A[j]
        adj[2] += na * A[j]
        adj[3] += na * ((c - 1) * A[j] - 1)
        ns = (c - 1) * (c - 2)
        non[1] += ns * A[j]
        non[2] += ns * A[j]
        non[3] += ns * ((c - 1) * A[j] - 1)
        for l, d in enumerate(sizes):
            if l == j:
                continue
            B = A[j] // (1 + d)
            npairs = c * d
            non[0] += npairs * B
            non[1] += npairs * d * B
            non[2] += npairs * c * B
            non[3] += npairs * (c * d * B - 1)
    return {"adjacent": adj, "nonadjacent": non}


# ---------------------------------------------------------------------------
# Main census
# ---------------------------------------------------------------------------


def bits_to_list(bits: int):
    out = []
    while bits:
        x = (bits & -bits).bit_length() - 1
        bits &= bits - 1
        out.append(x)
    return out


def make_witness(n, components, seqs, edges, u, v, s_bits, geometry, mask):
    S = bits_to_list(s_bits)
    S_set = set(S)
    K_vertices = [x for x in range(n) if x not in S_set]
    K_edges = [[a, b] for a, b in edges if a not in S_set and b not in S_set]
    return {
        "n": n,
        "geometry": geometry,
        "mask": mask,
        "components": [[k, i] for k, i in components],
        "component_level_sequences": [seqs[k][i] for k, i in components],
        "H_edges": [[a, b] for a, b in edges],
        "u": u,
        "v": v,
        "S": S,
        "p": n,
        "H_plus_p_edges": [[a, b] for a, b in edges] + [[s, n] for s in S],
        "K_vertices": K_vertices,
        "K_edges": K_edges,
        "u_in_K": u not in S_set,
        "v_in_K": v not in S_set,
    }


def run(nmax: int) -> dict:
    t0 = time.perf_counter()
    seqs, tree_edges = tree_tables(nmax)
    tp = fi.tree_polys_upto(nmax)

    counts = {}          # str(n) -> geometry -> mask -> count
    per_n = {}           # bookkeeping per order
    min_order = {cell: None for cell in CELLS}
    witnesses = {}
    failures = []

    for n in range(2, nmax + 1):
        local_counts = {g: [0, 0, 0, 0] for g in GEOMETRIES}
        n_forests = 0
        n_attachable = 0          # number of (H, S) pairs with S attachable
        n_subsets = 0             # number of (H, S) pairs with S nonempty
        n_instances = 0           # number of (H, u, v, S) instances
        n_k00_nonadjacent_checked = 0
        for components, _poly in fi.forests(n, tp):
            n_forests += 1
            edges, comp_of, comp_vertices = build_forest(components, tree_edges)
            assert len(edges) == n - len(comp_vertices)
            adj = [set() for _ in range(n)]
            for a, b in edges:
                adj[a].add(b)
                adj[b].add(a)
            ncomp = len(comp_vertices)

            # (2) direct enumeration of attachable S, each verified by union-find
            attachable = attachable_sets_direct(comp_vertices)
            expected = 1
            for cv in comp_vertices:
                expected *= 1 + len(cv)
            expected -= 1
            if len(attachable) != expected or len(set(attachable)) != expected:
                failures.append(f"n={n} {components}: direct enumeration size mismatch")
            for s_bits in attachable:
                if not hp_is_forest_unionfind(n, edges, s_bits):
                    failures.append(f"n={n} {components} S={bits_to_list(s_bits)}: H+p not a forest")
            n_attachable += len(attachable)

            # (3) converse over ALL nonempty subsets
            attachable_set = set(attachable)
            for s_bits in range(1, 1 << n):
                n_subsets += 1
                acyclic = hp_is_forest_unionfind(n, edges, s_bits)
                one_per = one_per_component(s_bits, comp_of, ncomp)
                direct = s_bits in attachable_set
                if not (acyclic == one_per == direct):
                    failures.append(
                        f"n={n} {components} S={bits_to_list(s_bits)}: "
                        f"acyclic={acyclic} one_per_component={one_per} direct={direct}")

            # (4) cells for all ordered pairs (u, v) and all attachable S
            forest_counts = {g: [0, 0, 0, 0] for g in GEOMETRIES}
            for u in range(n):
                adj_u = adj[u]
                for v in range(n):
                    if u == v:
                        continue
                    geometry = "adjacent" if v in adj_u else "nonadjacent"
                    fc = forest_counts[geometry]
                    for s_bits in attachable:
                        mi = (0 if (s_bits >> u) & 1 else 2) + (0 if (s_bits >> v) & 1 else 1)
                        fc[mi] += 1
                        if mi == 0:
                            # both marks deleted: must be nonadjacent and in
                            # different components (attachability lemma)
                            if geometry != "nonadjacent" or comp_of[u] == comp_of[v]:
                                failures.append(
                                    f"n={n} {components} u={u} v={v} S={bits_to_list(s_bits)}: "
                                    f"k00 with geometry={geometry}, same_component={comp_of[u] == comp_of[v]}")
                            n_k00_nonadjacent_checked += 1
                        cell = f"{geometry}:{MASKS[mi]}"
                        if min_order[cell] is None:
                            min_order[cell] = n
                            witnesses[cell] = make_witness(
                                n, components, seqs, edges, u, v, s_bits, geometry, MASKS[mi])
            # (5) closed-form cross-check for this forest
            sizes = [len(cv) for cv in comp_vertices]
            expected_counts = closed_form_counts(sizes)
            if expected_counts != forest_counts:
                failures.append(
                    f"n={n} {components}: closed form {expected_counts} != enumerated {forest_counts}")
            for g in GEOMETRIES:
                for mi in range(4):
                    local_counts[g][mi] += forest_counts[g][mi]
                    n_instances += forest_counts[g][mi]

        if n_forests != fi.OEIS_A005195[n]:
            failures.append(f"n={n}: {n_forests} forests enumerated, OEIS A005195 says {fi.OEIS_A005195[n]}")
        if local_counts["adjacent"][0] != 0:
            failures.append(f"n={n}: adjacent-k00 count is {local_counts['adjacent'][0]} != 0")
        if local_counts["adjacent"][1] != local_counts["adjacent"][2]:
            failures.append(f"n={n}: adjacent k01 != k10 (u/v symmetry broken)")
        if local_counts["nonadjacent"][1] != local_counts["nonadjacent"][2]:
            failures.append(f"n={n}: nonadjacent k01 != k10 (u/v symmetry broken)")
        if n_instances != sum(local_counts[g][mi] for g in GEOMETRIES for mi in range(4)):
            failures.append(f"n={n}: instance total mismatch")

        counts[str(n)] = {g: {MASKS[mi]: local_counts[g][mi] for mi in range(4)} for g in GEOMETRIES}
        per_n[str(n)] = {
            "forests": n_forests,
            "attachable_(H,S)_pairs_verified_acyclic_by_unionfind": n_attachable,
            "all_nonempty_subsets_(H,S)_tested": n_subsets,
            "instances_(H,u,v,S)_ordered_pairs": n_instances,
            "nonadjacent_k00_instances_checked_different_components": n_k00_nonadjacent_checked,
        }
        print(f"n={n}: forests={n_forests} attachable(H,S)={n_attachable} "
              f"subsets_tested={n_subsets} instances={n_instances}")
        print("   " + "  ".join(f"{g}:{MASKS[mi]}={local_counts[g][mi]}"
                                for g in GEOMETRIES for mi in range(4)))

    for cell in CELLS:
        if cell != "adjacent:k00" and min_order[cell] is None:
            failures.append(f"cell {cell} never realized for n <= {nmax}")
    if min_order["adjacent:k00"] is not None:
        failures.append("cell adjacent:k00 realized (should be impossible)")

    elapsed = time.perf_counter() - t0
    totals = {g: {m: sum(counts[str(n)][g][m] for n in range(2, nmax + 1)) for m in MASKS}
              for g in GEOMETRIES}
    unordered = {}
    for g in GEOMETRIES:
        unordered[g] = {}
        for n in range(2, nmax + 1):
            c = counts[str(n)][g]
            if c["k00"] % 2 or c["k11"] % 2 or c["k01"] != c["k10"]:
                failures.append(f"n={n} {g}: ordered counts not consistent with unordered pairs")
            unordered[g][str(n)] = {
                "both_marks_deleted": c["k00"] // 2,
                "exactly_one_mark_deleted": c["k01"],
                "no_mark_deleted": c["k11"] // 2,
            }

    status = "PASS" if not failures else "FAIL"
    result = {
        "title": "Scope lemma: adjacent-k00 cell is empty (exact structural producer)",
        "script": os.path.basename(__file__),
        "sha256": {
            os.path.basename(__file__): sha256_file(os.path.abspath(__file__)),
            "forest_indep.py": sha256_file(os.path.join(HERE, "forest_indep.py")),
        },
        "nmax": nmax,
        "orders": list(range(2, nmax + 1)),
        "conventions": {
            "H": "nonisomorphic forest of order n, vertices 0..n-1, components from forest_indep.forests "
                 "concatenated with vertex offsets; tree i of order k = i-th WROM level sequence",
            "marks": "ordered pair (u, v) of distinct vertices; every unordered pair {u, v} is counted "
                     "with both role assignments (k01 and k10 are distinguished)",
            "S": "nonempty subset of V(H); p = new vertex n adjacent exactly to S",
            "attachable": "H + p is a forest; verified by union-find |E| == |V| - #components",
            "geometry": "adjacent iff uv in E(H), else nonadjacent",
            "mask": "k<b_u><b_v>, b_u = 1 iff u not in S (u retained in K = H - S), b_v = 1 iff v not in S; "
                    "k00 = both marks deleted",
            "cell_order": CELLS,
        },
        "counts_ordered_pairs": counts,
        "totals_ordered_pairs": totals,
        "counts_unordered_pairs_derived": unordered,
        "per_n": per_n,
        "adjacent_k00_total": totals["adjacent"]["k00"],
        "min_order": min_order,
        "witnesses_first_in_enumeration_order": witnesses,
        "checks": {
            "forest_counts_match_OEIS_A005195": all(
                per_n[str(n)]["forests"] == fi.OEIS_A005195[n] for n in range(2, nmax + 1)),
            "every_direct_S_verified_forest_by_unionfind": True,
            "all_nonempty_subsets_equivalence_acyclic_iff_one_per_component": True,
            "closed_form_matches_every_forest": True,
            "nonadjacent_k00_always_different_components": True,
            "u_v_symmetry_k01_equals_k10": True,
        } if not failures else {"failures": failures},
        "status": status,
    }
    # the elapsed time is printed but deliberately not stored: the JSON must
    # be byte-identical across re-runs
    return result, failures, elapsed


def main(argv) -> int:
    nmax = int(argv[1]) if len(argv) > 1 else NMAX_DEFAULT
    if nmax < 3:
        print("NMAX must be at least 3 so that every realizable cell appears")
        return 2
    if nmax > 14:
        print("NMAX > 14 is outside the intended (single-process, minutes) budget")
        return 2
    result, failures, elapsed = run(nmax)
    out_dir = os.path.join(HERE, "results")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "scope_lemma_adjacent_k00_producer.json")
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=2, sort_keys=True)
        fh.write("\n")
    print(f"wrote {out_path}")
    print("min_order:", json.dumps(result["min_order"], sort_keys=True))
    print(f"elapsed {elapsed:.2f} s")
    if failures:
        for f in failures[:50]:
            print("FAILURE:", f)
        print(MARKER_FAIL)
        return 1
    print(MARKER_PASS)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
