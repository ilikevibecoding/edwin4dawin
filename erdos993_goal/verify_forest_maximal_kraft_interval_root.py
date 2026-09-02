#!/usr/bin/env python3
"""Exact replay for the forest maximal-set Kraft bound and interval DP.

The all-order proof is the leaf recursion recorded in the accompanying note.
This verifier independently enumerates every atlas forest, reconstructs its
Boolean-interval partition, matches interval tops to literal maximal
independent sets by size, and checks the Kraft bound exactly.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx


def canonical(G: nx.Graph) -> nx.Graph:
    return nx.convert_node_labels_to_integers(G, ordering="sorted")


def interval_terms(G: nx.Graph) -> Counter[tuple[int, int]]:
    """Return multiplicities of x^a(1+x)^b in the recursive partition."""
    G = canonical(G)
    if G.number_of_nodes() == 0:
        return Counter({(0, 0): 1})
    isolates = [v for v in G if G.degree(v) == 0]
    if isolates:
        H = G.copy()
        H.remove_node(isolates[0])
        return Counter({(a, b + 1): mult for (a, b), mult in interval_terms(H).items()})

    leaf = next(v for v in G if G.degree(v) == 1)
    support = next(iter(G.neighbors(leaf)))
    first = G.copy()
    first.remove_nodes_from([leaf, support])
    second = G.copy()
    second.remove_nodes_from([support, *list(G.neighbors(support))])
    out: Counter[tuple[int, int]] = Counter()
    for (a, b), mult in interval_terms(first).items():
        out[(a, b + 1)] += mult
    for (a, b), mult in interval_terms(second).items():
        out[(a + 1, b)] += mult
    return out


def literal_rows(G: nx.Graph) -> tuple[list[int], Counter[int]]:
    G = canonical(G)
    n = G.number_of_nodes()
    edges = [(1 << u) | (1 << v) for u, v in G.edges()]
    p = [0] * (n + 1)
    maximal: Counter[int] = Counter()
    full = (1 << n) - 1
    for mask in range(1 << n):
        if any(mask & edge == edge for edge in edges):
            continue
        p[mask.bit_count()] += 1
        outside = full ^ mask
        is_maximal = True
        while outside:
            bit = outside & -outside
            v = bit.bit_length() - 1
            if all(not (mask & (1 << u)) for u in G.neighbors(v)):
                is_maximal = False
                break
            outside ^= bit
        if is_maximal:
            maximal[mask.bit_count()] += 1
    while p and p[-1] == 0:
        p.pop()
    return p, maximal


def main() -> None:
    graphs = 0
    interval_terms_total = 0
    max_kraft = Fraction(0)
    equality_graphs = 0
    value_stream = hashlib.sha256()
    for G0 in nx.graph_atlas_g():
        if G0.number_of_nodes() and not nx.is_forest(G0):
            continue
        G = canonical(G0)
        terms = interval_terms(G)
        p, maximal = literal_rows(G)
        reconstructed = [0] * max(1, len(p))
        top_counts: Counter[int] = Counter()
        for (a, b), mult in terms.items():
            top_counts[a + b] += mult
            for j in range(b + 1):
                if a + j >= len(reconstructed):
                    reconstructed.extend([0] * (a + j - len(reconstructed) + 1))
                reconstructed[a + j] += mult * comb(b, j)
        while reconstructed and reconstructed[-1] == 0:
            reconstructed.pop()
        assert reconstructed == p
        assert top_counts == maximal
        kraft = sum(Fraction(mult, 1 << (a + b)) for (a, b), mult in terms.items())
        assert kraft <= 1
        if kraft > max_kraft:
            max_kraft = kraft
        equality_graphs += kraft == 1
        graphs += 1
        interval_terms_total += sum(terms.values())
        value_stream.update(
            f"{G.number_of_nodes()}|{sorted(G.edges())}|{sorted(terms.items())}|{kraft}\n".encode()
        )

    report = {
        "marker": "PASS_EXACT_FOREST_MAXIMAL_KRAFT_AND_BOOLEAN_INTERVAL_PARTITION",
        "all_order_theorem": "sum_s m_s(F)/2^s <= 1 for every finite forest",
        "interval_identity": "I(F;x)=sum_M x^a(M)(1+x)^b(M), a(M)+b(M)=|M|",
        "atlas_forests_replayed_including_empty": graphs,
        "interval_terms_replayed": interval_terms_total,
        "maximum_kraft_value": [max_kraft.numerator, max_kraft.denominator],
        "atlas_equality_graphs": equality_graphs,
        "value_stream_sha256": value_stream.hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    Path("forest_maximal_kraft_interval_exact_root_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
