#!/usr/bin/env python3
"""Exact orbit diagnostic for three-edge forest cores in the G1 leaf delta."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import isolate_multiply
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_g1_nonadjacent import (
    replace_rows,
    structural,
)
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_two_edge_core_g1_nonadjacent import (
    expression_sha256,
    graph_row_rules,
)


ANONYMOUS = tuple("abcdef")
TOPOLOGIES = {
    "matching3": (6, ((0, 1), (2, 3), (4, 5))),
    "wedge_plus_edge": (5, ((0, 1), (1, 2), (3, 4))),
    "path4": (4, ((0, 1), (1, 2), (2, 3))),
    "star3": (4, ((0, 1), (0, 2), (0, 3))),
}
EXPECTED_AUTOMORPHISMS = {
    "matching3": 48,
    "wedge_plus_edge": 4,
    "path4": 2,
    "star3": 6,
}


def automorphisms(vertex_count, edges):
    edge_set = {frozenset(edge) for edge in edges}
    result = []
    for permutation in itertools.permutations(range(vertex_count)):
        transformed = {
            frozenset((permutation[left], permutation[right]))
            for left, right in edges
        }
        if transformed == edge_set:
            result.append(permutation)
    return tuple(result)


def canonical_assignment(edges, vertex_count, assignment, symmetries):
    candidates = []
    for symmetry in symmetries:
        moved = {symmetry[position]: label for position, label in assignment.items()}
        anonymous_positions = [
            position for position in range(vertex_count) if position not in moved
        ]
        labels = dict(moved)
        labels.update(dict(zip(anonymous_positions, ANONYMOUS)))
        for reflect in (False, True):
            reflected = dict(labels)
            if reflect:
                reflected = {
                    position: ("v" if label == "u" else "u" if label == "v" else label)
                    for position, label in labels.items()
                }
            candidates.append(tuple(sorted(
                tuple(sorted((reflected[left], reflected[right])))
                for left, right in edges
            )))
    return min(candidates)


def orbit_graphs(mode):
    distinguished = tuple("puv") if mode == "collision" else tuple("pquv")
    records = {}
    for topology, (vertex_count, edges) in TOPOLOGIES.items():
        symmetries = automorphisms(vertex_count, edges)
        assert len(symmetries) == EXPECTED_AUTOMORPHISMS[topology]
        for used_count in range(min(len(distinguished), vertex_count) + 1):
            for positions in itertools.combinations(range(vertex_count), used_count):
                for labels in itertools.permutations(distinguished, used_count):
                    assignment = dict(zip(positions, labels))
                    if any(
                        {assignment.get(left), assignment.get(right)} == {"u", "v"}
                        for left, right in edges
                    ):
                        continue
                    graph = canonical_assignment(
                        edges, vertex_count, assignment, symmetries
                    )
                    if graph in records:
                        assert records[graph] == topology
                    records[graph] = topology
    return tuple(sorted((graph, topology) for graph, topology in records.items()))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode", choices=("collision", "distinct", "all"), default="all"
    )
    args = parser.parse_args()

    n = sp.Symbol("n", integer=True, positive=True)
    t = sp.Symbol("t", integer=True, nonnegative=True)
    h = sp.Symbol("h", nonnegative=True)
    components = build_expressions()
    complete = sp.expand(
        components["g2"] + components["F"] + components["QHL"]
        + components["QHJ"] + components["QKJ"] + components["T"]
    )
    rrows, srows, xrows, yrows = (symbolic_rows(prefix) for prefix in "RSXY")
    collision = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(srows, t, 7), L=srows,
    )
    collision = sp.expand(collision.subs(
        structural(rrows, n) | structural(srows, n - 1)
    ))
    distinct = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(xrows, t, 7), L=yrows,
    )
    distinct = sp.expand(distinct.subs(
        structural(rrows, n) | structural(srows, n - 1)
        | structural(xrows, n - 1) | structural(yrows, n - 2)
    ))

    requested = ("collision", "distinct") if args.mode == "all" else (args.mode,)
    all_records = {}
    for mode, expression in (("collision", collision), ("distinct", distinct)):
        if mode not in requested:
            continue
        graph_records = orbit_graphs(mode)
        distinguished_count = 3 if mode == "collision" else 4
        print("ORBIT_COUNT", mode, len(graph_records))
        records = []
        for index, (graph, topology) in enumerate(graph_records):
            rules = graph_row_rules(rrows, n, set(), graph)
            rules |= graph_row_rules(
                srows, n - 1, {"p" if mode == "collision" else "q"}, graph
            )
            if mode == "distinct":
                rules |= graph_row_rules(xrows, n - 1, {"p"}, graph)
                rules |= graph_row_rules(yrows, n - 2, {"p", "q"}, graph)
            value = sp.expand(expression.xreplace(rules))
            anonymous_count = len({
                vertex for edge in graph for vertex in edge if vertex in ANONYMOUS
            })
            first = distinguished_count + anonymous_count
            shifted_expression = sp.expand(value.subs(n, first + h))
            polynomial = sp.Poly(shifted_expression, h, t)
            coefficients = polynomial.coeffs()
            negative_terms = [
                (powers, str(coefficient))
                for powers, coefficient in polynomial.terms() if coefficient < 0
            ]
            record = {
                "index": index,
                "topology": topology,
                "edges": [list(edge) for edge in graph],
                "first": first,
                "terms": len(polynomial.terms()),
                "negative": len(negative_terms),
                "minimum": str(min(coefficients)),
                "raw_sha256": expression_sha256(value),
                "shifted_sha256": expression_sha256(shifted_expression),
            }
            if negative_terms:
                record["negative_terms"] = negative_terms
            records.append(record)
            print(json.dumps({"mode": mode, **record}, sort_keys=True))
        all_records[mode] = records
        print("MODE_SUMMARY", mode, json.dumps({
            "orbits": len(records),
            "passing": sum(record["negative"] == 0 for record in records),
            "failing": sum(record["negative"] != 0 for record in records),
            "topologies": {
                topology: sum(record["topology"] == topology for record in records)
                for topology in TOPOLOGIES
            },
        }, sort_keys=True))
    print("ORDERED_RECORD_SHA256", hashlib.sha256(json.dumps(
        all_records, separators=(",", ":"), sort_keys=True
    ).encode()).hexdigest().upper())
    print("EXPLORATORY_ONLY_NO_SIGN_CLAIM")


if __name__ == "__main__":
    main()
