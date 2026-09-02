#!/usr/bin/env python3
"""
Independent audit of results/scope_lemma_adjacent_k00_producer.json
(Erdős Problem #993 project, scope lemma "adjacent-k00 is empty").

Independence from the producer
------------------------------
* does NOT import scope_lemma_adjacent_k00_producer.py or forest_indep.py;
* nonisomorphic trees come from networkx.nonisomorphic_trees, checked against
  OEIS A000055 and for pairwise non-isomorphism with networkx.is_isomorphic;
* forests are built here as multisets of trees (integer partitions of n,
  combinations with replacement of tree indices), checked against OEIS
  A005195 (n = 1..9 -> 1, 2, 3, 6, 10, 20, 37, 76, 153, then 329, 710, ...);
* H + p is built explicitly as an adjacency structure for EVERY nonempty
  S ⊆ V(H) and tested for acyclicity with an iterative DFS (back-edge
  detection), not with union-find;
* "at most one vertex of S per component" is decided from components found
  by BFS on H, and the equivalence with acyclicity of H + p is checked for
  every S;
* K = H − N(p) is computed directly from the adjacency of H + p and the mask
  reads off whether u, v ∈ V(K).

The recomputed counts (n = 2..nmax of the producer JSON, ordered pairs
(u, v)) are compared with the producer JSON exactly, the producer's minimal
orders and witnesses are re-verified, the sha256 values recorded by the
producer are checked against the current files, and the audit writes
results/scope_lemma_adjacent_k00_audit.json and prints
PASS_INDEPENDENT_SCOPE_LEMMA_ADJACENT_K00 or FAIL_... with details.

Usage:  python3 scope_lemma_adjacent_k00_audit_independent.py
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from collections import deque
from itertools import combinations_with_replacement, product

import networkx as nx

HERE = os.path.dirname(os.path.abspath(__file__))
PRODUCER_SCRIPT = os.path.join(HERE, "scope_lemma_adjacent_k00_producer.py")
PRODUCER_JSON = os.path.join(HERE, "results", "scope_lemma_adjacent_k00_producer.json")
AUDIT_JSON = os.path.join(HERE, "results", "scope_lemma_adjacent_k00_audit.json")
CORE_LIB = os.path.join(HERE, "forest_indep.py")

MARKER_PASS = "PASS_INDEPENDENT_SCOPE_LEMMA_ADJACENT_K00"
MARKER_FAIL = "FAIL_INDEPENDENT_SCOPE_LEMMA_ADJACENT_K00"

GEOMETRIES = ("adjacent", "nonadjacent")
MASKS = ("k00", "k01", "k10", "k11")

# OEIS values typed in independently (not imported from forest_indep).
A000055 = {1: 1, 2: 1, 3: 1, 4: 2, 5: 3, 6: 6, 7: 11, 8: 23, 9: 47, 10: 106, 11: 235, 12: 551}
A005195 = {1: 1, 2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37, 8: 76, 9: 153, 10: 329, 11: 710, 12: 1601}


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        h.update(fh.read())
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Trees (networkx) and forests (multisets of trees)
# ---------------------------------------------------------------------------


def tree_edge_lists(nmax: int, failures: list):
    """trees[k] = list of edge lists (vertices 0..k-1) of all nonisomorphic
    trees of order k, from networkx; count and pairwise non-isomorphism checked."""
    trees = {}
    for k in range(1, nmax + 1):
        graphs = list(nx.nonisomorphic_trees(k))
        if len(graphs) != A000055[k]:
            failures.append(f"networkx gives {len(graphs)} trees of order {k}, OEIS A000055 says {A000055[k]}")
        lists = []
        for G in graphs:
            if G.number_of_nodes() != k or not nx.is_tree(G):
                failures.append(f"networkx tree of order {k} is not a tree on {k} vertices")
            if sorted(G.nodes()) != list(range(k)):
                failures.append(f"networkx tree of order {k} is not labelled 0..{k-1}")
            lists.append(sorted(tuple(sorted(e)) for e in G.edges()))
        for i in range(len(graphs)):
            for j in range(i + 1, len(graphs)):
                if nx.is_isomorphic(graphs[i], graphs[j]):
                    failures.append(f"networkx trees {i} and {j} of order {k} are isomorphic")
        trees[k] = lists
    return trees


def partitions(n: int, largest: int | None = None):
    """Integer partitions of n as non-increasing tuples."""
    if largest is None:
        largest = n
    if n == 0:
        yield ()
        return
    for first in range(min(n, largest), 0, -1):
        for rest in partitions(n - first, first):
            yield (first,) + rest


def forests_of_order(n: int, trees):
    """Every forest of order n exactly once as a list of (size, tree_index)
    components, via multisets of trees per part size of each partition."""
    for part in partitions(n):
        mult = {}
        for k in part:
            mult[k] = mult.get(k, 0) + 1
        sizes = sorted(mult, reverse=True)
        choices = [combinations_with_replacement(range(len(trees[k])), mult[k]) for k in sizes]
        for pick in product(*choices):
            comps = []
            for k, idxs in zip(sizes, pick):
                for i in idxs:
                    comps.append((k, i))
            yield comps


def build_adjacency(n: int, comps, trees):
    """Adjacency dict {vertex: set(neighbours)} of the forest on 0..n-1."""
    adj = {x: set() for x in range(n)}
    offset = 0
    for k, i in comps:
        for a, b in trees[k][i]:
            adj[a + offset].add(b + offset)
            adj[b + offset].add(a + offset)
        offset += k
    assert offset == n
    return adj


# ---------------------------------------------------------------------------
# Graph primitives (BFS components, DFS acyclicity) written for this audit
# ---------------------------------------------------------------------------


def bfs_components(adj):
    comp_of = {}
    comp_id = 0
    for root in adj:
        if root in comp_of:
            continue
        comp_of[root] = comp_id
        queue = deque([root])
        while queue:
            x = queue.popleft()
            for y in adj[x]:
                if y not in comp_of:
                    comp_of[y] = comp_id
                    queue.append(y)
        comp_id += 1
    return comp_of, comp_id


def is_acyclic_dfs(adj) -> bool:
    """Iterative DFS on an undirected simple graph: a visited neighbour other
    than the DFS parent is a back edge, i.e. a cycle."""
    parent = {}
    for root in adj:
        if root in parent:
            continue
        parent[root] = None
        stack = [root]
        while stack:
            x = stack.pop()
            for y in adj[x]:
                if y == parent[x]:
                    continue
                if y in parent:
                    return False
                parent[y] = x
                stack.append(y)
    return True


def h_plus_p(adj, S, p):
    """Explicit adjacency structure of H + p, p adjacent exactly to S."""
    adjp = {x: set(nb) for x, nb in adj.items()}
    adjp[p] = set(S)
    for s in S:
        adjp[s].add(p)
    return adjp


def one_per_component(S, comp_of) -> bool:
    seen = set()
    for s in S:
        c = comp_of[s]
        if c in seen:
            return False
        seen.add(c)
    return True


# ---------------------------------------------------------------------------
# Census
# ---------------------------------------------------------------------------


def census(nmax: int, trees, failures: list):
    counts = {}
    per_n = {}
    min_order = {f"{g}:{m}": None for g in GEOMETRIES for m in MASKS}
    witnesses = {}
    for n in range(2, nmax + 1):
        local = {g: {m: 0 for m in MASKS} for g in GEOMETRIES}
        n_forests = 0
        n_subsets = 0
        n_attachable = 0
        n_instances = 0
        for comps in forests_of_order(n, trees):
            n_forests += 1
            adj = build_adjacency(n, comps, trees)
            if not is_acyclic_dfs(adj):
                failures.append(f"n={n} {comps}: H itself has a cycle")
            comp_of, ncomp = bfs_components(adj)
            if ncomp != len(comps):
                failures.append(f"n={n} {comps}: BFS finds {ncomp} components, expected {len(comps)}")
            p = n
            vertices = list(range(n))
            attachable = []
            for bits in range(1, 1 << n):
                n_subsets += 1
                S = [x for x in vertices if (bits >> x) & 1]
                acyclic = is_acyclic_dfs(h_plus_p(adj, S, p))
                one_per = one_per_component(S, comp_of)
                if acyclic != one_per:
                    failures.append(f"n={n} {comps} S={S}: H+p acyclic={acyclic} but one-per-component={one_per}")
                if acyclic:
                    attachable.append(S)
            expected = 1
            for k, _ in comps:
                expected *= 1 + k
            expected -= 1
            if len(attachable) != expected:
                failures.append(f"n={n} {comps}: {len(attachable)} attachable S, closed form says {expected}")
            n_attachable += len(attachable)

            pairs = [(u, v, "adjacent" if v in adj[u] else "nonadjacent")
                     for u in vertices for v in vertices if u != v]
            for S in attachable:
                adjp = h_plus_p(adj, S, p)
                N_p = adjp[p]
                K_vertices = set(vertices) - N_p          # K = H - N(p)
                if K_vertices != set(vertices) - set(S):
                    failures.append(f"n={n} {comps} S={S}: V(K) != V(H) - S")
                for u, v, geometry in pairs:
                    mask = "k" + ("1" if u in K_vertices else "0") + ("1" if v in K_vertices else "0")
                    local[geometry][mask] += 1
                    n_instances += 1
                    cell = f"{geometry}:{mask}"
                    if min_order[cell] is None:
                        min_order[cell] = n
                        witnesses[cell] = {
                            "n": n, "components": [list(c) for c in comps],
                            "H_edges": sorted([a, b] for a in adj for b in adj[a] if a < b),
                            "u": u, "v": v, "S": list(S), "K_vertices": sorted(K_vertices),
                        }
        if n_forests != A005195[n]:
            failures.append(f"n={n}: {n_forests} forests built, OEIS A005195 says {A005195[n]}")
        if local["adjacent"]["k00"] != 0:
            failures.append(f"n={n}: adjacent-k00 = {local['adjacent']['k00']} != 0")
        counts[str(n)] = local
        per_n[str(n)] = {
            "forests": n_forests,
            "all_nonempty_subsets_(H,S)_tested": n_subsets,
            "attachable_(H,S)_pairs": n_attachable,
            "instances_(H,u,v,S)_ordered_pairs": n_instances,
        }
        print(f"n={n}: forests={n_forests} subsets_tested={n_subsets} attachable={n_attachable} "
              f"instances={n_instances}")
        print("   " + "  ".join(f"{g}:{m}={local[g][m]}" for g in GEOMETRIES for m in MASKS))
    return counts, per_n, min_order, witnesses


# ---------------------------------------------------------------------------
# Re-verification of the producer's witnesses
# ---------------------------------------------------------------------------


def level_sequence_graph(seq):
    """Graph of a level sequence: parent of i = nearest j < i with seq[j] == seq[i] - 1."""
    G = nx.Graph()
    G.add_nodes_from(range(len(seq)))
    for i in range(1, len(seq)):
        j = i - 1
        while seq[j] != seq[i] - 1:
            j -= 1
        G.add_edge(j, i)
    return G


def verify_witness(cell, w, failures: list):
    n = w["n"]
    geometry, mask = cell.split(":")
    adj = {x: set() for x in range(n)}
    for a, b in w["H_edges"]:
        adj[a].add(b)
        adj[b].add(a)
    if not is_acyclic_dfs(adj):
        failures.append(f"witness {cell}: H has a cycle")
    comp_of, ncomp = bfs_components(adj)
    recorded_sizes = sorted((k for k, _ in w["components"]), reverse=True)
    found_sizes = sorted((list(comp_of.values()).count(c) for c in range(ncomp)), reverse=True)
    if ncomp != len(w["components"]) or recorded_sizes != found_sizes:
        failures.append(f"witness {cell}: component structure does not match H_edges")
    u, v, S = w["u"], w["v"], list(w["S"])
    if u == v or not (0 <= u < n and 0 <= v < n):
        failures.append(f"witness {cell}: marks invalid")
    if not S or not one_per_component(S, comp_of):
        failures.append(f"witness {cell}: S empty or not one-per-component")
    adjp = h_plus_p(adj, S, n)
    if not is_acyclic_dfs(adjp):
        failures.append(f"witness {cell}: H+p has a cycle")
    K_vertices = set(range(n)) - adjp[n]
    if sorted(K_vertices) != sorted(w["K_vertices"]):
        failures.append(f"witness {cell}: K_vertices mismatch")
    got_geometry = "adjacent" if v in adj[u] else "nonadjacent"
    got_mask = "k" + ("1" if u in K_vertices else "0") + ("1" if v in K_vertices else "0")
    if (got_geometry, got_mask) != (geometry, mask) or w["geometry"] != geometry or w["mask"] != mask:
        failures.append(f"witness {cell}: recomputed cell is {got_geometry}:{got_mask}")
    hp_edges = sorted(sorted(e) for e in w["H_plus_p_edges"])
    hp_recomputed = sorted(sorted([a, b]) for a in adjp for b in adjp[a] if a < b)
    if hp_edges != hp_recomputed:
        failures.append(f"witness {cell}: H_plus_p_edges mismatch")
    K_edges = sorted(sorted(e) for e in w["K_edges"])
    K_recomputed = sorted(sorted([a, b]) for a in K_vertices for b in adj[a] if b in K_vertices and a < b)
    if K_edges != K_recomputed:
        failures.append(f"witness {cell}: K_edges mismatch")
    # the recorded level sequences must describe a forest isomorphic to H_edges
    G_seq = nx.disjoint_union_all([level_sequence_graph(s) for s in w["component_level_sequences"]])
    G_edges = nx.Graph()
    G_edges.add_nodes_from(range(n))
    G_edges.add_edges_from(tuple(e) for e in w["H_edges"])
    if not nx.is_isomorphic(G_seq, G_edges):
        failures.append(f"witness {cell}: level sequences not isomorphic to H_edges")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    t0 = time.perf_counter()
    failures: list[str] = []
    if not os.path.exists(PRODUCER_JSON):
        print(f"missing {PRODUCER_JSON}")
        print(MARKER_FAIL)
        return 1
    with open(PRODUCER_JSON, encoding="utf-8") as fh:
        prod = json.load(fh)
    nmax = int(prod["nmax"])
    if nmax > 12:
        failures.append(f"producer nmax={nmax} exceeds the OEIS tables typed into this audit")
        nmax = 12

    # freshness of the producer JSON with respect to the current files
    recorded = prod.get("sha256", {})
    current = {
        "scope_lemma_adjacent_k00_producer.py": sha256_file(PRODUCER_SCRIPT),
        "forest_indep.py": sha256_file(CORE_LIB),
    }
    for name, digest in current.items():
        if recorded.get(name) != digest:
            failures.append(f"producer JSON records sha256({name})={recorded.get(name)} but current file has {digest}")
    if prod.get("status") != "PASS":
        failures.append(f"producer JSON status is {prod.get('status')!r}")

    trees = tree_edge_lists(nmax, failures)
    counts, per_n, min_order, witnesses = census(nmax, trees, failures)

    # exact comparison with the producer
    comparison = {}
    for n in range(2, nmax + 1):
        pc = prod["counts_ordered_pairs"].get(str(n))
        same = pc == counts[str(n)]
        comparison[str(n)] = "identical" if same else "DIFFERENT"
        if not same:
            failures.append(f"n={n}: producer counts {pc} != audit counts {counts[str(n)]}")
        pn = prod["per_n"].get(str(n), {})
        if pn.get("forests") != per_n[str(n)]["forests"]:
            failures.append(f"n={n}: producer forests {pn.get('forests')} != audit {per_n[str(n)]['forests']}")
        if pn.get("instances_(H,u,v,S)_ordered_pairs") != per_n[str(n)]["instances_(H,u,v,S)_ordered_pairs"]:
            failures.append(f"n={n}: producer instance total differs from audit")
        if pn.get("attachable_(H,S)_pairs_verified_acyclic_by_unionfind") != per_n[str(n)]["attachable_(H,S)_pairs"]:
            failures.append(f"n={n}: producer attachable (H,S) total differs from audit")
        der = prod["counts_unordered_pairs_derived"]
        for g in GEOMETRIES:
            c = counts[str(n)][g]
            exp = {"both_marks_deleted": c["k00"] // 2, "exactly_one_mark_deleted": c["k01"],
                   "no_mark_deleted": c["k11"] // 2}
            if c["k00"] % 2 or c["k11"] % 2 or c["k01"] != c["k10"] or der[g][str(n)] != exp:
                failures.append(f"n={n} {g}: derived unordered counts inconsistent")
    if prod["min_order"] != min_order:
        failures.append(f"min_order: producer {prod['min_order']} != audit {min_order}")
    if min_order["adjacent:k00"] is not None:
        failures.append("audit realized adjacent:k00")
    for cell in min_order:
        if cell != "adjacent:k00" and min_order[cell] is None:
            failures.append(f"audit never realized {cell}")
    if prod.get("adjacent_k00_total") != 0:
        failures.append("producer adjacent_k00_total != 0")

    prod_witnesses = prod.get("witnesses_first_in_enumeration_order", {})
    expected_cells = {c for c in min_order if c != "adjacent:k00"}
    if set(prod_witnesses) != expected_cells:
        failures.append(f"producer witnesses cover {sorted(prod_witnesses)}, expected {sorted(expected_cells)}")
    for cell, w in prod_witnesses.items():
        if w["n"] != min_order.get(cell):
            failures.append(f"witness {cell}: order {w['n']} != audit minimal order {min_order.get(cell)}")
        verify_witness(cell, w, failures)

    elapsed = time.perf_counter() - t0
    status = "PASS" if not failures else "FAIL"
    out = {
        "title": "Independent audit of the adjacent-k00 scope lemma census",
        "script": os.path.basename(__file__),
        "sha256": {
            os.path.basename(__file__): sha256_file(os.path.abspath(__file__)),
            "scope_lemma_adjacent_k00_producer.py": current["scope_lemma_adjacent_k00_producer.py"],
            "scope_lemma_adjacent_k00_producer.json": sha256_file(PRODUCER_JSON),
            "forest_indep.py (reference only, not imported)": current["forest_indep.py"],
        },
        "networkx_version": nx.__version__,
        "nmax": nmax,
        "methods": {
            "trees": "networkx.nonisomorphic_trees; counts vs OEIS A000055; pairwise networkx.is_isomorphic",
            "forests": "integer partitions x combinations_with_replacement of tree indices; counts vs OEIS A005195",
            "acyclicity": "iterative DFS back-edge detection on an explicit adjacency dict of H + p",
            "attachability_equivalence": "all 2^n - 1 nonempty S: DFS-acyclic(H+p) == (<= 1 vertex of S per BFS component)",
            "mask": "K = H - N(p) from the adjacency of H + p; bits = [u in V(K)], [v in V(K)]",
            "pairs": "ordered pairs (u, v) of distinct vertices",
        },
        "forest_counts": {str(n): per_n[str(n)]["forests"] for n in range(2, nmax + 1)},
        "oeis_A005195_expected": {str(n): A005195[n] for n in range(1, nmax + 1)},
        "counts_ordered_pairs_recomputed": counts,
        "per_n": per_n,
        "min_order_recomputed": min_order,
        "audit_first_witnesses": witnesses,
        "comparison_with_producer": comparison,
        "producer_witnesses_reverified": sorted(prod_witnesses),
        "failures": failures,
        "status": status,
    }
    os.makedirs(os.path.dirname(AUDIT_JSON), exist_ok=True)
    with open(AUDIT_JSON, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, sort_keys=True)
        fh.write("\n")
    print(f"wrote {AUDIT_JSON}")
    print("comparison:", json.dumps(comparison, sort_keys=True))
    print("min_order:", json.dumps(min_order, sort_keys=True))
    print(f"elapsed {elapsed:.2f} s")
    if failures:
        for f in failures[:50]:
            print("FAILURE:", f)
        print(MARKER_FAIL)
        return 1
    print(MARKER_PASS)
    return 0


if __name__ == "__main__":
    sys.exit(main())
