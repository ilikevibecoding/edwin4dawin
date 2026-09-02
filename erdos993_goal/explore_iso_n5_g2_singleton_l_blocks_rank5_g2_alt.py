#!/usr/bin/env python3
"""Exact exploratory decomposition of the mixed singleton increment L(D,E)."""

import argparse
import itertools

import networkx as nx
import sympy as sp

from derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt import raw_g2
from derive_iso_n5_g2_singleton_ordinary_delta_partition_rank5_g2_alt import (
    add, occupation_rows, scale, shift,
)


def independence_row(graph):
    vertices = list(graph)
    counts = [0] * 7
    for size in range(min(6, len(vertices)) + 1):
        for subset in itertools.combinations(vertices, size):
            if graph.subgraph(subset).number_of_edges() == 0:
                counts[size] += 1
    return tuple(counts)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe", action="store_true")
    args = parser.parse_args()
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")
    erows = tuple(tuple(sp.symbols(f"e{name}0:7")) for name in "EUVW")
    t = sp.symbols("t")
    crows = tuple(add(drow, scale(shift(erow), t)) for drow, erow in zip(drows, erows))
    base = sp.expand(raw_g2(drows, drows))
    linear = sp.expand(sp.Poly(sp.expand(raw_g2(crows, drows) - base), t).coeff_monomial(t))

    da = tuple(sp.symbols("a0:7")); db = tuple(sp.symbols("b0:7"))
    dc = tuple(sp.symbols("c0:7")); dk = tuple(sp.symbols("d0:7"))
    ha = tuple(sp.symbols("A0:7")); hb = tuple(sp.symbols("B0:7"))
    hc = tuple(sp.symbols("C0:7")); hk = tuple(sp.symbols("D0:7"))
    eps_d, eps_h = sp.symbols("eps_d eps_h")
    d_occ = occupation_rows(da, db, dc, dk, eps_d)
    h_occ = occupation_rows(ha, hb, hc, hk, eps_h)
    rules = {s: value for generic, actual in zip(drows + erows, d_occ + h_occ)
             for s, value in zip(generic, actual)}
    occupied = sp.expand(linear.subs(rules))
    groups = {name: row for name, row in zip("abcdABCD", (da, db, dc, dk, ha, hb, hc, hk))}
    unique_blocks = {}
    for left in "abcd":
        for right in "ABCD":
            symbols = set(groups[left]) | set(groups[right]) | {eps_d, eps_h}
            block = sp.expand(occupied.subs({s: 0 for name, row in groups.items()
                                             if name not in (left, right) for s in row}))
            if block:
                print(f"\n[{left}{right}] terms={len(sp.Poly(block, *sorted(block.free_symbols, key=str)).terms())}")
                print(block)
                unique_blocks[left + right] = block
    print("\nTOTAL", len(sp.Poly(occupied, *sorted(occupied.free_symbols, key=str)).terms()))

    if args.probe:
        forests = []
        for graph in nx.graph_atlas_g():
            if len(graph) == 0 or nx.is_forest(graph):
                forests.append((len(graph), nx.to_graph6_bytes(graph, header=False).decode().strip(), independence_row(graph)))
        representatives = {"K0": unique_blocks["aA"], "K1": unique_blocks["aB"], "K2": unique_blocks["bC"]}
        pairs = ((da, ha), (da, hb), (db, hc))
        for (name, block), (leftrow, rightrow) in zip(representatives.items(), pairs):
            minimum = None
            witness = None
            for nl, gl, rl in forests:
                for nr, gr, rr in forests:
                    rules = dict(zip(leftrow, rl)) | dict(zip(rightrow, rr))
                    value = int(block.subs(rules))
                    if minimum is None or value < minimum:
                        minimum = value
                        witness = (nl, gl, nr, gr, value)
            print("PROBE", name, "minimum", minimum, "witness", witness, "pairs", len(forests) ** 2)


if __name__ == "__main__":
    main()
