"""Probe a connected-exchange injection for the hard half of Boundary-SM3.

In an exceptional pendant setup let F=G-{leaf,p}, H=G-N[p],
r=floor(2 alpha(F)/3).  When D_r(H)=3h_r-h_(r-1)<0, the empirically
surviving first half is h_(r-1) <= f_r.  This script asks for the stronger
certificate: a matching from I_(r-1)(H) into I_r(F) using only pairs whose
symmetric difference induces a connected subgraph of F.

Bounded exact evidence only.
"""

from __future__ import annotations

import argparse
import itertools
import json
from collections import Counter, deque
from pathlib import Path

import networkx as nx


def independence_poly(g: nx.Graph) -> list[int]:
    nodes = list(g.nodes())
    out = [0] * (len(nodes) + 1)
    for mask in range(1 << len(nodes)):
        ok = True
        for i, j in g.edges():
            # Relabel lookup is handled by caller.
            if (mask >> i) & 1 and (mask >> j) & 1:
                ok = False
                break
        if ok:
            out[mask.bit_count()] += 1
    while out and out[-1] == 0:
        out.pop()
    return out


def relabel(g: nx.Graph) -> nx.Graph:
    return nx.convert_node_labels_to_integers(g, ordering="sorted")


def independent_sets(g: nx.Graph, r: int) -> list[frozenset[int]]:
    nodes = sorted(g.nodes())
    return [
        frozenset(c)
        for c in itertools.combinations(nodes, r)
        if all(not (u in c and v in c) for u, v in g.edges())
    ]


def connected_injection(f: nx.Graph, h_nodes: set[int], r: int):
    left = [s for s in independent_sets(f.subgraph(h_nodes), r - 1)]
    right = independent_sets(f, r)
    one_root_right = [t for t in right if len(t - h_nodes) <= 1]
    bg = nx.Graph()
    inc = nx.Graph()
    lnodes = [("L", i) for i in range(len(left))]
    rnodes = [("R", j) for j in range(len(right))]
    bg.add_nodes_from(lnodes, bipartite=0)
    bg.add_nodes_from(rnodes, bipartite=1)
    inc.add_nodes_from(lnodes, bipartite=0)
    inc.add_nodes_from(rnodes, bipartite=1)
    edge_count = 0
    for i, s in enumerate(left):
        for j, t in enumerate(right):
            diff = s ^ t
            if diff and nx.is_connected(f.subgraph(diff)):
                bg.add_edge(("L", i), ("R", j))
                edge_count += 1
            if s < t:
                inc.add_edge(("L", i), ("R", j))
    matching = nx.algorithms.bipartite.maximum_matching(bg, top_nodes=lnodes)
    size = sum(1 for u in lnodes if u in matching)
    inclusion = nx.algorithms.bipartite.maximum_matching(inc, top_nodes=lnodes)
    inclusion_size = sum(1 for u in lnodes if u in inclusion)
    one = nx.Graph()
    onodes = [("O", j) for j in range(len(one_root_right))]
    one.add_nodes_from(lnodes, bipartite=0)
    one.add_nodes_from(onodes, bipartite=1)
    for i, s in enumerate(left):
        for j, t in enumerate(one_root_right):
            diff = s ^ t
            if diff and nx.is_connected(f.subgraph(diff)):
                one.add_edge(("L", i), ("O", j))
    one_matching = nx.algorithms.bipartite.maximum_matching(one, top_nodes=lnodes)
    one_size = sum(1 for u in lnodes if u in one_matching)
    lex_min_images = []
    lex_max_images = []
    for i in range(len(left)):
        js = sorted(j for tag, j in one.neighbors(("L", i)) if tag == "O")
        if js:
            lex_min_images.append(one_root_right[js[0]])
            lex_max_images.append(one_root_right[js[-1]])
    return {
        "domain": len(left),
        "codomain": len(right),
        "exchange_edges": edge_count,
        "matching": size,
        "defect": len(left) - size,
        "inclusion_matching": inclusion_size,
        "inclusion_defect": len(left) - inclusion_size,
        "one_root_codomain": len(one_root_right),
        "one_root_matching": one_size,
        "one_root_defect": len(left) - one_size,
        "lex_min_injective": len(lex_min_images) == len(left) and len(set(lex_min_images)) == len(left),
        "lex_max_injective": len(lex_max_images) == len(left) and len(set(lex_max_images)) == len(left),
    }


def minimum_marked_maximum_set(f: nx.Graph, marked: set[int], beta: int) -> frozenset[int]:
    candidates = independent_sets(f, beta)
    return min(candidates, key=lambda a: (len(a & marked), tuple(sorted(a))))


