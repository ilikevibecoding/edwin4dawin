#!/usr/bin/env python3
"""Diagnostic: test whether the forest-base terminal anchor follows via q2."""

from itertools import combinations
import networkx as nx


def count_i_s(g, r):
    i = 0
    s = 0
    nodes = list(g)
    for subset in combinations(nodes, r):
        if g.subgraph(subset).number_of_edges() == 0:
            i += 1
    for subset in combinations(nodes, r + 1):
        if g.subgraph(subset).number_of_edges() == 1:
            s += 1
    return i, s


def terminal(g, w, t):
    out = nx.convert_node_labels_to_integers(g)
    w = list(g).index(w)
    v = len(out)
    out.add_edge(w, v)
    for leaf in range(v + 1, v + 1 + t):
        out.add_edge(v, leaf)
    q = nx.disjoint_union(nx.convert_node_labels_to_integers(g), nx.empty_graph(t))
    return out, q


def main():
    forests = [g for g in nx.graph_atlas_g() if len(g) and nx.is_forest(g)]
    first_q2_fail = None
    first_anchor_fail = None
    minimum_q2_gap = None
    minimum_anchor_gap = None
    cells = 0
    q2_negative = []
    for g in forests:
        for w in g:
            f = g.copy()
            f.remove_node(w)
            h = g.copy()
            h.remove_nodes_from([w, *list(g.neighbors(w))])
            f2, z2 = count_i_s(f, 2)
            h2, _ = count_i_s(h, 2)
            for t in range(1, 5):
                tt, q = terminal(g, w, t)
                qi2, qs2 = count_i_s(q, 2)
                qi3, qs3 = count_i_s(q, 3)
                ti3, ts3 = count_i_s(tt, 3)
                included_c = z2 + h2 + t * f2
                # included ratio c1/(3f2) >= q2(Q)=s2/(2i2)
                q2_gap = 2 * qi2 * included_c - 3 * f2 * qs2
                anchor_gap = ts3 * qi3 - qs3 * ti3
                item = (len(g), nx.to_graph6_bytes(g, header=False).decode().strip(), w, t,
                        q2_gap, anchor_gap, f2, included_c, qi2, qs2, qi3, qs3)
                cells += 1
                if minimum_q2_gap is None or q2_gap < minimum_q2_gap[0]:
                    minimum_q2_gap = (q2_gap, item)
                if minimum_anchor_gap is None or anchor_gap < minimum_anchor_gap[0]:
                    minimum_anchor_gap = (anchor_gap, item)
                if q2_gap < 0 and first_q2_fail is None:
                    first_q2_fail = item
                if q2_gap < 0:
                    q2_negative.append(item)
                if anchor_gap < 0 and first_anchor_fail is None:
                    first_anchor_fail = item
    print("forests", len(forests), "cells", cells)
    print("minimum_q2_gap", minimum_q2_gap)
    print("first_q2_fail", first_q2_fail)
    print("q2_negative_count", len(q2_negative))
    print("q2_negative", q2_negative[:50])
    print("minimum_anchor_gap", minimum_anchor_gap)
    print("first_anchor_fail", first_anchor_fail)


if __name__ == "__main__":
    main()
