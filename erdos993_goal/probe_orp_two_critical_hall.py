"""Exact bounded probe of the two-critical-root connected Hall strengthening.

For each non-core vertex p of a tree T at the ORP boundary, rank critical
neighbor branches by their rank-r one-root contribution.  Retain only the two
largest critical roots, together with the unmarked rank-r sets of H, and test
whether connected symmetric-difference edges match I_{r-1}(H).

This is bounded evidence, not an all-order theorem.
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

import networkx as nx

from probe_random_boundary_one_root_payment import forest_poly


def isets(g: nx.Graph, nodes: set[int], k: int):
    return [frozenset(c) for c in itertools.combinations(sorted(nodes), k)
            if all(not (u in c and v in c) for u, v in g.edges())]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-order", type=int, default=12)
    ap.add_argument("--output", type=Path, default=Path("orp_two_critical_hall_n12.json"))
    args = ap.parse_args()
    totals = {"trees": 0, "noncore": 0, "exceptional_mod_noncore": 0, "negative": 0,
              "two_critical_count_failures": 0,
              "one_critical_payment_failures": 0,
              "two_critical_payment_failures": 0,
              "two_critical_hall_failures": 0}
    first = None
    first_one_critical_nogo = None
    tight = None
    for n in range(3, args.max_order + 1):
        for ti, g0 in enumerate(nx.nonisomorphic_trees(n)):
            g = nx.convert_node_labels_to_integers(g0, ordering="sorted")
            totals["trees"] += 1
            allv = set(g)
            gp = forest_poly(g, allv)
            alpha = len(gp) - 1
            for p in g:
                fn = allv - {p}
                fp = forest_poly(g, fn)
                if len(fp) - 1 != alpha:
                    continue
                totals["noncore"] += 1
                if alpha % 3 not in (1, 2):
                    continue
                totals["exceptional_mod_noncore"] += 1
                hn = allv - ({p} | set(g.neighbors(p)))
                hp = forest_poly(g, hn)
                r = 2 * alpha // 3
                hm = hp[r-1] if r-1 < len(hp) else 0
                hr = hp[r] if r < len(hp) else 0
                if hm <= 3 * hr:
                    continue
                totals["negative"] += 1
                roots = sorted(g.neighbors(p))
                critical = []
                contributions = []
                for s in roots:
                    comp = nx.node_connected_component(g.subgraph(fn), s)
                    Cn = set(comp) - {s}
                    Dn = set(comp) - ({s} | set(g.neighbors(s)))
                    C = forest_poly(g, Cn)
                    D = forest_poly(g, Dn)
                    if len(C) != len(D):
                        continue
                    critical.append(s)
                    allowed = hn - set(g.neighbors(s))
                    row = forest_poly(g, allowed)
                    val = row[r-1] if r-1 < len(row) else 0
                    contributions.append((val, s))
                need = 3 if alpha % 3 == 1 else 2
                if len(critical) < need:
                    totals["two_critical_count_failures"] += 1
                chosen = {s for _, s in sorted(contributions, reverse=True)[:2]}
                one_pay = hr + sum(v for v, _ in sorted(contributions, reverse=True)[:1])
                if one_pay < hm:
                    totals["one_critical_payment_failures"] += 1
                    if first_one_critical_nogo is None:
                        first_one_critical_nogo = {
                            "n": n, "tree_index": ti, "p": p, "alpha": alpha,
                            "r": r, "h_prev": hm, "h_r": hr,
                            "critical_contributions": sorted(contributions, reverse=True),
                            "one_critical_margin": one_pay - hm,
                            "edges": sorted(tuple(sorted(e)) for e in g.edges()),
                        }
                pay = hr + sum(v for v, _ in sorted(contributions, reverse=True)[:2])
                if pay < hm:
                    totals["two_critical_payment_failures"] += 1
                L = isets(g, hn, r-1)
                R0 = isets(g, hn, r)
                R1 = []
                for s in chosen:
                    allowed = hn - set(g.neighbors(s))
                    R1.extend(A | {s} for A in isets(g, allowed, r-1))
                R = R0 + R1
                bg = nx.Graph()
                ls = [("L", i) for i in range(len(L))]
                rs = [("R", i) for i in range(len(R))]
                bg.add_nodes_from(ls, bipartite=0); bg.add_nodes_from(rs, bipartite=1)
                for i, A in enumerate(L):
                    for j, B in enumerate(R):
                        diff = A ^ B
                        if diff and nx.is_connected(g.subgraph(diff)):
                            bg.add_edge(ls[i], rs[j])
                mat = nx.algorithms.bipartite.maximum_matching(bg, top_nodes=ls)
                got = sum(x in mat for x in ls)
                item = {"n": n, "tree_index": ti, "p": p, "alpha": alpha,
                        "r": r, "h_prev": hm, "h_r": hr,
                        "critical": critical, "chosen": sorted(chosen),
                        "contributions": sorted(contributions, reverse=True),
                        "domain": len(L), "codomain": len(R), "matching": got,
                        "defect": len(L)-got,
                        "edges": sorted(tuple(sorted(e)) for e in g.edges())}
                if tight is None or item["codomain"]-item["domain"] < tight["codomain"]-tight["domain"]:
                    tight = item
                if got < len(L):
                    totals["two_critical_hall_failures"] += 1
                    if first is None: first = item
    status = "PASS_BOUNDED_TWO_CRITICAL_HALL_NOT_PROOF" if not first else "FAIL_TWO_CRITICAL_HALL"
    report = {"status": status, "max_order": args.max_order,
              "totals": totals, "tightest": tight,
              "first_one_critical_nogo": first_one_critical_nogo,
              "first_failure": first}
    args.output.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