def lex_matching_avoiding_root(
    h: nx.Graph, j_side: frozenset[int], a_side: frozenset[int], root: int
) -> dict[int, int] | None:
    left = tuple(sorted(j_side, key=lambda v: (h.degree(v), v)))
    nbrs = {v: tuple(sorted((set(h.neighbors(v)) & set(a_side)) - {root})) for v in left}
    used: set[int] = set()
    match: dict[int, int] = {}

    def rec(i: int) -> bool:
        if i == len(left):
            return True
        v = left[i]
        for w in nbrs[v]:
            if w in used:
                continue
            used.add(w)
            match[v] = w
            if rec(i + 1):
                return True
            used.remove(w)
            del match[v]
        return False

    return match if rec(0) else None


def fixed_root_augmentation(
    f: nx.Graph, a: frozenset[int], j: frozenset[int], root: int
) -> frozenset[int] | None:
    sym = a ^ j
    h = f.subgraph(sym)
    j_side = frozenset(j - a)
    a_side = frozenset(a - j)
    matching = lex_matching_avoiding_root(h, j_side, a_side, root)
    if matching is None:
        return None
    closure_a = {root}
    closure_j: set[int] = set()
    queue = deque([root])
    while queue:
        av = queue.popleft()
        for jv in sorted(h.neighbors(av)):
            if jv not in j_side or jv in closure_j:
                continue
            closure_j.add(jv)
            mv = matching[jv]
            if mv not in closure_a:
                closure_a.add(mv)
                queue.append(mv)
    if len(closure_a) != len(closure_j) + 1:
        return None
    t = frozenset((j - closure_j) | closure_a)
    if len(t) != len(j) + 1 or any(u in t and v in t for u, v in f.edges()):
        return None
    return t


def fixed_root_map_certificate(f: nx.Graph, h_nodes: set[int], r: int, beta: int):
    marked = set(f) - h_nodes
    a = minimum_marked_maximum_set(f, marked, beta)
    roots = sorted(a & marked)
    if not roots:
        return {"defined": False, "reason": "maximum set misses marked vertices"}
    root = roots[0]
    fibres = Counter()
    undefined = 0
    for j in independent_sets(f.subgraph(h_nodes), r - 1):
        t = fixed_root_augmentation(f, a, j, root)
        if t is None:
            undefined += 1
        else:
            fibres[t] += 1
    return {
        "defined": undefined == 0,
        "undefined": undefined,
        "root": root,
        "marked_in_A": len(a & marked),
        "max_fibre": max(fibres.values()) if fibres else 0,
        "injective": undefined == 0 and all(v == 1 for v in fibres.values()),
    }


