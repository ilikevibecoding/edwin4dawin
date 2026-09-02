#!/usr/bin/env python3
"""Exact leaf recurrence for the component/branching-surplus margin.

This proves an algebraic reduction and performs a bounded diagnostic.  It does
not prove the remaining local leaf increment inequality at all orders.
"""

from __future__ import annotations

import argparse
import itertools
import math

import networkx as nx
import sympy as sp

from probe_rank5_component_surplus_floor_root import statistics


def independent_count(graph: nx.Graph, rank: int) -> int:
    return sum(
        not any(graph.has_edge(u, v) for u, v in itertools.combinations(chosen, 2))
        for chosen in itertools.combinations(tuple(graph), rank)
    )


def surplus(tree: nx.Graph) -> int:
    return sum(math.comb(tree.degree(v) - 1, 2) for v in tree)


def margin(tree: nx.Graph) -> int:
    n = len(tree)
    sum_a, sum_c = statistics(tree, 4)
    return math.comb(n - 2, 2) * sum_c - surplus(tree) * sum_a


def symbolic_identity() -> None:
    n, c4, c3b, j4, a4, b4, e, r = sp.symbols(
        "n c4 c3b j4 a4 b4 e r"
    )
    old = sp.binomial(n - 2, 2) * c4 - e * a4
    new = sp.binomial(n - 1, 2) * (c4 + c3b + j4) - (e + r) * (a4 + 5 * b4)
    increment = sp.expand_func(sp.expand(new - old))
    expected = (
        (n - 2) * c4
        + sp.binomial(n - 1, 2) * (c3b + j4)
        - r * a4
        - 5 * (e + r) * b4
    )
    assert sp.simplify(sp.expand_func(increment - expected)) == 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=12)
    args = parser.parse_args()
    symbolic_identity()
    checked = 0
    minimum = None
    minimum_witness = None
    subminimum = [None, None]
    subwitness = [None, None]
    for order in range(9, args.max_order + 1):
        local = None
        for index, child in enumerate(nx.nonisomorphic_trees(order)):
            child_c4 = statistics(child, 4)[1]
            child_margin = margin(child)
            for leaf in (v for v in child if child.degree(v) == 1):
                support = next(child.neighbors(leaf))
                base = child.copy()
                base.remove_node(leaf)
                base_c4 = statistics(base, 4)[1]
                deleted = base.copy()
                deleted.remove_node(support)
                deleted_c3 = statistics(deleted, 3)[1]
                b4 = independent_count(deleted, 4)
                closed = {support, *base.neighbors(support)}
                far = base.subgraph(set(base) - closed).copy()
                c4 = independent_count(far, 4)
                j4 = b4 - c4
                assert child_c4 == base_c4 + deleted_c3 + j4

                n = len(base)
                a4 = 5 * independent_count(base, 5)
                e = surplus(base)
                r = base.degree(support) - 1
                predicted = (
                    (n - 2) * base_c4
                    + math.comb(n - 1, 2) * (deleted_c3 + j4)
                    - r * a4
                    - 5 * (e + r) * b4
                )
                actual = child_margin - margin(base)
                assert predicted == actual
                subvalues = (
                    (n - 2) * base_c4 - r * a4,
                    math.comb(n - 1, 2) * (deleted_c3 + j4)
                    - 5 * (e + r) * b4,
                )
                row = (
                    actual,
                    order,
                    index,
                    leaf,
                    support,
                    nx.to_graph6_bytes(child, header=False).decode().strip(),
                )
                if local is None or row < local:
                    local = row
                if minimum is None or row < minimum:
                    minimum = row
                    minimum_witness = row
                for lane, value in enumerate(subvalues):
                    subrow = (
                        value,
                        order,
                        index,
                        leaf,
                        support,
                        nx.to_graph6_bytes(child, header=False).decode().strip(),
                    )
                    if subminimum[lane] is None or subrow < subminimum[lane]:
                        subminimum[lane] = subrow
                        subwitness[lane] = subrow
                checked += 1
        print(f"PASS order={order} minimum_increment={local}", flush=True)
    print(
        "PASS_EXACT_COMPONENT_SURPLUS_LEAF_RECURRENCE "
        f"bounded_checks={checked:,} minimum={minimum_witness}"
    )
    print(f"SUBCLAIM_MINIMA {subwitness}")
    print(
        "PENDING_ALL_ORDER_LOCAL_INCREMENT: "
        "(n-2)C4(T)+C(n-1,2)(C3(T-p)+i4(T-p)-i4(T-N[p])) "
        ">=5(deg_T(p)-1)i5(T)+5(e(T)+deg_T(p)-1)i4(T-p)."
    )


if __name__ == "__main__":
    main()
