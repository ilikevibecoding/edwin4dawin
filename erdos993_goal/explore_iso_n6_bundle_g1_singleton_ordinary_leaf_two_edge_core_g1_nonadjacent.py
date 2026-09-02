#!/usr/bin/env python3
"""Exact orbit diagnostic for two-edge post-support cores in the G1 leaf delta."""

from __future__ import annotations

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
    choose,
    replace_rows,
    structural,
)


ANONYMOUS = tuple("abcd")


def canonical_graph(edges):
    used = tuple(sorted({v for edge in edges for v in edge if v in ANONYMOUS}))
    target = ANONYMOUS[:len(used)]
    candidates = []
    for images in itertools.permutations(target):
        anonymous_map = dict(zip(used, images))
        for reflect in (False, True):
            mapping = dict(anonymous_map)
            if reflect:
                mapping.update({"u": "v", "v": "u"})
            transformed = tuple(sorted(
                tuple(sorted(mapping.get(vertex, vertex) for vertex in edge))
                for edge in edges
            ))
            candidates.append(transformed)
    return min(candidates)


def orbit_graphs(mode):
    distinguished = tuple("puv") if mode == "collision" else tuple("pquv")
    vertices = distinguished + ANONYMOUS
    allowed_edges = [
        edge for edge in itertools.combinations(vertices, 2)
        if set(edge) != {"u", "v"}
    ]
    return tuple(sorted({
        canonical_graph(pair) for pair in itertools.combinations(allowed_edges, 2)
    }))


def independent_counts(edges):
    vertices = tuple(sorted({vertex for edge in edges for vertex in edge}))
    edge_sets = tuple(map(set, edges))
    counts = [0] * (len(vertices) + 1)
    for size in range(len(vertices) + 1):
        for subset in itertools.combinations(vertices, size):
            chosen = set(subset)
            if all(not edge <= chosen for edge in edge_sets):
                counts[size] += 1
    return tuple(counts)


def graph_row_rules(rows, order, predeleted, graph):
    rules = {}
    for row, deleted_marks in zip(
        rows, (set(), {"u"}, {"v"}, {"u", "v"})
    ):
        deleted = set(predeleted) | deleted_marks
        surviving_edges = tuple(
            edge for edge in graph if not (set(edge) & deleted)
        )
        counts = independent_counts(surviving_edges)
        active_vertices = len({v for edge in surviving_edges for v in edge})
        row_order = order - len(deleted_marks)
        for rank in range(2, 8):
            rules[row[rank]] = sp.expand(sum(
                count * choose(row_order - active_vertices, rank - size)
                for size, count in enumerate(counts)
            ))
    return rules


def digest(value):
    return hashlib.sha256(
        sp.srepr(sp.expand(value)).encode()
    ).hexdigest().upper()


def main():
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

    all_records = {}
    for mode, expression in (("collision", collision), ("distinct", distinct)):
        graphs = orbit_graphs(mode)
        distinguished_count = 3 if mode == "collision" else 4
        print("ORBIT_COUNT", mode, len(graphs))
        cache = {}
        records = []
        for index, graph in enumerate(graphs):
            rules = graph_row_rules(rrows, n, set(), graph)
            rules |= graph_row_rules(
                srows, n - 1, {"p" if mode == "collision" else "q"}, graph
            )
            if mode == "distinct":
                rules |= graph_row_rules(xrows, n - 1, {"p"}, graph)
                rules |= graph_row_rules(yrows, n - 2, {"p", "q"}, graph)
            signature = tuple(
                (str(variable), sp.srepr(value))
                for variable, value in sorted(rules.items(), key=lambda item: str(item[0]))
            )
            if signature not in cache:
                cache[signature] = sp.expand(expression.xreplace(rules))
            value = cache[signature]
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
                "edges": [list(edge) for edge in graph],
                "first": first,
                "terms": len(polynomial.terms()),
                "negative": len(negative_terms),
                "minimum": str(min(coefficients)),
                "raw_sha256": digest(value),
                "shifted_sha256": digest(shifted_expression),
            }
            if negative_terms:
                record["negative_terms"] = negative_terms
            records.append(record)
            print(json.dumps({"mode": mode, **record}, sort_keys=True))
        all_records[mode] = records
        print("MODE_SUMMARY", mode, json.dumps({
            "orbits": len(graphs),
            "unique_row_signatures": len(cache),
            "passing_orbits": sum(record["negative"] == 0 for record in records),
            "failing_orbits": sum(record["negative"] != 0 for record in records),
        }, sort_keys=True))
    print("TOTAL_SUMMARY", json.dumps({
        mode: {
            "orbits": len(records),
            "passing": sum(record["negative"] == 0 for record in records),
            "failing": sum(record["negative"] != 0 for record in records),
        }
        for mode, records in all_records.items()
    }, sort_keys=True))
    print("ORDERED_RECORD_SHA256", hashlib.sha256(json.dumps(
        all_records, separators=(",", ":"), sort_keys=True
    ).encode()).hexdigest().upper())
    print("EXPLORATORY_ONLY_NO_SIGN_CLAIM")


if __name__ == "__main__":
    main()