def all_root_degree_certificate(f: nx.Graph, h_nodes: set[int], r: int, beta: int):
    marked = set(f) - h_nodes
    a = minimum_marked_maximum_set(f, marked, beta)
    fibres = Counter()
    undefined = 0
    root_count_expected = beta - (r - 1)
    for j in independent_sets(f.subgraph(h_nodes), r - 1):
        sym = a ^ j
        hh = f.subgraph(sym)
        j_side = frozenset(j - a)
        a_side = frozenset(a - j)
        # No forced exposed root: take one deterministic saturating matching.
        matching = lex_matching_avoiding_root(hh, j_side, a_side, root=-1)
        if matching is None:
            undefined += 1
            continue
        roots = sorted(a_side - set(matching.values()))
        if len(roots) != root_count_expected:
            undefined += 1
            continue
        for root in roots:
            closure_a = {root}
            closure_j: set[int] = set()
            queue = deque([root])
            while queue:
                av = queue.popleft()
                for jv in sorted(hh.neighbors(av)):
                    if jv not in j_side or jv in closure_j:
                        continue
                    closure_j.add(jv)
                    mv = matching[jv]
                    if mv not in closure_a:
                        closure_a.add(mv)
                        queue.append(mv)
            t = frozenset((j - closure_j) | closure_a)
            if len(t) != r or any(u in t and v in t for u, v in f.edges()):
                undefined += 1
                continue
            fibres[t] += 1
    mx = max(fibres.values()) if fibres else 0
    return {
        "defined": undefined == 0,
        "undefined": undefined,
        "outdegree": root_count_expected,
        "max_indegree": mx,
        "degree_bound": undefined == 0 and mx <= root_count_expected,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-order", type=int, default=12)
    ap.add_argument("--all-exceptional", action="store_true")
    ap.add_argument("--output", type=Path, default=Path("boundary_sm3_connected_injection_probe.json"))
    args = ap.parse_args()
    totals = {
        "trees": 0,
        "pendant_setups": 0,
        "exceptional_setups": 0,
        "negative_h_setups": 0,
        "matching_failures": 0,
        "fixed_root_undefined": 0,
        "fixed_root_noninjective": 0,
        "all_root_degree_failures": 0,
        "inclusion_matching_failures": 0,
        "one_root_matching_failures": 0,
        "lex_min_failures": 0,
        "lex_max_failures": 0,
        "exchange_edges": 0,
    }
    first_failure = None
    first_fixed_root_nogo = None
    first_all_root_degree_nogo = None
    first_inclusion_nogo = None
    tightest = None
    for n in range(3, args.max_order + 1):
        for ti, g0 in enumerate(nx.generators.nonisomorphic_trees(n)):
            g = relabel(g0)
            totals["trees"] += 1
            for leaf in sorted(v for v in g if g.degree(v) == 1):
                totals["pendant_setups"] += 1
                p = next(iter(g.neighbors(leaf)))
                f_nodes = set(g) - {leaf, p}
                t_nodes = set(g) - {leaf}
                h_nodes = set(g) - ({p} | set(g.neighbors(p)))
                f = relabel(g.subgraph(f_nodes).copy())
                t = relabel(g.subgraph(t_nodes).copy())
                # Preserve the H subset inside the F relabeling.
                fmap = {old: new for new, old in enumerate(sorted(f_nodes))}
                h_in_f = {fmap[v] for v in h_nodes}
                fp = independence_poly(f)
                tp = independence_poly(t)
                beta = len(fp) - 1
                if len(tp) - 1 != beta or beta % 3 not in (1, 2):
                    continue
                totals["exceptional_setups"] += 1
                r = (2 * beta) // 3
                if r < 1:
                    continue
                hp = independence_poly(relabel(f.subgraph(h_in_f).copy()))
                hrm1 = hp[r - 1] if r - 1 < len(hp) else 0
                hr = hp[r] if r < len(hp) else 0
                if 3 * hr - hrm1 >= 0 and not args.all_exceptional:
                    continue
                if 3 * hr - hrm1 < 0:
                    totals["negative_h_setups"] += 1
                rec = connected_injection(f, h_in_f, r)
                fixed = fixed_root_map_certificate(f, h_in_f, r, beta)
                all_root = all_root_degree_certificate(f, h_in_f, r, beta)
                if not fixed.get("defined", False):
                    totals["fixed_root_undefined"] += 1
                elif not fixed.get("injective", False):
                    totals["fixed_root_noninjective"] += 1
                if not all_root.get("degree_bound", False):
                    totals["all_root_degree_failures"] += 1
                if rec["inclusion_defect"]:
                    totals["inclusion_matching_failures"] += 1
                if rec["one_root_defect"]:
                    totals["one_root_matching_failures"] += 1
                if not rec["lex_min_injective"]:
                    totals["lex_min_failures"] += 1
                if not rec["lex_max_injective"]:
                    totals["lex_max_failures"] += 1
                totals["exchange_edges"] += rec["exchange_edges"]
                item = {
                    "n": n,
                    "tree_index": ti,
                    "leaf": leaf,
                    "support": p,
                    "beta": beta,
                    "r": r,
                    "D_r_H": 3 * hr - hrm1,
                    "count_slack": rec["codomain"] - rec["domain"],
                    **rec,
                    "fixed_root": fixed,
                    "all_root": all_root,
                    "edges": sorted(tuple(sorted(e)) for e in g.edges()),
                }
                if tightest is None or item["count_slack"] < tightest["count_slack"]:
                    tightest = item
                if rec["defect"]:
                    totals["matching_failures"] += 1
                    if first_failure is None:
                        first_failure = item
                if fixed.get("defined", False) and not fixed.get("injective", False) and first_fixed_root_nogo is None:
                    first_fixed_root_nogo = item
                if not all_root.get("degree_bound", False) and first_all_root_degree_nogo is None:
                    first_all_root_degree_nogo = item
                if rec["inclusion_defect"] and first_inclusion_nogo is None:
                    first_inclusion_nogo = item
    matching_ok = (first_failure is None and totals["one_root_matching_failures"] == 0)
    report = {
        "status": "PASS_BOUNDED_ONE_ROOT_CONNECTED_INJECTION_NOT_PROOF" if matching_ok else "FAIL_CONNECTED_INJECTION",
        "max_order": args.max_order,
        "totals": totals,
        "tightest": tightest,
        "first_failure": first_failure,
        "first_fixed_root_nogo": first_fixed_root_nogo,
        "first_all_root_degree_nogo": first_all_root_degree_nogo,
        "first_inclusion_nogo": first_inclusion_nogo,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
