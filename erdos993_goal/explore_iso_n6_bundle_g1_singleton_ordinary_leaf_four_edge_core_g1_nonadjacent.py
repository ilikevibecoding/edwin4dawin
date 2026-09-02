#!/usr/bin/env python3
"""Exact topology-sharded diagnostic for four-edge forest cores."""

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


ANONYMOUS = tuple("abcdefgh")
TOPOLOGIES = {
    "matching4": (8, ((0, 1), (2, 3), (4, 5), (6, 7))),
    "wedge_plus_matching2": (7, ((0, 1), (1, 2), (3, 4), (5, 6))),
    "wedge2": (6, ((0, 1), (1, 2), (3, 4), (4, 5))),
    "path4_plus_edge": (6, ((0, 1), (1, 2), (2, 3), (4, 5))),
    "star3_plus_edge": (6, ((0, 1), (0, 2), (0, 3), (4, 5))),
    "path5": (5, ((0, 1), (1, 2), (2, 3), (3, 4))),
    "star4": (5, ((0, 1), (0, 2), (0, 3), (0, 4))),
    "fork4": (5, ((0, 1), (0, 2), (0, 3), (3, 4))),
}
EXPECTED_AUTOMORPHISMS = {
    "matching4": 384,
    "wedge_plus_matching2": 16,
    "wedge2": 8,
    "path4_plus_edge": 4,
    "star3_plus_edge": 12,
    "path5": 2,
    "star4": 24,
    "fork4": 2,
}


def automorphisms(vertex_count, edges):
    edge_set = {frozenset(edge) for edge in edges}
    return tuple(
        permutation
        for permutation in itertools.permutations(range(vertex_count))
        if {
            frozenset((permutation[left], permutation[right]))
            for left, right in edges
        } == edge_set
    )


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
            reflected = {
                position: ("v" if reflect and label == "u" else
                           "u" if reflect and label == "v" else label)
                for position, label in labels.items()
            }
            candidates.append(tuple(sorted(
                tuple(sorted((reflected[left], reflected[right])))
                for left, right in edges
            )))
    return min(candidates)


def topology_orbits(mode, topology):
    distinguished = tuple("puv") if mode == "collision" else tuple("pquv")
    vertex_count, edges = TOPOLOGIES[topology]
    symmetries = automorphisms(vertex_count, edges)
    assert len(symmetries) == EXPECTED_AUTOMORPHISMS[topology]
    records = set()
    for used_count in range(min(len(distinguished), vertex_count) + 1):
        for positions in itertools.combinations(range(vertex_count), used_count):
            for labels in itertools.permutations(distinguished, used_count):
                assignment = dict(zip(positions, labels))
                if any(
                    {assignment.get(left), assignment.get(right)} == {"u", "v"}
                    for left, right in edges
                ):
                    continue
                records.add(canonical_assignment(
                    edges, vertex_count, assignment, symmetries
                ))
    return tuple(sorted(records))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("collision", "distinct"), required=True)
    parser.add_argument("--topology", choices=tuple(TOPOLOGIES) + ("all",), default="all")
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
    if args.mode == "collision":
        expression = replace_rows(
            complete,
            H=isolate_multiply(rrows, t, 7), K=srows,
            J=isolate_multiply(srows, t, 7), L=srows,
        )
        expression = sp.expand(expression.subs(
            structural(rrows, n) | structural(srows, n - 1)
        ))
    else:
        expression = replace_rows(
            complete,
            H=isolate_multiply(rrows, t, 7), K=srows,
            J=isolate_multiply(xrows, t, 7), L=yrows,
        )
        expression = sp.expand(expression.subs(
            structural(rrows, n) | structural(srows, n - 1)
            | structural(xrows, n - 1) | structural(yrows, n - 2)
        ))

    requested = TOPOLOGIES if args.topology == "all" else (args.topology,)
    output = {}
    for topology in requested:
        graphs = topology_orbits(args.mode, topology)
        distinguished_count = 3 if args.mode == "collision" else 4
        vertex_count = TOPOLOGIES[topology][0]
        print("ORBIT_COUNT", args.mode, topology, len(graphs))
        records = []
        for index, graph in enumerate(graphs):
            rules = graph_row_rules(rrows, n, set(), graph)
            rules |= graph_row_rules(
                srows, n - 1,
                {"p" if args.mode == "collision" else "q"}, graph
            )
            if args.mode == "distinct":
                rules |= graph_row_rules(xrows, n - 1, {"p"}, graph)
                rules |= graph_row_rules(yrows, n - 2, {"p", "q"}, graph)
            value = sp.expand(expression.xreplace(rules))
            anonymous_count = len({
                vertex for edge in graph for vertex in edge if vertex in ANONYMOUS
            })
            assert anonymous_count == vertex_count - len({
                vertex for edge in graph for vertex in edge
                if vertex in ("p", "q", "u", "v")
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
            print(json.dumps({
                "mode": args.mode, "topology": topology, **record
            }, sort_keys=True))
        output[topology] = records
        print("TOPOLOGY_SUMMARY", args.mode, topology, json.dumps({
            "orbits": len(records),
            "passing": sum(record["negative"] == 0 for record in records),
            "failing": sum(record["negative"] != 0 for record in records),
            "minimum": str(min(
                sp.Rational(record["minimum"]) for record in records
            )),
            "orbit_sha256": hashlib.sha256(json.dumps(
                [[list(edge) for edge in graph] for graph in graphs],
                separators=(",", ":"), sort_keys=True
            ).encode()).hexdigest().upper(),
            "record_sha256": hashlib.sha256(json.dumps(
                {topology: records}, separators=(",", ":"), sort_keys=True
            ).encode()).hexdigest().upper(),
        }, sort_keys=True))
    print("ORDERED_OUTPUT_SHA256", hashlib.sha256(json.dumps(
        output, separators=(",", ":"), sort_keys=True
    ).encode()).hexdigest().upper())
    print("EXPLORATORY_ONLY_NO_SIGN_CLAIM")


if __name__ == "__main__":
    main()
