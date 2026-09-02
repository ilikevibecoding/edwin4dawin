#!/usr/bin/env python3
"""Exact finite-core probe for mark-only components over a common forest.

This enumerates the arbitrary unmarked common forest K through order thirteen
and checks every coefficient after the low-sibling tau Bernstein conversion
and expansion in the number h of extra isolates.  It is a finite-core probe,
not an all-order theorem or a replacement for the required large-order cone.
"""

from __future__ import annotations

import argparse
import hashlib

import sympy as sp

from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_mark_only_common_forest_g1_nonadjacent import (
    exact_expression,
    mark_forests,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)
from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_finite_g1_nonadjacent import (
    KNOWN_FOREST_COUNTS,
    bernstein_rows,
)
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


def edge_label(edges):
    return ",".join("".join(sorted(edge)) for edge in sorted(edges)) or "edgeless"


def finite_probe(mode, marks, edges, raw, n, N, h, t, base):
    tau = sp.Symbol("tau", nonnegative=True)
    expression = exact_expression(mode, raw, marks, edges, n, N, h, t, base)
    bounded = sp.expand(expression.subs(
        t, sp.Rational(11, 10) * (N + h + len(marks)) * tau
    ))
    degree, rows, origins = bernstein_rows(bounded, tau, h)
    variables = (N, *base[2:])
    denominators = [
        sp.denom(coefficient)
        for row in rows
        for coefficient in sp.Poly(row, *variables).coeffs()
    ]
    scale = sp.ilcm(*denominators)
    scaled = [sp.expand(scale * row) for row in rows]
    evaluate = sp.lambdify(variables, scaled, modules="math", cse=True)
    stream = hashlib.sha256()
    minimum = None
    witness = None
    negative = 0
    forests = checks = 0
    for order in range(14):
        count = 0
        for forest_index, graph in enumerate(forest_graphs(order)):
            count += 1
            independence = poly_forest(graph)
            arguments = (
                order,
                *(independence[rank] if rank < len(independence) else 0
                  for rank in range(2, 8)),
            )
            values = tuple(int(value) for value in evaluate(*arguments))
            stream.update((",".join(map(str, values)) + "\n").encode())
            local = min(values)
            negative += sum(value < 0 for value in values)
            if minimum is None or local < minimum:
                minimum = local
                witness = (order, forest_index, origins[values.index(local)])
            checks += len(values)
        assert count == KNOWN_FOREST_COUNTS[order]
        forests += count
    return {
        "edges": edge_label(edges),
        "tau_degree": degree,
        "rows": len(rows),
        "scale": int(scale),
        "forests": forests,
        "checks": checks,
        "negative": negative,
        "minimum": minimum,
        "witness": witness,
        "stream_sha256": stream.hexdigest().upper(),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("collision", "distinct"), required=True)
    parser.add_argument("--maximum-edges", type=int)
    args = parser.parse_args()
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    raw = build_mode(args.mode, n, t)
    total = bad = 0
    for marks, edges in mark_forests(args.mode):
        if args.maximum_edges is not None and len(edges) > args.maximum_edges:
            continue
        result = finite_probe(args.mode, marks, edges, raw, n, N, h, t, base)
        total += 1
        bad += result["negative"] > 0
        print("FINITE", result, flush=True)
    print(
        "MODE", args.mode, "MOTIFS", total, "MOTIFS_WITH_NEGATIVE_ROWS", bad,
        flush=True,
    )
    print("PROBE_ONLY_NO_MARK_ONLY_COMMON_FOREST_THEOREM")


if __name__ == "__main__":
    main()
